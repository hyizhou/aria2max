// Aria2配置设置数据结构
export interface Aria2Setting {
  key: string
  type: 'text' | 'number' | 'boolean' | 'select' | 'password'
  labelKey: string
  helpTextKey: string
  placeholder?: string
  options?: Array<{ label: string; value: string }>
  min?: number
  max?: number
}

// Aria2配置设置数据结构
export const aria2Settings: Aria2Setting[] = [
  // 文件保存设置
  {
    key: 'dir',
    type: 'text',
    labelKey: 'aria2Config.dir.label',
    helpTextKey: 'aria2Config.dir.helpText',
    placeholder: '/downloads'
  },
  {
    key: 'disk-cache',
    type: 'text',
    labelKey: 'aria2Config.disk-cache.label',
    helpTextKey: 'aria2Config.disk-cache.helpText',
    placeholder: '64M'
  },
  {
    key: 'file-allocation',
    type: 'select',
    labelKey: 'aria2Config.file-allocation.label',
    helpTextKey: 'aria2Config.file-allocation.helpText',
    options: [
      { label: 'none', value: 'none' },
      { label: 'prealloc', value: 'prealloc' },
      { label: 'trunc', value: 'trunc' },
      { label: 'falloc', value: 'falloc' }
    ]
  },
  {
    key: 'no-file-allocation-limit',
    type: 'text',
    labelKey: 'aria2Config.no-file-allocation-limit.label',
    helpTextKey: 'aria2Config.no-file-allocation-limit.helpText',
    placeholder: '64M'
  },
  {
    key: 'continue',
    type: 'boolean',
    labelKey: 'aria2Config.continue.label',
    helpTextKey: 'aria2Config.continue.helpText'
  },
  {
    key: 'always-resume',
    type: 'boolean',
    labelKey: 'aria2Config.always-resume.label',
    helpTextKey: 'aria2Config.always-resume.helpText'
  },
  {
    key: 'max-resume-failure-tries',
    type: 'number',
    labelKey: 'aria2Config.max-resume-failure-tries.label',
    helpTextKey: 'aria2Config.max-resume-failure-tries.helpText',
    placeholder: '0',
    min: 0
  },
  {
    key: 'remote-time',
    type: 'boolean',
    labelKey: 'aria2Config.remote-time.label',
    helpTextKey: 'aria2Config.remote-time.helpText'
  },

  // 进度保存设置
  {
    key: 'input-file',
    type: 'text',
    labelKey: 'aria2Config.input-file.label',
    helpTextKey: 'aria2Config.input-file.helpText',
    placeholder: '/config/aria2.session'
  },
  {
    key: 'save-session',
    type: 'text',
    labelKey: 'aria2Config.save-session.label',
    helpTextKey: 'aria2Config.save-session.helpText',
    placeholder: '/config/aria2.session'
  },
  {
    key: 'save-session-interval',
    type: 'number',
    labelKey: 'aria2Config.save-session-interval.label',
    helpTextKey: 'aria2Config.save-session-interval.helpText',
    placeholder: '1',
    min: 0
  },
  {
    key: 'auto-save-interval',
    type: 'number',
    labelKey: 'aria2Config.auto-save-interval.label',
    helpTextKey: 'aria2Config.auto-save-interval.helpText',
    placeholder: '20',
    min: 0
  },
  {
    key: 'force-save',
    type: 'boolean',
    labelKey: 'aria2Config.force-save.label',
    helpTextKey: 'aria2Config.force-save.helpText'
  },

  // 下载连接设置
  {
    key: 'max-file-not-found',
    type: 'number',
    labelKey: 'aria2Config.max-file-not-found.label',
    helpTextKey: 'aria2Config.max-file-not-found.helpText',
    placeholder: '10',
    min: 0
  },
  {
    key: 'max-tries',
    type: 'number',
    labelKey: 'aria2Config.max-tries.label',
    helpTextKey: 'aria2Config.max-tries.helpText',
    placeholder: '0',
    min: 0
  },
  {
    key: 'retry-wait',
    type: 'number',
    labelKey: 'aria2Config.retry-wait.label',
    helpTextKey: 'aria2Config.retry-wait.helpText',
    placeholder: '10',
    min: 0
  },
  {
    key: 'connect-timeout',
    type: 'number',
    labelKey: 'aria2Config.connect-timeout.label',
    helpTextKey: 'aria2Config.connect-timeout.helpText',
    placeholder: '10',
    min: 1
  },
  {
    key: 'timeout',
    type: 'number',
    labelKey: 'aria2Config.timeout.label',
    helpTextKey: 'aria2Config.timeout.helpText',
    placeholder: '10',
    min: 1
  },
  {
    key: 'max-concurrent-downloads',
    type: 'number',
    labelKey: 'aria2Config.max-concurrent-downloads.label',
    helpTextKey: 'aria2Config.max-concurrent-downloads.helpText',
    placeholder: '5',
    min: 1
  },
  {
    key: 'max-connection-per-server',
    type: 'number',
    labelKey: 'aria2Config.max-connection-per-server.label',
    helpTextKey: 'aria2Config.max-connection-per-server.helpText',
    placeholder: '32',
    min: 1
  },
  {
    key: 'split',
    type: 'number',
    labelKey: 'aria2Config.split.label',
    helpTextKey: 'aria2Config.split.helpText',
    placeholder: '64',
    min: 1
  },
  {
    key: 'min-split-size',
    type: 'text',
    labelKey: 'aria2Config.min-split-size.label',
    helpTextKey: 'aria2Config.min-split-size.helpText',
    placeholder: '1M'
  },
  {
    key: 'piece-length',
    type: 'text',
    labelKey: 'aria2Config.piece-length.label',
    helpTextKey: 'aria2Config.piece-length.helpText',
    placeholder: '1M'
  },
  {
    key: 'allow-piece-length-change',
    type: 'boolean',
    labelKey: 'aria2Config.allow-piece-length-change.label',
    helpTextKey: 'aria2Config.allow-piece-length-change.helpText'
  },
  {
    key: 'lowest-speed-limit',
    type: 'text',
    labelKey: 'aria2Config.lowest-speed-limit.label',
    helpTextKey: 'aria2Config.lowest-speed-limit.helpText',
    placeholder: '0'
  },
  {
    key: 'max-overall-download-limit',
    type: 'text',
    labelKey: 'aria2Config.max-overall-download-limit.label',
    helpTextKey: 'aria2Config.max-overall-download-limit.helpText',
    placeholder: '0'
  },
  {
    key: 'max-download-limit',
    type: 'text',
    labelKey: 'aria2Config.max-download-limit.label',
    helpTextKey: 'aria2Config.max-download-limit.helpText',
    placeholder: '0'
  },
  {
    key: 'disable-ipv6',
    type: 'boolean',
    labelKey: 'aria2Config.disable-ipv6.label',
    helpTextKey: 'aria2Config.disable-ipv6.helpText'
  },
  {
    key: 'http-accept-gzip',
    type: 'boolean',
    labelKey: 'aria2Config.http-accept-gzip.label',
    helpTextKey: 'aria2Config.http-accept-gzip.helpText'
  },
  {
    key: 'reuse-uri',
    type: 'boolean',
    labelKey: 'aria2Config.reuse-uri.label',
    helpTextKey: 'aria2Config.reuse-uri.helpText'
  },
  {
    key: 'no-netrc',
    type: 'boolean',
    labelKey: 'aria2Config.no-netrc.label',
    helpTextKey: 'aria2Config.no-netrc.helpText'
  },
  {
    key: 'allow-overwrite',
    type: 'boolean',
    labelKey: 'aria2Config.allow-overwrite.label',
    helpTextKey: 'aria2Config.allow-overwrite.helpText'
  },
  {
    key: 'auto-file-renaming',
    type: 'boolean',
    labelKey: 'aria2Config.auto-file-renaming.label',
    helpTextKey: 'aria2Config.auto-file-renaming.helpText'
  },
  {
    key: 'content-disposition-default-utf8',
    type: 'boolean',
    labelKey: 'aria2Config.content-disposition-default-utf8.label',
    helpTextKey: 'aria2Config.content-disposition-default-utf8.helpText'
  },

  // BT/PT 下载设置
  {
    key: 'listen-port',
    type: 'text',
    labelKey: 'aria2Config.listen-port.label',
    helpTextKey: 'aria2Config.listen-port.helpText',
    placeholder: '6999'
  },
  {
    key: 'dht-listen-port',
    type: 'text',
    labelKey: 'aria2Config.dht-listen-port.label',
    helpTextKey: 'aria2Config.dht-listen-port.helpText',
    placeholder: '6999'
  },
  {
    key: 'enable-dht',
    type: 'boolean',
    labelKey: 'aria2Config.enable-dht.label',
    helpTextKey: 'aria2Config.enable-dht.helpText'
  },
  {
    key: 'enable-dht6',
    type: 'boolean',
    labelKey: 'aria2Config.enable-dht6.label',
    helpTextKey: 'aria2Config.enable-dht6.helpText'
  },
  {
    key: 'dht-file-path',
    type: 'text',
    labelKey: 'aria2Config.dht-file-path.label',
    helpTextKey: 'aria2Config.dht-file-path.helpText',
    placeholder: '/config/dht.dat'
  },
  {
    key: 'dht-file-path6',
    type: 'text',
    labelKey: 'aria2Config.dht-file-path6.label',
    helpTextKey: 'aria2Config.dht-file-path6.helpText',
    placeholder: '/config/dht6.dat'
  },
  {
    key: 'bt-enable-lpd',
    type: 'boolean',
    labelKey: 'aria2Config.bt-enable-lpd.label',
    helpTextKey: 'aria2Config.bt-enable-lpd.helpText'
  },
  {
    key: 'enable-peer-exchange',
    type: 'boolean',
    labelKey: 'aria2Config.enable-peer-exchange.label',
    helpTextKey: 'aria2Config.enable-peer-exchange.helpText'
  },
  {
    key: 'bt-max-peers',
    type: 'number',
    labelKey: 'aria2Config.bt-max-peers.label',
    helpTextKey: 'aria2Config.bt-max-peers.helpText',
    placeholder: '128',
    min: 0
  },
  {
    key: 'bt-request-peer-speed-limit',
    type: 'text',
    labelKey: 'aria2Config.bt-request-peer-speed-limit.label',
    helpTextKey: 'aria2Config.bt-request-peer-speed-limit.helpText',
    placeholder: '10M'
  },
  {
    key: 'max-overall-upload-limit',
    type: 'text',
    labelKey: 'aria2Config.max-overall-upload-limit.label',
    helpTextKey: 'aria2Config.max-overall-upload-limit.helpText',
    placeholder: '2M'
  },
  {
    key: 'max-upload-limit',
    type: 'text',
    labelKey: 'aria2Config.max-upload-limit.label',
    helpTextKey: 'aria2Config.max-upload-limit.helpText',
    placeholder: '0'
  },
  {
    key: 'seed-ratio',
    type: 'number',
    labelKey: 'aria2Config.seed-ratio.label',
    helpTextKey: 'aria2Config.seed-ratio.helpText',
    placeholder: '0',
    min: 0
  },
  {
    key: 'seed-time',
    type: 'number',
    labelKey: 'aria2Config.seed-time.label',
    helpTextKey: 'aria2Config.seed-time.helpText',
    placeholder: '2880',
    min: 0
  },
  {
    key: 'bt-hash-check-seed',
    type: 'boolean',
    labelKey: 'aria2Config.bt-hash-check-seed.label',
    helpTextKey: 'aria2Config.bt-hash-check-seed.helpText'
  },
  {
    key: 'bt-seed-unverified',
    type: 'boolean',
    labelKey: 'aria2Config.bt-seed-unverified.label',
    helpTextKey: 'aria2Config.bt-seed-unverified.helpText'
  },
  {
    key: 'bt-tracker-connect-timeout',
    type: 'number',
    labelKey: 'aria2Config.bt-tracker-connect-timeout.label',
    helpTextKey: 'aria2Config.bt-tracker-connect-timeout.helpText',
    placeholder: '10',
    min: 1
  },
  {
    key: 'bt-tracker-timeout',
    type: 'number',
    labelKey: 'aria2Config.bt-tracker-timeout.label',
    helpTextKey: 'aria2Config.bt-tracker-timeout.helpText',
    placeholder: '10',
    min: 1
  },
  {
    key: 'bt-prioritize-piece',
    type: 'text',
    labelKey: 'aria2Config.bt-prioritize-piece.label',
    helpTextKey: 'aria2Config.bt-prioritize-piece.helpText',
    placeholder: 'head=32M,tail=32M'
  },
  {
    key: 'rpc-save-upload-metadata',
    type: 'boolean',
    labelKey: 'aria2Config.rpc-save-upload-metadata.label',
    helpTextKey: 'aria2Config.rpc-save-upload-metadata.helpText'
  },
  {
    key: 'follow-torrent',
    type: 'select',
    labelKey: 'aria2Config.follow-torrent.label',
    helpTextKey: 'aria2Config.follow-torrent.helpText',
    options: [
      { label: 'true - 保存种子文件', value: 'true' },
      { label: 'false - 仅下载种子文件', value: 'false' },
      { label: 'mem - 保存在内存中', value: 'mem' }
    ]
  },
  {
    key: 'pause-metadata',
    type: 'boolean',
    labelKey: 'aria2Config.pause-metadata.label',
    helpTextKey: 'aria2Config.pause-metadata.helpText'
  },
  {
    key: 'bt-save-metadata',
    type: 'boolean',
    labelKey: 'aria2Config.bt-save-metadata.label',
    helpTextKey: 'aria2Config.bt-save-metadata.helpText'
  },
  {
    key: 'bt-load-saved-metadata',
    type: 'boolean',
    labelKey: 'aria2Config.bt-load-saved-metadata.label',
    helpTextKey: 'aria2Config.bt-load-saved-metadata.helpText'
  },
  {
    key: 'bt-remove-unselected-file',
    type: 'boolean',
    labelKey: 'aria2Config.bt-remove-unselected-file.label',
    helpTextKey: 'aria2Config.bt-remove-unselected-file.helpText'
  },
  {
    key: 'bt-force-encryption',
    type: 'boolean',
    labelKey: 'aria2Config.bt-force-encryption.label',
    helpTextKey: 'aria2Config.bt-force-encryption.helpText'
  },
  {
    key: 'bt-detach-seed-only',
    type: 'boolean',
    labelKey: 'aria2Config.bt-detach-seed-only.label',
    helpTextKey: 'aria2Config.bt-detach-seed-only.helpText'
  },

  // RPC 设置
  {
    key: 'enable-rpc',
    type: 'boolean',
    labelKey: 'aria2Config.enable-rpc.label',
    helpTextKey: 'aria2Config.enable-rpc.helpText'
  },
  {
    key: 'rpc-allow-origin-all',
    type: 'boolean',
    labelKey: 'aria2Config.rpc-allow-origin-all.label',
    helpTextKey: 'aria2Config.rpc-allow-origin-all.helpText'
  },
  {
    key: 'rpc-listen-all',
    type: 'boolean',
    labelKey: 'aria2Config.rpc-listen-all.label',
    helpTextKey: 'aria2Config.rpc-listen-all.helpText'
  },
  {
    key: 'rpc-listen-port',
    type: 'number',
    labelKey: 'aria2Config.rpc-listen-port.label',
    helpTextKey: 'aria2Config.rpc-listen-port.helpText',
    placeholder: '6800',
    min: 1,
    max: 65535
  },
  {
    key: 'rpc-secret',
    type: 'password',
    labelKey: 'aria2Config.rpc-secret.label',
    helpTextKey: 'aria2Config.rpc-secret.helpText',
    placeholder: '输入RPC密钥'
  },
  {
    key: 'rpc-max-request-size',
    type: 'text',
    labelKey: 'aria2Config.rpc-max-request-size.label',
    helpTextKey: 'aria2Config.rpc-max-request-size.helpText',
    placeholder: '10M'
  }
]

