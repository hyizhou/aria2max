<script setup lang="ts">
import { ref, computed } from 'vue'

interface Task {
  gid: string
  status: string
  totalLength: string
  completedLength: string
  downloadSpeed: string
  uploadSpeed: string
  connections: string
  files: Array<{
    path: string
    length: string
    completedLength: string
  }>
}

interface Props {
  task: Task
  selected: boolean
}

interface Emits {
  (e: 'action', action: string, gid: string): void
  (e: 'select', gid: string): void
  (e: 'click-detail', gid: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const formatBytes = (bytes: string | number): string => {
  const numBytes = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes
  if (numBytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(numBytes) / Math.log(k))
  return parseFloat((numBytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatSpeed = (bytes: string | number): string => {
  return formatBytes(bytes) + '/s'
}

const progress = computed(() => {
  const totalLength = typeof props.task.totalLength === 'string' ? parseInt(props.task.totalLength, 10) : props.task.totalLength
  const completedLength = typeof props.task.completedLength === 'string' ? parseInt(props.task.completedLength, 10) : props.task.completedLength
  if (totalLength === 0) return 0
  return Math.round((completedLength / totalLength) * 100)
})

const statusText = computed(() => {
  const statusMap: Record<string, string> = {
    active: '下载中',
    waiting: '等待中',
    paused: '已暂停',
    error: '错误',
    complete: '已完成',
    removed: '已删除'  // 为了兼容性显示，但通过我们项目操作的任务不会变成此状态
  }
  return statusMap[props.task.status] || props.task.status
})

const statusClass = computed(() => {
  return `status-${props.task.status}`
})

const handleAction = (action: string) => {
  emit('action', action, props.task.gid)
}

const handleSelect = () => {
  emit('select', props.task.gid)
}

const handleClickDetail = () => {
  emit('click-detail', props.task.gid)
}

const getFileName = (): string => {
  // 对于BT任务，使用BT任务名称
  if (props.task.bittorrent && props.task.bittorrent.info && props.task.bittorrent.info.name) {
    return props.task.bittorrent.info.name
  }
  
  // 对于普通任务，使用文件名
  if (props.task.files && props.task.files.length > 0) {
    const path = props.task.files[0].path
    return path.split('/').pop() || path
  }
  return '未知文件'
}
</script>

<template>
  <div 
    class="task-item" 
    :class="{ 'selected': selected }"
    @click="(e) => {
      // 如果点击的是复选框或按钮，不触发详情
      if (e.target.type === 'checkbox' || e.target.tagName === 'BUTTON') {
        return
      }
      handleClickDetail()
    }"
    role="button"
    tabindex="0"
    @keydown.enter="handleClickDetail"
    @keydown.space="handleClickDetail"
  >
    <div class="task-select" @click.stop>
      <input 
        type="checkbox" 
        :checked="selected"
        @change="handleSelect"
      />
    </div>
    
    <div class="task-info">
      <div class="task-header">
        <h4 class="task-name" :title="getFileName()">{{ getFileName() }}</h4>
        <span class="task-status" :class="statusClass">{{ statusText }}</span>
      </div>
      
      <div class="task-progress">
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            :class="statusClass"
            :style="{ width: progress + '%' }"
          ></div>
        </div>
        <div class="progress-text">
          {{ progress }}% - {{ formatBytes(task.completedLength) }} / {{ formatBytes(task.totalLength) }}
        </div>
      </div>
      
      <div class="task-details">
        <div class="task-speed">
          <span v-if="parseInt(task.downloadSpeed, 10) > 0">
            下载速度: {{ formatSpeed(task.downloadSpeed) }}
          </span>
          <span v-if="parseInt(task.uploadSpeed, 10) > 0">
            上传速度: {{ formatSpeed(task.uploadSpeed) }}
          </span>
        </div>
        <div class="task-actions">
          <button 
            v-if="task.status === 'active'" 
            class="btn-action"
            @click="handleAction('pause')"
          >
            暂停
          </button>
          <button 
            v-else-if="task.status === 'paused'" 
            class="btn-action"
            @click="handleAction('resume')"
          >
            继续
          </button>
          <button 
            class="btn-action btn-danger"
            @click="handleAction('delete')"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.task-item {
  display: flex;
  padding: 1rem;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s ease;
  overflow-x: hidden;
  width: 100%;
  box-sizing: border-box;
}

.task-item:hover {
  background-color: #f9f9f9;
}

.task-item.selected {
  background-color: #e3f2fd;
}

.task-select {
  display: flex;
  align-items: center;
  margin-right: 1rem;
}

.task-info {
  flex: 1;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.task-name {
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
  color: #333333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 70%;
  word-break: break-all;
}

.task-status {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-active {
  background-color: #e8f5e9;
  color: #4caf50;
}

.status-waiting {
  background-color: #e3f2fd;
  color: #2196f3;
}

.status-paused {
  background-color: #fff3e0;
  color: #ff9800;
}

.status-error {
  background-color: #ffebee;
  color: #f44336;
}

.status-complete {
  background-color: #f3e5f5;
  color: #9c27b0;
}

.task-progress {
  margin-bottom: 0.5rem;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.25rem;
}

.progress-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.progress-fill.status-active {
  background-color: #4caf50;
}

.progress-fill.status-waiting {
  background-color: #2196f3;
}

.progress-fill.status-paused {
  background-color: #ff9800;
}

.progress-fill.status-error {
  background-color: #f44336;
}

.progress-fill.status-complete {
  background-color: #9c27b0;
}

.progress-text {
  font-size: 0.75rem;
  color: #666666;
}

.task-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.task-speed {
  font-size: 0.75rem;
  color: #666666;
}

.task-speed span {
  margin-right: 1rem;
}

.task-actions {
  display: flex;
  gap: 0.5rem;
  min-width: 0;
  flex-shrink: 0;
}

.btn-action {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  border: 1px solid #e0e0e0;
  background-color: #ffffff;
  color: #333333;
  transition: all 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-action:hover {
  background-color: #f5f5f5;
}

.btn-danger {
  color: #f44336;
  border-color: #f44336;
}

.btn-danger:hover {
  background-color: #ffebee;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .task-item {
    padding: 0.75rem;
  }
  
  .task-select {
    margin-right: 0.75rem;
  }
  
  .task-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .task-name {
    max-width: 100%;
    font-size: 0.875rem;
  }
  
  .task-status {
    font-size: 0.6875rem;
    padding: 0.1875rem 0.375rem;
  }
  
  .progress-bar {
    height: 6px;
  }
  
  .progress-text {
    font-size: 0.6875rem;
  }
  
  .task-details {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .task-speed {
    order: 2;
    font-size: 0.6875rem;
  }
  
  .task-speed span {
    margin-right: 0.75rem;
  }
  
  .task-actions {
    order: 1;
    gap: 0.375rem;
  }
  
  .btn-action {
    padding: 0.1875rem 0.375rem;
    font-size: 0.6875rem;
  }
}

/* 超小屏幕适配 */
@media (max-width: 480px) {
  .task-item {
    padding: 0.5rem;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    overflow-x: hidden;
    word-wrap: break-word;
  }
  
  .task-select {
    margin-right: 0;
    margin-bottom: 0.25rem;
  }
  
  .task-info {
    width: 100%;
    overflow-x: hidden;
  }
  
  .task-header {
    gap: 0.375rem;
  }
  
  .task-name {
    font-size: 0.8125rem;
    word-break: break-all;
    overflow-wrap: break-word;
    hyphens: auto;
    max-width: 100%;
  }
  
  .task-status {
    font-size: 0.625rem;
    padding: 0.125rem 0.25rem;
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
  
  .task-details {
    gap: 0.375rem;
  }
  
  .task-speed {
    font-size: 0.625rem;
  }
  
  .task-speed span {
    margin-right: 0.5rem;
    display: block;
    margin-bottom: 0.25rem;
  }
  
  .task-actions {
    width: 100%;
    justify-content: space-between;
    gap: 0.25rem;
  }
  
  .btn-action {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    flex: 1;
    min-width: 60px;
    justify-content: center;
  }
}

/* 平板端适配 */
@media (max-width: 1024px) {
  .task-item {
    padding: 0.875rem;
  }
  
  .task-name {
    font-size: 0.9375rem;
  }
  
  .task-status {
    font-size: 0.71875rem;
  }
  
  .progress-text {
    font-size: 0.71875rem;
  }
  
  .task-speed {
    font-size: 0.71875rem;
  }
  
  .btn-action {
    font-size: 0.71875rem;
  }
}

/* 暗色主题样式 */
.dark-theme .task-item {
  border-bottom-color: #404040;
  background-color: #2d2d2d;
}

.dark-theme .task-item:hover {
  background-color: #3d3d3d;
}

.dark-theme .task-item.selected {
  background-color: #1a365d;
}

.dark-theme .task-name {
  color: #e0e0e0;
}

.dark-theme .progress-bar {
  background-color: #404040;
}

.dark-theme .progress-text {
  color: #b0b0b0;
}

.dark-theme .task-speed {
  color: #b0b0b0;
}

.dark-theme .btn-action {
  background-color: #3d3d3d;
  border-color: #555555;
  color: #e0e0e0;
}

.dark-theme .btn-action:hover {
  background-color: #4d4d4d;
}

.dark-theme .btn-danger {
  color: #ff6b6b;
  border-color: #ff6b6b;
}

.dark-theme .btn-danger:hover {
  background-color: #4d1a1a;
}

/* 任务状态徽章暗色主题 */
.dark-theme .status-active {
  background-color: #1a3a1a;
  color: #66bb6a;
}

.dark-theme .status-waiting {
  background-color: #1a2d4d;
  color: #64b5f6;
}

.dark-theme .status-paused {
  background-color: #4d3319;
  color: #ffa726;
}

.dark-theme .status-error {
  background-color: #4d1919;
  color: #ef5350;
}

.dark-theme .status-complete {
  background-color: #3d1a4d;
  color: #ab47bc;
}

/* 进度条暗色主题 */
.dark-theme .progress-fill.status-active {
  background-color: #66bb6a;
}

.dark-theme .progress-fill.status-waiting {
  background-color: #64b5f6;
}

.dark-theme .progress-fill.status-paused {
  background-color: #ffa726;
}

.dark-theme .progress-fill.status-error {
  background-color: #ef5350;
}

.dark-theme .progress-fill.status-complete {
  background-color: #ab47bc;
}
</style>