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
      let configFile = {}

      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf8')
        configFile = JSON.parse(configData)
      }

      // 返回配置信息
      res.json({
        aria2RpcUrl: configFile.aria2RpcUrl || process.env.ARIA2_RPC_URL || 'http://localhost:6800/jsonrpc',
        aria2RpcSecret: configFile.aria2RpcSecret || process.env.ARIA2_RPC_SECRET || '',
        downloadDir: configFile.downloadDir || process.env.DOWNLOAD_DIR || '/tmp',
        autoDeleteMetadata: configFile.autoDeleteMetadata !== undefined ? configFile.autoDeleteMetadata : (process.env.AUTO_DELETE_METADATA === 'true'),
        autoDeleteAria2Files: configFile.autoDeleteAria2Files !== undefined ? configFile.autoDeleteAria2Files : (process.env.AUTO_DELETE_ARIA2_FILES === 'true')
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
      const { aria2RpcUrl, aria2RpcSecret, downloadDir, autoDeleteMetadata, autoDeleteAria2Files } = req.body

      // 更新运行时配置
      if (aria2RpcUrl) {
        process.env.ARIA2_RPC_URL = aria2RpcUrl
      }
      if (aria2RpcSecret !== undefined) {
        process.env.ARIA2_RPC_SECRET = aria2RpcSecret
      }
      if (downloadDir) {
        process.env.DOWNLOAD_DIR = downloadDir
      }
      if (autoDeleteMetadata !== undefined) {
        process.env.AUTO_DELETE_METADATA = autoDeleteMetadata.toString()
      }
      if (autoDeleteAria2Files !== undefined) {
        process.env.AUTO_DELETE_ARIA2_FILES = autoDeleteAria2Files.toString()
      }

      // 更新 aria2 客户端配置
      if (aria2Client.updateConfig) {
        aria2Client.updateConfig({
          url: aria2RpcUrl || process.env.ARIA2_RPC_URL,
          secret: aria2RpcSecret !== undefined ? aria2RpcSecret : process.env.ARIA2_RPC_SECRET,
          downloadDir: downloadDir || process.env.DOWNLOAD_DIR
        })
      }

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
      await aria2Client.testConnection()
      res.json({ success: true })
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
      
      // 获取内存使用情况
      const totalMemory = os.totalmem()
      const freeMemory = os.freemem()
      const usedMemory = totalMemory - freeMemory
      const memoryUsage = {
        total: totalMemory,
        used: usedMemory,
        free: freeMemory,
        percentage: Math.round((usedMemory / totalMemory) * 100)
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