// 文件管理控制器
const aria2Client = require('../config/aria2')
const path = require('path')

class FileController {
  // 获取文件列表
  async getFiles(req, res) {
    try {
      const { path: dirPath = '' } = req.query
      const files = await aria2Client.getFiles(dirPath)
      res.json({ files })
    } catch (error) {
      console.error('Failed to get files:', error)
      res.status(500).json({ 
        error: { 
          code: 500, 
          message: 'Failed to get files' 
        } 
      })
    }
  }

  // 下载文件
  async downloadFile(req, res) {
    try {
      const { path: filePath } = req.query
      
      if (!filePath) {
        return res.status(400).json({ 
          error: { 
            code: 400, 
            message: 'File path is required' 
          } 
        })
      }
      
      const fullPath = path.join(aria2Client.downloadDir, filePath)
      
      // 检查文件是否存在
      const fs = require('fs').promises
      try {
        await fs.access(fullPath)
      } catch (error) {
        return res.status(404).json({ 
          error: { 
            code: 404, 
            message: 'File not found' 
          } 
        })
      }
      
      // 设置响应头并发送文件
      res.sendFile(fullPath)
    } catch (error) {
      console.error('Failed to download file:', error)
      res.status(500).json({ 
        error: { 
          code: 500, 
          message: 'Failed to download file' 
        } 
      })
    }
  }

  // 删除文件或目录
  async deleteFile(req, res) {
    try {
      const { path: filePath } = req.body
      
      if (!filePath) {
        return res.status(400).json({ 
          error: { 
            code: 400, 
            message: 'File path is required' 
          } 
        })
      }
      
      await aria2Client.deleteFile(filePath)
      res.json({ success: true })
    } catch (error) {
      console.error('Failed to delete file:', error)
      res.status(500).json({ 
        error: { 
          code: 500, 
          message: 'Failed to delete file' 
        } 
      })
    }
  }

  // 创建目录
  async createDirectory(req, res) {
    try {
      const { path: dirPath } = req.body
      
      if (!dirPath) {
        return res.status(400).json({ 
          error: { 
            code: 400, 
            message: 'Directory path is required' 
          } 
        })
      }
      
      await aria2Client.createDirectory(dirPath)
      res.json({ success: true })
    } catch (error) {
      console.error('Failed to create directory:', error)
      res.status(500).json({ 
        error: { 
          code: 500, 
          message: 'Failed to create directory' 
        } 
      })
    }
  }
  
  // 重命名文件或目录
  async renameFile(req, res) {
    try {
      const { oldPath, newPath } = req.body
      
      if (!oldPath || !newPath) {
        return res.status(400).json({ 
          error: { 
            code: 400, 
            message: 'Both oldPath and newPath are required' 
          } 
        })
      }
      
      await aria2Client.renameFile(oldPath, newPath)
      res.json({ success: true })
    } catch (error) {
      console.error('Failed to rename file:', error)
      res.status(500).json({ 
        error: { 
          code: 500, 
          message: 'Failed to rename file' 
        } 
      })
    }
  }
  
  // 上传文件
  async uploadFile(req, res) {
    try {
      if (!req.files || !req.files.file) {
        return res.status(400).json({ 
          error: { 
            code: 400, 
            message: 'File is required' 
          } 
        })
      }
      
      const file = req.files.file
      let fileName = file.name
      
      // Check for corruption patterns (double-encoded UTF-8)
      const corruptionPatterns = ['Ã', 'æ', 'å', 'ï¿½', '??']
      const isCorrupted = corruptionPatterns.some(pattern => fileName.includes(pattern))
      
      // Try to fix double-encoded UTF-8
      if (isCorrupted) {
        try {
          // Convert the corrupted string back to bytes assuming it's Latin-1
          // then interpret those bytes as UTF-8
          const buffer = Buffer.from(fileName, 'binary')
          const fixedName = buffer.toString('utf8')
          
          // Verify this looks like a proper Chinese filename
          // Check if it contains Chinese characters
          if (/[\u4e00-\u9fff]/.test(fixedName)) {
            fileName = fixedName
          }
        } catch (fixError) {
          console.log('Failed to fix UTF-8 encoding:', fixError.message)
        }
      }
      
      // Fallback to originalFilename if still corrupted
      if (isCorrupted && file.originalFilename && file.originalFilename !== fileName) {
        fileName = file.originalFilename
      }
      
      const filePath = req.body.path ? `${req.body.path}/${fileName}` : fileName
      
      await aria2Client.uploadFile(filePath, file.data)
      res.json({ success: true })
    } catch (error) {
      console.error('Failed to upload file:', error)
      res.status(500).json({ 
        error: { 
          code: 500, 
          message: 'Failed to upload file' 
        } 
      })
    }
  }
}

module.exports = new FileController()