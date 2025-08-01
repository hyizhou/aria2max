<template>
  <div class="system-status">
    <div class="page-header">
      <h2>系统状态</h2>
    </div>
    
    <div class="status-grid">
      <!-- 系统信息卡片 -->
      <div class="status-card">
        <div class="card-header">
          <i class="fas fa-server"></i>
          <h3>系统信息</h3>
        </div>
        <div class="card-content">
          <div class="info-item">
            <span class="label">主机名:</span>
            <span class="value">{{ systemInfo.hostname || '未知' }}</span>
          </div>
          <div class="info-item">
            <span class="label">系统:</span>
            <span class="value">{{ systemInfo.platform || '未知' }}</span>
          </div>
          <div class="info-item">
            <span class="label">架构:</span>
            <span class="value">{{ systemInfo.arch || '未知' }}</span>
          </div>
          <div class="info-item">
            <span class="label">内核版本:</span>
            <span class="value">{{ systemInfo.release || '未知' }}</span>
          </div>
          <div class="info-item">
            <span class="label">Node.js版本:</span>
            <span class="value">{{ systemInfo.nodeVersion || '未知' }}</span>
          </div>
          <div class="info-item">
            <span class="label">运行时间:</span>
            <span class="value">{{ systemInfo.uptimeFormatted || '未知' }}</span>
          </div>
        </div>
      </div>
      
      <!-- CPU使用率卡片 -->
      <div class="status-card">
        <div class="card-header">
          <i class="fas fa-microchip"></i>
          <h3>CPU使用率</h3>
          <div class="cpu-toggle" v-if="systemInfo.cpu?.cores > 1">
            <label class="toggle-switch">
              <input type="checkbox" v-model="showCpuCores">
              <span class="toggle-slider"></span>
            </label>
            <span class="toggle-label">显示核心</span>
          </div>
        </div>
        <div class="card-content">
          <!-- 整体CPU使用率条形图 -->
          <div v-if="!showCpuCores" class="progress-bar-container">
            <div class="progress-info">
              <span class="label">整体使用率</span>
              <span class="value">{{ systemInfo.cpu?.usage || 0 }}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-bar-fill" :style="{ width: (systemInfo.cpu?.usage || 0) + '%' }"></div>
            </div>
          </div>
          
          <!-- CPU核心使用率条形图 -->
          <div v-else class="cpu-cores-container">
            <div v-for="core in systemInfo.cpu?.cores" :key="core" class="core-progress">
              <div class="progress-info">
                <span class="label">核心 {{ core }}</span>
                <span class="value">{{ getCpuCoreUsage(core-1) }}%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-bar-fill" :style="{ width: getCpuCoreUsage(core-1) + '%' }"></div>
              </div>
            </div>
          </div>
          
          <div class="info-item">
            <span class="label">核心数:</span>
            <span class="value">{{ systemInfo.cpu?.cores || 0 }}</span>
          </div>
          <div class="info-item">
            <span class="label">型号:</span>
            <span class="value">{{ systemInfo.cpu?.model || '未知' }}</span>
          </div>
        </div>
      </div>
      
      <!-- 内存使用率卡片 -->
      <div class="status-card">
        <div class="card-header">
          <i class="fas fa-memory"></i>
          <h3>内存使用率</h3>
        </div>
        <div class="card-content">
          <div class="progress-bar-container">
            <div class="progress-info">
              <span class="label">使用率</span>
              <span class="value">{{ systemInfo.memory?.percentage || 0 }}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-bar-fill" :style="{ width: (systemInfo.memory?.percentage || 0) + '%' }"></div>
            </div>
          </div>
          <div class="info-item">
            <span class="label">总内存:</span>
            <span class="value">{{ formatBytes(systemInfo.memory?.total || 0) }}</span>
          </div>
          <div class="info-item">
            <span class="label">已用:</span>
            <span class="value">{{ formatBytes(systemInfo.memory?.used || 0) }}</span>
          </div>
          <div class="info-item">
            <span class="label">可用:</span>
            <span class="value">{{ formatBytes(systemInfo.memory?.free || 0) }}</span>
          </div>
        </div>
      </div>
      
      <!-- Swap内存使用率卡片 -->
      <div v-if="systemInfo.swap && systemInfo.swap.total > 0" class="status-card">
        <div class="card-header">
          <i class="fas fa-exchange-alt"></i>
          <h3>Swap使用率</h3>
        </div>
        <div class="card-content">
          <div class="progress-bar-container">
            <div class="progress-info">
              <span class="label">使用率</span>
              <span class="value">{{ systemInfo.swap?.percentage || 0 }}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-bar-fill" :style="{ width: (systemInfo.swap?.percentage || 0) + '%' }"></div>
            </div>
          </div>
          <div class="info-item">
            <span class="label">总Swap:</span>
            <span class="value">{{ formatBytes(systemInfo.swap?.total || 0) }}</span>
          </div>
          <div class="info-item">
            <span class="label">已用:</span>
            <span class="value">{{ formatBytes(systemInfo.swap?.used || 0) }}</span>
          </div>
          <div class="info-item">
            <span class="label">可用:</span>
            <span class="value">{{ formatBytes(systemInfo.swap?.free || 0) }}</span>
          </div>
        </div>
      </div>
      
      <!-- 磁盘使用率卡片 -->
      <div class="status-card">
        <div class="card-header">
          <i class="fas fa-hdd"></i>
          <h3>磁盘使用率</h3>
        </div>
        <div class="card-content">
          <div class="progress-bar-container">
            <div class="progress-info">
              <span class="label">使用率</span>
              <span class="value">{{ systemInfo.disk?.percentage || 0 }}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-bar-fill" :style="{ width: (systemInfo.disk?.percentage || 0) + '%' }"></div>
            </div>
          </div>
          <div class="info-item">
            <span class="label">路径:</span>
            <span class="value">{{ systemInfo.disk?.path || '未知' }}</span>
          </div>
          <div class="info-item">
            <span class="label">总容量:</span>
            <span class="value">{{ formatBytes(systemInfo.disk?.total || 0) }}</span>
          </div>
          <div class="info-item">
            <span class="label">已用:</span>
            <span class="value">{{ formatBytes(systemInfo.disk?.used || 0) }}</span>
          </div>
          <div class="info-item">
            <span class="label">可用:</span>
            <span class="value">{{ formatBytes(systemInfo.disk?.free || 0) }}</span>
          </div>
          <div v-if="systemInfo.disk?.error" class="error-message">
            {{ systemInfo.disk.error }}
          </div>
        </div>
      </div>
      
      <!-- 网络信息卡片 -->
      <div class="status-card">
        <div class="card-header">
          <i class="fas fa-network-wired"></i>
          <h3>网络信息</h3>
        </div>
        <div class="card-content">
          <div v-if="Object.keys(systemInfo.network || {}).length === 0" class="no-data">
            暂无网络接口信息
          </div>
          <div v-else>
            <div v-for="(info, name) in systemInfo.network" :key="name" class="network-item">
              <div class="network-name">{{ name }}</div>
              <div class="network-details">
                <div class="info-item">
                  <span class="label">IP地址:</span>
                  <span class="value">{{ info.address }}</span>
                </div>
                <div class="info-item">
                  <span class="label">子网掩码:</span>
                  <span class="value">{{ info.netmask }}</span>
                </div>
                <div class="info-item">
                  <span class="label">MAC地址:</span>
                  <span class="value">{{ info.mac }}</span>
                </div>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { systemApi } from '@/services'

