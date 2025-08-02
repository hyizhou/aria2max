<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTaskStore } from '@/store'

const taskStore = useTaskStore()
const router = useRouter()
const refreshInterval = ref<number | null>(null)

const stats = computed(() => {
  const stats = {
    active: 0,
    waiting: 0,
    paused: 0,
    error: 0,
    complete: 0
  }
  
  taskStore.tasks.forEach(task => {
    switch (task.status) {
      case 'active':
        stats.active++
        break
      case 'waiting':
        stats.waiting++
        break
      case 'paused':
        stats.paused++
        break
      case 'error':
        stats.error++
        break
      case 'complete':
        stats.complete++
        break
    }
  })
  
  return stats
})

const activeTasks = computed(() => {
  return taskStore.tasks.filter(task => task.status === 'active')
})

onMounted(async () => {
  await loadDashboardData()
  // Start auto-refresh every 1 second
  refreshInterval.value = window.setInterval(loadDashboardData, 1000)
})

onUnmounted(() => {
  // Clean up the interval when component is destroyed
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
})

const loadDashboardData = async () => {
  try {
    await taskStore.fetchTasks()
  } catch (error) {
    console.error('Failed to load dashboard data:', error)
  }
}

const getFileName = (task: any): string => {
  if (task.files && task.files.length > 0) {
    const path = task.files[0].path
    return path.split('/').pop() || path
  }
  return '未知文件'
}

