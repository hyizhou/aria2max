<template>
  <div class="network-monitor" ref="networkMonitor">
    <div class="network-speed-display" @click="toggleChart">
      <!-- 桌面端显示 -->
      <div class="desktop-display">
        <div class="speed-item download">
          <i class="fas fa-download"></i>
          <span class="speed-value">{{ downloadSpeed }}</span>
        </div>
        <div class="speed-item upload">
          <i class="fas fa-upload"></i>
          <span class="speed-value">{{ uploadSpeed }}</span>
        </div>
      </div>
      
      <!-- 移动端显示 -->
      <div class="mobile-display">
        <div class="speed-item download">
          <span class="arrow">↓</span>
          <span class="speed-value">{{ getMobileDownloadSpeed() }}</span>
        </div>
        <div class="speed-item upload">
          <span class="arrow">↑</span>
          <span class="speed-value">{{ getMobileUploadSpeed() }}</span>
        </div>
      </div>
    </div>
    
    <!-- 遮罩层 -->
    <div v-if="showChart && isMobile" class="chart-overlay" @click="hideChart"></div>
    
    <!-- 网速图表浮窗 -->
    <div 
      v-if="showChart" 
      class="network-chart-popup" 
      :style="popupStyle" 
      :class="{ 'popup-visible': isPositionCalculated, 'desktop-popup': !isMobile }"
      @click.self="hideChart"
    >
      <div class="chart-header">
        <h3>网络速度监控</h3>
      </div>
      <div class="chart-container">
        <canvas ref="chartCanvas" width="400" height="200"></canvas>
      </div>
      <div class="chart-info">
        <div class="info-item">
          <span class="label">当前下载:</span>
          <span class="value download">{{ downloadSpeed }}</span>
        </div>
        <div class="info-item">
          <span class="label">当前上传:</span>
          <span class="value upload">{{ uploadSpeed }}</span>
        </div>
        <div class="info-item">
          <span class="label">最高下载:</span>
          <span class="value">{{ maxDownloadSpeed }}</span>
        </div>
        <div class="info-item">
          <span class="label">最高上传:</span>
          <span class="value">{{ maxUploadSpeed }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useNetworkStore } from '@/store'

const networkMonitor = ref(null)
const chartCanvas = ref(null)
const showChart = ref(false)
const isMobile = ref(false)
const isPositionCalculated = ref(false)
const popupStyle = ref({})
const networkStore = useNetworkStore()
const downloadSpeed = ref(networkStore.downloadSpeedFormatted)
const uploadSpeed = ref(networkStore.uploadSpeedFormatted)
const maxDownloadSpeed = ref(networkStore.maxDownloadSpeedFormatted)
const maxUploadSpeed = ref(networkStore.maxUploadSpeedFormatted)
const networkHistory = ref({
  download: [] as number[],
  upload: [] as number[],
  timestamps: [] as number[]
})


let updateInterval = null
let hideTimeout = null
const MAX_HISTORY_POINTS = 60 // 显示最近60个数据点（5分钟）

// 获取网络速度数据
const fetchNetworkSpeed = async () => {
  try {
    await networkStore.fetchNetworkSpeed()
    
    // 更新当前速度显示
    downloadSpeed.value = networkStore.downloadSpeedFormatted
    uploadSpeed.value = networkStore.uploadSpeedFormatted
    maxDownloadSpeed.value = networkStore.maxDownloadSpeedFormatted
    maxUploadSpeed.value = networkStore.maxUploadSpeedFormatted
    
    // 更新历史数据用于图表绘制
    networkHistory.value = { ...networkStore.networkHistory }
    
    // 更新图表
    if (showChart.value) {
      drawChart()
    }
  } catch (error) {
    console.error('Failed to fetch network speed:', error)
  }
}

// 格式化字节数
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0.00 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
}

// 解析字节数
const parseBytes = (speedStr: string): number => {
  const match = speedStr.match(/([\d.]+)\s*(B|KB|MB|GB|TB)\/s/)
  if (!match) return 0
  
  const value = parseFloat(match[1])
  const unit = match[2]
  const units = { 'B': 1, 'KB': 1024, 'MB': 1024*1024, 'GB': 1024*1024*1024, 'TB': 1024*1024*1024*1024 }
  
  return value * (units[unit] || 1)
}