const systemInfo = ref<any>({})
const loading = ref(false)
const showCpuCores = ref(false) // CPU核心切换开关
let updateInterval: number | null = null

// 获取系统信息
const fetchSystemInfo = async () => {
  loading.value = true
  try {
    const response = await systemApi.getSystemInfo()
    systemInfo.value = response
  } catch (error) {
    console.error('Failed to fetch system info:', error)
    // 显示错误信息
    systemInfo.value = {
      hostname: '获取失败',
      platform: '未知',
      arch: '未知',
      release: '未知',
      nodeVersion: '未知',
      uptimeFormatted: '未知',
      cpu: { usage: 0, cores: 0, model: '未知' },
      memory: { total: 0, used: 0, free: 0, percentage: 0 },
      swap: null,
      disk: { path: '未知', total: 0, used: 0, free: 0, percentage: 0, error: '无法获取磁盘信息' },
      network: {}
    }
  } finally {
    loading.value = false
  }
}

// 获取CPU核心使用率
const getCpuCoreUsage = (coreIndex: number): number => {
  if (systemInfo.value.cpu && systemInfo.value.cpu.coresUsage) {
    return systemInfo.value.cpu.coresUsage[coreIndex] || 0
  }
  // 如果没有核心使用率数据，返回整体使用率的近似值
  return systemInfo.value.cpu?.usage || 0
}

