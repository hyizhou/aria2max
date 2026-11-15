// 文件管理控制器 — HTTP 层，委托给 fileService
import { Request, Response } from 'express'
import * as path from 'path'
import * as fs from 'fs/promises'
import archiver from 'archiver'
import fileService from '../services/fileService'
import zipService from '../services/zipService'
import { getDiskUsageForPath } from '../services/diskInfoService'
import type { DiskUsageInfo } from '@shared/types'
import {
  getRenamePathInvalidReason,
  type RenamePathInvalidReason
} from '@shared/utils/fileName'
import { normalizeRelativePath } from '@shared/utils/relativePath'

const invalidRenamePathMessages: Record<RenamePathInvalidReason, string> = {
  empty: 'File name cannot be empty',
  pathSeparator: 'File name cannot contain "/" or "\\"',
  controlCharacter: 'File name cannot contain control characters',
  relativeComponent: 'File name cannot be "." or ".."',
  invalidParentPath: 'Rename paths must be relative paths without empty, ".", or ".." segments',
  differentDirectory: 'New path must remain in the same directory as the old path'
}

function getRequiredStringValue(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function getOptionalStringValue(value: unknown): string | null {
  if (value === undefined) return ''
  return typeof value === 'string' ? value : null
}

class FileControllerImpl {
  // 获取文件列表
  async getFiles(req: Request, res: Response): Promise<void> {
    const dirPath = getOptionalStringValue(req.query.path)
    if (dirPath === null) {
      res.status(400).json({ error: { code: 400, message: 'Path must be a single string' } })
      return
    }

    const result = await fileService.getFiles(dirPath)
    let diskUsage: DiskUsageInfo | null = null
    if (!result.error) {
      try {
        diskUsage = await getDiskUsageForPath(await fileService.getFullPath(dirPath))
      } catch {
        diskUsage = { device: '', total: 0, used: 0, free: 0, percentage: 0, error: 'Unable to get disk usage' }
      }
    }
    res.json({ ...result, diskUsage })
  }

  // 下载文件或目录
  async downloadFile(req: Request, res: Response): Promise<void> {
    const filePath = getRequiredStringValue(req.query.path)
    if (filePath === null) {
      res.status(400).json({ error: { code: 400, message: 'File path is required' } })
      return
    }

    let fullPath: string
    try {
      fullPath = await fileService.getFullPath(filePath)
    } catch {
      res.status(400).json({ error: { code: 400, message: 'Invalid file path' } })
      return
    }
    const fileName = path.basename(fullPath)

    let stat
    try {
      stat = await fs.stat(fullPath)
    } catch {
      res.status(404).json({ error: { code: 404, message: 'File not found' } })
      return
    }

    if (stat.isFile()) {
      res.sendFile(fullPath, {
        headers: {
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`
        }
      })
      return
    }

    // 目录：流式 zip 传输，不落盘不缓存
    const zipName = encodeURIComponent(fileName + '.zip')
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${zipName}`)
    res.setHeader('Transfer-Encoding', 'chunked')
    res.flushHeaders()

    const archive = archiver('zip', { store: true })
    archive.on('error', (err: Error) => {
      console.error('Archive error:', err.message)
      res.end()
    })
    archive.pipe(res)
    archive.directory(fullPath, fileName)
    archive.finalize()
  }

  // 列出 zip 压缩包内指定子目录下的一级条目
  async listZipEntries(req: Request, res: Response): Promise<void> {
    const zipPath = getRequiredStringValue(req.query.path)
    const dir = getOptionalStringValue(req.query.dir)
    if (zipPath === null) {
      res.status(400).json({ error: { code: 400, message: 'File path is required' } })
      return
    }
    if (dir === null) {
      res.status(400).json({ error: { code: 400, message: 'Zip directory must be a single string' } })
      return
    }

    if (path.extname(zipPath).toLowerCase() !== '.zip') {
      res.json({ files: [], error: '仅支持预览 .zip 格式压缩包' })
      return
    }

    let zipFullPath: string
    let subDir: string
    try {
      zipFullPath = await fileService.getFullPath(zipPath)
      subDir = fileService.validateZipEntryPath(dir)
    } catch (error) {
      res.status(400).json({ error: { code: 400, message: error instanceof Error ? error.message : 'Invalid path' } })
      return
    }

    try {
      await fs.access(zipFullPath)
    } catch {
      res.status(404).json({ error: { code: 404, message: 'File not found' } })
      return
    }

    const [result, diskUsage] = await Promise.all([
      Promise.resolve(zipService.listEntries(zipFullPath, subDir)),
      getDiskUsageForPath(path.dirname(zipFullPath))
    ])
    res.json({ ...result, diskUsage })
  }

  // 读取 zip 内单个条目内容用于预览（文本/图片），inline 返回
  async readZipEntry(req: Request, res: Response): Promise<void> {
    const zipPath = getRequiredStringValue(req.query.path)
    const entry = getRequiredStringValue(req.query.entry)
    if (zipPath === null || entry === null) {
      res.status(400).json({ error: { code: 400, message: 'Both path and entry are required' } })
      return
    }

    if (path.extname(zipPath).toLowerCase() !== '.zip') {
      res.status(400).json({ error: { code: 400, message: '仅支持预览 .zip 格式压缩包' } })
      return
    }

    let zipFullPath: string
    let entryPath: string
    try {
      zipFullPath = await fileService.getFullPath(zipPath)
      entryPath = fileService.validateZipEntryPath(entry)
    } catch (error) {
      res.status(400).json({ error: { code: 400, message: error instanceof Error ? error.message : 'Invalid path' } })
      return
    }

    try {
      await fs.access(zipFullPath)
    } catch {
      res.status(404).json({ error: { code: 404, message: 'File not found' } })
      return
    }

    try {
      const content = zipService.readEntry(zipFullPath, entryPath)
      res.setHeader('Content-Type', content.mime)
      res.setHeader('Content-Length', content.size)
      res.send(content.buffer)
    } catch (error) {
      const message = error instanceof Error ? error.message : '读取失败'
      // 不支持预览/文件过大等业务提示用 422，便于前端区分
      res.status(422).json({ error: { code: 422, message } })
    }
  }

  // 删除文件或目录
  async deleteFile(req: Request, res: Response): Promise<void> {
    const { path: filePath } = req.body

    if (getRequiredStringValue(filePath) === null || normalizeRelativePath(filePath) === null) {
      res.status(400).json({ error: { code: 400, message: 'File path is required' } })
      return
    }

    const result = await fileService.deleteFile(filePath)
    if (!result.success) {
      res.status(500).json({ error: { code: 500, message: result.message } })
      return
    }
    res.json({ success: true })
  }

  // 创建目录
  async createDirectory(req: Request, res: Response): Promise<void> {
    const { path: dirPath } = req.body

    if (getRequiredStringValue(dirPath) === null || normalizeRelativePath(dirPath) === null) {
      res.status(400).json({ error: { code: 400, message: 'Directory path is required' } })
      return
    }

    const result = await fileService.createDirectory(dirPath)
    if (!result.success) {
      res.status(500).json({ error: { code: 500, message: result.message } })
      return
    }
    res.json({ success: true })
  }

  // 重命名文件或目录
  async renameFile(req: Request, res: Response): Promise<void> {
    const { oldPath, newPath } = req.body

    if (
      getRequiredStringValue(oldPath) === null ||
      getRequiredStringValue(newPath) === null
    ) {
      res.status(400).json({ error: { code: 400, message: 'Both oldPath and newPath are required' } })
      return
    }

    const invalidReason = getRenamePathInvalidReason(oldPath, newPath)
    if (invalidReason) {
      res.status(400).json({ error: { code: 400, message: invalidRenamePathMessages[invalidReason] } })
      return
    }

    const result = await fileService.renameFile(oldPath, newPath)
    if (!result.success) {
      res.status(500).json({ error: { code: 500, message: result.message } })
      return
    }
    res.json({ success: true })
  }

  // 上传文件
  async uploadFile(req: Request, res: Response): Promise<void> {
    if (!req.files || !req.files.file) {
      res.status(400).json({ error: { code: 400, message: 'File is required' } })
      return
    }

    const file = Array.isArray(req.files.file) ? req.files.file[0] : req.files.file
    const uploadPath = getOptionalStringValue(req.body.path)
    if (
      uploadPath === null ||
      typeof file.name !== 'string' ||
      !file.name
    ) {
      res.status(400).json({ error: { code: 400, message: 'Invalid upload path or file name' } })
      return
    }

    let fileName = file.name

    const corruptionPatterns = ['Ã', 'æ', 'å', 'ï¿½', '??']
    const isCorrupted = corruptionPatterns.some(pattern => fileName.includes(pattern))

    if (isCorrupted) {
      try {
        const buffer = Buffer.from(fileName, 'binary')
        const fixedName = buffer.toString('utf8')
        if (/[一-鿿]/.test(fixedName)) {
          fileName = fixedName
        }
      } catch (fixError) {
        const err = fixError as Error
        console.log('Failed to fix UTF-8 encoding:', err.message)
      }
    }

    if (isCorrupted && file.originalFilename && file.originalFilename !== fileName) {
      fileName = file.originalFilename
    }

    const relativePath = uploadPath ? `${uploadPath}/${fileName}` : fileName
    if (normalizeRelativePath(relativePath) === null) {
      res.status(400).json({ error: { code: 400, message: 'Invalid upload path or file name' } })
      return
    }

    const result = await fileService.uploadFile(relativePath, file.data)
    if (!result.success) {
      res.status(500).json({ error: { code: 500, message: result.message } })
      return
    }
    res.json({ success: true })
  }
}

export default new FileControllerImpl()
