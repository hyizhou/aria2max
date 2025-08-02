<script setup lang="ts">
import { computed } from 'vue'

interface File {
  name: string
  path: string
  size: number
  mtime: string
  isDir: boolean
}

interface Props {
  file: File
  selected: boolean
}

interface Emits {
  (e: 'action', action: string, path: string): void
  (e: 'select', path: string): void
  (e: 'navigate', path: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString()
}

const fileTypeIcon = computed(() => {
  if (props.file.isSymlink) {
    return 'fas fa-link'
  }
  if (props.file.isDir) {
    return 'fas fa-folder'
  }
  const ext = props.file.name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return 'fas fa-image'
    case 'mp4':
    case 'avi':
    case 'mkv':
    case 'mov':
    case 'wmv':
    case 'flv':
    case 'webm':
      return 'fas fa-video'
    case 'mp3':
    case 'wav':
    case 'flac':
      return 'fas fa-music'
    case 'pdf':
      return 'fas fa-file-pdf'
    case 'doc':
    case 'docx':
      return 'fas fa-file-word'
    case 'zip':
    case 'rar':
    case '7z':
      return 'fas fa-file-archive'
    default:
      return 'fas fa-file'
  }
})

const fileTypeDisplay = computed(() => {
  if (props.file.isSymlink) {
    return props.file.isDir ? '链接目录' : '链接文件'
  }
  return props.file.isDir ? '文件夹' : '文件'
})

const isVideoFile = computed(() => {
  if (props.file.isDir || props.file.isSymlink) return false
  const ext = props.file.name.split('.').pop()?.toLowerCase()
  const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'wmv', 'flv']
  return videoExtensions.includes(ext)
})

const handleAction = (action: string) => {
  emit('action', action, props.file.path)
}

const handleSelect = () => {
  emit('select', props.file.path)
}

const handleNavigate = () => {
  if (props.file.isDir) {
    emit('navigate', props.file.path)
  } else {
    // For files, trigger preview action instead of download
    emit('action', 'preview', props.file.path)
  }
}
</script>

<template>
  <div class="file-item" :class="{ 'selected': selected }">
    <div class="file-select">
      <input 
        type="checkbox" 
        :checked="selected"
        @change="handleSelect"
      />
    </div>
    
    <div class="file-info" @click="handleNavigate" :class="{ 'file-info-clickable': file.isDir }">
      <div class="file-icon">
        <i :class="fileTypeIcon"></i>
      </div>
      <div class="file-details">
        <div class="file-name" :title="file.name">{{ file.name }}</div>
        <div class="file-meta">
          <span class="file-size" v-if="!file.isDir && !file.isSymlink">{{ formatBytes(file.size) }}</span>
          <span class="file-type">{{ fileTypeDisplay }}</span>
          <span class="file-date">{{ formatDate(file.mtime) }}</span>
        </div>
      </div>
    </div>
    
    <div class="file-actions">
      <button 
        class="btn-action"
        @click="handleAction('rename')"
      >
        <i class="fas fa-edit"></i>
        重命名
      </button>
      <button 
        v-if="!file.isDir"
        class="btn-action"
        @click="handleAction('download')"
      >
        <i class="fas fa-download"></i>
        下载
      </button>
      <button 
        class="btn-action btn-danger"
        @click="handleAction('delete')"
      >
        <i class="fas fa-trash"></i>
        删除
      </button>
    </div>
  </div>
</template>

<style scoped>
.file-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s ease;
  overflow-x: hidden;
  width: 100%;
  box-sizing: border-box;
  table-layout: fixed; /* 固定表格布局，防止内容溢出 */
}

.file-item:hover {
  background-color: #f9f9f9;
}

.file-item.selected {
  background-color: #e3f2fd;
}

.file-select {
  margin-right: 1rem;
}

.file-info {
  flex: 1;
  display: flex;
  align-items: center;
  cursor: pointer;
  overflow: hidden; /* 防止内容溢出 */
}

.file-icon {
  margin-right: 1rem;
  font-size: 1.5rem;
  color: #666666;
}

.file-details {
  flex: 1;
  overflow: hidden; /* 防止内容溢出 */
}

.file-name {
  font-weight: 500;
  color: #333333;
  margin-bottom: 0.25rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: calc(100% - 120px); /* 为操作按钮预留空间 */
  box-sizing: border-box; /* 确保padding和border包含在width内 */
}

