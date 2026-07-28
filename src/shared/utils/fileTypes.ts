/**
 * 可在线预览的文件扩展名（服务端 zip 预览与前端 FilePreview 共用的权威列表）
 *
 * 抽到 shared 是为了避免两端各维护一份导致漂移：
 * 服务端判定某类型可预览、前端却显示「不支持」。
 */
export const TEXT_EXTENSIONS: readonly string[] = [
  'txt', 'md', 'markdown', 'json', 'xml', 'html', 'htm', 'css', 'js', 'ts',
  'vue', 'py', 'java', 'cpp', 'c', 'h', 'hpp', 'log', 'csv', 'yaml', 'yml',
  'ini', 'conf', 'sh', 'bat', 'sql', 'srt', 'ass', 'go', 'rs', 'rb', 'php'
]

export const IMAGE_EXTENSIONS: readonly string[] = [
  'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico'
]

// 取文件扩展名（小写，无扩展名返回空串）
export function getExtension(name: string): string {
  return name.split('.').pop()?.toLowerCase() || ''
}

export function isTextFile(name: string): boolean {
  return TEXT_EXTENSIONS.includes(getExtension(name))
}

export function isImageFile(name: string): boolean {
  return IMAGE_EXTENSIONS.includes(getExtension(name))
}
