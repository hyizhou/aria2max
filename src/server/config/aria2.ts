// Aria2 RPC 配置和连接管理
import axios, { AxiosResponse } from 'axios'
import * as fs from 'fs'
import * as path from 'path'
import type {
  Aria2Task,
  Aria2TaskDetail,
  Aria2SystemStatus,
  Aria2GlobalOptions,
  Aria2ConnectionTestResult,
  Aria2ConnectionStatus,
  Aria2RpcResponse,
  Aria2File
} from '@shared/types'

// 默认配置值
const defaultConfig = {
  aria2RpcUrl: 'http://localhost:6800/jsonrpc',
  aria2RpcSecret: '',
  downloadDir: '/downloads',
  aria2ConfigPath: '',
  autoDeleteMetadata: false,
  autoDeleteAria2FilesOnRemove: false,
  autoDeleteAria2FilesOnSchedule: false
}

// 配置类型
interface Aria2Config {
  aria2RpcUrl: string
  aria2RpcSecret: string
  downloadDir: string
  aria2ConfigPath: string
  autoDeleteMetadata: boolean
  autoDeleteAria2FilesOnRemove: boolean
  autoDeleteAria2FilesOnSchedule: boolean
}

// 配置文件路径
const configPath = path.join(__dirname, '../config.json')

// 动态加载配置文件的函数
function loadConfigFile(): Partial<Aria2Config> {
  if (fs.existsSync(configPath)) {
    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'))
    } catch (error) {
      const err = error as Error
      console.error('Failed to parse config.json, using default config:', err.message)
      return {}
    }
  }
  return {}
}

// 配置优先级逻辑：只从config.json文件读取配置，不使用环境变量
function getFinalConfig(): Aria2Config {
  const configFile = loadConfigFile()
  return {
    aria2RpcUrl: configFile.aria2RpcUrl || defaultConfig.aria2RpcUrl,
    aria2RpcSecret: configFile.aria2RpcSecret || defaultConfig.aria2RpcSecret,
    downloadDir: configFile.downloadDir || defaultConfig.downloadDir,
    aria2ConfigPath: configFile.aria2ConfigPath !== undefined ?
      configFile.aria2ConfigPath : defaultConfig.aria2ConfigPath,
    autoDeleteMetadata: configFile.autoDeleteMetadata !== undefined ?
      configFile.autoDeleteMetadata : defaultConfig.autoDeleteMetadata,
    autoDeleteAria2FilesOnRemove: configFile.autoDeleteAria2FilesOnRemove !== undefined ?
      configFile.autoDeleteAria2FilesOnRemove : defaultConfig.autoDeleteAria2FilesOnRemove,
    autoDeleteAria2FilesOnSchedule: configFile.autoDeleteAria2FilesOnSchedule !== undefined ?
      configFile.autoDeleteAria2FilesOnSchedule : defaultConfig.autoDeleteAria2FilesOnSchedule
  }
}

// 如果config.json不存在，创建一个默认的
if (!fs.existsSync(configPath)) {
  const configDir = path.dirname(configPath)
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true })
  }
  fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2))
}

class Aria2Client {
  constructor() {
    // 使用getter方法动态获取配置值，确保配置更新后能生效
  }

  // 使用getter方法动态获取配置值
  get rpcUrl(): string {
    return getFinalConfig().aria2RpcUrl
  }

  get rpcSecret(): string {
    return getFinalConfig().aria2RpcSecret
  }

  get downloadDir(): string {
    return getFinalConfig().downloadDir
  }

  // 检查Aria2连接状态
  async checkConnection(): Promise<Aria2ConnectionStatus> {
    try {
      console.log('[Aria2] Testing connection to Aria2...')
      await this.sendRequest('aria2.getVersion')
      return { connected: true, message: 'Aria2连接正常' }
    } catch (error) {
      const err = error as Error
      console.error('[Aria2] Connection test failed:', err.message)
      return { connected: false, message: `Aria2连接失败: ${err.message}` }
    }
  }

