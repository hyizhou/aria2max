/**
 * 文件管理相关类型定义
 */

// 文件项信息
export interface FileItem {
  name: string
  path: string
  size: number
  mtime: string
  isDir: boolean
  isSymlink: boolean
  targetPath?: string | null
  targetExists: boolean
}

// 文件列表响应
export interface FileListResponse {
  files: FileItem[]
  error: string | null
}

// 创建目录请求
export interface CreateDirectoryRequest {
  path: string
}

// 重命名文件请求
export interface RenameFileRequest {
  oldPath: string
  newPath: string
}

// 删除文件请求
export interface DeleteFileRequest {
  path: string
}

// 文件操作响应
export interface FileOperationResponse {
  success: boolean
}

// 文件上传进度事件
export interface UploadProgressEvent {
  loaded: number
  total: number
  progress: number
}
