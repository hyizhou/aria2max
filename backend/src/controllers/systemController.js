// 系统管理控制器
const aria2Client = require('../config/aria2')
const fs = require('fs')
const path = require('path')
const os = require('os')
const disk = require('diskusage')

class SystemController {
  // 获取 aria2 系统状态
  async getSystemStatus(req, res) {
    try {
      const status = await aria2Client.getSystemStatus()
      res.json(status)
    } catch (error) {
      console.error('Failed to get system status:', error)
      res.status(500).json({ 
        error: { 
          code: 500, 
          message: 'Failed to get system status' 
        } 
      })
    }
  }

  // 获取配置信息
  async getConfig(req, res) {
    try {
      // 读取配置文件
      const configPath = path.join(__dirname, '../config.json')
      let configFile = {
        aria2RpcUrl: 'http://localhost:6800/jsonrpc',
        aria2RpcSecret: '',
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
        autoDeleteMetadata: configFile.autoDeleteMetadata,
        autoDeleteAria2FilesOnRemove: configFile.autoDeleteAria2FilesOnRemove,
        autoDeleteAria2FilesOnSchedule: configFile.autoDeleteAria2FilesOnSchedule
      })
    } catch (error) {
      console.error('Failed to get config:', error)
      res.status(500).json({ 
        error: { 
          code: 500, 
          message: 'Failed to get config' 
        } 
      })
    }
  }

  // 保存配置信息
  async saveConfig(req, res) {
    try {
      const { aria2RpcUrl, aria2RpcSecret, downloadDir, aria2ConfigPath, autoDeleteMetadata, autoDeleteAria2FilesOnRemove, autoDeleteAria2FilesOnSchedule } = req.body

      // 读取现有配置文件
      const configPath = path.join(__dirname, '../config.json')
      let existingConfig = {
        aria2RpcUrl: 'http://localhost:6800/jsonrpc',
        aria2RpcSecret: '',
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
    } catch (error) {
      console.error('Failed to save config:', error)
      res.status(500).json({ 
        error: { 
          code: 500, 
          message: 'Failed to save config' 
        } 
      })
    }
  }

  // 测试连接
  async testConnection(req, res) {
    try {
      const result = await aria2Client.testConnection()
      
      if (result.success) {
        res.json({ 
          success: true, 
          message: result.message,
          details: result.details
        })
      } else {
        res.status(400).json({ 
          success: false, 
          message: result.message,
          details: result.details
        })
      }
    } catch (error) {
      console.error('Connection test failed:', error)
      res.status(500).json({ 
        error: { 
          code: 500, 
          message: 'Connection test failed: ' + error.message 
        } 
      })
    }
  }

  // 获取系统状态信息
  async getSystemInfo(req, res) {
    try {
      // 检查缓存
      const now = Date.now()
      if (cachedSystemInfo && (now - lastCacheTime) < CACHE_DURATION) {
        return res.json(cachedSystemInfo)
      }
      
      // 获取CPU使用率和每个核心的使用率
      const cpuUsage = await getCpuUsage()
      const cpuCoresUsage = await getCpuCoresUsage()
      
      // 获取内存使用情况（包括swap）
      const totalMemory = os.totalmem()
      const freeMemory = os.freemem()
      const usedMemory = totalMemory - freeMemory
      const memoryUsage = {
        total: totalMemory,
        used: usedMemory,
        free: freeMemory,
        percentage: Math.round((usedMemory / totalMemory) * 100)
      }
      
      // 获取swap内存信息
      let swapUsage = null
      try {
        const swapInfo = await getSwapInfo()
        if (swapInfo.total > 0) {
          swapUsage = swapInfo
        }
      } catch (swapError) {
        console.warn('Failed to get swap info:', swapError.message)
      }
      
      // 获取磁盘使用情况（下载目录）
      const downloadDir = aria2Client.downloadDir || process.env.DOWNLOAD_DIR || '/tmp'
      let diskUsage = null
      
      try {
        const diskInfo = await getDiskUsage(downloadDir)
        diskUsage = {
          path: downloadDir,
          total: diskInfo.total,
          used: diskInfo.total - diskInfo.free,
          free: diskInfo.free,
          percentage: Math.round(((diskInfo.total - diskInfo.free) / diskInfo.total) * 100)
        }
      } catch (diskError) {
        console.error('Failed to get disk usage:', diskError.message)
        diskUsage = {
          path: downloadDir,
          total: 0,
          used: 0,
          free: 0,
          percentage: 0,
          error: '无法获取磁盘信息'
        }
      }
      
      // 获取网络接口信息
      const networkInterfaces = os.networkInterfaces()
      const networkStats = {}
      
      // 过滤掉Docker和虚拟网络接口
      const filteredInterfaces = Object.keys(networkInterfaces).filter(interfaceName => {
        return !interfaceName.includes('docker') && 
               !interfaceName.includes('br-') && 
               !interfaceName.includes('veth') && 
               !interfaceName.includes('lo') &&
               !interfaceName.includes('virbr') &&
               !interfaceName.includes('vmnet')
      })
      
      filteredInterfaces.forEach(interfaceName => {
        const interfaces = networkInterfaces[interfaceName]
        const ipv4Interface = interfaces.find(iface => iface.family === 'IPv4' && !iface.internal)
        
        if (ipv4Interface) {
          const networkSpeed = getNetworkSpeedDelta(interfaceName)
          networkStats[interfaceName] = {
            address: ipv4Interface.address,
            netmask: ipv4Interface.netmask,
            mac: ipv4Interface.mac,
            rxSpeed: networkSpeed.rxSpeed,
            txSpeed: networkSpeed.txSpeed,
            rxSpeedFormatted: networkSpeed.rxSpeedFormatted,
            txSpeedFormatted: networkSpeed.txSpeedFormatted
          }
        }
      })
      
      // 获取系统运行时间
      const uptime = os.uptime()
      const uptimeFormatted = formatUptime(uptime)
      
      // 获取系统信息
      const systemInfo = {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        release: os.release(),
        nodeVersion: process.version,
        uptime: uptime,
        uptimeFormatted: uptimeFormatted,
        cpu: {
          usage: cpuUsage,
          cores: os.cpus().length,
          model: os.cpus()[0].model,
          coresUsage: cpuCoresUsage
        },
        memory: memoryUsage,
        swap: swapUsage,
        disk: diskUsage,
        network: networkStats,
        timestamp: Date.now()
      }
      
      // 更新缓存
      cachedSystemInfo = systemInfo
      lastCacheTime = now
      
      res.json(systemInfo)
    } catch (error) {
      console.error('Failed to get system info:', error)
      res.status(500).json({ 
        error: { 
          code: 500, 
          message: 'Failed to get system info: ' + error.message 
        } 
      })
    }
  }

  // 获取实时网速（Dashboard专用）
  async getRealtimeSpeed(req, res) {
    try {
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
    } catch (error) {
      console.error('Failed to get realtime speed:', error)
      res.status(500).json({ 
        error: { 
          code: 500, 
          message: 'Failed to get realtime speed' 
        } 
      })
    }
  }

  // 获取设备网速（专门用于网速显示）
  async getDeviceNetworkSpeed(req, res) {
    try {
      const networkInterfaces = os.networkInterfaces()
      
      // 过滤掉虚拟网络接口，只获取物理网卡
      const filteredInterfaces = Object.keys(networkInterfaces).filter(interfaceName => {
        return !interfaceName.includes('docker') && 
               !interfaceName.includes('br-') && 
               !interfaceName.includes('veth') && 
               !interfaceName.includes('lo') &&
               !interfaceName.includes('virbr') &&
               !interfaceName.includes('vmnet') &&
               !interfaceName.startsWith('docker')
      })
      
      let totalRxSpeed = 0
      let totalTxSpeed = 0
      
      filteredInterfaces.forEach(interfaceName => {
        const networkSpeed = getNetworkSpeedDelta(interfaceName)
        totalRxSpeed += networkSpeed.rxSpeed
        totalTxSpeed += networkSpeed.txSpeed
      })
      
      res.json({
        downloadSpeed: Math.round(totalRxSpeed),
        uploadSpeed: Math.round(totalTxSpeed),
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to get device network speed:', error)
      res.status(500).json({ 
        error: { 
          code: 500, 
          message: 'Failed to get device network speed' 
        } 
      })
    }
  }
}

// 辅助函数：获取CPU使用率
function getCpuUsage() {
  return new Promise((resolve) => {
    const startMeasure = cpuAverage()
    
    setTimeout(() => {
      const endMeasure = cpuAverage()
      const idleDifference = endMeasure.idle - startMeasure.idle
      const totalDifference = endMeasure.total - startMeasure.total
      const cpuPercentage = 100 - Math.round((idleDifference / totalDifference) * 100)
      
      resolve(cpuPercentage)
    }, 200) // 增加到200ms以提高准确性
  })
}

// 辅助函数：获取每个CPU核心的使用率
function getCpuCoresUsage() {
  return new Promise((resolve) => {
    const cpus = os.cpus()
    const startMeasures = cpus.map(cpu => cpuAveragePerCore(cpu))
    
    setTimeout(() => {
      const endMeasures = cpus.map(cpu => cpuAveragePerCore(os.cpus()[cpus.indexOf(cpu)]))
      const coreUsages = startMeasures.map((start, index) => {
        const end = endMeasures[index]
        const idleDifference = end.idle - start.idle
        const totalDifference = end.total - start.total
        return 100 - Math.round((idleDifference / totalDifference) * 100)
      })
      
      resolve(coreUsages)
    }, 200) // 增加到200ms以提高准确性
  })
}

// 辅助函数：获取单个CPU核心的平均使用率
function cpuAveragePerCore(cpu) {
  let totalTick = 0
  let totalIdle = 0
  
  for (let type in cpu.times) {
    totalTick += cpu.times[type]
  }
  totalIdle = cpu.times.idle
  
  return {
    idle: totalIdle,
    total: totalTick
  }
}

// 辅助函数：获取CPU平均使用率
function cpuAverage() {
  const cpus = os.cpus()
  let totalIdle = 0
  let totalTick = 0
  
  cpus.forEach(cpu => {
    for (let type in cpu.times) {
      totalTick += cpu.times[type]
    }
    totalIdle += cpu.times.idle
  })
  
  return {
    idle: totalIdle / cpus.length,
    total: totalTick / cpus.length
  }
}

// 辅助函数：获取磁盘使用情况
function getDiskUsage(path) {
  return new Promise((resolve, reject) => {
    disk.check(path, (err, info) => {
      if (err) {
        reject(err)
      } else {
        resolve(info)
      }
    })
  })
}

// 辅助函数：获取swap信息
function getSwapInfo() {
  return new Promise((resolve, reject) => {
    try {
      // 尝试读取/proc/meminfo获取swap信息
      const meminfo = fs.readFileSync('/proc/meminfo', 'utf8')
      const lines = meminfo.split('\n')
      
      let swapTotal = 0
      let swapFree = 0
      
      lines.forEach(line => {
        if (line.startsWith('SwapTotal:')) {
          swapTotal = parseInt(line.split(':')[1].trim()) * 1024 // 转换为字节
        } else if (line.startsWith('SwapFree:')) {
          swapFree = parseInt(line.split(':')[1].trim()) * 1024 // 转换为字节
        }
      })
      
      const swapUsed = swapTotal - swapFree
      const swapPercentage = swapTotal > 0 ? Math.round((swapUsed / swapTotal) * 100) : 0
      
      resolve({
        total: swapTotal,
        used: swapUsed,
        free: swapFree,
        percentage: swapPercentage
      })
    } catch (error) {
      // 如果读取失败，尝试使用其他方法
      try {
        // 在某些系统上可能有/proc/swaps文件
        const swaps = fs.readFileSync('/proc/swaps', 'utf8')
        const lines = swaps.split('\n')
        
        let swapTotal = 0
        
        // 跳过标题行，处理每一行swap信息
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim()
          if (line && !line.startsWith('Filename')) {
            const parts = line.split(/\s+/)
            if (parts.length >= 3) {
              swapTotal += parseInt(parts[2]) * 1024 // 转换为字节
            }
          }
        }
        
        if (swapTotal > 0) {
          // 如果有swap，但无法获取详细信息，则返回基本数据
          resolve({
            total: swapTotal,
            used: 0,
            free: swapTotal,
            percentage: 0
          })
        } else {
          // 没有swap
          resolve({
            total: 0,
            used: 0,
            free: 0,
            percentage: 0
          })
        }
      } catch (innerError) {
        reject(error)
      }
    }
  })
}

// 辅助函数：格式化字节数
function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 辅助函数：格式化运行时间
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  // 移除秒数显示，只精确到分钟
  
  let result = ''
  if (days > 0) result += `${days}天 `
  if (hours > 0) result += `${hours}小时 `
  if (minutes > 0) result += `${minutes}分钟`
  
  return result || '0分钟'
}

