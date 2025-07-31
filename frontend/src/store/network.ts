import { defineStore } from 'pinia'
import { systemApi } from '@/services'

// 格式化字节数（固定两位小数，用0补齐）
const formatBytesTwoDecimal = (bytes: number): string => {
  if (bytes === 0) return '0.00 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
}

// 解析网络速度数据
const parseNetworkSpeed = (network: any): { download: number, upload: number } => {
  let totalDownload = 0
  let totalUpload = 0
  
  Object.keys(network).forEach(interfaceName => {
    const interfaceData = network[interfaceName]
    totalDownload += interfaceData.rxSpeed || 0
    totalUpload += interfaceData.txSpeed || 0
  })
  
  return { download: totalDownload, upload: totalUpload }
}

export const useNetworkStore = defineStore('network', {
  state: () => ({
    downloadSpeed: 0,
    uploadSpeed: 0,
    maxDownloadSpeed: 0,
    maxUploadSpeed: 0,
    isMonitoring: false,
    networkHistory: {
      download: [] as number[],
      upload: [] as number[],
      timestamps: [] as number[]
    }
  }),
  
  getters: {
    downloadSpeedFormatted: (state) => formatBytesTwoDecimal(state.downloadSpeed) + '/s',
    uploadSpeedFormatted: (state) => formatBytesTwoDecimal(state.uploadSpeed) + '/s',
    maxDownloadSpeedFormatted: (state) => formatBytesTwoDecimal(state.maxDownloadSpeed) + '/s',
    maxUploadSpeedFormatted: (state) => formatBytesTwoDecimal(state.maxUploadSpeed) + '/s'
  },
  
  actions: {
    // 更新网络速度数据
    updateNetworkSpeed(networkData: any) {
      const { download, upload } = parseNetworkSpeed(networkData)
      
      // 更新当前速度
      this.downloadSpeed = download
      this.uploadSpeed = upload
      
      // 更新最高速度
      if (download > this.maxDownloadSpeed) {
        this.maxDownloadSpeed = download
      }
      if (upload > this.maxUploadSpeed) {
        this.maxUploadSpeed = upload
      }
      
      // 添加到历史数据
      const now = Date.now()
      this.networkHistory.download.push(download)
      this.networkHistory.upload.push(upload)
      this.networkHistory.timestamps.push(now)
      
      // 限制历史数据长度（最多保存60个数据点）
      const MAX_HISTORY_POINTS = 60
      if (this.networkHistory.download.length > MAX_HISTORY_POINTS) {
        this.networkHistory.download.shift()
        this.networkHistory.upload.shift()
        this.networkHistory.timestamps.shift()
      }
    },
    
    // 获取网络速度数据
    async fetchNetworkSpeed() {
      try {
        const response = await systemApi.getSystemInfo()
        const network = response.network || {}
        this.updateNetworkSpeed(network)
      } catch (error) {
        console.error('Failed to fetch network speed:', error)
      }
    },
    
    // 开始网络监控
    startMonitoring() {
      if (this.isMonitoring) return
      
      this.isMonitoring = true
      // 立即获取一次数据
      this.fetchNetworkSpeed()
      
      // 每2秒更新一次数据
      setInterval(() => {
        if (this.isMonitoring) {
          this.fetchNetworkSpeed()
        }
      }, 2000)
    },
    
    // 停止网络监控
    stopMonitoring() {
      this.isMonitoring = false
    }
  }
})