// Aria2默认配置
export const defaultAria2Config: Record<string, any> = {
  // 文件保存设置
  dir: '/downloads',
  'disk-cache': '64M',
  'file-allocation': 'prealloc',
  'no-file-allocation-limit': '64M',
  continue: true,
  'always-resume': true,
  'max-resume-failure-tries': 0,
  'remote-time': true,

  // 进度保存设置
  'input-file': '/config/aria2.session',
  'save-session': '/config/aria2.session',
  'save-session-interval': 1,
  'auto-save-interval': 20,
  'force-save': false,

  // 下载连接设置
  'max-file-not-found': 10,
  'max-tries': 0,
  'retry-wait': 10,
  'connect-timeout': 10,
  timeout: 10,
  'max-concurrent-downloads': 5,
  'max-connection-per-server': 32,
  split: 64,
  'min-split-size': '1M',
  'piece-length': '1M',
  'allow-piece-length-change': true,
  'lowest-speed-limit': '0',
  'max-overall-download-limit': '0',
  'max-download-limit': '0',
  'disable-ipv6': false,
  'http-accept-gzip': true,
  'reuse-uri': true,
  'no-netrc': true,
  'allow-overwrite': false,
  'auto-file-renaming': true,
  'content-disposition-default-utf8': true,

  // BT/PT 下载设置
  'listen-port': '6999',
  'dht-listen-port': '6999',
  'enable-dht': true,
  'enable-dht6': true,
  'dht-file-path': '/config/dht.dat',
  'dht-file-path6': '/config/dht6.dat',
  'bt-enable-lpd': true,
  'enable-peer-exchange': true,
  'bt-max-peers': 128,
  'bt-request-peer-speed-limit': '10M',
  'max-overall-upload-limit': '2M',
  'max-upload-limit': '0',
  'seed-ratio': 0,
  'seed-time': 2880,
  'bt-hash-check-seed': true,
  'bt-seed-unverified': false,
  'bt-tracker-connect-timeout': 10,
  'bt-tracker-timeout': 10,
  'bt-prioritize-piece': 'head=32M,tail=32M',
  'rpc-save-upload-metadata': true,
  'follow-torrent': 'true',
  'pause-metadata': false,
  'bt-save-metadata': false,
  'bt-load-saved-metadata': true,
  'bt-remove-unselected-file': false,
  'bt-force-encryption': false,
  'bt-detach-seed-only': false,

  // RPC 设置
  'enable-rpc': true,
  'rpc-allow-origin-all': true,
  'rpc-listen-all': true,
  'rpc-listen-port': 6800,
  'rpc-secret': '',
  'rpc-max-request-size': '10M'
}
