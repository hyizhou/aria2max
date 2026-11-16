// 文件操作基础服务 — 纯文件系统操作，不依赖任何外部服务
import * as path from 'path'
import * as fs from 'fs/promises'
import { getFinalConfig } from '../config/aria2'
import { normalizeRelativePath } from '@shared/utils/relativePath'

// win32 文件系统通常大小写不敏感；其他平台保持精确比较。
// macOS 卷特性无法静态判断，保守保持大小写敏感（误拒不误放）。
function comparePathText(value: string, separator: string = path.sep): string {
  return separator === '\\' ? value.toLowerCase() : value
}

export function isSamePathText(
  left: string,
  right: string,
  separator: string = path.sep
): boolean {
  return comparePathText(left, separator) === comparePathText(right, separator)
}

function isWithinBase(fullPath: string, base: string): boolean {
  const comparableFullPath = comparePathText(fullPath)
  const comparableBase = comparePathText(base)
  // 根路径（'/' 或 'C:\\'）本身以分隔符结尾，其后代直接以根为前缀
  if (comparableBase.endsWith(path.sep)) return comparableFullPath.startsWith(comparableBase)
  return comparableFullPath === comparableBase ||
    comparableFullPath.startsWith(comparableBase + path.sep)
}

interface FsErrnoException extends Error {
  code?: string
}

interface TrustedPathResult {
  lexicalPath: string
  realPath: string
  allowedRealRoots: AllowedRealRoot[]
  finalUnreachableSymlink: boolean
  traversesUnreachableSymlink: boolean
  finalIsSymlink: boolean
}

interface AllowedRealRoot {
  path: string
  type: 'file' | 'directory'
}

export type PathExistsStatus = 'exists' | 'missing' | 'unknown'

// 文件型允许根只接受精确匹配；目录型允许根接受其下的子路径
function isWithinAllowedRoots(realPath: string, roots: AllowedRealRoot[]): boolean {
  return roots.some(root =>
    root.type === 'file'
      ? isSamePathText(realPath, root.path)
      : isWithinBase(realPath, root.path)
  )
}

async function resolveRealRootType(realPath: string): Promise<'file' | 'directory'> {
  const stats = await fs.lstat(realPath)
  return stats.isDirectory() ? 'directory' : 'file'
}

function removeTrailingSeparators(prefix: string): string {
  let result = prefix
  const separators = path.sep === '\\' ? ['/', '\\'] : ['/']
  while (result.length > 1 && separators.some(separator => result.endsWith(separator))) {
    result = result.slice(0, -1)
  }
  return result
}

// 判断 aria2 路径是否位于下载目录前缀之内（含精确匹配）。
// 前缀必须带分隔符边界，避免 /downloads 误匹配 /downloads2。
function isPathWithinPrefix(candidate: string, prefix: string): boolean {
  const normalizedPrefix = removeTrailingSeparators(path.normalize(prefix))
  const normalizedCandidate = path.normalize(candidate)
  const startsWithPrefix = (value: string, root: string): boolean =>
    root.endsWith(path.sep)
      ? value.startsWith(root)
      : value === root || value.startsWith(root + path.sep)
  if (path.sep === '\\') {
    return startsWithPrefix(normalizedCandidate.toLowerCase(), normalizedPrefix.toLowerCase())
  }
  return startsWithPrefix(normalizedCandidate, normalizedPrefix)
}

function isUnreachableSymlinkCode(code: string | undefined): boolean {
  return code === 'ENOENT' || code === 'ELOOP' || code === 'EACCES' || code === 'ENOTDIR'
}

// 不可达链接（目标缺失/循环/无权限）只允许删除或重命名链接本身，
// 浏览、上传、下载、新建目录等操作必须被拒绝。
function assertReachableSymlinkPath(trusted: TrustedPathResult): void {
  if (trusted.finalUnreachableSymlink || trusted.traversesUnreachableSymlink) {
    throw new Error('Symbolic link target is unreachable')
  }
}

function assertNotTraversingUnreachableSymlink(trusted: TrustedPathResult): void {
  if (trusted.traversesUnreachableSymlink) {
    throw new Error('Symbolic link target is unreachable')
  }
}

