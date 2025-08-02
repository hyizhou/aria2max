<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  initialStatus?: string
}

interface Emits {
  (e: 'filter-change', filter: any): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const filter = ref({
  status: props.initialStatus || 'all',
  keyword: ''
})

// 监听外部状态变化
watch(() => props.initialStatus, (newStatus) => {
  if (newStatus && newStatus !== filter.value.status) {
    filter.value.status = newStatus
    emit('filter-change', filter.value)
  }
})

const statusOptions = [
  { value: 'all', label: '全部状态' },
  { value: 'active', label: '下载中' },
  { value: 'waiting', label: '等待中' },
  { value: 'paused', label: '已暂停' },
  { value: 'error', label: '错误' },
  { value: 'complete', label: '已完成' }
]

const handleStatusChange = (status: string) => {
  filter.value.status = status
  emit('filter-change', filter.value)
}

const handleKeywordChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  filter.value.keyword = target.value
  emit('filter-change', filter.value)
}

const clearKeyword = () => {
  filter.value.keyword = ''
  emit('filter-change', filter.value)
}
</script>

<template>
  <div class="task-filter">
    <div class="filter-item">
      <label>状态:</label>
      <select 
        :value="filter.status" 
        @change="handleStatusChange(($event.target as HTMLSelectElement).value)"
      >
        <option 
          v-for="option in statusOptions" 
          :key="option.value" 
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
    </div>
    
    <div class="filter-item">
      <label>搜索:</label>
      <div class="search-input">
        <input 
          type="text" 
          :value="filter.keyword"
          placeholder="文件名或任务ID"
          @input="handleKeywordChange"
        />
        <button 
          v-if="filter.keyword" 
          class="clear-button"
          @click="clearKeyword"
        >
          ✕
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.task-filter {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-item label {
  font-weight: 500;
  color: #333333;
}

.filter-item select,
.filter-item input {
  padding: 0.5rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 0.875rem;
}

.filter-item input {
  min-width: 200px;
}

.search-input {
  position: relative;
}

.clear-button {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  color: #999999;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .task-filter {
    flex-direction: column;
    gap: 1rem;
  }
  
  .filter-item {
    width: 100%;
  }
  
  .filter-item input {
    min-width: unset;
    width: 100%;
  }
}

/* 暗色主题样式 */
.dark-theme .task-filter {
  background-color: #2d2d2d;
  border-color: #404040;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.dark-theme .filter-item label {
  color: #e0e0e0;
}

.dark-theme .filter-item select,
.dark-theme .filter-item input {
  background-color: #3d3d3d;
  border-color: #555555;
  color: #e0e0e0;
}

.dark-theme .filter-item select:focus,
.dark-theme .filter-item input:focus {
  border-color: #1976d2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.3);
}

.dark-theme .clear-button {
  color: #b0b0b0;
}

.dark-theme .clear-button:hover {
  color: #e0e0e0;
}
</style>