// 绘制图表
const drawChart = () => {
  if (!chartCanvas.value) return
  
  const canvas = chartCanvas.value
  const ctx = canvas.getContext('2d')
  const width = canvas.width
  const height = canvas.height
  
  // 清空画布
  ctx.clearRect(0, 0, width, height)
  
  if (networkHistory.value.download.length === 0) return
  
  // 找到最大值用于缩放
  const maxDownload = Math.max(...networkHistory.value.download, 1)
  const maxUpload = Math.max(...networkHistory.value.upload, 1)
  const maxValue = Math.max(maxDownload, maxUpload)
  
  // 绘制网格
  ctx.strokeStyle = '#e0e0e0'
  ctx.lineWidth = 1
  
  // 水平网格线
  for (let i = 0; i <= 5; i++) {
    const y = (height - 40) * (1 - i / 5) + 20
    ctx.beginPath()
    ctx.moveTo(40, y)
    ctx.lineTo(width - 20, y)
    ctx.stroke()
    
    // 网格标签
    ctx.fillStyle = '#666'
    ctx.font = '12px Arial'
    ctx.textAlign = 'right'
    ctx.fillText(formatBytes(maxValue * i / 5) + '/s', 35, y + 4)
  }
  
  // 绘制下载速度曲线
  if (networkHistory.value.download.length > 1) {
    ctx.strokeStyle = '#1976d2'
    ctx.lineWidth = 2
    ctx.beginPath()
    
    networkHistory.value.download.forEach((speed, index) => {
      const x = 40 + (width - 60) * index / (MAX_HISTORY_POINTS - 1)
      const y = height - 20 - (height - 40) * speed / maxValue
      
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    
    ctx.stroke()
  }
  
  // 绘制上传速度曲线
  if (networkHistory.value.upload.length > 1) {
    ctx.strokeStyle = '#388e3c'
    ctx.lineWidth = 2
    ctx.beginPath()
    
    networkHistory.value.upload.forEach((speed, index) => {
      const x = 40 + (width - 60) * index / (MAX_HISTORY_POINTS - 1)
      const y = height - 20 - (height - 40) * speed / maxValue
      
      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })
    
    ctx.stroke()
  }
  
  // 绘制图例
  ctx.fillStyle = '#1976d2'
  ctx.fillRect(width - 120, 10, 15, 3)
  ctx.fillStyle = '#333'
  ctx.font = '12px Arial'
  ctx.textAlign = 'left'
  ctx.fillText('下载', width - 100, 15)
  
  ctx.fillStyle = '#388e3c'
  ctx.fillRect(width - 120, 25, 15, 3)
  ctx.fillStyle = '#333'
  ctx.fillText('上传', width - 100, 30)
}

// 获取移动端简化下载速度显示
const getMobileDownloadSpeed = () => {
  const speed = parseBytes(downloadSpeed.value)
  return formatBytesTwoDecimal(speed) + '/s'
}

// 获取移动端简化上传速度显示
const getMobileUploadSpeed = () => {
  const speed = parseBytes(uploadSpeed.value)
  return formatBytesTwoDecimal(speed) + '/s'
}

// 检测是否为移动端
const checkIsMobile = () => {
  isMobile.value = window.innerWidth <= 768
}


// 格式化字节数（固定两位小数，用0补齐）
const formatBytesTwoDecimal = (bytes: number): string => {
  if (bytes === 0) return '0.00 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
}

// 切换图表显示
const toggleChart = () => {
  checkIsMobile() // 每次切换时重新检测
  showChart.value = !showChart.value
  if (showChart.value) {
    // 重置位置计算状态
    isPositionCalculated.value = false
    
    nextTick(() => {
      // 使用setTimeout确保浮窗元素完全渲染后再计算位置
      setTimeout(() => {
        updatePopupPosition()
        drawChart()
        
        // 标记位置已计算完成
        isPositionCalculated.value = true
        
        // 添加全局点击监听器以实现点击外部关闭
        setTimeout(() => {
          document.addEventListener('click', handleGlobalClick)
        }, 0)
      }, 0)
    })
  } else {
    // 移除全局点击监听器
    document.removeEventListener('click', handleGlobalClick)
  }
}

// 处理全局点击事件，实现点击外部关闭浮窗
const handleGlobalClick = (event) => {
  // 检查点击的元素是否在浮窗内部
  const popupElement = document.querySelector('.network-chart-popup')
  const speedDisplayElement = document.querySelector('.network-speed-display')
  
  if (popupElement && !popupElement.contains(event.target) && 
      speedDisplayElement && !speedDisplayElement.contains(event.target)) {
    hideChart()
  }
}

// 隐藏图表
const hideChart = () => {
  if (hideTimeout) {
    clearTimeout(hideTimeout)
  }
  showChart.value = false
  isPositionCalculated.value = false
}


// 更新浮窗位置
const updatePopupPosition = () => {
  if (!networkMonitor.value) {
    console.warn('Network monitor element not found')
    return
  }
  
  const rect = networkMonitor.value.getBoundingClientRect()
  
  // 检查位置信息是否有效
  if (rect.width === 0 || rect.height === 0) {
    console.warn('Network monitor element has invalid dimensions:', rect)
    // 如果尺寸为0，可能是首次渲染，延迟一下再尝试
    setTimeout(() => {
      const newRect = networkMonitor.value.getBoundingClientRect()
      if (newRect.width > 0 && newRect.height > 0) {
        doUpdatePopupPosition(newRect)
      }
    }, 10)
    return
  }
  
  doUpdatePopupPosition(rect)
}

// 实际执行位置更新的函数
const doUpdatePopupPosition = (rect) => {
  const isMobileDevice = window.innerWidth <= 768
  const popupWidth = isMobileDevice ? 320 : 450
  const margin = 10
  
  let left, top
  
  if (isMobileDevice) {
    // 移动端：屏幕中央
    const popupHeight = 280
    left = (window.innerWidth - popupWidth) / 2
    top = (window.innerHeight - popupHeight) / 2
  } else {
    // 桌面端：网速显示器下方，高度根据内容自适应
    left = rect.left + rect.width / 2 - popupWidth / 2
    top = rect.bottom + margin
    
    // 确保不超出屏幕边界
    left = Math.max(margin, Math.min(left, window.innerWidth - popupWidth - margin))
  }
  
  // 使用更强制的方式来设置样式，避免CSS覆盖
  const popupElement = document.querySelector('.network-chart-popup')
  if (popupElement) {
    popupElement.style.position = 'fixed'
    popupElement.style.top = top + 'px'
    popupElement.style.left = left + 'px'
    popupElement.style.width = popupWidth + 'px'
    // 移除固定高度和溢出隐藏，让内容自然撑开
    popupElement.style.height = 'auto'
    popupElement.style.maxHeight = 'none'
    popupElement.style.overflowY = 'visible'
    popupElement.style.zIndex = '1001'
    popupElement.style.margin = '0'
    popupElement.style.transform = 'none'
  }
  
  // 同时保留Vue的样式绑定
  popupStyle.value = {
    position: 'fixed',
    top: top + 'px',
    left: left + 'px',
    width: popupWidth + 'px',
    height: 'auto',
    maxHeight: 'none',
    overflowY: 'visible',
    zIndex: 1001,
    margin: '0',
    transform: 'none'
  }
}

// 组件挂载时开始监控
onMounted(() => {
  // 检测是否为移动端
  checkIsMobile()
  
  // 等待DOM完全渲染后初始化
  nextTick(() => {
    // 立即获取一次数据
    fetchNetworkSpeed()
    
    // 每2秒更新一次数据
    updateInterval = setInterval(fetchNetworkSpeed, 2000)
    
    // 监听窗口大小变化
    window.addEventListener('resize', () => {
      checkIsMobile()
      if (showChart.value) {
        // 窗口大小改变时重新计算浮窗位置
        setTimeout(updatePopupPosition, 0)
      }
    })
  })
})

// 组件卸载时清理
onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval)
  }
  if (hideTimeout) {
    clearTimeout(hideTimeout)
  }
  window.removeEventListener('resize', updatePopupPosition)
  window.removeEventListener('resize', checkIsMobile)
  // 移除全局点击监听器
  document.removeEventListener('click', handleGlobalClick)
})
</script>

