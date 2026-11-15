// 文件操作基础服务 — 纯文件系统操作，不依赖任何外部服务
import * as path from 'path'
import * as fs from 'fs/promises'
import { getFinalConfig } from '../config/aria2'
import { normalizeRelativePath } from '@shared/utils/relativePath'

function isWithinBase(fullPath: string, base: string): boolean {
  return fullPath === base || fullPath.startsWith(base + path.sep)
}

interface FsErrnoException extends Error {
  code?: string
}

// 路径安全检查：词法边界和真实符号链接边界都不得离开允许根目录
async function safePath(base: string, relative: string): Promise<string> {
  const normalizedRelative = normalizeRelativePath(relative)
  if (normalizedRelative === null) throw new Error('Invalid relative path')

  const realBase = await fs.realpath(base)
  const resolved = path.resolve(realBase, normalizedRelative)
  let validatedPath = resolved

  try {
    validatedPath = await fs.realpath(resolved)
  } catch (error) {
    const err = error as FsErrnoException
    if (err.code !== 'ENOENT' && err.code !== 'ENOTDIR') throw error

    // 新建文件/目录时最终路径可能尚不存在；必须验证最近存在祖先，
    // 防止其中某个符号链接把剩余路径带出允许根目录。
    let current = resolved
    const remainingSegments: string[] = []
    while (path.dirname(current) !== current) {
      remainingSegments.unshift(path.basename(current))
      current = path.dirname(current)
      try {
        const realAncestor = await fs.realpath(current)
        if (!isWithinBase(realAncestor, realBase)) {
          throw new Error('Path is outside the allowed directory')
        }
        validatedPath = path.join(realAncestor, ...remainingSegments)
        break
      } catch (ancestorError) {
        const ancestorErr = ancestorError as FsErrnoException
        if (ancestorErr.code !== 'ENOENT' && ancestorErr.code !== 'ENOTDIR') throw ancestorError
      }
    }
  }

  if (!isWithinBase(validatedPath, realBase)) {
    throw new Error('Path is outside the allowed directory')
  }

  // 保留词法路径，删除/重命名遇到符号链接时操作链接本身；
  // 上方 realpath 已确保该链接最终不会指向允许目录之外。
  return resolved
}

// 获取所有允许的根目录列表（统一路径权限检查的基础）
function getAllowedRoots(): string[] {
  const config = getFinalConfig()
  const roots = [path.normalize(config.downloadDir)]
  const hostDir = path.normalize(config.aria2HostDir || config.downloadDir)
  if (!roots.includes(hostDir)) roots.push(hostDir)
  return roots
}

// 检查绝对路径是否在允许的目录范围内
async function isPathAllowed(fullPath: string): Promise<boolean> {
  if (typeof fullPath !== 'string') return false

  let resolved: string
  try {
    resolved = await fs.realpath(fullPath)
  } catch {
    return false
  }

  const roots = await Promise.all(
    getAllowedRoots().map(async root => {
      try {
        return await fs.realpath(root)
      } catch {
        return null
      }
    })
  )
  return roots.some(root => root !== null && isWithinBase(resolved, root))
}

