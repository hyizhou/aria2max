import * as os from 'os'
import * as disk from 'diskusage'
import * as fs from 'fs'
import aria2Client from '../config/aria2'
import type { SystemInfo, NetworkSpeedInfo, DiskInfo, SwapInfo, DeviceNetworkSpeedResponse } from '@shared/types'

// 缓存系统信息
let cachedSystemInfo: SystemInfo | null = null
let lastCacheTime = 0
const CACHE_DURATION = 800

// 全局变量存储上一次的网络统计
const lastNetworkStats: Record<string, { rx: number; tx: number; timestamp: number }> = {}

// CPU 平均信息
interface CpuAverage {
  idle: number
  total: number
}

// 辅助函数：获取CPU使用率
function getCpuUsage(): Promise<number> {
  return new Promise((resolve) => {
    const startMeasure = cpuAverage()

    setTimeout(() => {
      const endMeasure = cpuAverage()
      const idleDifference = endMeasure.idle - startMeasure.idle
      const totalDifference = endMeasure.total - startMeasure.total
      const cpuPercentage = 100 - Math.round((idleDifference / totalDifference) * 100)

      resolve(cpuPercentage)
    }, 200)
  })
}

// 辅助函数：获取每个CPU核心的使用率
function getCpuCoresUsage(): Promise<number[]> {
  return new Promise((resolve) => {
    const cpus = os.cpus()
    const startMeasures = cpus.map(cpu => cpuAveragePerCore(cpu))

    setTimeout(() => {
      const currentCpus = os.cpus()
      const endMeasures = currentCpus.map(cpu => cpuAveragePerCore(cpu))
      const coreUsages = startMeasures.map((start, index) => {
        const end = endMeasures[index]
        const idleDifference = end.idle - start.idle
        const totalDifference = end.total - start.total
        return 100 - Math.round((idleDifference / totalDifference) * 100)
      })

      resolve(coreUsages)
    }, 200)
  })
}

// 辅助函数：获取单个CPU核心的平均使用率
function cpuAveragePerCore(cpu: os.CpuInfo): CpuAverage {
  let totalTick = 0
  let totalIdle = 0

  for (const type in cpu.times) {
    totalTick += cpu.times[type as keyof os.CpuInfo['times']]
  }
  totalIdle = cpu.times.idle

  return {
    idle: totalIdle,
    total: totalTick
  }
}

// 辅助函数：获取CPU平均使用率
function cpuAverage(): CpuAverage {
  const cpus = os.cpus()
  let totalIdle = 0
  let totalTick = 0

  cpus.forEach(cpu => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type as keyof os.CpuInfo['times']]
    }
    totalIdle += cpu.times.idle
  })

  return {
    idle: totalIdle / cpus.length,
    total: totalTick / cpus.length
  }
}

// 磁盘使用情况类型
interface DiskUsageResult {
  total: number
  free: number
  available: number
}

// 辅助函数：获取磁盘使用情况
function getDiskUsage(path: string): Promise<DiskUsageResult> {
  return new Promise((resolve, reject) => {
    fs.stat(path, (err, stats) => {
      if (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          return reject(new Error(`Directory not found: ${path}`))
        }
        return reject(err)
      }
      if (!stats.isDirectory()) {
        return reject(new Error(`Path is not a directory: ${path}`))
      }
      disk.check(path, (err, info) => {
        if (err) {
          reject(err)
        } else if (info) {
          resolve(info)
        } else {
          reject(new Error('Failed to get disk usage info'))
        }
      })
    })
  })
}