.file-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  color: #666666;
}

.file-size {
  min-width: 80px;
}

.file-type {
  min-width: 60px;
}

.file-date {
  min-width: 120px;
}

.file-info-clickable {
  cursor: pointer;
}

.file-actions {
  display: flex;
  gap: 0.5rem;
  min-width: 120px; /* 与文件名的max-width计算保持一致 */
  flex-shrink: 0;
  flex-wrap: nowrap; /* 防止按钮换行 */
  white-space: nowrap; /* 防止按钮内文字换行 */
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
  display: flex;
  align-items: center;
  gap: 0.25rem;
  white-space: nowrap;
  flex-shrink: 0;
  min-width: 0; /* 允许按钮收缩以适应空间 */
  overflow: hidden; /* 防止内容溢出 */
  text-overflow: ellipsis; /* 文字过长时显示省略号 */
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
  .file-item {
    padding: 0.625rem 0.75rem;
  }
  
  .file-select {
    margin-right: 0.75rem;
  }
  
  .file-icon {
    margin-right: 0.75rem;
    font-size: 1.25rem;
  }
  
  .file-name {
    font-size: 0.875rem;
    max-width: calc(100% - 100px); /* 为操作按钮预留空间 */
  }
  
  .file-meta {
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.6875rem;
  }
  
  .file-size,
  .file-type,
  .file-date {
    min-width: unset;
  }
  
  .file-actions {
    gap: 0.375rem;
    min-width: 100px; /* 与文件名的max-width计算保持一致 */
    flex-wrap: nowrap; /* 防止按钮换行 */
    white-space: nowrap; /* 防止按钮内文字换行 */
  }
  
  .btn-action {
    padding: 0.1875rem 0.375rem;
    font-size: 0.6875rem;
    min-width: 0; /* 允许按钮收缩以适应空间 */
    overflow: hidden; /* 防止内容溢出 */
    text-overflow: ellipsis; /* 文字过长时显示省略号 */
  }
}

/* 超小屏幕适配 */
@media (max-width: 480px) {
  .file-item {
    padding: 0.5rem;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    overflow-x: hidden;
    word-wrap: break-word;
  }
  
  .file-select {
    margin-right: 0;
    margin-bottom: 0.25rem;
  }
  
  .file-info {
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.375rem;
  }
  
  .file-icon {
    margin-right: 0;
    font-size: 1.125rem;
  }
  
  .file-details {
    width: 100%;
    overflow-x: hidden;
  }
  
  .file-name {
    font-size: 0.8125rem;
    margin-bottom: 0.375rem;
    word-break: break-all;
    overflow-wrap: break-word;
    hyphens: auto;
    max-width: 100%;
  }
  
  .file-meta {
    font-size: 0.625rem;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .file-actions {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
    gap: 0.25rem;
  }
  
  .btn-action {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    flex: 1;
    min-width: 60px;
    justify-content: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

/* 平板端适配 */
@media (max-width: 1024px) {
  .file-item {
    padding: 0.6875rem 0.875rem;
  }
  
  .file-icon {
    font-size: 1.375rem;
  }
  
  .file-name {
    font-size: 0.9375rem;
    max-width: calc(100% - 110px); /* 为操作按钮预留空间 */
  }
  
  .file-meta {
    font-size: 0.71875rem;
  }
  
  .file-actions {
    min-width: 110px; /* 与文件名的max-width计算保持一致 */
    flex-wrap: nowrap; /* 防止按钮换行 */
    white-space: nowrap; /* 防止按钮内文字换行 */
  }
  
  .btn-action {
    font-size: 0.71875rem;
    min-width: 0; /* 允许按钮收缩以适应空间 */
    overflow: hidden; /* 防止内容溢出 */
    text-overflow: ellipsis; /* 文字过长时显示省略号 */
  }
}

/* 暗色主题样式 */
.dark-theme .file-item {
  border-bottom-color: #404040;
}

.dark-theme .file-item:hover {
  background-color: #3d3d3d;
}

.dark-theme .file-item.selected {
  background-color: #1a365d;
}

.dark-theme .file-icon {
  color: #b0b0b0;
}

.dark-theme .file-name {
  color: #e0e0e0;
}

.dark-theme .file-meta {
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
</style>