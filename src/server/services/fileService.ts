// 文件操作基础服务 — 纯文件系统操作，不依赖任何外部服务
import * as path from 'path'
import * as fs from 'fs/promises'
import { getFinalConfig } from '../config/aria2'

// 路径安全检查：防止路径遍历攻击
function safePath(base: string, relative: string): string {
  const normalizedBase = path.normalize(base)
  const resolved = path.resolve(normalizedBase, relative)
  if (resolved !== normalizedBase && !resolved.startsWith(normalizedBase + path.sep)) {
    throw new Error('Invalid path: path traversal detected')
  }
  return resolved
}

// 检查绝对路径是否在下载目录范围内
function isPathAllowed(fullPath: string): boolean {
  const normalizedBase = path.normalize(getDownloadDir())
  const resolved = path.normalize(fullPath)
  return resolved === normalizedBase || resolved.startsWith(normalizedBase + path.sep)
}

// 格式化文件系统错误
function formatFsError(err: NodeJS.ErrnoException): string {
  switch (err.code) {
    case 'ENOENT': return 'File or directory not found'
    case 'EACCES': return 'Permission denied'
    case 'ENOTEMPTY': return 'Directory is not empty'
    case 'EPERM': return 'Operation not permitted'
    case 'EISDIR': return 'Expected a file but found a directory'
    case 'ENOTDIR': return 'Expected a directory but found a file'
    case 'EBUSY': return 'File or directory is in use'
    case 'EIO': return 'I/O error'
    default: return err.message || 'Unknown error'
  }
}

export interface FileListResult {
  files: Array<{
    name: string
    path: string
    size: number
    mtime: string
    isDir: boolean
    isSymlink: boolean
    targetPath: string | null
    targetExists: boolean
  }>
  error: string | null
}

export interface FileOperationResult {
  success: boolean
  message?: string
}

// 获取下载目录根路径
function getDownloadDir(): string {
  return getFinalConfig().downloadDir
}

class FileService {
  // 获取文件列表
  async getFiles(dirPath = ''): Promise<FileListResult> {
    const baseDir = getDownloadDir()

    try {
      const fullPath = safePath(baseDir, dirPath)
      const files = await fs.readdir(fullPath, { withFileTypes: true })

      const fileList = await Promise.all(files.map(async (file) => {
        const filePath = path.join(fullPath, file.name)
        const stats = await fs.stat(filePath)
        const lstats = await fs.lstat(filePath)

        const isSymlink = lstats.isSymbolicLink()
        let isDir = file.isDirectory()
        let targetPath: string | null = null
        let targetExists = true

        if (isSymlink) {
          try {
            targetPath = await fs.readlink(filePath)
            const targetFullPath = path.resolve(path.dirname(filePath), targetPath)
            const targetStats = await fs.stat(targetFullPath)
            isDir = targetStats.isDirectory()
          } catch {
            targetExists = false
          }
        }

        return {
          name: file.name,
          path: path.join(dirPath, file.name),
          size: stats.size,
          mtime: stats.mtime.toISOString(),
          isDir,
          isSymlink,
          targetPath,
          targetExists
        }
      }))

      return { files: fileList, error: null }
    } catch (error) {
      const err = error as NodeJS.ErrnoException
      const message = dirPath
        ? `Failed to read directory: ${formatFsError(err)}`
        : `Download directory not accessible: ${formatFsError(err)}`
      console.error(`[FileService] ${message}`)
      return { files: [], error: message }
    }
  }

  // 删除文件或目录（通过绝对路径）
  async deleteByAbsolutePath(fullPath: string): Promise<FileOperationResult> {
    if (!isPathAllowed(fullPath)) {
      console.error(`[FileService] Delete blocked: path outside download directory: ${fullPath}`)
      return { success: false, message: 'Path is outside the allowed directory' }
    }
    try {
      const lstats = await fs.lstat(fullPath)
      if (lstats.isSymbolicLink()) {
        await fs.unlink(fullPath)
      } else {
        await fs.rm(fullPath, { recursive: true })
      }
      console.log(`[FileService] Deleted: ${fullPath}`)
      return { success: true }
    } catch (error) {
      const err = error as NodeJS.ErrnoException
      const message = formatFsError(err)
      console.error(`[FileService] Delete failed: ${fullPath} - ${message}`)
      return { success: false, message }
    }
  }

