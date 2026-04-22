import * as os from 'os'
import si from 'systeminformation'
import aria2Client from '../config/aria2'
import { formatBytes } from '@shared/utils/format'
import type { SystemInfo, NetworkSpeedInfo, DiskInfo, DiskPartitionInfo, SwapInfo, DeviceNetworkSpeedResponse } from '@shared/types'

// 缓存系统信息（5秒缓存，减少 systeminformation 调用频率）
let cachedSystemInfo: SystemInfo | null = null
let lastCacheTime = 0
const CACHE_DURATION = 5000

// 需要过滤的虚拟接口名模式
const EXCLUDE_INTERFACE_PATTERNS = ['docker', 'br-', 'veth', 'lo', 'virbr', 'vmnet']
// 需要过滤的虚拟文件系统类型
const EXCLUDE_FS_TYPES = ['tmpfs', 'devtmpfs', 'overlay', 'squashfs', 'iso9660']

function isFilteredInterface(name: string): boolean {
  return EXCLUDE_INTERFACE_PATTERNS.some(pattern => name.includes(pattern))
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

export async function getSystemInfo(): Promise<SystemInfo> {
  const now = Date.now()
  if (cachedSystemInfo && (now - lastCacheTime) < CACHE_DURATION) {
    return cachedSystemInfo
  }

  // 并行获取所有系统数据
  const [cpuData, loadData, memData, fsSizeData, interfacesData, statsData] =
    await Promise.all([
      si.cpu(),
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.networkInterfaces(),
      si.networkStats()
    ])

  // CPU 信息
  const cpuInfo = {
    usage: Math.round(loadData.currentLoad),
    cores: cpuData.cores,
    model: `${cpuData.manufacturer} ${cpuData.brand}`,
    coresUsage: loadData.cpus.map(core => Math.round(core.load))
  }

  // 内存信息（用 available 计算真实使用量，排除 buff/cache）
  const actualUsed = memData.total - memData.available
  const memoryInfo = {
    total: memData.total,
    used: actualUsed,
    free: memData.available,
    percentage: Math.round((actualUsed / memData.total) * 100),
    cache: memData.buffcache,
    cachePercentage: Math.round((memData.buffcache / memData.total) * 100)
  }

  // Swap 信息（全平台）
  let swapInfo: SwapInfo | null = null
  if (memData.swaptotal > 0) {
    swapInfo = {
      total: memData.swaptotal,
      used: memData.swapused,
      free: memData.swapfree,
      percentage: Math.round((memData.swapused / memData.swaptotal) * 100)
    }
  }

  // 磁盘信息（多分区支持）
  const downloadDir = aria2Client.downloadDir || process.env.DOWNLOAD_DIR || '/tmp'
  let diskInfo: DiskInfo | null = null

  try {
    // 过滤虚拟文件系统，只保留真实磁盘
    const realPartitions = fsSizeData.filter(fs =>
      !EXCLUDE_FS_TYPES.includes(fs.type) && fs.size > 0
    )

    // 查找下载目录所在的分区（最长路径匹配）
    const matchedFs = realPartitions
      .filter(fs => downloadDir.startsWith(fs.mount))
      .sort((a, b) => b.mount.length - a.mount.length)[0]
      || realPartitions.find(fs => fs.mount === '/' || fs.mount === 'C:')
      || realPartitions[0]

    // 构建分区列表
    const partitions: DiskPartitionInfo[] = realPartitions.map(fs => ({
      mount: fs.mount,
      type: fs.type,
      total: fs.size,
      used: fs.used,
      free: fs.available,
      percentage: Math.round(fs.use)
    }))

    if (matchedFs) {
      diskInfo = {
        path: downloadDir,
        total: matchedFs.size,
        used: matchedFs.used,
        free: matchedFs.available,
        percentage: Math.round(matchedFs.use),
        partitions
      }
    } else {
      diskInfo = {
        path: downloadDir,
        total: 0,
        used: 0,
        free: 0,
        percentage: 0,
        partitions
      }
    }
  } catch (error) {
    diskInfo = {
      path: downloadDir,
      total: 0,
      used: 0,
      free: 0,
      percentage: 0,
      partitions: [],
      error: '无法获取磁盘信息'
    }
  }

  // 网络信息
  const networkStats: Record<string, NetworkSpeedInfo> = {}
  const filteredInterfaces = interfacesData.filter(iface =>
    !iface.internal && !isFilteredInterface(iface.iface)
  )

  for (const iface of filteredInterfaces) {
    const stats = statsData.find(s => s.iface === iface.iface)
    const rxSpeed = stats?.rx_sec ?? 0
    const txSpeed = stats?.tx_sec ?? 0

    networkStats[iface.iface] = {
      address: iface.ip4 || '',
      netmask: iface.ip4subnet || '',
      mac: iface.mac,
      rxSpeed,
      txSpeed,
      rxSpeedFormatted: formatBytes(rxSpeed) + '/s',
      txSpeedFormatted: formatBytes(txSpeed) + '/s'
    }
  }

  // 系统基础信息（os 模块已跨平台）
  const uptime = os.uptime()

  const systemInfo: SystemInfo = {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    release: os.release(),
    nodeVersion: process.version,
    uptime,
    uptimeFormatted: formatUptime(uptime),
    cpu: cpuInfo,
    memory: memoryInfo,
    swap: swapInfo,
    disk: diskInfo,
    network: networkStats,
    timestamp: Date.now()
  }

  cachedSystemInfo = systemInfo
  lastCacheTime = now

  return systemInfo
}

export async function getDeviceNetworkSpeed(): Promise<DeviceNetworkSpeedResponse> {
  const statsData = await si.networkStats()

  const filteredStats = statsData.filter(
    stat => !isFilteredInterface(stat.iface)
  )

  let totalRxSpeed = 0
  let totalTxSpeed = 0

  for (const stat of filteredStats) {
    totalRxSpeed += stat.rx_sec ?? 0
    totalTxSpeed += stat.tx_sec ?? 0
  }

  return {
    downloadSpeed: Math.round(totalRxSpeed),
    uploadSpeed: Math.round(totalTxSpeed),
    timestamp: new Date().toISOString()
  }
}