// 辅助函数：获取swap信息
function getSwapInfo(): Promise<SwapInfo> {
  return new Promise((resolve, reject) => {
    try {
      const meminfo = fs.readFileSync('/proc/meminfo', 'utf8')
      const lines = meminfo.split('\n')

      let swapTotal = 0
      let swapFree = 0

      lines.forEach(line => {
        if (line.startsWith('SwapTotal:')) {
          swapTotal = parseInt(line.split(':')[1].trim()) * 1024
        } else if (line.startsWith('SwapFree:')) {
          swapFree = parseInt(line.split(':')[1].trim()) * 1024
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
      try {
        const swaps = fs.readFileSync('/proc/swaps', 'utf8')
        const swapLines = swaps.split('\n')

        let swapTotal = 0

        for (let i = 1; i < swapLines.length; i++) {
          const line = swapLines[i].trim()
          if (line && !line.startsWith('Filename')) {
            const parts = line.split(/\s+/)
            if (parts.length >= 3) {
              swapTotal += parseInt(parts[2]) * 1024
            }
          }
        }

        if (swapTotal > 0) {
          resolve({
            total: swapTotal,
            used: 0,
            free: swapTotal,
            percentage: 0
          })
        } else {
          resolve({
            total: 0,
            used: 0,
            free: 0,
            percentage: 0
          })
        }
      } catch {
        reject(error)
      }
    }
  })
}

// 辅助函数：格式化字节数
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 辅助函数：格式化运行时间
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  let result = ''
  if (days > 0) result += `${days}天 `
  if (hours > 0) result += `${hours}小时 `
  if (minutes > 0) result += `${minutes}分钟`

  return result || '0分钟'
}

// 网络速度变化
interface NetworkSpeedDelta {
  rxSpeed: number
  txSpeed: number
  rxSpeedFormatted: string
  txSpeedFormatted: string
}

// 辅助函数：获取网络速度变化
function getNetworkSpeedDelta(interfaceName: string): NetworkSpeedDelta {
  try {
    const currentRx = parseInt(fs.readFileSync(`/sys/class/net/${interfaceName}/statistics/rx_bytes`, 'utf8').trim())
    const currentTx = parseInt(fs.readFileSync(`/sys/class/net/${interfaceName}/statistics/tx_bytes`, 'utf8').trim())

    if (!lastNetworkStats[interfaceName]) {
      lastNetworkStats[interfaceName] = { rx: currentRx, tx: currentTx, timestamp: Date.now() }
      return { rxSpeed: 0, txSpeed: 0, rxSpeedFormatted: '0 B/s', txSpeedFormatted: '0 B/s' }
    }

    const lastStats = lastNetworkStats[interfaceName]
    const timeDelta = (Date.now() - lastStats.timestamp) / 1000

    if (timeDelta === 0) {
      return { rxSpeed: 0, txSpeed: 0, rxSpeedFormatted: '0 B/s', txSpeedFormatted: '0 B/s' }
    }

    const rxSpeed = (currentRx - lastStats.rx) / timeDelta
    const txSpeed = (currentTx - lastStats.tx) / timeDelta

    lastNetworkStats[interfaceName] = { rx: currentRx, tx: currentTx, timestamp: Date.now() }

    return {
      rxSpeed: rxSpeed,
      txSpeed: txSpeed,
      rxSpeedFormatted: formatBytes(rxSpeed) + '/s',
      txSpeedFormatted: formatBytes(txSpeed) + '/s'
    }
  } catch {
    return { rxSpeed: 0, txSpeed: 0, rxSpeedFormatted: '0 B/s', txSpeedFormatted: '0 B/s' }
  }
}

export async function getSystemInfo(): Promise<SystemInfo> {
  const now = Date.now()
  if (cachedSystemInfo && (now - lastCacheTime) < CACHE_DURATION) {
    return cachedSystemInfo
  }

  const cpuUsage = await getCpuUsage()
  const cpuCoresUsage = await getCpuCoresUsage()

  const totalMemory = os.totalmem()
  const freeMemory = os.freemem()
  const usedMemory = totalMemory - freeMemory
  const memoryUsage = {
    total: totalMemory,
    used: usedMemory,
    free: freeMemory,
    percentage: Math.round((usedMemory / totalMemory) * 100)
  }

  let swapUsage: SwapInfo | null = null
  try {
    const swapInfo = await getSwapInfo()
    if (swapInfo.total > 0) {
      swapUsage = swapInfo
    }
  } catch (swapError) {
    const err = swapError as Error
    console.warn('Failed to get swap info:', err.message)
  }

  const downloadDir = aria2Client.downloadDir || process.env.DOWNLOAD_DIR || '/tmp'
  let diskUsage: DiskInfo | null = null

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
    const err = diskError as Error
    console.error('Failed to get disk usage:', err.message)
    diskUsage = {
      path: downloadDir,
      total: 0,
      used: 0,
      free: 0,
      percentage: 0,
      error: '无法获取磁盘信息'
    }
  }

  const networkInterfaces = os.networkInterfaces()
  const networkStats: Record<string, NetworkSpeedInfo> = {}

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
    if (!interfaces) return

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

  const uptime = os.uptime()
  const uptimeFormatted = formatUptime(uptime)

  const systemInfo: SystemInfo = {
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

  cachedSystemInfo = systemInfo
  lastCacheTime = now

  return systemInfo
}

export function getDeviceNetworkSpeed(): DeviceNetworkSpeedResponse {
  const networkInterfaces = os.networkInterfaces()

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

  return {
    downloadSpeed: Math.round(totalRxSpeed),
    uploadSpeed: Math.round(totalTxSpeed),
    timestamp: new Date().toISOString()
  }
}
