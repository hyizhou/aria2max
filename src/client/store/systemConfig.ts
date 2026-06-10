// 系统配置设置数据结构
export interface SystemSetting {
  key: string
  type: 'text' | 'password' | 'boolean'
  labelKey: string
  helpTextKey: string
  placeholderKey?: string
}

// 系统配置字段元数据（添加新配置字段只需在此处添加一项）
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
    key: 'aria2HostDir',
    type: 'text',
    labelKey: 'systemConfig.aria2HostDir.label',
    helpTextKey: 'systemConfig.aria2HostDir.helpText',
    placeholderKey: 'systemConfig.aria2HostDir.placeholder'
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

// 系统默认配置（自动从 systemSettings 生成）
export const defaultSystemConfig: Record<string, any> = Object.fromEntries(
  systemSettings.map(s => [s.key, s.type === 'boolean' ? false : ''])
)
