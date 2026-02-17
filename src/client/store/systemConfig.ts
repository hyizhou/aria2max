// 系统配置设置数据结构
import { defineStore } from 'pinia'

export interface SystemSetting {
  key: string
  type: 'text' | 'password' | 'boolean'
  label: string
  helpText: string
  placeholder?: string
}

// 系统配置设置数据结构
export const systemSettings: SystemSetting[] = [
  {
    key: 'aria2RpcUrl',
    type: 'text',
    label: 'Aria2 RPC 地址',
    helpText: 'Aria2 RPC 服务器地址',
    placeholder: '例如: http://localhost:6800/jsonrpc'
  },
  {
    key: 'aria2RpcSecret',
    type: 'password',
    label: 'RPC 密钥',
    helpText: '留空表示不修改现有RPC密钥。只有在此字段输入新值时，才会更新RPC密钥配置。',
    placeholder: '留空表示不修改现有密钥'
  },
  {
    key: 'downloadDir',
    type: 'text',
    label: '文件管理目录',
    helpText: '注意：此路径仅用于本项目的文件管理功能，不是Aria2的下载目录。文件管理功能通过此路径访问和管理已下载的文件，但不会影响Aria2的实际下载路径设置。',
    placeholder: '例如: /home/user/downloads'
  },
  {
    key: 'aria2ConfigPath',
    type: 'text',
    label: 'Aria2配置文件路径',
    helpText: '指定aria2配置文件路径。配置后所有修改将持久化保存至该文件，aria2重启后配置保持不变。留空时配置仅保存在内存中，重启后恢复初始状态',
    placeholder: '/path/to/aria2.conf'
  },
  {
    key: 'autoDeleteMetadata',
    type: 'boolean',
    label: '自动删除元数据',
    helpText: '启用自动删除元数据文件(.torrent, .metalink等)，下载完成后自动清理这些元数据文件，节省磁盘空间'
  },
  {
    key: 'autoDeleteAria2FilesOnRemove',
    type: 'boolean',
    label: '删除任务时自动删除.aria2文件',
    helpText: '删除下载任务时自动删除对应的.aria2文件，避免产生残留文件'
  },
  {
    key: 'autoDeleteAria2FilesOnSchedule',
    type: 'boolean',
    label: '定时清理无任务关联的.aria2文件',
    helpText: '每30分钟自动清理一次无任务关联的.aria2文件，系统会扫描并删除没有对应下载任务的.aria2控制文件'
  }
]

// 系统默认配置
export const defaultSystemConfig: Record<string, any> = {
  aria2RpcUrl: '',
  aria2RpcSecret: '',
  downloadDir: '',
  aria2ConfigPath: '',
  autoDeleteMetadata: false,
  autoDeleteAria2FilesOnRemove: false,
  autoDeleteAria2FilesOnSchedule: false
}

// System Config Store
export const useSystemConfigStore = defineStore('systemConfig', {
  state: () => ({
    // 这个Store主要用于存储配置元数据，不包含实际的配置状态
    // 实际配置状态仍然在config.ts的useConfigStore中管理
  }),
  
  getters: {
    // 提供对配置元数据的访问
    getSystemSettings: () => () => systemSettings,
    getDefaultSystemConfig: () => () => defaultSystemConfig
  },
  
  actions: {
    // 可以添加与配置元数据相关的操作方法
  }
})