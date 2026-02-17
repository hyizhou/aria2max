// 文件管理控制器
import { Request, Response } from 'express'
import * as path from 'path'
import * as fs from 'fs/promises'
import aria2Client from '../config/aria2'

interface FileController {
  getFiles(req: Request, res: Response): Promise<void>
  downloadFile(req: Request, res: Response): Promise<void>
  deleteFile(req: Request, res: Response): Promise<void>
  createDirectory(req: Request, res: Response): Promise<void>
  renameFile(req: Request, res: Response): Promise<void>
  uploadFile(req: Request, res: Response): Promise<void>
}

class FileControllerImpl implements FileController {
  // 获取文件列表
  async getFiles(req: Request, res: Response): Promise<void> {
    const { path: dirPath = '' } = req.query
    const result = await aria2Client.getFiles(dirPath as string)
    res.json(result)
  }

  // 下载文件
  async downloadFile(req: Request, res: Response): Promise<void> {
    const { path: filePath } = req.query

    if (!filePath) {
      res.status(400).json({
        error: {
          code: 400,
          message: 'File path is required'
        }
      })
      return
    }

    const fullPath = path.join(aria2Client.downloadDir, filePath as string)

    try {
      await fs.access(fullPath)
    } catch {
      res.status(404).json({
        error: {
          code: 404,
          message: 'File not found'
        }
      })
      return
    }

    res.sendFile(fullPath)
  }

  // 删除文件或目录
  async deleteFile(req: Request, res: Response): Promise<void> {
    const { path: filePath } = req.body

    if (!filePath) {
      res.status(400).json({
        error: {
          code: 400,
          message: 'File path is required'
        }
      })
      return
    }

    await aria2Client.deleteFile(filePath)
    res.json({ success: true })
  }

  // 创建目录
  async createDirectory(req: Request, res: Response): Promise<void> {
    const { path: dirPath } = req.body

    if (!dirPath) {
      res.status(400).json({
        error: {
          code: 400,
          message: 'Directory path is required'
        }
      })
      return
    }

    await aria2Client.createDirectory(dirPath)
    res.json({ success: true })
  }

  // 重命名文件或目录
  async renameFile(req: Request, res: Response): Promise<void> {
    const { oldPath, newPath } = req.body

    if (!oldPath || !newPath) {
      res.status(400).json({
        error: {
          code: 400,
          message: 'Both oldPath and newPath are required'
        }
      })
      return
    }

    await aria2Client.renameFile(oldPath, newPath)
    res.json({ success: true })
  }

  // 上传文件
  async uploadFile(req: Request, res: Response): Promise<void> {
    if (!req.files || !req.files.file) {
      res.status(400).json({
        error: {
          code: 400,
          message: 'File is required'
        }
      })
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

        if (/[\u4e00-\u9fff]/.test(fixedName)) {
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

    const filePath = req.body.path ? `${req.body.path}/${fileName}` : fileName

    await aria2Client.uploadFile(filePath, file.data)
    res.json({ success: true })
  }
}

export default new FileControllerImpl()