<style scoped>
.network-monitor {
  position: relative;
  display: flex;
  align-items: center;
}

/* 遮罩层 */
.chart-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

.network-speed-display {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 6px;
  background: transparent;
  border: none;
  min-width: 0; /* 允许flex收缩 */
}

/* 桌面端显示 */
.desktop-display {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

/* 移动端显示 */
.mobile-display {
  display: none;
  align-items: center;
  gap: 0.4rem;
}

/* 箭头字符 */
.arrow {
  font-size: 0.7rem;
  font-weight: bold;
  margin-right: 0.1rem;
  flex-shrink: 0;
}

.arrow.download {
  color: #1976d2;
}

.arrow.upload {
  color: #388e3c;
}

.network-speed-display:hover {
  background-color: rgba(25, 118, 210, 0.1);
  transform: translateY(-1px);
}

.speed-item {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.8rem;
  font-weight: 500;
  opacity: 0.8;
  transition: all 0.3s ease;
  white-space: nowrap; /* 防止换行 */
  min-width: 0; /* 允许flex收缩 */
}

.network-speed-display:hover .speed-item {
  opacity: 1;
}

.speed-item i {
  font-size: 0.7rem;
  opacity: 0.7;
  flex-shrink: 0; /* 图标不收缩 */
}

.network-speed-display:hover .speed-item i {
  opacity: 1;
}

.speed-item.download {
  color: #1976d2;
}

.speed-item.upload {
  color: #388e3c;
}

.speed-value {
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-weight: 600;
  min-width: 45px;
  text-align: right;
  font-size: 0.75rem;
  overflow: hidden;
  text-overflow: ellipsis; /* 超出部分显示省略号 */
}


.network-chart-popup {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border: 1px solid #e0e0e0;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s ease, visibility 0.2s ease;
  position: fixed !important; /* 确保使用fixed定位 */
  height: auto;
  max-height: none;
  overflow-y: visible;
}

.network-chart-popup.popup-visible {
  opacity: 1;
  visibility: visible;
}

/* 桌面端动画效果 */
.network-chart-popup.desktop-popup {
  transform: scale(0.95);
  transition: opacity 0.2s ease, visibility 0.2s ease, transform 0.2s ease;
}

.network-chart-popup.desktop-popup.popup-visible {
  transform: scale(1);
}

/* 移动端动画效果 */
.network-chart-popup:not(.desktop-popup).popup-visible {
  animation: fadeIn 0.2s ease;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e0e0e0;
  background-color: #f8f9fa;
  border-radius: 8px 8px 0 0;
}

.chart-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  color: #666;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background-color: #e0e0e0;
  color: #333;
}

