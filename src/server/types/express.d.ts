/**
 * Express 类型扩展
 */

// 上传文件类型
interface UploadedFile {
  name: string
  data: Buffer
  size: number
  encoding: string
  tempFilePath: string
  truncated: boolean
  mimetype: string
  md5: string
  mv: ((path: string, callback: (err: Error | null) => void) => void) & ((path: string) => Promise<void>)
  originalFilename?: string
}

// 用于模块声明合并
declare global {
  namespace Express {
    interface Request {
      files?: {
        [key: string]: UploadedFile | UploadedFile[]
      }
    }
  }
}

export {}