// 格式化字节数
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}


// 组件挂载时获取数据并设置定时更新
onMounted(() => {
  fetchSystemInfo()
  // 每1秒更新一次
  updateInterval = window.setInterval(fetchSystemInfo, 1000)
})

// 组件卸载时清除定时器
onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval)
  }
})
</script>

<style scoped>
.system-status {
  padding: 1.5rem;
  position: relative;
  overflow-x: hidden;
  width: 100%;
  box-sizing: border-box;
}

.page-header {
  margin-bottom: 1.5rem;
}

.page-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #333333;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.status-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  padding: 1rem 1.5rem;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.card-header i {
  font-size: 1.25rem;
  margin-right: 0.75rem;
  color: #1976d2;
}

.card-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #333333;
}

.card-content {
  padding: 1.5rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #f0f0f0;
}

.info-item:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.info-item .label {
  font-weight: 500;
  color: #666666;
}

.info-item .value {
  font-weight: 600;
  color: #333333;
  text-align: right;
  word-break: break-all;
}

.cpu-toggle {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 20px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

.toggle-switch input:checked + .toggle-slider {
  background-color: #1976d2;
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(20px);
}

.toggle-label {
  font-size: 0.875rem;
  color: #666666;
  white-space: nowrap;
}

.progress-bar-container {
  margin-bottom: 1.5rem;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.progress-info .label {
  font-weight: 500;
  color: #666666;
}

.progress-info .value {
  font-weight: 600;
  color: #333333;
}

.progress-bar {
  width: 100%;
  height: 12px;
  background-color: #e9ecef;
  border-radius: 6px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #1976d2, #42a5f5);
  border-radius: 6px;
  transition: width 0.3s ease;
}

.cpu-cores-container {
  margin-bottom: 1.5rem;
}

.core-progress {
  margin-bottom: 1rem;
}

.core-progress:last-child {
  margin-bottom: 0;
}

.network-item {
  margin-bottom: 1rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 6px;
}

.network-item:last-child {
  margin-bottom: 0;
}

.network-name {
  font-weight: 600;
  color: #333333;
  margin-bottom: 0.5rem;
}

.network-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.network-details .info-item {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
  font-size: 0.875rem;
}


.no-data {
  text-align: center;
  color: #999999;
  padding: 2rem;
}

.error-message {
  color: #f44336;
  font-size: 0.875rem;
  margin-top: 0.5rem;
  padding: 0.5rem;
  background-color: #ffebee;
  border-radius: 4px;
}


/* 响应式设计 */
@media (max-width: 768px) {
  .system-status {
    padding: 0.75rem;
  }
  
  .page-header h2 {
    font-size: 1.25rem;
  }
  
  .status-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .card-header {
    padding: 0.75rem 1rem;
  }
  
  .card-content {
    padding: 1rem;
  }
  
  .cpu-toggle {
    display: none;
  }
}

@media (max-width: 480px) {
  .system-status {
    padding: 0.5rem;
  }
  
  .page-header h2 {
    font-size: 1.125rem;
  }
  
  .card-header {
    padding: 0.5rem 0.75rem;
  }
  
  .card-content {
    padding: 0.75rem;
  }
  
  .info-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
  
  .info-item .value {
    text-align: left;
  }
}
</style>