  // 删除文件或目录（相对于 downloadDir 的路径）
  async deleteFile(relativePath: string): Promise<FileOperationResult> {
    const fullPath = safePath(getDownloadDir(), relativePath)
    return this.deleteByAbsolutePath(fullPath)
  }

  // 检查文件/目录是否存在
  async exists(fullPath: string): Promise<boolean> {
    try {
      await fs.access(fullPath)
      return true
    } catch {
      return false
    }
  }

  // 创建目录
  async createDirectory(dirPath: string): Promise<FileOperationResult> {
    const fullPath = safePath(getDownloadDir(), dirPath)
    try {
      await fs.mkdir(fullPath, { recursive: true })
      console.log(`[FileService] Created directory: ${fullPath}`)
      return { success: true }
    } catch (error) {
      const err = error as NodeJS.ErrnoException
      const message = formatFsError(err)
      console.error(`[FileService] Create directory failed: ${fullPath} - ${message}`)
      return { success: false, message }
    }
  }

  // 重命名
  async renameFile(oldPath: string, newPath: string): Promise<FileOperationResult> {
    const oldFullPath = safePath(getDownloadDir(), oldPath)
    const newFullPath = safePath(getDownloadDir(), newPath)
    try {
      await fs.rename(oldFullPath, newFullPath)
      console.log(`[FileService] Renamed: ${oldFullPath} -> ${newFullPath}`)
      return { success: true }
    } catch (error) {
      const err = error as NodeJS.ErrnoException
      const message = formatFsError(err)
      console.error(`[FileService] Rename failed: ${oldFullPath} -> ${newFullPath} - ${message}`)
      return { success: false, message }
    }
  }

  // 上传文件
  async uploadFile(relativePath: string, data: Buffer): Promise<FileOperationResult> {
    const fullPath = safePath(getDownloadDir(), relativePath)
    try {
      await fs.mkdir(path.dirname(fullPath), { recursive: true })
      await fs.writeFile(fullPath, data)
      console.log(`[FileService] Uploaded: ${fullPath}`)
      return { success: true }
    } catch (error) {
      const err = error as NodeJS.ErrnoException
      const message = formatFsError(err)
      console.error(`[FileService] Upload failed: ${fullPath} - ${message}`)
      return { success: false, message }
    }
  }

  // 获取文件绝对路径（供下载等场景使用，含安全检查）
  getFullPath(relativePath: string): string {
    return safePath(getDownloadDir(), relativePath)
  }

  // 解析 aria2 任务中的文件路径到宿主机绝对路径
  // aria2 可能运行在容器中，路径与宿主机不同，需要映射
  async resolveAria2TaskPath(aria2Path: string, aria2DownloadDir: string | null): Promise<string> {
    if (!path.isAbsolute(aria2Path)) {
      return safePath(getDownloadDir(), aria2Path)
    }

    // 如果有 aria2 下载目录信息，做路径映射
    if (aria2DownloadDir && aria2Path.startsWith(aria2DownloadDir)) {
      let relativePath = aria2Path.substring(aria2DownloadDir.length)
      if (relativePath.startsWith('/')) {
        relativePath = relativePath.substring(1)
      }
      return safePath(getDownloadDir(), relativePath)
    }

    // 绝对路径且不需要映射，检查是否在允许范围内
    if (!isPathAllowed(aria2Path)) {
      throw new Error(`Invalid path: aria2 path outside download directory: ${aria2Path}`)
    }
    return aria2Path
  }
}

export default new FileService()
