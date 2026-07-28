// 压缩包读取服务 — 基于 adm-zip，利用 zip 中央目录按需读取单个条目
// 仅做"读取/预览"，不做解压整包；供 fileController 的 zip 预览接口使用
import AdmZip from 'adm-zip'
import { FileItem } from '../../shared/types/file'
import { isTextFile, isImageFile } from '../../shared/utils/fileTypes'

// 单个条目预览大小上限：超出则拒绝，避免一次性解压占满内存
export const ZIP_ENTRY_MAX_SIZE = 50 * 1024 * 1024 // 50 MB

// —— 中文文件名修复 ——
// Windows 下用资源管理器/WniRAR 等打包的中文 zip，文件名是 GBK 编码且未声明 UTF-8 标志，
// adm-zip 默认强制按 UTF-8 解码会乱码。这里通过自定义 decoder 拿到原始字节，
// 先尝试 UTF-8（合法则用，兼容 UTF-8 中文 zip），失败再回退 GBK。
let gbkDecoder: InstanceType<typeof TextDecoder> | null = null
try {
  gbkDecoder = new TextDecoder('gbk') // 需要全 ICU 构建；缺失则降级
} catch {
  gbkDecoder = null
}

function smartDecode(buf: Buffer): string {
  // 1. 尝试严格 UTF-8 解码：合法则直接采用
  try {
    return new TextDecoder('utf8', { fatal: true }).decode(buf)
  } catch {
    // 不是合法 UTF-8（典型如 GBK 字节）
  }
  // 2. 回退 GBK
  if (gbkDecoder) {
    try {
      return gbkDecoder.decode(buf)
    } catch {
      // GBK 解码也失败则继续降级
    }
  }
  // 3. 最终降级（可能含替换字符 U+FFFD）
  return buf.toString('utf8')
}

const zipDecoder = {
  efs: true,
  encode: (data: string) => Buffer.from(data, 'utf8'),
  decode: (data: Uint8Array | Buffer) => smartDecode(Buffer.from(data))
}

function openZip(zipPath: string): AdmZip {
  return new AdmZip(zipPath, { decoder: zipDecoder })
}

// 判定 zip 内条目的预览类型（与前端 FilePreview 共用 fileTypes 列表，避免漂移）
export type ZipEntryType = 'text' | 'image' | 'unsupported'
export function getEntryType(entryName: string): ZipEntryType {
  if (isTextFile(entryName)) return 'text'
  if (isImageFile(entryName)) return 'image'
  return 'unsupported'
}

// 图片扩展名 → MIME
function getImageMime(ext: string): string {
  switch (ext) {
    case 'jpg':
    case 'jpeg': return 'image/jpeg'
    case 'png': return 'image/png'
    case 'gif': return 'image/gif'
    case 'bmp': return 'image/bmp'
    case 'webp': return 'image/webp'
    case 'svg': return 'image/svg+xml'
    case 'ico': return 'image/x-icon'
    default: return 'application/octet-stream'
  }
}

export interface ZipEntryContent {
  buffer: Buffer
  size: number
  type: ZipEntryType
  mime: string
  name: string
}

// macOS 打包产生的垃圾条目，列表时过滤
function isJunkEntry(entryName: string): boolean {
  const segs = entryName.split('/')
  return segs.some(s => s === '__MACOSX' || s === '.DS_Store')
}

class ZipService {
  // 列出 zip 内指定子目录下的一级条目（目录 + 文件），结构同 FileListResult
  listEntries(zipPath: string, dirInput: string): { files: FileItem[]; error: string | null } {
    const dir = dirInput.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
    let zip: AdmZip
    try {
      zip = openZip(zipPath)
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error(`[ZipService] Failed to open zip: ${zipPath} - ${msg}`)
      return { files: [], error: '无法打开压缩包，文件可能已损坏或不是有效的 zip' }
    }

    const dirMap = new Map<string, FileItem>()
    const fileList: FileItem[] = []

    for (const entry of zip.getEntries()) {
      let name = entry.entryName.replace(/\\/g, '/')
      if (isJunkEntry(name)) continue
      const isDirEntry = entry.isDirectory || name.endsWith('/')
      if (name.endsWith('/')) name = name.slice(0, -1)

      // 计算相对 dir 的路径
      let rel: string
      if (dir) {
        if (name === dir) continue
        if (!name.startsWith(dir + '/')) continue
        rel = name.slice(dir.length + 1)
      } else {
        rel = name
      }
      if (!rel) continue

      const slashIdx = rel.indexOf('/')
      if (slashIdx === -1) {
        // 直接子项
        if (isDirEntry) {
          if (!dirMap.has(rel)) {
            dirMap.set(rel, {
              name: rel,
              path: dir ? `${dir}/${rel}` : rel,
              size: 0,
              mtime: '',
              isDir: true,
              isSymlink: false,
              targetPath: null,
              targetExists: true
            })
          }
        } else {
          fileList.push({
            name: rel,
            path: name,
            size: entry.header.size,
            mtime: safeIso(entry.header.time),
            isDir: false,
            isSymlink: false,
            targetPath: null,
            targetExists: true
          })
        }
      } else {
        // 更深层 → 第一段为子目录
        const firstSeg = rel.slice(0, slashIdx)
        if (firstSeg && !dirMap.has(firstSeg)) {
          dirMap.set(firstSeg, {
            name: firstSeg,
            path: dir ? `${dir}/${firstSeg}` : firstSeg,
            size: 0,
            mtime: '',
            isDir: true,
            isSymlink: false,
            targetPath: null,
            targetExists: true
          })
        }
      }
    }

    const dirs = Array.from(dirMap.values())
    const files = [...dirs, ...fileList]
    return { files, error: null }
  }

  // 读取单个条目内容用于预览（文本/图片）
  readEntry(zipPath: string, entryName: string): ZipEntryContent {
    const type = getEntryType(entryName)
    if (type === 'unsupported') {
      throw new Error('该类型暂不支持在线预览，请下载后查看')
    }

    let zip: AdmZip
    try {
      zip = openZip(zipPath)
    } catch (error) {
      console.error(`[ZipService] Failed to open zip: ${zipPath}`, error)
      throw new Error('无法打开压缩包')
    }

    const entry = zip.getEntry(entryName)
    if (!entry || entry.isDirectory) {
      throw new Error('压缩包内未找到该文件')
    }

    const size = entry.header.size
    if (size > ZIP_ENTRY_MAX_SIZE) {
      throw new Error('文件过大，暂不支持在线预览，请下载后查看')
    }

    let buffer: Buffer
    try {
      buffer = entry.getData()
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.error(`[ZipService] Failed to read entry: ${entryName}`, error)
      if (/password|encrypt|decrypt/i.test(msg)) {
        throw new Error('该压缩包已加密，暂不支持在线预览')
      }
      throw new Error('读取压缩包内文件失败')
    }

    const ext = entryName.split('.').pop()?.toLowerCase() || ''
    const mime = type === 'text' ? 'text/plain; charset=utf-8' : getImageMime(ext)

    return { buffer, size, type, mime, name: entryName }
  }
}

// adm-zip 的 header.time 可能是 Date/string/undefined，统一转 ISO 字符串
function safeIso(time: unknown): string {
  if (!time) return ''
  try {
    return new Date(time as string | number | Date).toISOString()
  } catch {
    return ''
  }
}

export default new ZipService()
