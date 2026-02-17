/**
 * 任务相关类型定义
 */

import type { Aria2Task, Aria2TaskDetail, Aria2TaskStatus } from './aria2'

// 重新导出 Aria2 类型
export type { Aria2Task, Aria2TaskDetail, Aria2TaskStatus }

// 添加任务请求
export interface AddTaskRequest {
  uri: string
  options?: Record<string, string | number>
}

// 添加任务响应
export interface AddTaskResponse {
  gid: string
}

// 任务列表响应
export interface TaskListResponse {
  tasks: Aria2Task[]
}

// 删除任务请求参数
export interface DeleteTaskParams {
  deleteFile?: string
}

// 元数据任务信息
export interface MetadataTask {
  gid: string
  name: string
  status: Aria2TaskStatus
}

// 清理元数据任务响应
export interface CleanMetadataTasksResponse {
  success: boolean
  message: string
  deletedTasks: MetadataTask[]
}

// 自动删除元数据响应
export interface AutoDeleteMetadataResponse {
  success: boolean
  message: string
}

// 任务操作响应
export interface TaskOperationResponse {
  success: boolean
}

// 任务选项
export interface TaskOptions {
  dir?: string
  out?: string
  header?: string[]
  'max-connection-per-server'?: string
  'split'?: string
  'bt-metadata-only'?: string
  'bt-save-metadata'?: string
  [key: string]: string | number | string[] | undefined
}