// 格式化文件系统错误
function formatFsError(err: FsErrnoException): string {
  if (err.message === 'Invalid relative path' || err.message === 'Path is outside the allowed directory') {
    return err.message
  }
  switch (err.code) {
    case 'ENOENT': return 'File or directory not found'
    case 'EACCES': return 'Permission denied'
    case 'ENOTEMPTY': return 'Directory is not empty'
    case 'EPERM': return 'Operation not permitted'
    case 'EISDIR': return 'Expected a file but found a directory'
    case 'ENOTDIR': return 'Expected a directory but found a file'
    case 'EBUSY': return 'File or directory is in use'
    case 'EIO': return 'I/O error'
    default: return 'File operation failed'
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
  diskUsage?: import('@shared/types').DiskUsageInfo | null
}

export interface FileOperationResult {
  success: boolean
  message?: string
}

// 获取下载目录根路径（文件管理功能使用）
function getDownloadDir(): string {
  return getFinalConfig().downloadDir
}

// 获取 aria2 下载目录对应的宿主机路径（用于任务文件路径映射）
// 当 aria2 运行在容器中时，容器路径 ≠ 宿主机路径
// 例如：aria2 容器 /downloads → 宿主机 /mnt/sda1/download
function getAria2HostDir(): string {
  const config = getFinalConfig()
  return config.aria2HostDir || config.downloadDir
}

class FileService {
  // 获取文件列表
  async getFiles(dirPath = ''): Promise<FileListResult> {
    const baseDir = getDownloadDir()

    try {
      const fullPath = await safePath(baseDir, dirPath)
      const files = await fs.readdir(fullPath, { withFileTypes: true })

      const fileList = await Promise.all(files.map(async (file) => {
        const filePath = path.join(fullPath, file.name)
        const stats = await fs.stat(filePath)
        const lstats = await fs.lstat(filePath)

        const isSymlink = lstats.isSymbolicLink()
        let isDir = file.isDirectory()
        const targetPath: string | null = null
        let targetExists = true

        if (isSymlink) {
          try {
            const targetStats = await fs.stat(filePath)
            isDir = targetStats.isDirectory()
          } catch {
            targetExists = false
          }
        }

        return {
          name: file.name,
          path: path.join(normalizeRelativePath(dirPath) ?? '', file.name),
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
      const err = error as FsErrnoException
      const message = dirPath
        ? `Failed to read directory: ${formatFsError(err)}`
        : `Download directory not accessible: ${formatFsError(err)}`
      console.error(`[FileService] ${message}`)
      return { files: [], error: message }
    }
  }

  // 删除文件或目录（通过绝对路径）
  async deleteByAbsolutePath(fullPath: string): Promise<FileOperationResult> {
    if (!(await isPathAllowed(fullPath))) {
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
      const err = error as FsErrnoException
      const message = formatFsError(err)
      console.error(`[FileService] Delete failed: ${fullPath} - ${message}`)
      return { success: false, message }
    }
  }

  // 删除文件或目录（相对于 downloadDir 的路径）
  async deleteFile(relativePath: string): Promise<FileOperationResult> {
    const fullPath = await safePath(getDownloadDir(), relativePath)
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
    const fullPath = await safePath(getDownloadDir(), dirPath)
    try {
      await fs.mkdir(fullPath, { recursive: true })
      console.log(`[FileService] Created directory: ${fullPath}`)
      return { success: true }
    } catch (error) {
      const err = error as FsErrnoException
      const message = formatFsError(err)
      console.error(`[FileService] Create directory failed: ${fullPath} - ${message}`)
      return { success: false, message }
    }
  }

  // 重命名
  async renameFile(oldPath: string, newPath: string): Promise<FileOperationResult> {
    const oldFullPath = await safePath(getDownloadDir(), oldPath)
    const newFullPath = await safePath(getDownloadDir(), newPath)
    try {
      await fs.rename(oldFullPath, newFullPath)
      console.log(`[FileService] Renamed: ${oldFullPath} -> ${newFullPath}`)
      return { success: true }
    } catch (error) {
      const err = error as FsErrnoException
      const message = formatFsError(err)
      console.error(`[FileService] Rename failed: ${oldFullPath} -> ${newFullPath} - ${message}`)
      return { success: false, message }
    }
  }

  // 上传文件
  async uploadFile(relativePath: string, data: Buffer): Promise<FileOperationResult> {
    const fullPath = await safePath(getDownloadDir(), relativePath)
    try {
      await fs.mkdir(path.dirname(fullPath), { recursive: true })
      await fs.writeFile(fullPath, data)
      console.log(`[FileService] Uploaded: ${fullPath}`)
      return { success: true }
    } catch (error) {
      const err = error as FsErrnoException
      const message = formatFsError(err)
      console.error(`[FileService] Upload failed: ${fullPath} - ${message}`)
      return { success: false, message }
    }
  }

  // 获取文件绝对路径（供下载等场景使用，含安全检查）
  async getFullPath(relativePath: string): Promise<string> {
    return await safePath(getDownloadDir(), relativePath)
  }

  // 校验 zip 内部条目路径（相对路径，/ 分隔），防止绝对路径、盘符与 .. 穿越
  // 与 safePath 哲学一致：只允许在压缩包内部的相对定位
  validateZipEntryPath(p: string): string {
    const normalized = normalizeRelativePath(p)
    if (normalized === null) throw new Error('Invalid zip entry path')
    return normalized
  }

  // 解析 aria2 任务中的文件路径到宿主机绝对路径
  // aria2 可能运行在容器中，路径与宿主机不同，需要映射
  async resolveAria2TaskPath(aria2Path: string, aria2DownloadDir: string | null): Promise<string> {
    if (!path.isAbsolute(aria2Path)) {
      return await safePath(getAria2HostDir(), aria2Path)
    }

    // 如果有 aria2 下载目录信息，做路径映射
    // 将 aria2 路径前缀替换为宿主机路径（aria2HostDir）
    if (aria2DownloadDir && aria2Path.startsWith(aria2DownloadDir)) {
      let relativePath = aria2Path.substring(aria2DownloadDir.length)
      if (relativePath.startsWith('/')) {
        relativePath = relativePath.substring(1)
      }
      return await safePath(getAria2HostDir(), relativePath)
    }

    // 绝对路径且不需要映射，检查是否在允许范围内
    if (!(await isPathAllowed(aria2Path))) {
      throw new Error(`Invalid path: aria2 path outside download directory: ${aria2Path}`)
    }
    return aria2Path
  }
}

export default new FileService()