// 按路径逐段解析。配置根内出现的符号链接视为用户显式暴露的入口，
// 其目标目录/文件也会加入本次访问的允许根集合。
async function resolveTrustedPath(base: string, targetPath: string): Promise<TrustedPathResult> {
  // 配置根本身可能是符号链接：边界判断必须对词法根进行，
  // 这样 aria2 返回的词法绝对路径仍可从词法根逐段解析。
  const lexicalBase = path.resolve(base)
  const realBase = await fs.realpath(lexicalBase)
  const lexicalPath = path.resolve(lexicalBase, targetPath)
  if (!isWithinBase(lexicalPath, lexicalBase)) {
    throw new Error('Path is outside the allowed directory')
  }

  const relativePart = lexicalPath === lexicalBase
    ? ''
    : lexicalPath.slice(lexicalBase.endsWith(path.sep) ? lexicalBase.length : lexicalBase.length + path.sep.length)
  const relativeSegments = relativePart === '' ? [] : relativePart.split(path.sep)
  const allowedRealRoots: AllowedRealRoot[] = [
    { path: realBase, type: await resolveRealRootType(realBase) }
  ]
  let currentPath = realBase
  let unreachableSymlinkIndex: number | null = null
  let finalIsSymlink = false

  for (let index = 0; index < relativeSegments.length; index++) {
    const segment = relativeSegments[index]
    const nextPath = path.join(currentPath, segment)

    if (unreachableSymlinkIndex !== null) {
      // 已位于不可达链接之下，后续组件无法解析；保留词法位置供统一拒绝。
      currentPath = nextPath
      finalIsSymlink = false
      continue
    }

    try {
      const stats = await fs.lstat(nextPath)
      if (stats.isSymbolicLink()) {
        finalIsSymlink = true
        try {
          const targetRealPath = await fs.realpath(nextPath)
          allowedRealRoots.push({
            path: targetRealPath,
            type: await resolveRealRootType(targetRealPath)
          })
          currentPath = targetRealPath
        } catch (error) {
          const err = error as FsErrnoException
          if (!isUnreachableSymlinkCode(err.code)) throw error
          // 损坏/循环/无权限链接的目标不可信；只有链接本身可被删除或重命名。
          unreachableSymlinkIndex = index
          currentPath = nextPath
        }
      } else {
        finalIsSymlink = false
        currentPath = await fs.realpath(nextPath).catch(() => nextPath)
      }
    } catch (error) {
      const err = error as FsErrnoException
      if (err.code !== 'ENOENT') throw error
      // 上传/新建目录时最终路径可能尚不存在；只要已存在前缀可信即可。
      // ENOTDIR 表示已存在前缀中出现文件组件，路径语义无效，必须拒绝。
      currentPath = nextPath
      finalIsSymlink = false
    }
  }

  return {
    lexicalPath,
    realPath: currentPath,
    allowedRealRoots,
    finalUnreachableSymlink: unreachableSymlinkIndex === relativeSegments.length - 1,
    traversesUnreachableSymlink:
      unreachableSymlinkIndex !== null && unreachableSymlinkIndex < relativeSegments.length - 1,
    finalIsSymlink
  }
}

// 路径安全检查：词法路径必须落在配置根内；真实路径可以经过
// 配置根内显式存在的符号链接入口，但不能凭空穿越到其它外部路径。
async function resolveSafePath(base: string, relative: string): Promise<TrustedPathResult> {
  const normalizedRelative = normalizeRelativePath(relative)
  if (normalizedRelative === null) throw new Error('Invalid relative path')

  const trusted = await resolveTrustedPath(base, normalizedRelative)
  const isAllowed = isWithinAllowedRoots(trusted.realPath, trusted.allowedRealRoots)
  if (!isAllowed) {
    throw new Error('Path is outside the allowed directory')
  }

  return trusted
}

// 保留词法路径，便于删除/重命名符号链接本身；读取操作会按入口继续解析。
async function safePath(base: string, relative: string): Promise<string> {
  return (await resolveSafePath(base, relative)).lexicalPath
}

// 获取所有允许的根目录列表（统一路径权限检查的基础）。
// 配置根可能是符号链接，词法根与其真实目标指向同一目录，需同时纳入。
async function getAllowedRoots(): Promise<string[]> {
  const config = getFinalConfig()
  // 空值会被 path.resolve 解释为进程工作目录，必须过滤，避免暴露范围意外扩大
  const lexicalRoots = [config.downloadDir, config.aria2HostDir || config.downloadDir]
    .map(root => path.normalize(root))
    .filter(root => path.isAbsolute(root))
    .filter((root, index, roots) =>
      roots.findIndex(existing => isSamePathText(existing, root)) === index
    )

  const roots: string[] = []
  for (const lexicalRoot of lexicalRoots) {
    if (!roots.some(existing => isSamePathText(existing, lexicalRoot))) {
      roots.push(lexicalRoot)
    }
    const realRoot = await fs.realpath(lexicalRoot).catch(() => null)
    if (
      realRoot !== null &&
      !roots.some(existing => isSamePathText(existing, realRoot))
    ) {
      roots.push(realRoot)
    }
  }
  return roots
}