  // 测试连接方法（用于系统设置中的测试连接功能）
  async testConnection(config?: Partial<Aria2Config>): Promise<Aria2ConnectionTestResult> {
    try {
      console.log('[Aria2] Testing Aria2 RPC connection...')

      const testRpcUrl = config?.aria2RpcUrl || this.rpcUrl
      const testRpcSecret = config?.aria2RpcSecret || this.rpcSecret

      const versionResult = await this.sendRequestWithConfig('aria2.getVersion', [], testRpcUrl, testRpcSecret)
      console.log('[Aria2] Version check successful:', versionResult.result)

      const globalOptions = await this.getGlobalOptionsWithConfig(testRpcUrl, testRpcSecret)
      console.log('[Aria2] Global options retrieved successfully')

      return {
        success: true,
        message: 'Aria2 连接测试成功',
        details: {
          version: (versionResult.result as { version: string }).version,
          rpcUrl: testRpcUrl,
          hasSecret: !!testRpcSecret,
          globalOptions: globalOptions
        }
      }
    } catch (error) {
      const err = error as Error
      console.error('[Aria2] Connection test failed:', error)

      let errorDetails = err.message
      if (err.message.includes('Unauthorized')) {
        errorDetails = 'RPC密钥认证失败，请检查RPC密钥是否正确'
      } else if (err.message.includes('ECONNREFUSED')) {
        errorDetails = '无法连接到Aria2服务，请确保Aria2正在运行'
      } else if (err.message.includes('ENOTFOUND')) {
        errorDetails = '无法解析Aria2服务地址，请检查RPC URL配置'
      }

      return {
        success: false,
        message: errorDetails,
        details: {
          error: err.message,
          rpcUrl: config?.aria2RpcUrl || this.rpcUrl,
          hasSecret: !!(config?.aria2RpcSecret || this.rpcSecret),
          secretLength: (config?.aria2RpcSecret || this.rpcSecret) ? (config?.aria2RpcSecret || this.rpcSecret).length : 0
        }
      }
    }
  }

  // 发送 RPC 请求
  async sendRequest<T = unknown>(method: string, params: unknown[] = [], retryCount = 0): Promise<Aria2RpcResponse<T>> {
    return this.sendRequestWithConfig(method, params, this.rpcUrl, this.rpcSecret, retryCount)
  }

  // 发送 RPC 请求（使用指定配置）
  async sendRequestWithConfig<T = unknown>(
    method: string,
    params: unknown[] = [],
    rpcUrl: string,
    rpcSecret: string,
    retryCount = 0
  ): Promise<Aria2RpcResponse<T>> {
    const maxRetries = 3
    const retryDelay = 1000

    try {
      const requestParams = [...params]
      if (rpcSecret) {
        const authToken = `token:${rpcSecret}`
        requestParams.unshift(authToken)
      }

      const response: AxiosResponse<Aria2RpcResponse<T>> = await axios.post(rpcUrl, {
        jsonrpc: '2.0',
        id: 'aria-max',
        method: method,
        params: requestParams
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      })

      return response.data
    } catch (error) {
      const axiosError = error as { response?: { status: number; data?: { error?: { message: string } } }; request?: unknown; message: string }
      if (axiosError.response) {
        const errorMessage = axiosError.response.data && axiosError.response.data.error ?
          axiosError.response.data.error.message : axiosError.message
        console.error(`[Aria2 RPC] Request failed (${axiosError.response.status}): ${errorMessage}`)
        console.error(`[Aria2 RPC] Error response data:`, axiosError.response.data)

        if (rpcSecret) {
          console.error(`[Aria2 RPC] Configured RPC secret length: ${rpcSecret.length}`)
          console.error(`[Aria2 RPC] Token format: token:${rpcSecret.substring(0, 2)}***`)
        }

        throw new Error(`Aria2 RPC request failed (${axiosError.response.status}): ${errorMessage}`)
      } else if (axiosError.request) {
        console.error(`[Aria2 RPC] Network error: ${axiosError.message}`)
        console.error(`[Aria2 RPC] Make sure Aria2 is running at: ${rpcUrl}`)

        if (retryCount < maxRetries) {
          console.log(`[Aria2 RPC] Retrying ${method} request (${retryCount + 1}/${maxRetries}) in ${retryDelay}ms...`)
          await new Promise(resolve => setTimeout(resolve, retryDelay))
          return this.sendRequestWithConfig(method, params.slice(rpcSecret ? 1 : 0), rpcUrl, rpcSecret, retryCount + 1)
        } else {
          console.error(`[Aria2 RPC] Max retries exceeded for ${method}`)
          throw new Error(`Aria2 RPC network error: ${axiosError.message}`)
        }
      } else {
        console.error(`[Aria2 RPC] Request failed: ${axiosError.message}`)
        throw new Error(`Aria2 RPC request failed: ${axiosError.message}`)
      }
    }
  }

