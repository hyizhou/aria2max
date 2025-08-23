// Aria2 RPC 配置和连接管理
const axios = require('axios')
const fs = require('fs')
const path = require('path')

// 默认配置值
const defaultConfig = {
  aria2RpcUrl: 'http://localhost:6800/jsonrpc',
  aria2RpcSecret: '',
  // 注意：downloadDir仅用于本项目文件管理功能，不是Aria2的下载目录
  // 文件管理功能通过此路径访问和管理已下载的文件，但不会影响Aria2的实际下载路径设置
  downloadDir: '/downloads',
  aria2ConfigPath: '',
  autoDeleteMetadata: false,
  autoDeleteAria2FilesOnRemove: false,
  autoDeleteAria2FilesOnSchedule: false
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
// 只从config.json文件读取配置，不使用环境变量
function getFinalConfig() {
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
    return getFinalConfig().aria2RpcUrl
  }
  
  get rpcSecret() {
    return getFinalConfig().aria2RpcSecret
  }
  
  get downloadDir() {
    return getFinalConfig().downloadDir
  }

  // 检查Aria2连接状态
  async checkConnection() {
    try {
      console.log('[Aria2] Testing connection to Aria2...')
      const result = await this.sendRequest('aria2.getVersion')
      console.log('[Aria2] Connection test successful:', result)
      return { connected: true, message: 'Aria2连接正常' }
    } catch (error) {
      console.error('[Aria2] Connection test failed:', error.message)
      return { connected: false, message: `Aria2连接失败: ${error.message}` }
    }
  }

  // 测试连接方法（用于系统设置中的测试连接功能）
  async testConnection(config) {
    try {
      console.log('[Aria2] Testing Aria2 RPC connection...')
      
      // 使用传入的配置或默认配置
      const testRpcUrl = config?.aria2RpcUrl || this.rpcUrl
      const testRpcSecret = config?.aria2RpcSecret || this.rpcSecret
      
      // 首先测试基本连接
      const versionResult = await this.sendRequestWithConfig('aria2.getVersion', [], testRpcUrl, testRpcSecret)
      console.log('[Aria2] Version check successful:', versionResult.result)
      
      // 然后测试全局选项
      const globalOptions = await this.getGlobalOptionsWithConfig(testRpcUrl, testRpcSecret)
      console.log('[Aria2] Global options retrieved successfully')
      
      return {
        success: true,
        message: 'Aria2 连接测试成功',
        details: {
          version: versionResult.result.version,
          rpcUrl: testRpcUrl,
          hasSecret: !!testRpcSecret,
          globalOptions: globalOptions
        }
      }
    } catch (error) {
      console.error('[Aria2] Connection test failed:', error)
      
      // 提供更详细的错误信息
      let errorDetails = error.message
      if (error.message.includes('Unauthorized')) {
        errorDetails = 'RPC密钥认证失败，请检查RPC密钥是否正确'
      } else if (error.message.includes('ECONNREFUSED')) {
        errorDetails = '无法连接到Aria2服务，请确保Aria2正在运行'
      } else if (error.message.includes('ENOTFOUND')) {
        errorDetails = '无法解析Aria2服务地址，请检查RPC URL配置'
      }
      
      return {
        success: false,
        message: errorDetails,
        details: {
          error: error.message,
          rpcUrl: config?.aria2RpcUrl || this.rpcUrl,
          hasSecret: !!(config?.aria2RpcSecret || this.rpcSecret),
          secretLength: (config?.aria2RpcSecret || this.rpcSecret) ? (config?.aria2RpcSecret || this.rpcSecret).length : 0
        }
      }
    }
  }

  // 发送 RPC 请求
  async sendRequest(method, params = [], retryCount = 0) {
    return this.sendRequestWithConfig(method, params, this.rpcUrl, this.rpcSecret, retryCount);
  }
  
  // 发送 RPC 请求（使用指定配置）
  async sendRequestWithConfig(method, params = [], rpcUrl, rpcSecret, retryCount = 0) {
    const maxRetries = 3
    const retryDelay = 1000 // 1秒
    
    try {
      // 如果设置了访问码，将其添加到参数中
      if (rpcSecret) {
        const authToken = `token:${rpcSecret}`
        params.unshift(authToken)
      }
      
      // 静默处理，不打印日志
      
      // 每次都创建新的axios实例，确保使用最新的配置
      const response = await axios.post(rpcUrl, {
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
      
      
      return response.data
    } catch (error) {
      if (error.response) {
        // Handle HTTP errors
        const errorMessage = error.response.data && error.response.data.error ? 
          error.response.data.error.message : error.message
        console.error(`[Aria2 RPC] Request failed (${error.response.status}): ${errorMessage}`);
        console.error(`[Aria2 RPC] Error response data:`, error.response.data);
        
        // 添加更多调试信息
        if (rpcSecret) {
          console.error(`[Aria2 RPC] Configured RPC secret length: ${rpcSecret.length}`)
          console.error(`[Aria2 RPC] Token format: token:${rpcSecret.substring(0, 2)}***`)
        }
        
        throw new Error(`Aria2 RPC request failed (${error.response.status}): ${errorMessage}`)
      } else if (error.request) {
        // Handle network errors
        console.error(`[Aria2 RPC] Network error: ${error.message}`);
        console.error(`[Aria2 RPC] Make sure Aria2 is running at: ${rpcUrl}`);
        
        // 对于网络错误，进行重试
        if (retryCount < maxRetries) {
          console.log(`[Aria2 RPC] Retrying ${method} request (${retryCount + 1}/${maxRetries}) in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return this.sendRequestWithConfig(method, params.slice(rpcSecret ? 1 : 0), rpcUrl, rpcSecret, retryCount + 1);
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
    return this.getGlobalOptionsWithConfig(this.rpcUrl, this.rpcSecret);
  }
  
  // 获取 Aria2 全局选项（使用指定配置）
  async getGlobalOptionsWithConfig(rpcUrl, rpcSecret) {
    try {
      const response = await this.sendRequestWithConfig('aria2.getGlobalOption', [], rpcUrl, rpcSecret)
      return response.result
    } catch (error) {
      console.error('Failed to get global options:', error.message)
      return null
    }
  }

  // 获取下载任务列表（优化版本，只返回前端需要的字段）
  async getTasks() {
    try {
      // 获取活跃任务
      const activeResponse = await this.sendRequest('aria2.tellActive')
      // 获取等待任务
      const waitingResponse = await this.sendRequest('aria2.tellWaiting', [0, 1000])
      // 获取已停止任务
      const stoppedResponse = await this.sendRequest('aria2.tellStopped', [0, 1000])
      
      // 合并所有任务，并进行数据精简，只返回前端需要的字段
      const tasks = [
        ...(activeResponse.result || []),
        ...(waitingResponse.result || []),
        ...(stoppedResponse.result || [])
      ].map(task => {
        // 只提取前端需要的字段
        const minimalTask = {
          gid: task.gid,
          status: task.status,
          totalLength: task.totalLength || '0',
          completedLength: task.completedLength || '0',
          downloadSpeed: task.downloadSpeed || '0',
          uploadSpeed: task.uploadSpeed || '0',
          dir: task.dir || ''
        };
        
        // 如果有bittorrent信息，简化BT任务名称
        if (task.bittorrent && task.bittorrent.info && task.bittorrent.info.name) {
          minimalTask.bittorrent = {
            info: {
              name: task.bittorrent.info.name
            }
          };
        }
        
        // 如果文件信息存在，只保留必要的文件信息
        if (task.files && task.files.length > 0) {
          minimalTask.files = task.files.slice(0, 1).map(file => ({
            index: file.index,
            path: file.path || '',
            length: file.length || '0',
            completedLength: file.completedLength || '0',
            selected: file.selected || file.selected === undefined ? 'true' : 'false'
          }));
        } else {
          minimalTask.files = [];
        }
        
        return minimalTask;
      });
      
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
            // Aria2返回的peerId已经是百分比编码格式，直接使用无需处理
            // 根据Aria2官方文档：peerId是"百分比编码的对等方 ID"
            
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
    let taskDetails = null;
    try {
      // First check if the task exists and get its status and details
      try {
        const taskStatus = await this.sendRequest('aria2.tellStatus', [gid])
        taskDetails = taskStatus.result
        console.log(`[Aria2 Remove] Task ${gid} status: ${taskDetails.status}`);
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
      
      const status = taskDetails.status;
      
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
      
      // 删除对应的.aria2文件（如果启用）
      if (taskDetails) {
        await this.deleteTaskAria2File(taskDetails);
      }
      
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

  // 删除任务对应的.aria2文件
  async deleteTaskAria2File(taskDetails) {
    try {
      // 检查是否启用了删除任务时自动删除.aria2文件
      const autoDeleteEnabled = process.env.AUTO_DELETE_ARIA2_FILES_ON_REMOVE === 'true'
      if (!autoDeleteEnabled) {
        return
      }
      
      if (!taskDetails || !taskDetails.gid) {
        return
      }
      
      // 获取任务的文件列表来确定.aria2文件的位置
      const files = taskDetails.files || []
      if (files.length === 0) {
        return
      }
      
      // 获取第一个文件的路径来确定.aria2文件的位置
      const firstFile = files[0]
      const filePath = firstFile.path
      
      if (!filePath) {
        return
      }
      
      // 获取文件所在目录
      const pathModule = require('path')
      const fileDir = pathModule.dirname(filePath)
      const fileName = pathModule.basename(filePath, pathModule.extname(filePath))
      
      // 构建对应的.aria2文件路径
      const aria2FilePath = pathModule.join(fileDir, `${fileName}.aria2`)
      
      const fs = require('fs').promises
      
      try {
        // 检查.aria2文件是否存在
        await fs.access(aria2FilePath)
        
        // 删除.aria2文件
        await fs.unlink(aria2FilePath)
        console.log(`Deleted .aria2 file for task ${taskDetails.gid}: ${aria2FilePath}`)
      } catch (accessError) {
        if (accessError.code === 'ENOENT') {
          // 文件不存在，无需删除
          console.log(`No .aria2 file found for task ${taskDetails.gid}: ${aria2FilePath}`)
        } else {
          console.error(`Failed to delete .aria2 file ${aria2FilePath}:`, accessError.message)
        }
      }
    } catch (error) {
      console.error('Error in deleteTaskAria2File:', error.message)
    }
  }

  // 清理无任务对应的.aria2文件
  async cleanupOrphanedAria2Files() {
    try {
      // 检查是否启用了定时清理.aria2文件
      const autoDeleteEnabled = process.env.AUTO_DELETE_ARIA2_FILES_ON_SCHEDULE === 'true'
      if (!autoDeleteEnabled) {
        return
      }
      
      const fs = require('fs').promises
      const pathModule = require('path')
      
      console.log('[Aria2] Starting cleanup of orphaned .aria2 files...')
      
      // 获取所有活跃任务的文件路径
      const tasks = await this.getTasks()
      const taskFilePaths = new Set()
      
      // 收集所有任务的文件路径
      for (const task of tasks) {
        if (task.files && Array.isArray(task.files)) {
          for (const file of task.files) {
            if (file.path) {
              // 获取文件名（不含扩展名）
              const fileName = pathModule.basename(file.path, pathModule.extname(file.path))
              const fileDir = pathModule.dirname(file.path)
              // 将文件路径转换为对应的.aria2文件路径
              const aria2FilePath = pathModule.join(fileDir, `${fileName}.aria2`)
              taskFilePaths.add(aria2FilePath)
            }
          }
        }
      }
      
      // 扫描下载目录中的所有.aria2文件
      const downloadDir = this.downloadDir
      await this.scanAndDeleteOrphanedAria2Files(downloadDir, taskFilePaths)
      
      console.log(`[Aria2] Cleanup completed. Found ${taskFilePaths.size} task-related .aria2 files.`)
    } catch (error) {
      console.error('Error in cleanupOrphanedAria2Files:', error.message)
    }
  }

  // 递归扫描目录并删除无任务对应的.aria2文件
  async scanAndDeleteOrphanedAria2Files(dirPath, taskFilePaths) {
    const fs = require('fs').promises
    const pathModule = require('path')
    
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true })
      
      for (const item of items) {
        const fullPath = pathModule.join(dirPath, item.name)
        
        if (item.isDirectory()) {
          // 递归扫描子目录
          await this.scanAndDeleteOrphanedAria2Files(fullPath, taskFilePaths)
        } else if (item.isFile() && item.name.endsWith('.aria2')) {
          // 检查是否是孤立的.aria2文件
          if (!taskFilePaths.has(fullPath)) {
            try {
              await fs.unlink(fullPath)
              console.log(`Deleted orphaned .aria2 file: ${fullPath}`)
            } catch (unlinkError) {
              console.error(`Failed to delete orphaned .aria2 file ${fullPath}:`, unlinkError.message)
            }
          }
        }
      }
    } catch (error) {
      console.error(`Failed to scan directory ${dirPath}:`, error.message)
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