// 系统配置设置数据结构
import { defineStore } from 'pinia'

export interface SystemSetting {
  key: string
  type: 'text' | 'password' | 'boolean'
  labelKey: string
  helpTextKey: string
  placeholderKey?: string
}

// 系统配置设置数据结构
export const systemSettings: SystemSetting[] = [
  {
    key: 'aria2RpcUrl',
    type: 'text',
    labelKey: 'systemConfig.aria2RpcUrl.label',
    helpTextKey: 'systemConfig.aria2RpcUrl.helpText',
    placeholderKey: 'systemConfig.aria2RpcUrl.placeholder'
  },
  {
    key: 'aria2RpcSecret',
    type: 'password',
    labelKey: 'systemConfig.aria2RpcSecret.label',
    helpTextKey: 'systemConfig.aria2RpcSecret.helpText',
    placeholderKey: 'systemConfig.aria2RpcSecret.placeholder'
  },
  {
    key: 'downloadDir',
    type: 'text',
    labelKey: 'systemConfig.downloadDir.label',
    helpTextKey: 'systemConfig.downloadDir.helpText',
    placeholderKey: 'systemConfig.downloadDir.placeholder'
  },
  {
    key: 'aria2ConfigPath',
    type: 'text',
    labelKey: 'systemConfig.aria2ConfigPath.label',
    helpTextKey: 'systemConfig.aria2ConfigPath.helpText',
    placeholderKey: 'systemConfig.aria2ConfigPath.placeholder'
  },
  {
    key: 'autoDeleteMetadata',
    type: 'boolean',
    labelKey: 'systemConfig.autoDeleteMetadata.label',
    helpTextKey: 'systemConfig.autoDeleteMetadata.helpText'
  },
  {
    key: 'autoDeleteAria2FilesOnRemove',
    type: 'boolean',
    labelKey: 'systemConfig.autoDeleteAria2FilesOnRemove.label',
    helpTextKey: 'systemConfig.autoDeleteAria2FilesOnRemove.helpText'
  },
  {
    key: 'autoDeleteAria2FilesOnSchedule',
    type: 'boolean',
    labelKey: 'systemConfig.autoDeleteAria2FilesOnSchedule.label',
    helpTextKey: 'systemConfig.autoDeleteAria2FilesOnSchedule.helpText'
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
