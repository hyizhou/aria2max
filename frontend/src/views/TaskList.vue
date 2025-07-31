<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useTaskStore } from '@/store'
import { fileApi } from '@/services'
import TaskItem from '@/components/TaskItem.vue'
import TaskFilter from '@/components/TaskFilter.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'

const taskStore = useTaskStore()
const router = useRouter()
const route = useRoute()

const loading = ref(false)
const selectedTasks = ref<string[]>([])
const filter = ref({
  status: 'all',
  keyword: ''
})
const refreshInterval = ref<number | null>(null)

// 监听路由参数变化，更新过滤器
watch(() => route.query.status, (newStatus) => {
  if (newStatus && typeof newStatus === 'string') {
    filter.value.status = newStatus
    // 通知 TaskFilter 组件更新
  }
}, { immediate: true })

onMounted(async () => {
  // 检查是否有状态参数
  if (route.query.status) {
    filter.value.status = route.query.status as string
  }
  
  await loadTasks()
  // Start auto-refresh every 1 second
  refreshInterval.value = window.setInterval(loadTasks, 1000)
})

onUnmounted(() => {
  // Clean up the interval when component is destroyed
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
})

const loadTasks = async () => {
  // During auto-refresh, don't show loading state to prevent flashing
  // Only show loading state for manual refreshes
  try {
    await taskStore.fetchTasks()
  } catch (error) {
    console.error('Failed to load tasks:', error)
  }
}

const getFileName = (task: any): string => {
  // 对于BT任务，使用BT任务名称
  if (task.bittorrent && task.bittorrent.info && task.bittorrent.info.name) {
    return task.bittorrent.info.name
  }
  
  // 对于普通任务，使用文件名
  if (task.files && task.files.length > 0) {
    const path = task.files[0].path
    return path.split('/').pop() || path
  }
  return '未知文件'
}

// 添加确认状态管理
const confirmDelete = ref<{gid: string, show: boolean} | null>(null)
const deleteWithFile = ref<boolean>(false)

const handleTaskDetail = (gid: string) => {
  router.push(`/tasks/${gid}`)
}

const handleTaskAction = async (action: string, gid: string) => {
  // Add confirmation for delete action
  if (action === 'delete') {
    confirmDelete.value = { gid, show: true }
    return
  }
  
  try {
    switch (action) {
      case 'pause':
        await taskStore.pauseTask(gid)
        break
      case 'resume':
        await taskStore.resumeTask(gid)
        break
      case 'delete':
        await taskStore.deleteTask(gid)
        break
    }
    await loadTasks()
  } catch (error: any) {
    console.error('Task action failed:', error)
    // Display error message to user
    let errorMessage = '操作失败'
    if (error && error.error && error.error.message) {
      errorMessage = error.error.message
    } else if (error && error.message) {
      errorMessage = error.message
    }
    // In a real application, you would use a proper notification system
    alert(`任务操作失败: ${errorMessage}`)
  }
}

// 确认删除操作（不带文件）
const confirmDeleteTask = async (gid: string) => {
  if (!gid) return
  
  try {
    await taskStore.deleteTask(gid)
    await loadTasks()
    // 关闭确认弹窗
    confirmDelete.value = null
  } catch (error: any) {
    console.error('Delete task failed:', error)
    // 关闭确认弹窗
    confirmDelete.value = null
    // Display error message to user
    let errorMessage = '操作失败'
    if (error && error.error && error.error.message) {
      errorMessage = error.error.message
    } else if (error && error.message) {
      errorMessage = error.message
    }
    alert(`删除任务失败: ${errorMessage}`)
  }
}

// 确认删除操作（可选择是否删除文件）
const confirmDeleteTaskWithFile = async (deleteFile: boolean) => {
  if (!confirmDelete.value) return
  
  const gid = confirmDelete.value.gid
  if (!gid) return
  
  try {
    // 删除任务（可选择是否同时删除文件）
    await taskStore.deleteTask(gid, deleteFile)
    
    await loadTasks()
    // 关闭确认弹窗
    confirmDelete.value = null
  } catch (error: any) {
    console.error('Delete task failed:', error)
    // 关闭确认弹窗
    confirmDelete.value = null
    // Display error message to user
    let errorMessage = '操作失败'
    if (error && error.error && error.error.message) {
      errorMessage = error.error.message
    } else if (error && error.message) {
      errorMessage = error.message
    }
    alert(`删除任务失败: ${errorMessage}`)
  }
}

// 取消删除操作
const cancelDeleteTask = () => {
  confirmDelete.value = null
}

// 添加批量删除确认状态管理
const confirmBatchDelete = ref<boolean>(false)