// 遍历配置根，返回第一个通过词法解析与动态允许根检查的结果
async function resolveAllowedEntry(fullPath: string): Promise<TrustedPathResult | null> {
  for (const root of await getAllowedRoots()) {
    try {
      const trusted = await resolveTrustedPath(root, fullPath)
      if (isWithinAllowedRoots(trusted.realPath, trusted.allowedRealRoots)) {
        return trusted
      }
    } catch (error) {
      continue
    }
  }
  return null
}

// 检查绝对路径是否在允许的目录范围内；符号链接入口按解析后的目标判断
async function isPathAllowed(fullPath: string): Promise<boolean> {
  if (typeof fullPath !== 'string' || !path.isAbsolute(fullPath)) return false
  return (await resolveAllowedEntry(fullPath)) !== null
}

// 格式化文件系统错误
function formatFsError(err: FsErrnoException): string {
  if (
    err.message === 'Invalid relative path' ||
    err.message === 'Path is outside the allowed directory' ||
    err.message === 'Symbolic link target is unreachable'
  ) {
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
      const trusted = await resolveSafePath(baseDir, dirPath)
      assertReachableSymlinkPath(trusted)
      // 读取使用同一次验证得到的真实路径，避免校验后路径组件被替换
      const fullPath = trusted.realPath
      const files = await fs.readdir(fullPath, { withFileTypes: true })

      // lstat 读取条目自身属性；目标可达性单独探测，单个坏条目不影响整个列表
      type FileListEntry = FileListResult['files'][number]
      const fileList = (
        await Promise.all(files.map(async (file): Promise<FileListEntry | null> => {
          const filePath = path.join(fullPath, file.name)
          try {
            const lstats = await fs.lstat(filePath)
            const isSymlink = lstats.isSymbolicLink()
            let isDir = lstats.isDirectory()
            let targetExists = true

            if (isSymlink) {
              try {
                const targetStats = await fs.stat(filePath)
                isDir = targetStats.isDirectory()
              } catch {
                targetExists = false
                isDir = false
              }
            }

            return {
              name: file.name,
              path: path.join(normalizeRelativePath(dirPath) ?? '', file.name),
              size: lstats.size,
              mtime: lstats.mtime.toISOString(),
              isDir,
              isSymlink,
              targetPath: null,
              targetExists
            }
          } catch {
            // 单个条目自身无法读取时跳过，其余条目仍正常返回
            return null
          }
        }))
      ).filter((entry): entry is FileListEntry => entry !== null)

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
    // 下载根（词法或真实形式）容纳全部任务文件，绝不允许通过删除接口移除；
    // 检查必须先于 lstat 分支，词法根本身是符号链接时 unlink 同样危险
    const normalizedEntry = path.normalize(fullPath)
    const entryRealPath = await fs.realpath(fullPath).catch(() => normalizedEntry)
    const allowedRoots = await getAllowedRoots()
    if (
      allowedRoots.some(root =>
        isSamePathText(root, normalizedEntry) || isSamePathText(root, entryRealPath)
      )
    ) {
      console.error(`[FileService] Delete blocked: refusing to remove the download root: ${fullPath}`)
      return { success: false, message: 'Cannot delete the download root directory' }
    }
    try {
      const lstats = await fs.lstat(fullPath)
      if (lstats.isSymbolicLink()) {
        // unlink 不会解引用符号链接，词法路径确保只删除链接本身
        await fs.unlink(fullPath)
      } else {
        // 递归删除前重新解析真实路径，并用同一词法入口解析出的
        // 动态允许根（含链接目标）复核，缩小校验与删除之间的竞态窗口
        const realPath = await fs.realpath(fullPath)
        const trusted = await resolveAllowedEntry(fullPath)
        if (!trusted || !isWithinAllowedRoots(realPath, trusted.allowedRealRoots)) {
          console.error(`[FileService] Delete blocked: path moved outside allowed roots: ${fullPath}`)
          return { success: false, message: 'Path is outside the allowed directory' }
        }
        await fs.rm(realPath, { recursive: true })
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
    try {
      const fullPath = await safePath(getDownloadDir(), relativePath)
      return await this.deleteByAbsolutePath(fullPath)
    } catch (error) {
      const err = error as FsErrnoException
      const message = formatFsError(err)
      console.error(`[FileService] Delete failed: ${relativePath} - ${message}`)
      return { success: false, message }
    }
  }

  // 区分路径不存在与无法判定（例如权限错误），供删除确认做保守决策
  async checkPathExists(fullPath: string): Promise<{
    status: PathExistsStatus
    errorCode?: string
  }> {
    try {
      await fs.access(fullPath)
      return { status: 'exists' }
    } catch (error) {
      const err = error as FsErrnoException
      if (err.code === 'ENOENT') {
        return { status: 'missing' }
      }
      return { status: 'unknown', errorCode: err.code }
    }
  }

  // 创建目录
  async createDirectory(dirPath: string): Promise<FileOperationResult> {
    try {
      const trusted = await resolveSafePath(getDownloadDir(), dirPath)
      assertReachableSymlinkPath(trusted)
      await fs.mkdir(trusted.realPath, { recursive: true })
      console.log(`[FileService] Created directory: ${trusted.realPath}`)
      return { success: true }
    } catch (error) {
      const err = error as FsErrnoException
      const message = formatFsError(err)
      console.error(`[FileService] Create directory failed: ${dirPath} - ${message}`)
      return { success: false, message }
    }
  }

  // 重命名
  async renameFile(oldPath: string, newPath: string): Promise<FileOperationResult> {
    try {
      const oldTrusted = await resolveSafePath(getDownloadDir(), oldPath)
      assertNotTraversingUnreachableSymlink(oldTrusted)
      const newTrusted = await resolveSafePath(getDownloadDir(), newPath)
      assertReachableSymlinkPath(newTrusted)
      // 源为符号链接时保留词法路径：rename 不解引用源链接，只重命名链接本身
      const sourcePath = oldTrusted.finalIsSymlink ? oldTrusted.lexicalPath : oldTrusted.realPath
      // 目标最终组件是有效符号链接时同样保留词法路径：rename 替换链接本身，
      // 不穿透覆盖链接目标；中间目录组件仍使用已验证的真实路径
      const destPath = newTrusted.finalIsSymlink ? newTrusted.lexicalPath : newTrusted.realPath
      await fs.rename(sourcePath, destPath)
      console.log(`[FileService] Renamed: ${sourcePath} -> ${destPath}`)
      return { success: true }
    } catch (error) {
      const err = error as FsErrnoException
      const message = formatFsError(err)
      console.error(`[FileService] Rename failed: ${oldPath} -> ${newPath} - ${message}`)
      return { success: false, message }
    }
  }

  // 上传文件
  async uploadFile(relativePath: string, data: Buffer): Promise<FileOperationResult> {
    try {
      const trusted = await resolveSafePath(getDownloadDir(), relativePath)
      assertReachableSymlinkPath(trusted)
      await fs.mkdir(path.dirname(trusted.realPath), { recursive: true })
      await fs.writeFile(trusted.realPath, data)
      console.log(`[FileService] Uploaded: ${trusted.realPath}`)
      return { success: true }
    } catch (error) {
      const err = error as FsErrnoException
      const message = formatFsError(err)
      console.error(`[FileService] Upload failed: ${relativePath} - ${message}`)
      return { success: false, message }
    }
  }

  // 获取文件绝对路径（供下载等场景使用，含安全检查）
  async getFullPath(relativePath: string): Promise<string> {
    const trusted = await resolveSafePath(getDownloadDir(), relativePath)
    assertReachableSymlinkPath(trusted)
    return trusted.realPath
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
    if (aria2DownloadDir && isPathWithinPrefix(aria2Path, aria2DownloadDir)) {
      const normalizedDir = removeTrailingSeparators(path.normalize(aria2DownloadDir))
      const normalizedPath = path.normalize(aria2Path)
      // 根前缀（'/' 或 'C:\\'）已以分隔符结尾，切片时无需再跳过一个分隔符
      const separatorLength = normalizedDir.endsWith(path.sep) ? 0 : 1
      const relativePath = normalizedPath === normalizedDir
        ? ''
        : normalizedPath.slice(normalizedDir.length + separatorLength)
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
