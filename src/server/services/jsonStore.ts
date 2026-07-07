/**
 * 通用 JSON 文件读写工具
 *
 * 提供带容错的读取和原子写入，作为项目内所有 JSON 持久化（任务元数据、
 * 未来其他增强数据）的基础设施。
 */
import * as fs from 'fs'
import * as path from 'path'

/**
 * 读取 JSON 文件并解析。
 * 文件不存在或解析失败时返回 fallback，不抛出异常。
 */
export function readJsonSync<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) {
    return fallback
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T
  } catch (error) {
    console.error(`[jsonStore] Failed to read/parse ${filePath}:`, (error as Error).message)
    return fallback
  }
}

/**
 * 原子写入 JSON 文件。
 * 先写入同目录下的临时文件，再 rename 覆盖目标文件，
 * 避免写到一半进程崩溃导致文件损坏。
 */
export function writeJsonAtomicSync(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const tmpPath = filePath + '.tmp'
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8')
  fs.renameSync(tmpPath, filePath)
}
