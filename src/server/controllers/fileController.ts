// 文件管理控制器 — HTTP 层，委托给 fileService
import { Request, Response } from 'express'
import * as path from 'path'
import * as fs from 'fs/promises'
import archiver from 'archiver'
import fileService from '../services/fileService'
import zipService from '../services/zipService'
import {
  getRenamePathInvalidReason,
  type RenamePathInvalidReason
} from '@shared/utils/fileName'

const invalidRenamePathMessages: Record<RenamePathInvalidReason, string> = {
  empty: 'File name cannot be empty',
  pathSeparator: 'File name cannot contain "/" or "\\"',
  controlCharacter: 'File name cannot contain control characters',
  relativeComponent: 'File name cannot be "." or ".."',
  invalidParentPath: 'Rename paths must be relative paths without empty, ".", or ".." segments',
  differentDirectory: 'New path must remain in the same directory as the old path'
}

class FileControllerImpl {
  // 获取文件列表
  async getFiles(req: Request, res: Response): Promise<void> {
    const { path: dirPath = '' } = req.query
    const result = await fileService.getFiles(dirPath as string)
    res.json(result)
  }

  // 下载文件或目录
  async downloadFile(req: Request, res: Response): Promise<void> {
    const { path: filePath } = req.query

    if (!filePath) {
      res.status(400).json({ error: { code: 400, message: 'File path is required' } })
      return
    }

    const fullPath = fileService.getFullPath(filePath as string)
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
    const { path: zipPath, dir = '' } = req.query

    if (!zipPath) {
      res.status(400).json({ error: { code: 400, message: 'File path is required' } })
      return
    }

    if (path.extname(zipPath as string).toLowerCase() !== '.zip') {
      res.json({ files: [], error: '仅支持预览 .zip 格式压缩包' })
      return
    }

    let zipFullPath: string
    let subDir: string
    try {
      zipFullPath = fileService.getFullPath(zipPath as string)
      subDir = fileService.validateZipEntryPath(dir as string)
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

    const result = zipService.listEntries(zipFullPath, subDir)
    res.json(result)
  }

  // 读取 zip 内单个条目内容用于预览（文本/图片），inline 返回
  async readZipEntry(req: Request, res: Response): Promise<void> {
    const { path: zipPath, entry } = req.query

    if (!zipPath || !entry) {
      res.status(400).json({ error: { code: 400, message: 'Both path and entry are required' } })
      return
    }

    if (path.extname(zipPath as string).toLowerCase() !== '.zip') {
      res.status(400).json({ error: { code: 400, message: '仅支持预览 .zip 格式压缩包' } })
      return
    }

    let zipFullPath: string
    let entryPath: string
    try {
      zipFullPath = fileService.getFullPath(zipPath as string)
      entryPath = fileService.validateZipEntryPath(entry as string)
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

    if (!filePath) {
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

    if (!dirPath) {
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

    if (!oldPath || !newPath) {
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

    const relativePath = req.body.path ? `${req.body.path}/${fileName}` : fileName
    const result = await fileService.uploadFile(relativePath, file.data)
    if (!result.success) {
      res.status(500).json({ error: { code: 500, message: result.message } })
      return
    }
    res.json({ success: true })
  }
}

export default new FileControllerImpl()
