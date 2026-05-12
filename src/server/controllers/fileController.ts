// 文件管理控制器 — HTTP 层，委托给 fileService
import { Request, Response } from 'express'
import * as path from 'path'
import * as fs from 'fs/promises'
import archiver from 'archiver'
import fileService from '../services/fileService'

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
