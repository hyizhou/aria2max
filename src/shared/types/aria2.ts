/**
 * Aria2 RPC 相关类型定义
 */

// Aria2 任务状态类型
export type Aria2TaskStatus = 'active' | 'waiting' | 'paused' | 'error' | 'complete' | 'removed'

// Aria2 文件信息
export interface Aria2File {
  index: string
  path: string
  length: string
  completedLength: string
  selected: string
  uris?: Aria2Uri[]
  size?: number
  completed?: number
}

// Aria2 URI 信息
export interface Aria2Uri {
  uri: string
  status: string
}

// Aria2 BT 信息
export interface Aria2Bittorrent {
  info?: {
    name: string
  }
  comment?: string
  creationDate?: string
  mode?: string
  announceList?: string[][]
}

// Aria2 Peer 信息
export interface Aria2Peer {
  peerId?: string
  ip?: string
  port?: string
  bitfield?: string
  amChoking?: string
  peerChoking?: string
  downloadSpeed?: string
  uploadSpeed?: string
  seeder?: string
}

// Aria2 Tracker 信息
export interface Aria2Tracker {
  trackerId?: string
  url?: string
  status?: string
}

// Aria2 任务（精简版，用于列表）
export interface Aria2Task {
  gid: string
  status: Aria2TaskStatus
  totalLength: string
  completedLength: string
  downloadSpeed: string
  uploadSpeed: string
  dir?: string
  bittorrent?: Aria2Bittorrent
  files?: Aria2File[]
  connections?: string
  errorCode?: string
  errorMessage?: string
}

// Aria2 任务详情（包含更多连接信息）
export interface Aria2TaskDetail extends Aria2Task {
  peers?: Aria2Peer[]
  trackers?: Aria2Tracker[]
}

// Aria2 版本信息
export interface Aria2Version {
  version: string
  enabledFeatures: string[]
}

// Aria2 会话信息
export interface Aria2SessionInfo {
  sessionId: string
}

// Aria2 系统状态
export interface Aria2SystemStatus {
  version: string
  enabledFeatures: string[]
  sessionId: string
}

// Aria2 全局选项
export interface Aria2GlobalOptions {
  [key: string]: string
}

// Aria2 RPC 请求
export interface Aria2RpcRequest {
  jsonrpc: '2.0'
  id: string
  method: string
  params: (string | object | unknown[])[]
}

// Aria2 RPC 响应
export interface Aria2RpcResponse<T = unknown> {
  jsonrpc: '2.0'
  id: string
  result?: T
  error?: {
    code: number
    message: string
  }
}

// Aria2 连接测试结果
export interface Aria2ConnectionTestResult {
  success: boolean
  message: string
  details?: {
    version?: string
    rpcUrl?: string
    hasSecret?: boolean
    secretLength?: number
    globalOptions?: Aria2GlobalOptions | null
    error?: string
  }
}

// Aria2 连接状态
export interface Aria2ConnectionStatus {
  connected: boolean
  message: string
}