  // 获取 Aria2 全局选项
  async getGlobalOptions(): Promise<Aria2GlobalOptions | null> {
    return this.getGlobalOptionsWithConfig(this.rpcUrl, this.rpcSecret)
  }

  // 获取 Aria2 全局选项（使用指定配置）
  async getGlobalOptionsWithConfig(rpcUrl: string, rpcSecret: string): Promise<Aria2GlobalOptions | null> {
    try {
      const response = await this.sendRequestWithConfig<Aria2GlobalOptions>('aria2.getGlobalOption', [], rpcUrl, rpcSecret)
      return response.result || null
    } catch (error) {
      const err = error as Error
      console.error('Failed to get global options:', err.message)
      return null
    }
  }

  // 获取下载任务列表
  async getTasks(): Promise<Aria2Task[]> {
    try {
      const activeResponse = await this.sendRequest<Aria2Task[]>('aria2.tellActive')
      const waitingResponse = await this.sendRequest<Aria2Task[]>('aria2.tellWaiting', [0, 1000])
      const stoppedResponse = await this.sendRequest<Aria2Task[]>('aria2.tellStopped', [0, 1000])

      const tasks = [
        ...(activeResponse.result || []),
        ...(waitingResponse.result || []),
        ...(stoppedResponse.result || [])
      ].map((task): Aria2Task => {
        const minimalTask: Aria2Task = {
          gid: task.gid,
          status: task.status,
          totalLength: task.totalLength || '0',
          completedLength: task.completedLength || '0',
          downloadSpeed: task.downloadSpeed || '0',
          uploadSpeed: task.uploadSpeed || '0',
          dir: task.dir || ''
        }

        if (task.bittorrent && task.bittorrent.info && task.bittorrent.info.name) {
          minimalTask.bittorrent = {
            info: {
              name: task.bittorrent.info.name
            }
          }
        }

        if (task.files && task.files.length > 0) {
          minimalTask.files = task.files.slice(0, 1).map((file): Aria2File => ({
            index: file.index,
            path: file.path || '',
            length: file.length || '0',
            completedLength: file.completedLength || '0',
            selected: file.selected !== undefined ? file.selected : 'true'
          }))
        } else {
          minimalTask.files = []
        }

        return minimalTask
      })

      return tasks
    } catch (error) {
      const err = error as Error
      console.error(`[Aria2 RPC] Failed to get tasks: ${err.message}`)
      return []
    }
  }