const handleBatchAction = async (action: string) => {
  // Add confirmation for delete action
  if (action === 'delete') {
    confirmBatchDelete.value = true
    return
  }
  
  try {
    // 批量操作（暂停或继续）
    const promises = selectedTasks.value.map(gid => {
      if (action === 'pause') {
        return taskStore.pauseTask(gid)
      } else if (action === 'resume') {
        return taskStore.resumeTask(gid)
      }
    })
    
    await Promise.all(promises)
    
    // 重新加载任务列表
    await loadTasks()
  } catch (error: any) {
    console.error('Batch action failed:', error)
    // Display error message to user
    let errorMessage = '操作失败'
    if (error && error.error && error.error.message) {
      errorMessage = error.error.message
    } else if (error && error.message) {
      errorMessage = error.message
    }
    alert(`批量操作失败: ${errorMessage}`)
  }
}

// 确认批量删除操作（不带文件）
const confirmBatchDeleteTask = async () => {
  try {
    // 批量删除选中的任务
    const deletePromises = selectedTasks.value.map(gid => taskStore.deleteTask(gid))
    await Promise.all(deletePromises)
    
    // 清空选中列表
    selectedTasks.value = []
    
    // 重新加载任务列表
    await loadTasks()
    
    // 关闭确认弹窗
    confirmBatchDelete.value = false
  } catch (error: any) {
    console.error('Batch delete failed:', error)
    // 关闭确认弹窗
    confirmBatchDelete.value = false
    // Display error message to user
    let errorMessage = '操作失败'
    if (error && error.error && error.error.message) {
      errorMessage = error.error.message
    } else if (error && error.message) {
      errorMessage = error.message
    }
    alert(`批量删除任务失败: ${errorMessage}`)
  }
}

// 确认批量删除操作（可选择是否删除文件）
const confirmBatchDeleteTaskWithFile = async (deleteFile: boolean) => {
  try {
    // 批量删除选中的任务（可选择是否同时删除文件）
    const deletePromises = selectedTasks.value.map(gid => taskStore.deleteTask(gid, deleteFile))
    await Promise.all(deletePromises)
    
    // 清空选中列表
    selectedTasks.value = []
    
    // 重新加载任务列表
    await loadTasks()
    
    // 关闭确认弹窗
    confirmBatchDelete.value = false
  } catch (error: any) {
    console.error('Batch delete failed:', error)
    // 关闭确认弹窗
    confirmBatchDelete.value = false
    // Display error message to user
    let errorMessage = '操作失败'
    if (error && error.error && error.error.message) {
      errorMessage = error.error.message
    } else if (error && error.message) {
      errorMessage = error.message
    }
    alert(`批量删除任务失败: ${errorMessage}`)
  }
}

// 取消批量删除操作
const cancelBatchDeleteTask = () => {
  confirmBatchDelete.value = false
}

const handleSelectTask = (gid: string) => {
  const index = selectedTasks.value.indexOf(gid)
  if (index === -1) {
    selectedTasks.value.push(gid)
  } else {
    selectedTasks.value.splice(index, 1)
  }
}

const handleSelectAll = () => {
  if (selectedTasks.value.length === filteredTasks.value.length) {
    // Deselect all filtered tasks
    selectedTasks.value = selectedTasks.value.filter(
      gid => !filteredTasks.value.some(task => task.gid === gid)
    )
  } else {
    // Select all filtered tasks that aren't already selected
    const filteredGids = filteredTasks.value.map(task => task.gid)
    const newSelections = filteredGids.filter(
      gid => !selectedTasks.value.includes(gid)
    )
    selectedTasks.value.push(...newSelections)
  }
}

const handleFilterChange = (newFilter: any) => {
  filter.value = newFilter
}

const filteredTasks = computed(() => {
  let tasks = taskStore.tasks
  
  // Apply status filter
  if (filter.value.status !== 'all') {
    tasks = tasks.filter(task => task.status === filter.value.status)
  }
  
  // Apply keyword filter
  if (filter.value.keyword) {
    const keyword = filter.value.keyword.toLowerCase()
    tasks = tasks.filter(task => {
      // Check task name/ID
      const name = getFileName(task).toLowerCase()
      const gid = task.gid.toLowerCase()
      return name.includes(keyword) || gid.includes(keyword)
    })
  }
  
  // 注意：显示所有任务状态，包括removed状态（为了兼容性）
  // 但通过我们项目操作删除的任务会直接彻底删除，不会变成removed状态
  
  return tasks
})
</script>

