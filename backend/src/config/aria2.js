// Aria2 RPC 配置和连接管理
const axios = require('axios')
const fs = require('fs')
const path = require('path')

// 默认配置值
const defaultConfig = {
  ARIA2_RPC_URL: 'http://localhost:6800/jsonrpc',
  ARIA2_RPC_SECRET: '',
  DOWNLOAD_DIR: '/downloads',
  AUTO_DELETE_METADATA: false
}

// 配置文件路径
const configPath = path.join(__dirname, '../config.json')

// 动态加载配置文件的函数
function loadConfigFile() {
  if (fs.existsSync(configPath)) {
    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'))
    } catch (error) {
      console.error('Failed to parse config.json, using default config:', error.message)
      return {}
    }
  }
  return {}
}

// 配置优先级逻辑：
// 1. 环境变量（最高优先级）
// 2. config.json文件
// 3. 默认配置值（最低优先级）
function getFinalConfig() {
  const configFile = loadConfigFile()
  return {
    ARIA2_RPC_URL: process.env.ARIA2_RPC_URL || configFile.ARIA2_RPC_URL || defaultConfig.ARIA2_RPC_URL,
    ARIA2_RPC_SECRET: process.env.ARIA2_RPC_SECRET || configFile.ARIA2_RPC_SECRET || defaultConfig.ARIA2_RPC_SECRET,
    DOWNLOAD_DIR: process.env.DOWNLOAD_DIR || configFile.DOWNLOAD_DIR || defaultConfig.DOWNLOAD_DIR,
    AUTO_DELETE_METADATA: process.env.AUTO_DELETE_METADATA !== undefined ? 
      process.env.AUTO_DELETE_METADATA === 'true' : 
      (configFile.AUTO_DELETE_METADATA !== undefined ? configFile.AUTO_DELETE_METADATA : defaultConfig.AUTO_DELETE_METADATA)
  }
}

// 如果config.json不存在，创建一个默认的（仅在启动时创建，不更新已存在的文件）
if (!fs.existsSync(configPath)) {
  const configDir = path.dirname(configPath)
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true })
  }
  // 只写入默认配置，不包含环境变量的值，避免nodemon重启
  fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2))
}

class Aria2Client {
  constructor() {
    // 使用getter方法动态获取配置值，确保配置更新后能生效
  }
  
  // 使用getter方法动态获取配置值
  get rpcUrl() {
    return getFinalConfig().ARIA2_RPC_URL
  }
  
  get rpcSecret() {
    return getFinalConfig().ARIA2_RPC_SECRET
  }
  
  get downloadDir() {
    return getFinalConfig().DOWNLOAD_DIR
  }

  // 检查Aria2连接状态
  async checkConnection() {
    try {
      await this.sendRequest('aria2.getVersion')
      return { connected: true, message: 'Aria2连接正常' }
    } catch (error) {
      return { connected: false, message: `Aria2连接失败: ${error.message}` }
    }
  }