  // 获取任务详情
  async getTaskDetail(gid: string): Promise<Aria2TaskDetail> {
    try {
      const response = await this.sendRequest<Aria2TaskDetail>('aria2.tellStatus', [gid])
      const task = response.result as Aria2TaskDetail

      if (task.files && Array.isArray(task.files)) {
        task.files = task.files.map(file => ({
          ...file,
          size: parseInt(file.length) || 0,
          completed: parseInt(file.completedLength) || 0
        }))
      }

      if (task.status === 'active') {
        try {
          const peersResponse = await this.sendRequest<unknown[]>('aria2.getPeers', [gid])
          if (peersResponse.result && Array.isArray(peersResponse.result)) {
            task.peers = peersResponse.result.filter(peer => {
              if (!peer || typeof peer !== 'object') return false
              const keys = Object.keys(peer)
              if (keys.length === 0) return false
              return keys.some(key => (peer as Record<string, unknown>)[key] !== null && (peer as Record<string, unknown>)[key] !== undefined && (peer as Record<string, unknown>)[key] !== '')
            }) as Aria2TaskDetail['peers']
          } else {
            task.peers = []
          }
        } catch (error) {
          const err = error as Error
          console.log(`[Aria2] Connection data not available for task ${gid}:`, err.message)
          task.peers = []
        }
      } else {
        task.peers = []
      }

      return task
    } catch (error) {
      const err = error as Error
      console.error(`[Aria2] Failed to get task detail for ${gid}:`, err.message)
      throw error
    }
  }

  // 添加下载任务 (URI)
  async addTask(uri: string | string[], options: Record<string, string | number> = {}): Promise<string> {
    const uris = Array.isArray(uri) ? uri : [uri]
    const params: unknown[] = [uris]

    const processedOptions: Record<string, string> = {}

    if (uris.some(u => u && u.startsWith('magnet:'))) {
      delete options['bt-metadata-only']
      delete options['bt-save-metadata']
    }

    Object.keys(options).forEach(key => {
      const value = options[key]
      if (value !== '' && value !== undefined && value !== null) {
        if (typeof value === 'number') {
          processedOptions[key] = value.toString()
        } else {
          processedOptions[key] = value
        }
      }
    })

    if (Object.keys(processedOptions).length > 0) {
      params.push(processedOptions)
    }

    const response = await this.sendRequest<string>('aria2.addUri', params)
    return response.result as string
  }

  // 添加种子文件任务
  async addTorrent(torrentData: string, options: Record<string, string | number> = {}): Promise<string> {
    const params: unknown[] = [torrentData, []]

    const defaultOptions = {
      dir: this.downloadDir
    }

    const processedOptions: Record<string, string> = { ...defaultOptions }

    Object.keys(options).forEach(key => {
      const value = options[key]
      if (value !== '' && value !== undefined && value !== null) {
        if (typeof value === 'number') {
          processedOptions[key] = value.toString()
        } else {
          processedOptions[key] = value
        }
      }
    })

    if (Object.keys(processedOptions).length > 0) {
      params.push(processedOptions)
    }

    const response = await this.sendRequest<string>('aria2.addTorrent', params)
    return response.result as string
  }

  // 添加Metalink文件任务
  async addMetalink(metalinkData: string, options: Record<string, string | number> = {}): Promise<string> {
    const params: unknown[] = [metalinkData]

    const defaultOptions = {
      dir: this.downloadDir
    }

    const processedOptions: Record<string, string> = { ...defaultOptions }

    Object.keys(options).forEach(key => {
      const value = options[key]
      if (value !== '' && value !== undefined && value !== null) {
        if (typeof value === 'number') {
          processedOptions[key] = value.toString()
        } else {
          processedOptions[key] = value
        }
      }
    })

    if (Object.keys(processedOptions).length > 0) {
      params.push(processedOptions)
    }

    const response = await this.sendRequest<string>('aria2.addMetalink', params)
    return response.result as string
  }

  // 暂停任务
  async pauseTask(gid: string): Promise<string> {
    const response = await this.sendRequest<string>('aria2.pause', [gid])
    return response.result as string
  }

  // 继续任务
  async resumeTask(gid: string): Promise<string> {
    const response = await this.sendRequest<string>('aria2.unpause', [gid])
    return response.result as string
  }

