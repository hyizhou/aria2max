/**
 * 格式化字节数
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * 格式化字节数（固定两位小数，用0补齐）
 */
export function formatBytesFixed(bytes: number): string {
  if (bytes === 0) return '0.00 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
}

/**
 * 解析格式化的字节字符串为数值（如 "1.5 MB/s" -> 1572864）
 */
export function parseBytes(speedStr: string): number {
  const match = speedStr.match(/([\d.]+)\s*(B|KB|MB|GB|TB)/)
  if (!match) return 0

  const value = parseFloat(match[1])
  const unit = match[2]
  const units: Record<string, number> = { 'B': 1, 'KB': 1024, 'MB': 1024 * 1024, 'GB': 1024 * 1024 * 1024, 'TB': 1024 * 1024 * 1024 * 1024 }

  return value * (units[unit] || 1)
}

/**
 * 格式化时间戳为日期时间字符串（精度到分钟），如 "2026-07-07 14:30"
 */
export function formatDateTime(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * 格式化时长（毫秒）为紧凑字符串，如 "1时23分"、"5分30秒"、"45秒"。
 */
export function formatDuration(ms: number): string {
  if (!ms || ms < 0) return '0秒'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}时${m}分`
  if (m > 0) return `${m}分${s}秒`
  return `${s}秒`
}
