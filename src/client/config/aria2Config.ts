// Aria2配置设置数据结构
export interface Aria2Setting {
  key: string
  type: 'text' | 'number' | 'boolean' | 'select' | 'password'
  label: string
  helpText: string
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
    label: '下载目录',
    helpText: '下载目录。可使用绝对路径或相对路径, 默认: 当前启动位置',
    placeholder: '/downloads'
  },
  {
    key: 'disk-cache',
    type: 'text',
    label: '磁盘缓存',
    helpText: '磁盘缓存, 0 为禁用缓存，默认:16M',
    placeholder: '64M'
  },
  {
    key: 'file-allocation',
    type: 'select',
    label: '文件预分配方式',
    helpText: '文件预分配方式, 可选：none, prealloc, trunc, falloc',
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
    label: '文件预分配大小限制',
    helpText: '文件预分配大小限制。小于此选项值大小的文件不预分配空间，单位 K 或 M，默认：5M',
    placeholder: '64M'
  },
  {
    key: 'continue',
    type: 'boolean',
    label: '断点续传',
    helpText: '断点续传，默认启用'
  },
  {
    key: 'always-resume',
    type: 'boolean',
    label: '始终尝试断点续传',
    helpText: '始终尝试断点续传，无法断点续传则终止下载，默认启用'
  },
  {
    key: 'max-resume-failure-tries',
    type: 'number',
    label: '不支持断点续传的URI数值',
    helpText: '不支持断点续传的 URI 数值，当 always-resume=false 时生效',
    placeholder: '0',
    min: 0
  },
  {
    key: 'remote-time',
    type: 'boolean',
    label: '获取服务器文件时间',
    helpText: '获取服务器文件时间，默认启用'
  },

  // 进度保存设置
  {
    key: 'input-file',
    type: 'text',
    label: '会话文件读取路径',
    helpText: '从会话文件中读取下载任务',
    placeholder: '/config/aria2.session'
  },
  {
    key: 'save-session',
    type: 'text',
    label: '会话文件保存路径',
    helpText: '会话文件保存路径',
    placeholder: '/config/aria2.session'
  },
  {
    key: 'save-session-interval',
    type: 'number',
    label: '会话保存间隔',
    helpText: '任务状态改变后保存会话的间隔时间（秒）, 0 为仅在进程正常退出时保存',
    placeholder: '1',
    min: 0
  },
  {
    key: 'auto-save-interval',
    type: 'number',
    label: '自动保存间隔',
    helpText: '自动保存任务进度到控制文件的间隔时间（秒）',
    placeholder: '20',
    min: 0
  },
  {
    key: 'force-save',
    type: 'boolean',
    label: '强制保存',
    helpText: '强制保存，即使任务已完成也保存信息到会话文件'
  },

  // 下载连接设置
  {
    key: 'max-file-not-found',
    type: 'number',
    label: '文件未找到重试次数',
    helpText: '文件未找到重试次数，默认:10',
    placeholder: '10',
    min: 0
  },
  {
    key: 'max-tries',
    type: 'number',
    label: '最大尝试次数',
    helpText: '最大尝试次数，0 表示无限，默认:5',
    placeholder: '0',
    min: 0
  },
  {
    key: 'retry-wait',
    type: 'number',
    label: '重试等待时间',
    helpText: '重试等待时间（秒）, 默认:0 (禁用)',
    placeholder: '10',
    min: 0
  },
  {
    key: 'connect-timeout',
    type: 'number',
    label: '连接超时时间',
    helpText: '连接超时时间（秒），默认：10',
    placeholder: '10',
    min: 1
  },
  {
    key: 'timeout',
    type: 'number',
    label: '超时时间',
    helpText: '超时时间（秒），默认：10',
    placeholder: '10',
    min: 1
  },
  {
    key: 'max-concurrent-downloads',
    type: 'number',
    label: '最大同时下载任务数',
    helpText: '最大同时下载任务数, 运行时可修改, 默认:5',
    placeholder: '5',
    min: 1
  },
  {
    key: 'max-connection-per-server',
    type: 'number',
    label: '单服务器最大连接线程数',
    helpText: '单服务器最大连接线程数, 任务添加时可指定, 默认:32',
    placeholder: '32',
    min: 1
  },
  {
    key: 'split',
    type: 'number',
    label: '单任务最大连接线程数',
    helpText: '单任务最大连接线程数, 任务添加时可指定, 默认:64',
    placeholder: '64',
    min: 1
  },
  {
    key: 'min-split-size',
    type: 'text',
    label: '文件最小分段大小',
    helpText: '文件最小分段大小, 取值范围 1M-1024M',
    placeholder: '1M'
  },
  {
    key: 'piece-length',
    type: 'text',
    label: 'HTTP/FTP下载分片大小',
    helpText: 'HTTP/FTP 下载分片大小，默认：1M',
    placeholder: '1M'
  },
  {
    key: 'allow-piece-length-change',
    type: 'boolean',
    label: '允许分片大小变化',
    helpText: '允许分片大小变化，默认启用'
  },
  {
    key: 'lowest-speed-limit',
    type: 'text',
    label: '最低下载速度限制',
    helpText: '最低下载速度限制，单位 K 或 M ，默认：0 (无限制)',
    placeholder: '0'
  },
  {
    key: 'max-overall-download-limit',
    type: 'text',
    label: '全局最大下载速度限制',
    helpText: '全局最大下载速度限制, 运行时可修改, 默认：0 (无限制)',
    placeholder: '0'
  },
  {
    key: 'max-download-limit',
    type: 'text',
    label: '单任务下载速度限制',
    helpText: '单任务下载速度限制, 默认：0 (无限制)',
    placeholder: '0'
  },
  {
    key: 'disable-ipv6',
    type: 'boolean',
    label: '禁用 IPv6',
    helpText: '禁用 IPv6, 默认:false'
  },
  {
    key: 'http-accept-gzip',
    type: 'boolean',
    label: 'GZip 支持',
    helpText: 'GZip 支持，默认启用'
  },
  {
    key: 'reuse-uri',
    type: 'boolean',
    label: 'URI 复用',
    helpText: 'URI 复用，默认启用'
  },
  {
    key: 'no-netrc',
    type: 'boolean',
    label: '禁用 netrc 支持',
    helpText: '禁用 netrc 支持，默认启用'
  },
  {
    key: 'allow-overwrite',
    type: 'boolean',
    label: '允许覆盖',
    helpText: '允许覆盖，当相关控制文件不存在时从头开始重新下载'
  },
  {
    key: 'auto-file-renaming',
    type: 'boolean',
    label: '文件自动重命名',
    helpText: '文件自动重命名，默认启用'
  },
  {
    key: 'content-disposition-default-utf8',
    type: 'boolean',
    label: 'UTF-8 处理 Content-Disposition',
    helpText: '使用 UTF-8 处理 Content-Disposition，默认启用'
  },

  // BT/PT 下载设置
  {
    key: 'listen-port',
    type: 'text',
    label: 'BT 监听端口',
    helpText: 'BT 监听端口(TCP), 默认:6881-6999',
    placeholder: '6999'
  },
  {
    key: 'dht-listen-port',
    type: 'text',
    label: 'DHT 监听端口',
    helpText: 'DHT 网络与 UDP tracker 监听端口(UDP), 默认:6881-6999',
    placeholder: '6999'
  },
  {
    key: 'enable-dht',
    type: 'boolean',
    label: '启用 IPv4 DHT',
    helpText: '启用 IPv4 DHT 功能, PT 下载会自动禁用, 默认启用'
  },
  {
    key: 'enable-dht6',
    type: 'boolean',
    label: '启用 IPv6 DHT',
    helpText: '启用 IPv6 DHT 功能, PT 下载会自动禁用，默认启用'
  },
  {
    key: 'dht-file-path',
    type: 'text',
    label: 'IPv4 DHT 文件路径',
    helpText: 'IPv4 DHT 文件路径，默认：$HOME/.aria2/dht.dat',
    placeholder: '/config/dht.dat'
  },
  {
    key: 'dht-file-path6',
    type: 'text',
    label: 'IPv6 DHT 文件路径',
    helpText: 'IPv6 DHT 文件路径，默认：$HOME/.aria2/dht6.dat',
    placeholder: '/config/dht6.dat'
  },
  {
    key: 'bt-enable-lpd',
    type: 'boolean',
    label: '本地节点发现',
    helpText: '本地节点发现, PT 下载会自动禁用，默认启用'
  },
  {
    key: 'enable-peer-exchange',
    type: 'boolean',
    label: '节点交换',
    helpText: '启用节点交换, PT 下载会自动禁用, 默认启用'
  },
  {
    key: 'bt-max-peers',
    type: 'number',
    label: 'BT 下载最大连接数',
    helpText: 'BT 下载最大连接数（单任务），0 为不限制，默认:128',
    placeholder: '128',
    min: 0
  },
  {
    key: 'bt-request-peer-speed-limit',
    type: 'text',
    label: 'BT 下载期望速度',
    helpText: 'BT 下载期望速度值（单任务），单位 K 或 M ，默认:10M',
    placeholder: '10M'
  },
  {
    key: 'max-overall-upload-limit',
    type: 'text',
    label: '全局最大上传速度限制',
    helpText: '全局最大上传速度限制, 运行时可修改, 默认:2M',
    placeholder: '2M'
  },
  {
    key: 'max-upload-limit',
    type: 'text',
    label: '单任务上传速度限制',
    helpText: '单任务上传速度限制, 默认：0 (无限制)',
    placeholder: '0'
  },
  {
    key: 'seed-ratio',
    type: 'number',
    label: '最小分享率',
    helpText: '最小分享率。当种子的分享率达到此值时停止做种, 0 为一直做种, 默认:0',
    placeholder: '0',
    min: 0
  },
  {
    key: 'seed-time',
    type: 'number',
    label: '最小做种时间',
    helpText: '最小做种时间（分钟）。设置为 0 时将在 BT 任务下载完成后停止做种',
    placeholder: '2880',
    min: 0
  },
  {
    key: 'bt-hash-check-seed',
    type: 'boolean',
    label: '做种前检查文件哈希',
    helpText: '做种前检查文件哈希, 默认启用'
  },
  {
    key: 'bt-seed-unverified',
    type: 'boolean',
    label: '无需再次校验',
    helpText: '继续之前的BT任务时, 无需再次校验, 默认:false'
  },
  {
    key: 'bt-tracker-connect-timeout',
    type: 'number',
    label: 'BT tracker 连接超时',
    helpText: 'BT tracker 服务器连接超时时间（秒），默认：10',
    placeholder: '10',
    min: 1
  },
  {
    key: 'bt-tracker-timeout',
    type: 'number',
    label: 'BT tracker 超时时间',
    helpText: 'BT tracker 服务器超时时间（秒），默认：10',
    placeholder: '10',
    min: 1
  },
  {
    key: 'bt-prioritize-piece',
    type: 'text',
    label: 'BT 下载优先下载文件',
    helpText: 'BT 下载优先下载文件开头或结尾',
    placeholder: 'head=32M,tail=32M'
  },
  {
    key: 'rpc-save-upload-metadata',
    type: 'boolean',
    label: '保存上传的种子文件',
    helpText: '保存通过 WebUI(RPC) 上传的种子文件，默认启用'
  },
  {
    key: 'follow-torrent',
    type: 'select',
    label: '下载种子文件自动开始',
    helpText: '下载种子文件自动开始下载',
    options: [
      { label: 'true - 保存种子文件', value: 'true' },
      { label: 'false - 仅下载种子文件', value: 'false' },
      { label: 'mem - 保存在内存中', value: 'mem' }
    ]
  },
  {
    key: 'pause-metadata',
    type: 'boolean',
    label: '种子文件下载完后暂停',
    helpText: '种子文件下载完后暂停任务，默认:false'
  },
  {
    key: 'bt-save-metadata',
    type: 'boolean',
    label: '保存磁力链接元数据',
    helpText: '保存磁力链接元数据为种子文件, 默认:false'
  },
  {
    key: 'bt-load-saved-metadata',
    type: 'boolean',
    label: '加载已保存的元数据',
    helpText: '加载已保存的元数据文件，默认启用'
  },
  {
    key: 'bt-remove-unselected-file',
    type: 'boolean',
    label: '删除未选择文件',
    helpText: '删除 BT 下载任务中未选择文件，默认:false'
  },
  {
    key: 'bt-force-encryption',
    type: 'boolean',
    label: 'BT强制加密',
    helpText: 'BT强制加密，启用后将拒绝旧的 BT 握手协议'
  },
  {
    key: 'bt-detach-seed-only',
    type: 'boolean',
    label: '分离仅做种任务',
    helpText: '分离仅做种任务，默认:false'
  },

  // RPC 设置
  {
    key: 'enable-rpc',
    type: 'boolean',
    label: '启用 RPC 服务器',
    helpText: '启用 JSON-RPC/XML-RPC 服务器, 默认启用'
  },
  {
    key: 'rpc-allow-origin-all',
    type: 'boolean',
    label: '接受所有远程请求',
    helpText: '接受所有远程请求, 默认启用'
  },
  {
    key: 'rpc-listen-all',
    type: 'boolean',
    label: '允许外部访问',
    helpText: '允许外部访问, 默认启用'
  },
  {
    key: 'rpc-listen-port',
    type: 'number',
    label: 'RPC 监听端口',
    helpText: 'RPC 监听端口, 默认:6800',
    placeholder: '6800',
    min: 1,
    max: 65535
  },
  {
    key: 'rpc-secret',
    type: 'password',
    label: 'RPC 密钥',
    helpText: 'RPC 密钥，用于访问验证',
    placeholder: '输入RPC密钥'
  },
  {
    key: 'rpc-max-request-size',
    type: 'text',
    label: 'RPC 最大请求大小',
    helpText: 'RPC 最大请求大小，默认：10M',
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