  // 删除任务
  async removeTask(gid: string): Promise<boolean> {
    let taskDetails: Aria2TaskDetail | null = null
    try {
      try {
        const taskStatus = await this.sendRequest<Aria2TaskDetail>('aria2.tellStatus', [gid])
        taskDetails = taskStatus.result as Aria2TaskDetail
        console.log(`[Aria2 Remove] Task ${gid} status: ${taskDetails.status}`)
      } catch (_statusError) {
        console.log(`[Aria2 Remove] Cannot get task status for ${gid}, assuming it doesn't exist or already removed`)
        try {
          await this.sendRequest('aria2.removeDownloadResult', [gid])
          console.log(`[Aria2 Remove] Cleaned up download result for non-existent task ${gid}`)
        } catch (cleanupError) {
          console.log(`[Aria2 Remove] No cleanup needed for task ${gid}`)
        }
        return true
      }

      const status = taskDetails.status

      if (status === 'active') {
        console.log(`[Aria2 Remove] Removing active task ${gid}`)

        try {
          const pauseResponse = await this.sendRequest<string>('aria2.pause', [gid])
          console.log(`[Aria2 Remove] Paused task ${gid}, response:`, pauseResponse)
          await new Promise(resolve => setTimeout(resolve, 200))
        } catch (pauseError) {
          const err = pauseError as Error
          console.log(`[Aria2 Remove] Failed to pause task ${gid}: ${err.message}`)
        }

        try {
          const removeResponse = await this.sendRequest<string>('aria2.remove', [gid])
          console.log(`[Aria2 Remove] Marked active task ${gid} as removed, response:`, removeResponse)
        } catch (removeError) {
          const err = removeError as Error
          console.log(`[Aria2 Remove] Failed to mark active task ${gid} as removed: ${err.message}`)
          throw removeError
        }

        try {
          await this.removeDownloadResultWithRetry(gid)
        } catch (removeDownloadResultError) {
          const err = removeDownloadResultError as Error
          console.log(`[Aria2 Remove] Failed to completely remove active task ${gid}: ${err.message}`)
          throw removeDownloadResultError
        }
      } else if (status === 'waiting' || status === 'paused') {
        console.log(`[Aria2 Remove] Removing ${status} task ${gid}`)
        try {
          const removeResponse = await this.sendRequest<string>('aria2.remove', [gid])
          console.log(`[Aria2 Remove] Removed ${status} task ${gid}, response:`, removeResponse)
        } catch (removeError) {
          const err = removeError as Error
          console.log(`[Aria2 Remove] Failed to remove ${status} task ${gid}: ${err.message}`)
          throw removeError
        }
      } else {
        console.log(`[Aria2 Remove] Completely removing ${status} task ${gid}`)
        try {
          await this.removeDownloadResultWithRetry(gid)
        } catch (removeDownloadResultError) {
          const err = removeDownloadResultError as Error
          console.log(`[Aria2 Remove] Failed to completely remove ${status} task ${gid}: ${err.message}`)
          throw removeDownloadResultError
        }
      }

      await new Promise(resolve => setTimeout(resolve, 100))

      if (taskDetails) {
        await this.deleteTaskAria2File(taskDetails)
      }

      return true
    } catch (error) {
      const err = error as Error
      console.error(`[Aria2 Remove] Task ${gid} removal failed:`, err.message)
      throw error
    }
  }