.chart-container {
  padding: 1rem;
  background-color: white;
}

.chart-info {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e0e0e0;
  background-color: #f8f9fa;
  border-radius: 0 0 8px 8px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
}

.info-item .label {
  color: #666;
  font-weight: 500;
}

.info-item .value {
  font-weight: 600;
  font-family: 'Courier New', monospace;
}

.info-item .value.download {
  color: #1976d2;
}

.info-item .value.upload {
  color: #388e3c;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 移动端适配 */
@media (max-width: 768px) {
  .network-speed-display {
    padding: 0.3rem 0.5rem;
    gap: 0.6rem;
    min-width: 0; /* 允许收缩 */
    max-width: 180px; /* 增加宽度利用空间 */
    justify-content: center; /* 居中显示 */
  }
  
  /* 隐藏桌面端显示 */
  .desktop-display {
    display: none;
  }
  
  /* 显示移动端显示 */
  .mobile-display {
    display: flex;
  }
  
  .speed-item {
    font-size: 0.65rem;
    gap: 0.2rem;
    min-width: 0; /* 允许收缩 */
    flex: 1; /* 平均分配空间 */
    justify-content: center; /* 居中显示 */
    align-items: center;
  }
  
  /* 移动端隐藏图标 */
  .speed-item i {
    display: none;
  }
  
  .speed-value {
    min-width: 0; /* 允许收缩 */
    font-size: 0.6rem;
    white-space: nowrap; /* 不换行 */
    overflow: visible; /* 显示完整内容 */
    text-overflow: clip; /* 去掉省略号 */
  }
  
    
  .network-chart-popup {
    width: 320px;
    max-width: calc(100vw - 20px);
    max-height: 80vh; /* 限制最大高度 */
    overflow-y: auto; /* 允许滚动 */
  }
  
  .chart-container canvas {
    width: 100% !important;
    height: 120px !important;
  }
  
  .chart-info {
    grid-template-columns: 1fr;
    font-size: 0.75rem;
  }
}

/* 超小屏幕适配 */
@media (max-width: 480px) {
  .network-speed-display {
    padding: 0.25rem 0.4rem;
    gap: 0.5rem;
    min-width: 0; /* 允许收缩 */
    max-width: 140px; /* 增加宽度利用空间 */
    justify-content: center; /* 居中显示 */
  }
  
  .speed-item {
    font-size: 0.6rem;
    gap: 0.15rem;
    min-width: 0; /* 允许收缩 */
    flex: 1; /* 平均分配空间 */
    justify-content: center; /* 居中显示 */
    align-items: center;
  }
  
  /* 超小屏幕也隐藏图标 */
  .speed-item i {
    display: none;
  }
  
  .speed-value {
    min-width: 0; /* 允许收缩 */
    font-size: 0.55rem;
    white-space: nowrap; /* 不换行 */
    overflow: visible; /* 显示完整内容 */
    text-overflow: clip; /* 去掉省略号 */
  }
  
  /* 超小屏幕箭头样式 */
  .arrow {
    font-size: 0.6rem;
    margin-right: 0.05rem;
  }
  
    
  .network-chart-popup {
    width: 280px;
    max-width: calc(100vw - 20px);
    max-height: 80vh; /* 限制最大高度 */
    overflow-y: auto; /* 允许滚动 */
  }
  
  .chart-container canvas {
    width: 100% !important;
    height: 100px !important;
  }
  
  .chart-info {
    grid-template-columns: 1fr;
    font-size: 0.7rem;
  }
}
</style>