<template>
  <div class="task-list">
    <div class="page-header">
      <h2>下载任务</h2>
    </div>
    
    <TaskFilter :initial-status="filter.status" @filter-change="handleFilterChange" />
    
    <div class="task-actions">
      <div class="task-actions-left">
        <label class="select-all">
          <input 
            type="checkbox" 
            :checked="selectedTasks.length === filteredTasks.length && filteredTasks.length > 0"
            @change="handleSelectAll"
          />
          全选
        </label>
      </div>
      <div class="task-actions-right">
        <button class="btn btn-info">
          <i class="fas fa-broom"></i>
          自动清理
        </button>
        <button 
          class="btn btn-secondary"
          :disabled="selectedTasks.length === 0"
          @click="handleBatchAction('pause')"
        >
          暂停选中
        </button>
        <button 
          class="btn btn-secondary"
          :disabled="selectedTasks.length === 0"
          @click="handleBatchAction('resume')"
        >
          继续选中
        </button>
        <button 
          class="btn btn-danger"
          :disabled="selectedTasks.length === 0"
          @click="handleBatchAction('delete')"
        >
          删除选中
        </button>
      </div>
    </div>
    
    <div class="task-list-container">
      <div v-if="filteredTasks.length === 0" class="empty-state">
        <p>暂无下载任务</p>
      </div>
      
      <div class="task-items">
        <TaskItem
          v-for="task in filteredTasks"
          :key="task.gid"
          :task="task"
          :selected="selectedTasks.includes(task.gid)"
          @action="handleTaskAction"
          @select="handleSelectTask"
          @click-detail="handleTaskDetail"
        />
      </div>
    </div>
    
    <!-- 删除确认弹窗 -->
    <ConfirmDialog
      v-if="confirmDelete && confirmDelete.show"
      title="确认删除"
      message="确定要删除这个任务吗？此操作不可恢复。"
      confirm-text="确定删除"
      checkbox-label="同时删除本地文件"
      :initial-checkbox-value="false"
      @confirm-with-checkbox="confirmDeleteTaskWithFile"
      @cancel="cancelDeleteTask"
    />
    
    <!-- 批量删除确认弹窗 -->
    <ConfirmDialog
      v-if="confirmBatchDelete"
      title="确认批量删除"
      :message="`确定要删除选中的 ${selectedTasks.length} 个任务吗？此操作不可恢复。`"
      confirm-text="确定删除"
      checkbox-label="同时删除本地文件"
      :initial-checkbox-value="false"
      @confirm-with-checkbox="confirmBatchDeleteTaskWithFile"
      @cancel="cancelBatchDeleteTask"
    />
    
  </div>
</template>

<style scoped>
.task-list {
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

.task-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow-x: hidden;
  width: 100%;
  box-sizing: border-box;
}

.select-all {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.task-actions-right {
  display: flex;
  gap: 0.5rem;
  min-width: 0;
  flex-shrink: 0;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-secondary {
  background-color: #f5f5f5;
  color: #333333;
  border-color: #e0e0e0;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #e0e0e0;
  border-color: #bdbdbd;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-danger {
  background-color: #f44336;
  color: #ffffff;
  border-color: #f44336;
}

.btn-danger:hover:not(:disabled) {
  background-color: #d32f2f;
  border-color: #d32f2f;
}

.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.task-list-container {
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  position: relative;
  min-height: 200px;
  width: 100%;
  box-sizing: border-box;
}

.loading, .empty-state {
  padding: 2rem;
  text-align: center;
  color: #999999;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .task-list {
    padding: 0.75rem;
  }
  
  .page-header h2 {
    font-size: 1.25rem;
  }
  
  .task-actions {
    flex-direction: column;
    gap: 0.75rem;
    align-items: stretch;
    padding: 0.75rem;
  }
  
  .task-actions-right {
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .btn {
    padding: 0.4375rem 0.875rem;
    font-size: 0.8125rem;
  }
  
  .task-list-container {
    border-radius: 6px;
  }
}

/* 超小屏幕适配 */
@media (max-width: 480px) {
  .task-list {
    padding: 0.5rem;
  }
  
  .page-header {
    margin-bottom: 1rem;
  }
  
  .page-header h2 {
    font-size: 1.125rem;
  }
  
  .task-actions {
    padding: 0.5rem;
    gap: 0.5rem;
  }
  
  .task-actions-right {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .btn {
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
    width: 100%;
    justify-content: center;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .select-all {
    font-size: 0.875rem;
  }
}

/* 平板端适配 */
@media (max-width: 1024px) {
  .task-list {
    padding: 1rem;
  }
  
  .task-actions {
    padding: 0.875rem;
  }
  
  .btn {
    padding: 0.5rem 0.875rem;
    font-size: 0.8125rem;
  }
}
</style>