  // 发送 RPC 请求
  async sendRequest(method, params = [], retryCount = 0) {
    const maxRetries = 3
    const retryDelay = 1000 // 1秒
    
    try {
      // 如果设置了访问码，将其添加到参数中
      if (this.rpcSecret) {
        params.unshift(`token:${this.rpcSecret}`)
      }
      
      // 记录发送的请求（除了获取任务列表的请求）
      if (!method.startsWith('aria2.tell')) {
        console.log(`[Aria2 RPC] Sending request: ${method}`, params.slice(this.rpcSecret ? 1 : 0));
      }
      
      // 每次都创建新的axios实例，确保使用最新的配置
      const response = await axios.post(this.rpcUrl, {
        jsonrpc: '2.0',
        id: 'aria-max',
        method: method,
        params: params
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10秒超时
      })
      
      // 记录响应（除了获取任务列表的响应）
      if (!method.startsWith('aria2.tell')) {
        console.log(`[Aria2 RPC] Response for ${method}:`, response.data);
      }
      
      return response.data
    } catch (error) {
      if (error.response) {
        // Handle HTTP errors
        const errorMessage = error.response.data && error.response.data.error ? 
          error.response.data.error.message : error.message
        console.error(`[Aria2 RPC] Request failed (${error.response.status}): ${errorMessage}`);
        throw new Error(`Aria2 RPC request failed (${error.response.status}): ${errorMessage}`)
      } else if (error.request) {
        // Handle network errors
        console.error(`[Aria2 RPC] Network error: ${error.message}`);
        
        // 对于网络错误，进行重试
        if (retryCount < maxRetries) {
          console.log(`[Aria2 RPC] Retrying ${method} request (${retryCount + 1}/${maxRetries}) in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return this.sendRequest(method, params.slice(this.rpcSecret ? 1 : 0), retryCount + 1);
        } else {
          console.error(`[Aria2 RPC] Max retries exceeded for ${method}`);
          throw new Error(`Aria2 RPC network error: ${error.message}`)
        }
      } else {
        // Handle other errors
        console.error(`[Aria2 RPC] Request failed: ${error.message}`);
        throw new Error(`Aria2 RPC request failed: ${error.message}`)
      }
    }
  }

  // 获取 Aria2 全局选项
  async getGlobalOptions() {
    try {
      const response = await this.sendRequest('aria2.getGlobalOption')
      return response.result
    } catch (error) {
      console.error('Failed to get global options:', error.message)
      return null
    }
  }

  // 获取下载任务列表
  async getTasks() {
    try {
      // 获取活跃任务
      const activeResponse = await this.sendRequest('aria2.tellActive')
      // 获取等待任务
      const waitingResponse = await this.sendRequest('aria2.tellWaiting', [0, 1000])
      // 获取已停止任务
      const stoppedResponse = await this.sendRequest('aria2.tellStopped', [0, 1000])
      
      // 合并所有任务
      const tasks = [
        ...(activeResponse.result || []),
        ...(waitingResponse.result || []),
        ...(stoppedResponse.result || [])
      ]
      
      return tasks
    } catch (error) {
      console.error(`[Aria2 RPC] Failed to get tasks: ${error.message}`);
      // 如果获取任务失败，返回空数组而不是抛出错误
      return []
    }
  }

  // 获取任务详情（包含连接状态信息）
  async getTaskDetail(gid) {
    try {
      // 获取基本任务状态 - 只获取核心信息，避免不必要的RPC调用
      const response = await this.sendRequest('aria2.tellStatus', [gid])
      const task = response.result
      
      // 转换文件数据结构以匹配前端期望的格式
      if (task.files && Array.isArray(task.files)) {
        task.files = task.files.map(file => ({
          ...file,
          size: file.length || 0,
          completed: file.completedLength || 0
        }))
      }
      
      // 对于活跃任务，获取连接信息（不仅限于BT任务）
      if (task.status === 'active') {
        try {
          // 获取BT对等信息 - 使用正确的aria2.getPeers方法
          const peersResponse = await this.sendRequest('aria2.getPeers', [gid])
          // 检查返回中的peers数据并过滤掉空元素和无效元素
          if (peersResponse.result && Array.isArray(peersResponse.result)) {
            // 过滤掉空的peer元素和只有空字段的peer元素
            task.peers = peersResponse.result.filter(peer => {
              // 首先检查peer对象是否存在且不为空
              if (!peer || typeof peer !== 'object') return false
              
              // 检查对象是否包含有意义的字段
              const keys = Object.keys(peer)
              if (keys.length === 0) return false
              
              // 检查是否包含至少一个非空字段
              return keys.some(key => peer[key] !== null && peer[key] !== undefined && peer[key] !== '')
            })
          } else {
            task.peers = []
          }
        } catch (error) {
          console.log(`[Aria2] Connection data not available for task ${gid}:`, error.message)
          task.peers = []
        }
        
        // 如果没有peers数据，但任务有连接信息，创建占位符数据
        // 只有在确实需要显示连接数但没有详细连接信息时才创建占位符数据
        if (task.peers.length === 0 && task.connections && parseInt(task.connections, 10) > 0) {
          // 不再创建空对象数组，而是保持空数组，让前端决定如何显示
          // 前端可以通过 task.connections 字段来显示连接数
        }
      } else {
        // 非活跃任务，直接设为空数组
        task.peers = []
      }
      
      return task
    } catch (error) {
      console.error(`[Aria2] Failed to get task detail for ${gid}:`, error.message)
      throw error
    }
  }

  // 添加下载任务 (URI)
  async addTask(uri, options = {}) {
    // 确保 URI 是数组格式
    const uris = Array.isArray(uri) ? uri : [uri];
    
    const params = [uris]
    
    // 处理用户提供的选项，确保它们符合Aria2的参数格式
    const processedOptions = {}
    
    // 特殊处理磁力链接，确保不设置 bt-metadata-only=true
    if (uris.some(u => u && u.startsWith('magnet:'))) {
      // 移除可能阻止下载的BT选项
      delete options['bt-metadata-only'];
      delete options['bt-save-metadata'];
    }
    
    // 处理用户选项
    Object.keys(options).forEach(key => {
      const value = options[key]
      // 只添加非空值的选项
      if (value !== '' && value !== undefined && value !== null) {
        // 对于数字类型的选项，确保它们是字符串格式
        if (typeof value === 'number') {
          processedOptions[key] = value.toString()
        } else {
          processedOptions[key] = value
        }
      }
    })
    
    const finalOptions = processedOptions
    
    if (Object.keys(finalOptions).length > 0) {
      params.push(finalOptions)
    }
    
    const response = await this.sendRequest('aria2.addUri', params)
    return response.result
  }
  
  // 添加种子文件任务
  async addTorrent(torrentData, options = {}) {
    // torrentData 应该是base64编码的种子文件内容
    const params = [torrentData, []] // 第二个参数是Web种子URL数组，这里留空
    
    // 合并默认选项和用户选项
    const defaultOptions = {
      dir: this.downloadDir
    }
    
    // 处理用户提供的选项
    const processedOptions = {}
    Object.assign(processedOptions, defaultOptions)
    
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
    
    const response = await this.sendRequest('aria2.addTorrent', params)
    return response.result
  }
  
  // 添加Metalink文件任务
  async addMetalink(metalinkData, options = {}) {
    // metalinkData 应该是base64编码的metalink文件内容
    const params = [metalinkData]
    
    // 合并默认选项和用户选项
    const defaultOptions = {
      dir: this.downloadDir
    }
    
    // 处理用户提供的选项
    const processedOptions = {}
    Object.assign(processedOptions, defaultOptions)
    
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
    
    const response = await this.sendRequest('aria2.addMetalink', params)
    return response.result
  }

  // 暂停任务
  async pauseTask(gid) {
    const response = await this.sendRequest('aria2.pause', [gid])
    return response.result
  }

  // 继续任务
  async resumeTask(gid) {
    const response = await this.sendRequest('aria2.unpause', [gid])
    return response.result
  }

  // 删除任务 - 同步执行所有删除步骤，确保任务被彻底删除
  async removeTask(gid) {
    try {
      // First check if the task exists and get its status
      let status = null;
      try {
        const taskStatus = await this.sendRequest('aria2.tellStatus', [gid])
        status = taskStatus.result.status
        console.log(`[Aria2 Remove] Task ${gid} status: ${status}`);
      } catch (statusError) {
        // If we can't get task status, the task might not exist or already be removed
        console.log(`[Aria2 Remove] Cannot get task status for ${gid}, assuming it doesn't exist or already removed`)
        // Try to remove download result in case it still exists in stopped list
        try {
          await this.sendRequest('aria2.removeDownloadResult', [gid])
          console.log(`[Aria2 Remove] Cleaned up download result for non-existent task ${gid}`);
        } catch (cleanupError) {
          console.log(`[Aria2 Remove] No cleanup needed for task ${gid}`);
        }
        return true // Task doesn't exist, consider deletion successful
      }
      
      // 根据任务状态采用正确的删除方法
      if (status === 'active') {
        // 对于活跃状态的任务，需要先暂停再删除
        console.log(`[Aria2 Remove] Removing active task ${gid}`);
        
        // 先暂停任务并等待暂停完成
        try {
          const pauseResponse = await this.sendRequest('aria2.pause', [gid])
          console.log(`[Aria2 Remove] Paused task ${gid}, response:`, pauseResponse);
          
          // 等待一段时间确保暂停完成
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (pauseError) {
          console.log(`[Aria2 Remove] Failed to pause task ${gid}: ${pauseError.message}`);
          // 即使暂停失败也要继续尝试删除
        }
        
        // 然后标记为删除
        try {
          const removeResponse = await this.sendRequest('aria2.remove', [gid])
          console.log(`[Aria2 Remove] Marked active task ${gid} as removed, response:`, removeResponse);
        } catch (removeError) {
          console.log(`[Aria2 Remove] Failed to mark active task ${gid} as removed: ${removeError.message}`);
          // 重新抛出错误，让调用方知道删除失败
          throw removeError;
        }
        
        // 最后彻底删除，带重试机制
        try {
          await this.removeDownloadResultWithRetry(gid);
        } catch (removeDownloadResultError) {
          console.log(`[Aria2 Remove] Failed to completely remove active task ${gid}: ${removeDownloadResultError.message}`);
          // 重新抛出错误，让调用方知道删除失败
          throw removeDownloadResultError;
        }
      } else if (status === 'waiting' || status === 'paused') {
        // 对于等待、暂停状态的任务，直接删除即可
        console.log(`[Aria2 Remove] Removing ${status} task ${gid}`);
        try {
          const removeResponse = await this.sendRequest('aria2.remove', [gid])
          console.log(`[Aria2 Remove] Removed ${status} task ${gid}, response:`, removeResponse);
        } catch (removeError) {
          console.log(`[Aria2 Remove] Failed to remove ${status} task ${gid}: ${removeError.message}`);
          // 重新抛出错误，让调用方知道删除失败
          throw removeError;
        }
      } else {
        // 对于已完成、错误、已删除状态的任务，直接彻底删除，带重试机制
        console.log(`[Aria2 Remove] Completely removing ${status} task ${gid}`);
        try {
          await this.removeDownloadResultWithRetry(gid);
        } catch (removeDownloadResultError) {
          console.log(`[Aria2 Remove] Failed to completely remove ${status} task ${gid}: ${removeDownloadResultError.message}`);
          // 重新抛出错误，让调用方知道删除失败
          throw removeDownloadResultError;
        }
      }
      
      // Wait a bit to ensure the task is fully processed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return true
    } catch (error) {
      // 重新抛出错误，让调用方知道具体哪个步骤失败了
      console.error(`[Aria2 Remove] Task ${gid} removal failed:`, error.message)
      throw error;
    }
  }
  
  // 带重试机制的 removeDownloadResult 方法
  async removeDownloadResultWithRetry(gid, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const removeDownloadResultResponse = await this.sendRequest('aria2.removeDownloadResult', [gid]);
        console.log(`[Aria2 Remove] Completely removed task ${gid}, response:`, removeDownloadResultResponse);
        return removeDownloadResultResponse;
      } catch (error) {
        console.log(`[Aria2 Remove] Failed to completely remove task ${gid} (attempt ${i + 1}/${maxRetries}): ${error.message}`);
        
        // 如果不是最后一次尝试，等待一段时间后重试
        if (i < maxRetries - 1) {
          // 等待时间逐渐增加
          await new Promise(resolve => setTimeout(resolve, 300 * (i + 1)));
        } else {
          // 最后一次尝试失败，抛出错误
          throw error;
        }
      }
    }
  }

  // 获取 aria2 系统状态
  async getSystemStatus() {
    const versionResponse = await this.sendRequest('aria2.getVersion')
    const sessionResponse = await this.sendRequest('aria2.getSessionInfo')
    
    return {
      version: versionResponse.result.version,
      enabledFeatures: versionResponse.result.enabledFeatures,
      sessionId: sessionResponse.result.sessionId
    }
  }

  // 获取文件列表
  async getFiles(path = '') {
    const fs = require('fs').promises
    const pathModule = require('path')
    
    try {
      const fullPath = pathModule.join(this.downloadDir, path)
      const files = await fs.readdir(fullPath, { withFileTypes: true })
      
      const fileList = await Promise.all(files.map(async (file) => {
        const filePath = pathModule.join(fullPath, file.name)
        const stats = await fs.stat(filePath)
        const lstats = await fs.lstat(filePath) // Get link stats
        
        // Check if it's a symbolic link
        const isSymlink = lstats.isSymbolicLink()
        
        // For symbolic links, get the real path to determine if it points to a directory
        let isDir = file.isDirectory()
        let targetPath = null
        let targetExists = true
        
        if (isSymlink) {
          try {
            targetPath = await fs.readlink(filePath)
            // Check if the target exists and what type it is
            const targetFullPath = pathModule.resolve(pathModule.dirname(filePath), targetPath)
            const targetStats = await fs.stat(targetFullPath)
            isDir = targetStats.isDirectory()
          } catch (error) {
            targetExists = false
          }
        }
        
        return {
          name: file.name,
          path: pathModule.join(path, file.name),
          size: stats.size,
          mtime: stats.mtime.toISOString(),
          isDir: isDir,
          isSymlink: isSymlink,
          targetPath: targetPath,
          targetExists: targetExists
        }
      }))
      
      return fileList
    } catch (error) {
      throw new Error(`Failed to read directory: ${error.message}`)
    }
  }

  // 删除文件或目录
  async deleteFile(path) {
    const fs = require('fs').promises
    const pathModule = require('path')
    
    try {
      let fullPath = path
      
      // 如果Aria2在Docker容器中运行，需要映射路径
      // 从Aria2获取实际的下载目录配置
      const globalOptions = await this.getGlobalOptions()
      if (globalOptions && globalOptions.dir) {
        const aria2DownloadDir = globalOptions.dir
        
        // 如果path是相对于Aria2下载目录的路径，则需要映射到宿主机路径
        if (!pathModule.isAbsolute(path) || path.startsWith(aria2DownloadDir)) {
          // 移除Aria2下载目录前缀，然后与宿主机下载目录拼接
          let relativePath = path
          if (path.startsWith(aria2DownloadDir)) {
            relativePath = path.substring(aria2DownloadDir.length)
            // 移除开头的斜杠（如果有的话）
            if (relativePath.startsWith('/')) {
              relativePath = relativePath.substring(1)
            }
          }
          fullPath = pathModule.join(this.downloadDir, relativePath)
        }
      } else {
        // 如果无法获取Aria2配置，使用原来的逻辑
        fullPath = pathModule.isAbsolute(path) ? path : pathModule.join(this.downloadDir, path)
      }
      
      // 检查文件/目录是否存在
      try {
        await fs.access(fullPath)
      } catch (accessError) {
        if (accessError.code === 'ENOENT') {
          // 文件不存在，视为删除成功
          console.log(`File not found, skipping deletion: ${fullPath}`)
          return { success: true }
        }
        throw accessError
      }
      
      // Check if it's a symbolic link
      const lstats = await fs.lstat(fullPath)
      if (lstats.isSymbolicLink()) {
        // For symbolic links, only unlink the link itself
        await fs.unlink(fullPath)
      } else {
        // For regular files/directories, remove recursively
        await fs.rm(fullPath, { recursive: true, force: true })
      }
      
      return { success: true }
    } catch (error) {
      console.error('Delete file error details:', {
        originalPath: path,
        resolvedPath: fullPath,
        error: error.message,
        stack: error.stack
      })
      throw new Error(`Failed to delete file: ${error.message}`)
    }
  }

  // 创建目录
  async createDirectory(path) {
    const fs = require('fs').promises
    const pathModule = require('path')
    
    try {
      // 检查路径是否已经是绝对路径，如果是则直接使用，否则与下载目录拼接
      const fullPath = pathModule.isAbsolute(path) ? path : pathModule.join(this.downloadDir, path)
      await fs.mkdir(fullPath, { recursive: true })
      return { success: true }
    } catch (error) {
      throw new Error(`Failed to create directory: ${error.message}`)
    }
  }
  
  // 重命名文件或目录
  async renameFile(oldPath, newPath) {
    const fs = require('fs').promises
    const pathModule = require('path')
    
    try {
      // 检查路径是否已经是绝对路径，如果是则直接使用，否则与下载目录拼接
      const oldFullPath = pathModule.isAbsolute(oldPath) ? oldPath : pathModule.join(this.downloadDir, oldPath)
      const newFullPath = pathModule.isAbsolute(newPath) ? newPath : pathModule.join(this.downloadDir, newPath)
      
      // Check if new path already exists
      try {
        await fs.access(newFullPath)
        throw new Error('Target path already exists')
      } catch (accessError) {
        // If accessError means file doesn't exist, that's good
        if (accessError.code !== 'ENOENT') {
          throw accessError
        }
      }
      
      await fs.rename(oldFullPath, newFullPath)
      return { success: true }
    } catch (error) {
      throw new Error(`Failed to rename file: ${error.message}`)
    }
  }
  
  // 测试文件是否存在
  async testFileExists(path) {
    const fs = require('fs').promises
    const pathModule = require('path')
    
    try {
      let fullPath = path
      
      // 如果Aria2在Docker容器中运行，需要映射路径
      // 从Aria2获取实际的下载目录配置
      const globalOptions = await this.getGlobalOptions()
      if (globalOptions && globalOptions.dir) {
        const aria2DownloadDir = globalOptions.dir
        
        // 如果path是相对于Aria2下载目录的路径，则需要映射到宿主机路径
        if (!pathModule.isAbsolute(path) || path.startsWith(aria2DownloadDir)) {
          // 移除Aria2下载目录前缀，然后与宿主机下载目录拼接
          let relativePath = path
          if (path.startsWith(aria2DownloadDir)) {
            relativePath = path.substring(aria2DownloadDir.length)
            // 移除开头的斜杠（如果有的话）
            if (relativePath.startsWith('/')) {
              relativePath = relativePath.substring(1)
            }
          }
          fullPath = pathModule.join(this.downloadDir, relativePath)
        }
      } else {
        // 如果无法获取Aria2配置，使用原来的逻辑
        fullPath = pathModule.isAbsolute(path) ? path : pathModule.join(this.downloadDir, path)
      }
      
      // 检查文件/目录是否存在
      await fs.access(fullPath)
      return true
    } catch (error) {
      throw new Error(`File does not exist: ${error.message}`)
    }
  }

  // 自动删除元数据文件
  async autoDeleteMetadata(taskDetails) {
    try {
      // 检查是否启用了自动删除元数据
      const autoDeleteEnabled = process.env.AUTO_DELETE_METADATA === 'true'
      if (!autoDeleteEnabled) {
        return
      }
      
      // 只有在任务完成时才删除元数据
      if (taskDetails.status !== 'complete') {
        return
      }
      
      // 获取任务的文件列表
      const files = taskDetails.files || []
      if (files.length === 0) {
        return
      }
      
      // 获取第一个文件的路径来确定元数据文件的位置
      const firstFile = files[0]
      const filePath = firstFile.path
      
      if (!filePath) {
        return
      }
      
      // 获取文件所在目录
      const pathModule = require('path')
      const fileDir = pathModule.dirname(filePath)
      
      // 查找并删除元数据文件
      const fs = require('fs').promises
      
      try {
        // 列出目录中的所有文件
        const dirFiles = await fs.readdir(fileDir)
        
        // 查找元数据文件（.torrent, .metalink, .meta4等）
        const metadataExtensions = ['.torrent', '.metalink', '.meta4']
        const metadataFiles = dirFiles.filter(file => {
          return metadataExtensions.some(ext => file.toLowerCase().endsWith(ext))
        })
        
        // 删除找到的元数据文件
        for (const metadataFile of metadataFiles) {
          const fullPath = pathModule.join(fileDir, metadataFile)
          try {
            await fs.unlink(fullPath)
            console.log(`Deleted metadata file: ${fullPath}`)
          } catch (unlinkError) {
            console.error(`Failed to delete metadata file ${fullPath}:`, unlinkError.message)
          }
        }
      } catch (dirError) {
        console.error(`Failed to read directory ${fileDir}:`, dirError.message)
      }
    } catch (error) {
      console.error('Error in autoDeleteMetadata:', error.message)
    }
  }
  // 重新加载配置（用于通知配置更改）
  reloadConfig() {
    // 由于使用getter方法，配置会自动更新
    // 这里可以添加其他需要在配置更改后执行的逻辑
    console.log('[Aria2Client] Config reloaded');
    
    // 清除可能的缓存或重新初始化连接
    // 目前没有需要清除的缓存，但可以在这里添加
  }
}

module.exports = new Aria2Client()