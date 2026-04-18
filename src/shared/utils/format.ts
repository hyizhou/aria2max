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
