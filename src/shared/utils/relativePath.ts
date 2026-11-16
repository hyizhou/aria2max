// 相对路径规范化：文件管理前端路由、文件系统路径与 zip 内部路径共用
export function normalizeRelativePath(input: string): string | null {
  if (typeof input !== 'string' || input.includes('\\')) return null
  for (const character of input) {
    const code = character.codePointAt(0)
    if (code !== undefined && (code <= 0x1f || code === 0x7f)) return null
  }
  if (input.startsWith('/') || /^[a-zA-Z]:/.test(input)) return null

  const rawSegments = input.split('/')
  const segments = rawSegments.filter(segment => segment.length > 0)
  if (rawSegments.slice(0, -1).some(segment => segment.length === 0)) return null
  // 逐段拒绝相对定位保留段与盘符样式段（如 foo/C:/bar），避免跨平台语义歧义
  if (segments.some(segment => segment === '.' || segment === '..' || /^[a-zA-Z]:$/.test(segment))) return null

  return segments.join('/')
}
