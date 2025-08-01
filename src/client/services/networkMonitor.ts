import { useNetworkStore } from '@/store'

// 更新页面标题显示网速
const updatePageTitleWithNetworkSpeed = () => {
  const networkStore = useNetworkStore()
  
  const downloadSpeed = networkStore.downloadSpeedFormatted
  const uploadSpeed = networkStore.uploadSpeedFormatted
  
  // 更新页面标题
  document.title = `下载:${downloadSpeed}, 上传:${uploadSpeed} - aria-max`
}

// 开始网络监控
export const startNetworkMonitoring = () => {
  const networkStore = useNetworkStore()
  
  // 启动网络监控
  networkStore.startMonitoring()
  
  // 每2秒更新一次页面标题
  setInterval(updatePageTitleWithNetworkSpeed, 2000)
}