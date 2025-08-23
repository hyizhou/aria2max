// 系统管理控制器
const aria2Client = require('../config/aria2')
const fs = require('fs')
const path = require('path')
const systemInfoService = require('../services/systemInfoService')

class SystemController {
  // 获取 aria2 系统状态
  async getSystemStatus(req, res) {
    const status = await aria2Client.getSystemStatus()
    res.json(status)
  }

  // 获取配置信息
  async getConfig(req, res) {
    // 读取配置文件
    const configPath = path.join(__dirname, '../config.json')
    let configFile = {
      aria2RpcUrl: 'http://localhost:6800/jsonrpc',
      aria2RpcSecret: '',
      // 注意：downloadDir仅用于本项目文件管理功能，不是Aria2的下载目录
      // 文件管理功能通过此路径访问和管理已下载的文件，但不会影响Aria2的实际下载路径设置
      downloadDir: '/tmp',
      aria2ConfigPath: '',
      autoDeleteMetadata: false,
      autoDeleteAria2FilesOnRemove: false,
      autoDeleteAria2FilesOnSchedule: false
    }

    // 如果配置文件存在，读取文件内容
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8')
      const fileConfig = JSON.parse(configData)
      
      // 合并文件配置，保持字段名的大写格式
      configFile = {
        ...configFile,
        ...fileConfig
      }
    }

    // 同时更新运行时环境变量，确保配置立即生效
    process.env.ARIA2_RPC_URL = configFile.aria2RpcUrl
    process.env.ARIA2_RPC_SECRET = configFile.aria2RpcSecret
    process.env.DOWNLOAD_DIR = configFile.downloadDir
    process.env.AUTO_DELETE_METADATA = configFile.autoDeleteMetadata.toString()
    process.env.AUTO_DELETE_ARIA2_FILES_ON_REMOVE = configFile.autoDeleteAria2FilesOnRemove.toString()
    process.env.AUTO_DELETE_ARIA2_FILES_ON_SCHEDULE = configFile.autoDeleteAria2FilesOnSchedule.toString()

    // aria2客户端使用getter方法动态获取配置，无需手动更新
    // 配置更改会自动生效，因为Aria2Client的getter方法每次都会重新读取配置

    // 返回配置信息，过滤掉敏感信息，字段名改为驼峰格式
    res.json({
      aria2RpcUrl: configFile.aria2RpcUrl,
      // 不返回aria2RpcSecret，这是敏感信息
      aria2RpcSecret: '', // 总是返回空字符串
      downloadDir: configFile.downloadDir,
      aria2ConfigPath: configFile.aria2ConfigPath || '',
      autoDeleteMetadata: configFile.autoDeleteMetadata,
      autoDeleteAria2FilesOnRemove: configFile.autoDeleteAria2FilesOnRemove,
      autoDeleteAria2FilesOnSchedule: configFile.autoDeleteAria2FilesOnSchedule
    })
  }

  // 保存配置信息
  async saveConfig(req, res) {
    const { aria2RpcUrl, aria2RpcSecret, downloadDir, aria2ConfigPath, autoDeleteMetadata, autoDeleteAria2FilesOnRemove, autoDeleteAria2FilesOnSchedule } = req.body

    // 读取现有配置文件
    const configPath = path.join(__dirname, '../config.json')
    let existingConfig = {
      aria2RpcUrl: 'http://localhost:6800/jsonrpc',
      aria2RpcSecret: '',
      // 注意：downloadDir仅用于本项目文件管理功能，不是Aria2的下载目录
      // 文件管理功能通过此路径访问和管理已下载的文件，但不会影响Aria2的实际下载路径设置
      downloadDir: '/tmp',
      aria2ConfigPath: '',
      autoDeleteMetadata: false,
      autoDeleteAria2FilesOnRemove: false,
      autoDeleteAria2FilesOnSchedule: false
    }

    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8')
      existingConfig = JSON.parse(configData)
    }

    // 构建要保存的配置，对于未提供的字段保持原值
    const configFile = {
      aria2RpcUrl: aria2RpcUrl !== undefined ? aria2RpcUrl : existingConfig.aria2RpcUrl,
      aria2RpcSecret: aria2RpcSecret !== undefined && aria2RpcSecret !== '' ? aria2RpcSecret : existingConfig.aria2RpcSecret,
      downloadDir: downloadDir !== undefined ? downloadDir : existingConfig.downloadDir,
      aria2ConfigPath: aria2ConfigPath !== undefined ? aria2ConfigPath : existingConfig.aria2ConfigPath,
      autoDeleteMetadata: autoDeleteMetadata !== undefined ? autoDeleteMetadata : existingConfig.autoDeleteMetadata,
      autoDeleteAria2FilesOnRemove: autoDeleteAria2FilesOnRemove !== undefined ? autoDeleteAria2FilesOnRemove : existingConfig.autoDeleteAria2FilesOnRemove,
      autoDeleteAria2FilesOnSchedule: autoDeleteAria2FilesOnSchedule !== undefined ? autoDeleteAria2FilesOnSchedule : existingConfig.autoDeleteAria2FilesOnSchedule
    }

    // 确保目录存在
    const configDir = path.dirname(configPath)
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true })
    }

    // 写入配置文件
    fs.writeFileSync(configPath, JSON.stringify(configFile, null, 2))

    res.json({ success: true })
  }

  // 测试连接
  async testConnection(req, res) {
    const result = await aria2Client.testConnection(req.body)
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: result.message,
        details: result.details
      })
    } else {
      const err = new Error(result.message)
      err.statusCode = 400
      err.details = result.details // a custom property
      throw err
    }
  }

  // 获取系统状态信息
  async getSystemInfo(req, res) {
    const systemInfo = await systemInfoService.getSystemInfo()
    res.json(systemInfo)
  }

  // 获取实时网速（Dashboard专用）
  async getRealtimeSpeed(req, res) {
    const tasks = await aria2Client.getTasks()
    const activeTasks = tasks.filter(task => task.status === 'active')
    
    let totalDownloadSpeed = 0
    let totalUploadSpeed = 0
    
    activeTasks.forEach(task => {
      totalDownloadSpeed += parseInt(task.downloadSpeed || '0', 10)
      totalUploadSpeed += parseInt(task.uploadSpeed || '0', 10)
    })
    
    res.json({
      downloadSpeed: totalDownloadSpeed,
      uploadSpeed: totalUploadSpeed,
      activeConnections: activeTasks.length,
      timestamp: new Date().toISOString()
    })
  }

  // 获取设备网速（专门用于网速显示）
  async getDeviceNetworkSpeed(req, res) {
    const speed = systemInfoService.getDeviceNetworkSpeed()
    res.json(speed)
  }
}

module.exports = new SystemController()