const getProgress = (task: any): number => {
  if (task.totalLength === 0) return 0
  return Math.round((task.completedLength / task.totalLength) * 100)
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatSpeed = (bytes: number): string => {
  return formatBytes(bytes) + '/s'
}

// 处理统计卡片点击，跳转到任务列表并过滤对应状态
const handleStatCardClick = (status: string) => {
  router.push({
    path: '/tasks',
    query: { status: status }
  })
}

// 处理活跃任务点击，跳转到任务详情页面
const handleTaskClick = (gid: string) => {
  router.push(`/tasks/${gid}`)
}
</script>

<template>
  <div class="dashboard">
    <div class="page-header">
      <h2>仪表板</h2>
    </div>
    
    <div class="stats-grid">
      <div class="stat-card" @click="handleStatCardClick('active')">
        <div class="stat-icon active">
          <i class="icon-download"></i>
        </div>
        <div class="stat-info">
          <h3>{{ stats.active }}</h3>
          <p>活跃任务</p>
        </div>
      </div>
      
      <div class="stat-card" @click="handleStatCardClick('waiting')">
        <div class="stat-icon waiting">
          <i class="icon-clock"></i>
        </div>
        <div class="stat-info">
          <h3>{{ stats.waiting }}</h3>
          <p>等待中</p>
        </div>
      </div>
      
      <div class="stat-card" @click="handleStatCardClick('paused')">
        <div class="stat-icon paused">
          <i class="icon-pause"></i>
        </div>
        <div class="stat-info">
          <h3>{{ stats.paused }}</h3>
          <p>已暂停</p>
        </div>
      </div>
      
      <div class="stat-card" @click="handleStatCardClick('error')">
        <div class="stat-icon error">
          <i class="icon-error"></i>
        </div>
        <div class="stat-info">
          <h3>{{ stats.error }}</h3>
          <p>错误</p>
        </div>
      </div>
      
      <div class="stat-card" @click="handleStatCardClick('complete')">
        <div class="stat-icon complete">
          <i class="icon-check"></i>
        </div>
        <div class="stat-info">
          <h3>{{ stats.complete }}</h3>
          <p>已完成</p>
        </div>
      </div>
    </div>
    
    <div class="section">
      <h3>活跃任务</h3>
      <div class="active-tasks">
        <!-- 活跃任务列表 -->
        <div v-if="activeTasks.length === 0" class="empty-state">
          <p>暂无活跃任务</p>
        </div>
        <div v-else class="task-list">
          <div 
            v-for="task in activeTasks" 
            :key="task.gid"
            class="task-item"
            @click="handleTaskClick(task.gid)"
          >
            <div class="task-name">{{ getFileName(task) }}</div>
            <div class="task-progress">
              <div class="progress-bar">
                <div 
                  class="progress-fill" 
                  :style="{ width: getProgress(task) + '%' }"
                ></div>
              </div>
              <div class="progress-text">
                {{ getProgress(task) }}% - {{ formatBytes(task.completedLength) }} / {{ formatBytes(task.totalLength) }}
              </div>
            </div>
            <div class="task-speed">
              {{ formatSpeed(task.downloadSpeed) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  padding: 1.5rem;
  overflow-x: hidden;
  width: 100%;
  box-sizing: border-box;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #333333;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
  width: 100%;
  box-sizing: border-box;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 1.5rem;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  width: 100%;
  box-sizing: border-box;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 1rem;
  font-size: 1.5rem;
  color: #ffffff;
}

.stat-icon.active {
  background-color: #4caf50;
}

.stat-icon.waiting {
  background-color: #2196f3;
}

.stat-icon.paused {
  background-color: #ff9800;
}

.stat-icon.error {
  background-color: #f44336;
}

.stat-icon.complete {
  background-color: #9c27b0;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
}

.stat-card:hover .stat-icon.active {
  background-color: #45a049;
}

.stat-card:hover .stat-icon.waiting {
  background-color: #1976d2;
}

.stat-card:hover .stat-icon.paused {
  background-color: #e68900;
}

.stat-card:hover .stat-icon.error {
  background-color: #da190b;
}

.stat-card:hover .stat-icon.complete {
  background-color: #7b1fa2;
}

.stat-card:active {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.stat-info h3 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #333333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stat-info p {
  margin: 0;
  color: #666666;
}

.section {
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.section h3 {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #333333;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #999999;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.task-item {
  padding: 1rem;
  background-color: #f9f9f9;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.task-name {
  font-weight: 500;
  color: #333333;
  margin-bottom: 0.5rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  word-break: break-all;
}

.task-progress {
  margin-bottom: 0.5rem;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background-color: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 0.25rem;
}

.progress-fill {
  height: 100%;
  background-color: #4caf50;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.75rem;
  color: #666666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-speed {
  font-size: 0.75rem;
  color: #666666;
}

.task-item:hover {
  background-color: #f0f0f0;
  border-color: #e0e0e0;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.task-item:active {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .dashboard {
    padding: 0.75rem;
  }
  
  .page-header {
    margin-bottom: 1.5rem;
  }
  
  .page-header h2 {
    font-size: 1.25rem;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }
  
  .stat-card {
    padding: 1rem;
  }
  
  .stat-icon {
    width: 40px;
    height: 40px;
    font-size: 1rem;
    margin-right: 0.75rem;
  }
  
  .stat-info h3 {
    font-size: 1.25rem;
  }
  
  .stat-info p {
    font-size: 0.875rem;
  }
  
  .section {
    padding: 1rem;
    margin-bottom: 1rem;
  }
  
  .section h3 {
    font-size: 1.125rem;
    margin-bottom: 0.75rem;
  }
  
  .task-item {
    padding: 0.75rem;
  }
  
  .task-name {
    font-size: 0.875rem;
  }
  
  .progress-text {
    font-size: 0.6875rem;
  }
  
  .task-speed {
    font-size: 0.6875rem;
  }
}

/* 超小屏幕适配 */
@media (max-width: 480px) {
  .dashboard {
    padding: 0.5rem;
  }
  
  .page-header {
    margin-bottom: 1rem;
  }
  
  .page-header h2 {
    font-size: 1.125rem;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  
  .stat-card {
    padding: 0.75rem;
    flex-direction: column;
    text-align: center;
  }
  
  .stat-icon {
    width: 50px;
    height: 50px;
    font-size: 1.25rem;
    margin-right: 0;
    margin-bottom: 0.5rem;
  }
  
  .stat-info h3 {
    font-size: 1.125rem;
    word-break: break-all;
    overflow-wrap: break-word;
  }
  
  .stat-info p {
    font-size: 0.8125rem;
  }
  
  .section {
    padding: 0.75rem;
    margin-bottom: 0.75rem;
  }
  
  .section h3 {
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }
  
  .empty-state {
    padding: 1.5rem;
  }
  
  .task-item {
    padding: 0.5rem;
  }
  
  .task-name {
    font-size: 0.8125rem;
  }
  
  .progress-bar {
    height: 4px;
  }
  
  .progress-text {
    font-size: 0.625rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .task-speed {
    font-size: 0.625rem;
  }
}

/* 平板端适配 */
@media (max-width: 1024px) {
  .dashboard {
    padding: 1rem;
  }
  
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.875rem;
  }
  
  .stat-card {
    padding: 1.25rem;
  }
  
  .stat-icon {
    width: 50px;
    height: 50px;
    font-size: 1.25rem;
  }
  
  .stat-info h3 {
    font-size: 1.375rem;
  }
}

/* 暗色主题样式 */
.dark-theme .dashboard {
  background-color: #1a1a1a;
}

.dark-theme .page-header h2 {
  color: #e0e0e0;
}

.dark-theme .stat-card {
  background-color: #2d2d2d;
  border-color: #404040;
}

.dark-theme .stat-card:hover {
  background-color: #3d3d3d;
}

.dark-theme .stat-info h3 {
  color: #e0e0e0;
}

.dark-theme .stat-info p {
  color: #b0b0b0;
}

.dark-theme .section {
  background-color: #2d2d2d;
  border-color: #404040;
}

.dark-theme .section h3 {
  color: #e0e0e0;
}

.dark-theme .empty-state {
  color: #b0b0b0;
}

.dark-theme .task-item {
  background-color: #2d2d2d;
  border-color: #404040;
}

.dark-theme .task-item:hover {
  background-color: #3d3d3d;
  border-color: #555555;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.dark-theme .task-name {
  color: #e0e0e0;
}

.dark-theme .progress-bar {
  background-color: #404040;
}

.dark-theme .progress-fill {
  background-color: #66bb6a;
}

.dark-theme .progress-text {
  color: #b0b0b0;
}

.dark-theme .task-speed {
  color: #b0b0b0;
}

.dark-theme .page-header {
  border-bottom-color: #404040;
}
</style>