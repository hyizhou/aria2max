/**
 * 系统配置相关类型定义
 */

// 系统配置
export interface SystemConfig {
  aria2RpcUrl: string
  aria2RpcSecret: string
  downloadDir: string
  aria2ConfigPath: string
  autoDeleteMetadata: boolean
  autoDeleteAria2FilesOnRemove: boolean
  autoDeleteAria2FilesOnSchedule: boolean
}

// 系统配置更新请求（部分字段可选）
export type SystemConfigUpdateRequest = Partial<SystemConfig>

// 系统状态响应
export interface SystemStatusResponse {
  version: string
  enabledFeatures: string[]
  sessionId: string
}

// CPU 信息
export interface CpuInfo {
  usage: number
  cores: number
  model: string
  coresUsage: number[]
}

// 内存信息
export interface MemoryInfo {
  total: number
  used: number
  free: number
  percentage: number
}

// Swap 信息
export interface SwapInfo {
  total: number
  used: number
  free: number
  percentage: number
}

// 磁盘信息
export interface DiskInfo {
  path: string
  total: number
  used: number
  free: number
  percentage: number
  error?: string
}

// 网络速度信息
export interface NetworkSpeedInfo {
  address: string
  netmask: string
  mac: string
  rxSpeed: number
  txSpeed: number
  rxSpeedFormatted: string
  txSpeedFormatted: string
}

// 系统完整信息
export interface SystemInfo {
  hostname: string
  platform: string
  arch: string
  release: string
  nodeVersion: string
  uptime: number
  uptimeFormatted: string
  cpu: CpuInfo
  memory: MemoryInfo
  swap: SwapInfo | null
  disk: DiskInfo | null
  network: Record<string, NetworkSpeedInfo>
  timestamp: number
}

// 实时网速响应
export interface RealtimeSpeedResponse {
  downloadSpeed: number
  uploadSpeed: number
  activeConnections: number
  timestamp: string
}

// 设备网速响应
export interface DeviceNetworkSpeedResponse {
  downloadSpeed: number
  uploadSpeed: number
  timestamp: string
}

// 测试连接响应
export interface TestConnectionResponse {
  success: boolean
  message: string
  details?: {
    version?: string
    rpcUrl?: string
    hasSecret?: boolean
    globalOptions?: Record<string, string> | null
    error?: string
    secretLength?: number
  }
}

// 保存配置响应
export interface SaveConfigResponse {
  success: boolean
  error?: {
    message: string
  }
}