  // 带重试机制的 removeDownloadResult 方法
  async removeDownloadResultWithRetry(gid: string, maxRetries = 3): Promise<Aria2RpcResponse<string>> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const removeDownloadResultResponse = await this.sendRequest<string>('aria2.removeDownloadResult', [gid])
        console.log(`[Aria2 Remove] Completely removed task ${gid}, response:`, removeDownloadResultResponse)
        return removeDownloadResultResponse
      } catch (error) {
        const err = error as Error
        console.log(`[Aria2 Remove] Failed to completely remove task ${gid} (attempt ${i + 1}/${maxRetries}): ${err.message}`)

        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 300 * (i + 1)))
        } else {
          throw error
        }
      }
    }
    throw new Error('Max retries exceeded')
  }

  // 获取 aria2 系统状态
  async getSystemStatus(): Promise<Aria2SystemStatus> {
    const versionResponse = await this.sendRequest<{ version: string; enabledFeatures: string[] }>('aria2.getVersion')
    const sessionResponse = await this.sendRequest<{ sessionId: string }>('aria2.getSessionInfo')

    return {
      version: (versionResponse.result as { version: string }).version,
      enabledFeatures: (versionResponse.result as { enabledFeatures: string[] }).enabledFeatures,
      sessionId: (sessionResponse.result as { sessionId: string }).sessionId
    }
  }

  // 获取文件列表
  async getFiles(dirPath = ''): Promise<{ files: unknown[]; error: string | null }> {
    const fsPromises = fs.promises

    try {
      const fullPath = path.join(this.downloadDir, dirPath)
      const files = await fsPromises.readdir(fullPath, { withFileTypes: true })

      const fileList = await Promise.all(files.map(async (file) => {
        const filePath = path.join(fullPath, file.name)
        const stats = await fsPromises.stat(filePath)
        const lstats = await fsPromises.lstat(filePath)

        const isSymlink = lstats.isSymbolicLink()

        let isDir = file.isDirectory()
        let targetPath: string | null = null
        let targetExists = true

        if (isSymlink) {
          try {
            targetPath = await fsPromises.readlink(filePath)
            const targetFullPath = path.resolve(path.dirname(filePath), targetPath)
            const targetStats = await fsPromises.stat(targetFullPath)
            isDir = targetStats.isDirectory()
          } catch {
            targetExists = false
          }
        }

        return {
          name: file.name,
          path: path.join(dirPath, file.name),
          size: stats.size,
          mtime: stats.mtime.toISOString(),
          isDir: isDir,
          isSymlink: isSymlink,
          targetPath: targetPath,
          targetExists: targetExists
        }
      }))

      return { files: fileList, error: null }
    } catch (error) {
      const err = error as Error
      const errorMessage = `Failed to read directory: ${this.downloadDir}. Error: ${err.message}`
      console.error(errorMessage)
      return { files: [], error: errorMessage }
    }
  }

  // 删除文件或目录
  async deleteFile(filePath: string): Promise<{ success: boolean }> {
    const fsPromises = fs.promises

    try {
      let fullPath = filePath

      const globalOptions = await this.getGlobalOptions()
      if (globalOptions && globalOptions.dir) {
        const aria2DownloadDir = globalOptions.dir

        if (!path.isAbsolute(filePath) || filePath.startsWith(aria2DownloadDir)) {
          let relativePath = filePath
          if (filePath.startsWith(aria2DownloadDir)) {
            relativePath = filePath.substring(aria2DownloadDir.length)
            if (relativePath.startsWith('/')) {
              relativePath = relativePath.substring(1)
            }
          }
          fullPath = path.join(this.downloadDir, relativePath)
        }
      } else {
        fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.downloadDir, filePath)
      }

      try {
        await fsPromises.access(fullPath)
      } catch (accessError) {
        const err = accessError as NodeJS.ErrnoException
        if (err.code === 'ENOENT') {
          console.log(`File not found, skipping deletion: ${fullPath}`)
          return { success: true }
        }
        throw accessError
      }

      const lstats = await fsPromises.lstat(fullPath)
      if (lstats.isSymbolicLink()) {
        await fsPromises.unlink(fullPath)
      } else {
        await fsPromises.rm(fullPath, { recursive: true, force: true })
      }

      return { success: true }
    } catch (error) {
      const err = error as Error
      console.error('Delete file error details:', {
        originalPath: filePath,
        error: err.message,
        stack: err.stack
      })
      throw new Error(`Failed to delete file: ${err.message}`)
    }
  }

  // 创建目录
  async createDirectory(dirPath: string): Promise<{ success: boolean }> {
    const fsPromises = fs.promises

    try {
      const fullPath = path.isAbsolute(dirPath) ? dirPath : path.join(this.downloadDir, dirPath)
      await fsPromises.mkdir(fullPath, { recursive: true })
      return { success: true }
    } catch (error) {
      const err = error as Error
      throw new Error(`Failed to create directory: ${err.message}`)
    }
  }

  // 重命名文件或目录
  async renameFile(oldPath: string, newPath: string): Promise<{ success: boolean }> {
    const fsPromises = fs.promises

    try {
      const oldFullPath = path.isAbsolute(oldPath) ? oldPath : path.join(this.downloadDir, oldPath)
      const newFullPath = path.isAbsolute(newPath) ? newPath : path.join(this.downloadDir, newPath)

      try {
        await fsPromises.access(newFullPath)
        throw new Error('Target path already exists')
      } catch (accessError) {
        const err = accessError as NodeJS.ErrnoException
        if (err.code !== 'ENOENT') {
          throw accessError
        }
      }

      await fsPromises.rename(oldFullPath, newFullPath)
      return { success: true }
    } catch (error) {
      const err = error as Error
      throw new Error(`Failed to rename file: ${err.message}`)
    }
  }

  // 测试文件是否存在
  async testFileExists(filePath: string): Promise<boolean> {
    const fsPromises = fs.promises

    try {
      let fullPath = filePath

      const globalOptions = await this.getGlobalOptions()
      if (globalOptions && globalOptions.dir) {
        const aria2DownloadDir = globalOptions.dir

        if (!path.isAbsolute(filePath) || filePath.startsWith(aria2DownloadDir)) {
          let relativePath = filePath
          if (filePath.startsWith(aria2DownloadDir)) {
            relativePath = filePath.substring(aria2DownloadDir.length)
            if (relativePath.startsWith('/')) {
              relativePath = relativePath.substring(1)
            }
          }
          fullPath = path.join(this.downloadDir, relativePath)
        }
      } else {
        fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.downloadDir, filePath)
      }

      await fsPromises.access(fullPath)
      return true
    } catch {
      throw new Error('File does not exist')
    }
  }

  // 自动删除元数据文件
  async autoDeleteMetadata(taskDetails: Aria2TaskDetail): Promise<void> {
    try {
      const autoDeleteEnabled = process.env.AUTO_DELETE_METADATA === 'true'
      if (!autoDeleteEnabled) {
        return
      }

      if (taskDetails.status !== 'complete') {
        return
      }

      const files = taskDetails.files || []
      if (files.length === 0) {
        return
      }

      const firstFile = files[0]
      const filePath = firstFile.path

      if (!filePath) {
        return
      }

      const fileDir = path.dirname(filePath)
      const fsPromises = fs.promises

      try {
        const dirFiles = await fsPromises.readdir(fileDir)

        const metadataExtensions = ['.torrent', '.metalink', '.meta4']
        const metadataFiles = dirFiles.filter(file => {
          return metadataExtensions.some(ext => file.toLowerCase().endsWith(ext))
        })

        for (const metadataFile of metadataFiles) {
          const fullMetadataPath = path.join(fileDir, metadataFile)
          try {
            await fsPromises.unlink(fullMetadataPath)
            console.log(`Deleted metadata file: ${fullMetadataPath}`)
          } catch (unlinkError) {
            const err = unlinkError as Error
            console.error(`Failed to delete metadata file ${fullMetadataPath}:`, err.message)
          }
        }
      } catch (dirError) {
        const err = dirError as Error
        console.error(`Failed to read directory ${fileDir}:`, err.message)
      }
    } catch (error) {
      const err = error as Error
      console.error('Error in autoDeleteMetadata:', err.message)
    }
  }

  // 删除任务对应的.aria2文件
  async deleteTaskAria2File(taskDetails: Aria2TaskDetail): Promise<void> {
    try {
      const autoDeleteEnabled = process.env.AUTO_DELETE_ARIA2_FILES_ON_REMOVE === 'true'
      if (!autoDeleteEnabled) {
        return
      }

      if (!taskDetails || !taskDetails.gid) {
        return
      }

      const files = taskDetails.files || []
      if (files.length === 0) {
        return
      }

      const firstFile = files[0]
      const filePath = firstFile.path

      if (!filePath) {
        return
      }

      const fileDir = path.dirname(filePath)
      const fileName = path.basename(filePath, path.extname(filePath))
      const aria2FilePath = path.join(fileDir, `${fileName}.aria2`)

      const fsPromises = fs.promises

      try {
        await fsPromises.access(aria2FilePath)
        await fsPromises.unlink(aria2FilePath)
        console.log(`Deleted .aria2 file for task ${taskDetails.gid}: ${aria2FilePath}`)
      } catch (accessError) {
        const err = accessError as NodeJS.ErrnoException
        if (err.code === 'ENOENT') {
          console.log(`No .aria2 file found for task ${taskDetails.gid}: ${aria2FilePath}`)
        } else {
          console.error(`Failed to delete .aria2 file ${aria2FilePath}:`, err.message)
        }
      }
    } catch (error) {
      const err = error as Error
      console.error('Error in deleteTaskAria2File:', err.message)
    }
  }

  // 清理无任务对应的.aria2文件
  async cleanupOrphanedAria2Files(): Promise<void> {
    try {
      const autoDeleteEnabled = process.env.AUTO_DELETE_ARIA2_FILES_ON_SCHEDULE === 'true'
      if (!autoDeleteEnabled) {
        return
      }

      console.log('[Aria2] Starting cleanup of orphaned .aria2 files...')

      const tasks = await this.getTasks()
      const taskFilePaths = new Set<string>()

      for (const task of tasks) {
        if (task.files && Array.isArray(task.files)) {
          for (const file of task.files) {
            if (file.path) {
              const fileName = path.basename(file.path, path.extname(file.path))
              const fileDir = path.dirname(file.path)
              const aria2FilePath = path.join(fileDir, `${fileName}.aria2`)
              taskFilePaths.add(aria2FilePath)
            }
          }
        }
      }

      const downloadDir = this.downloadDir
      await this.scanAndDeleteOrphanedAria2Files(downloadDir, taskFilePaths)

      console.log(`[Aria2] Cleanup completed. Found ${taskFilePaths.size} task-related .aria2 files.`)
    } catch (error) {
      const err = error as Error
      console.error('Error in cleanupOrphanedAria2Files:', err.message)
    }
  }

  // 递归扫描目录并删除无任务对应的.aria2文件
  private async scanAndDeleteOrphanedAria2Files(dirPath: string, taskFilePaths: Set<string>): Promise<void> {
    const fsPromises = fs.promises

    try {
      const items = await fsPromises.readdir(dirPath, { withFileTypes: true })

      for (const item of items) {
        const fullPath = path.join(dirPath, item.name)

        if (item.isDirectory()) {
          await this.scanAndDeleteOrphanedAria2Files(fullPath, taskFilePaths)
        } else if (item.isFile() && item.name.endsWith('.aria2')) {
          if (!taskFilePaths.has(fullPath)) {
            try {
              await fsPromises.unlink(fullPath)
              console.log(`Deleted orphaned .aria2 file: ${fullPath}`)
            } catch (unlinkError) {
              const err = unlinkError as Error
              console.error(`Failed to delete orphaned .aria2 file ${fullPath}:`, err.message)
            }
          }
        }
      }
    } catch (error) {
      const err = error as Error
      console.error(`Failed to scan directory ${dirPath}:`, err.message)
    }
  }

  // 上传文件
  async uploadFile(filePath: string, data: Buffer): Promise<{ success: boolean }> {
    const fsPromises = fs.promises

    try {
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.downloadDir, filePath)
      const dir = path.dirname(fullPath)

      await fsPromises.mkdir(dir, { recursive: true })
      await fsPromises.writeFile(fullPath, data)

      return { success: true }
    } catch (error) {
      const err = error as Error
      throw new Error(`Failed to upload file: ${err.message}`)
    }
  }

  // 重新加载配置
  reloadConfig(): void {
    console.log('[Aria2Client] Config reloaded')
  }
}

export default new Aria2Client()