// 辅助函数：获取网络速度
function getNetworkSpeed(interfaceName) {
  try {
    const fs = require('fs')
    const stats = fs.readFileSync(`/sys/class/net/${interfaceName}/statistics/rx_bytes`, 'utf8')
    const txStats = fs.readFileSync(`/sys/class/net/${interfaceName}/statistics/tx_bytes`, 'utf8')
    
    return {
      rx: parseInt(stats.trim()),
      tx: parseInt(txStats.trim()),
      rxFormatted: formatBytes(parseInt(stats.trim())),
      txFormatted: formatBytes(parseInt(txStats.trim()))
    }
  } catch (error) {
    return {
      rx: 0,
      tx: 0,
      rxFormatted: '0 B',
      txFormatted: '0 B'
    }
  }
}

// 全局变量存储上一次的网络统计
let lastNetworkStats = {}

// 缓存系统信息，避免过于频繁的计算
let cachedSystemInfo = null
let lastCacheTime = 0
const CACHE_DURATION = 800 // 缓存800毫秒

// 辅助函数：获取网络速度变化
function getNetworkSpeedDelta(interfaceName) {
  try {
    const fs = require('fs')
    const currentRx = parseInt(fs.readFileSync(`/sys/class/net/${interfaceName}/statistics/rx_bytes`, 'utf8').trim())
    const currentTx = parseInt(fs.readFileSync(`/sys/class/net/${interfaceName}/statistics/tx_bytes`, 'utf8').trim())
    
    if (!lastNetworkStats[interfaceName]) {
      lastNetworkStats[interfaceName] = { rx: currentRx, tx: currentTx, timestamp: Date.now() }
      return { rxSpeed: 0, txSpeed: 0, rxSpeedFormatted: '0 B/s', txSpeedFormatted: '0 B/s' }
    }
    
    const lastStats = lastNetworkStats[interfaceName]
    const timeDelta = (Date.now() - lastStats.timestamp) / 1000 // 转换为秒
    
    if (timeDelta === 0) {
      return { rxSpeed: 0, txSpeed: 0, rxSpeedFormatted: '0 B/s', txSpeedFormatted: '0 B/s' }
    }
    
    const rxSpeed = (currentRx - lastStats.rx) / timeDelta
    const txSpeed = (currentTx - lastStats.tx) / timeDelta
    
    // 更新上一次的统计
    lastNetworkStats[interfaceName] = { rx: currentRx, tx: currentTx, timestamp: Date.now() }
    
    return {
      rxSpeed: rxSpeed,
      txSpeed: txSpeed,
      rxSpeedFormatted: formatBytes(rxSpeed) + '/s',
      txSpeedFormatted: formatBytes(txSpeed) + '/s'
    }
  } catch (error) {
    return { rxSpeed: 0, txSpeed: 0, rxSpeedFormatted: '0 B/s', txSpeedFormatted: '0 B/s' }
  }
}

module.exports = new SystemController()