<template>
  <div class="file-manager">
    <div class="page-header">
      <h2>文件管理</h2>
    </div>
    
    <FileBreadcrumb 
      :current-path="fileStore.currentPath" 
      @navigate="handleNavigate"
    />
    
    <div class="file-actions">
      <div class="file-actions-left">
        <label class="select-all">
          <input 
            type="checkbox" 
            :checked="selectedFiles.length === fileStore.files.length && fileStore.files.length > 0"
            @change="handleSelectAll"
          />
          全选
        </label>
      </div>
      <div class="file-actions-right">
        <button class="btn btn-secondary" @click="loadFiles">
          <i class="fas fa-sync-alt"></i>
          刷新
        </button>
        <button class="btn btn-secondary" @click="handleUploadClick">
          上传文件
        </button>
        <button class="btn btn-secondary" @click="handleCreateDirectory">
          新建目录
        </button>
        <button 
          class="btn btn-danger"
          :disabled="selectedFiles.length === 0"
          @click="handleBatchDelete"
        >
          删除选中
        </button>
      </div>
    </div>
    
    <div class="file-list-container">
      <div v-if="loading" class="loading">
        <p>加载中...</p>
      </div>
      
      <div v-else-if="fileStore.error" class="error-state">
        <p>无法加载文件列表：</p>
        <p class="error-message">{{ fileStore.error }}</p>
        <button class="btn btn-secondary" @click="loadFiles">重试</button>
      </div>
      
      <div v-else-if="fileStore.files.length === 0" class="empty-state">
        <p>该目录为空</p>
      </div>
      
      <div v-else class="file-items">
        <FileItem
          v-for="file in fileStore.files"
          :key="file.path"
          :file="file"
          :selected="selectedFiles.includes(file.path)"
          @action="handleFileAction"
          @select="handleSelectFile"
          @navigate="handleNavigate"
        />
      </div>
    </div>
  </div>
  
  <!-- File Upload Component -->
  <FileUpload ref="fileUploadRef" @uploadComplete="loadFiles" />
  
  <!-- File Rename Component -->
  <FileRename ref="fileRenameRef" @renameComplete="loadFiles" />
  
  <!-- File Preview Component -->
  <FilePreview ref="filePreviewRef" @close="handlePreviewClose" />
  
  <!-- 删除确认弹窗 -->
  <ConfirmDialog
    v-if="confirmDelete && confirmDelete.show"
    title="确认删除"
    message="确定要删除这个文件或目录吗？此操作不可恢复。"
    confirm-text="确定删除"
    @confirm="confirmDeleteFile"
    @cancel="cancelDeleteFile"
  />
  
  <!-- 批量删除确认弹窗 -->
  <ConfirmDialog
    v-if="confirmBatchDelete"
    title="确认批量删除"
    :message="`确定要删除选中的 ${selectedFiles.length} 个文件或目录吗？此操作不可恢复。`"
    confirm-text="确定删除"
    @confirm="confirmBatchDeleteFiles"
    @cancel="cancelBatchDeleteFile"
  />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useFileStore } from '@/store'
import FileItem from '@/components/FileItem.vue'
import FileBreadcrumb from '@/components/FileBreadcrumb.vue'
import FileUpload from '@/components/FileUpload.vue'
import FileRename from '@/components/FileRename.vue'
import FilePreview from '@/components/FilePreview.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'

const fileStore = useFileStore()
const loading = ref(false)
const selectedFiles = ref<string[]>([])
const fileUploadRef = ref<typeof FileUpload | null>(null)
const fileRenameRef = ref<typeof FileRename | null>(null)
const filePreviewRef = ref<typeof FilePreview | null>(null)

// 删除确认状态管理
const confirmDelete = ref<{path: string, show: boolean} | null>(null)
const confirmBatchDelete = ref<boolean>(false)

onMounted(async () => {
  await loadFiles()
})

const loadFiles = async () => {
  loading.value = true
  try {
    await fileStore.fetchFiles(fileStore.currentPath)
  } finally {
    loading.value = false
  }
}

const handleNavigate = async (path: string) => {
  fileStore.currentPath = path
  await loadFiles()
}

const handleFileAction = async (action: string, path: string) => {
  // 添加确认删除对话框
  if (action === 'delete') {
    confirmDelete.value = { path, show: true }
    return
  }
  
  try {
    switch (action) {
      case 'delete':
        await fileStore.deleteFile(path)
        await loadFiles()
        break
      case 'download':
        await fileStore.downloadFile(path)
        break
      case 'preview':
        filePreviewRef.value?.show(path)
        break
      case 'rename':
        fileRenameRef.value?.show(path)
        break
    }
  } catch (error) {
    console.error('File action failed:', error)
  }
}

const handleSelectFile = (path: string) => {
  const index = selectedFiles.value.indexOf(path)
  if (index === -1) {
    selectedFiles.value.push(path)
  } else {
    selectedFiles.value.splice(index, 1)
  }
}

const handleSelectAll = () => {
  if (selectedFiles.value.length === fileStore.files.length) {
    selectedFiles.value = []
  } else {
    selectedFiles.value = fileStore.files.map(file => file.path)
  }
}

const handleBatchDelete = async () => {
  if (selectedFiles.value.length === 0) return
  confirmBatchDelete.value = true
}

// 确认删除单个文件/目录
const confirmDeleteFile = async () => {
  if (!confirmDelete.value) return
  
  const path = confirmDelete.value.path
  if (!path) return
  
  try {
    await fileStore.deleteFile(path)
    await loadFiles()
    confirmDelete.value = null
  } catch (error) {
    console.error('Delete file failed:', error)
    confirmDelete.value = null
    alert(`删除失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

// 确认批量删除文件/目录
const confirmBatchDeleteFiles = async () => {
  try {
    for (const path of selectedFiles.value) {
      await fileStore.deleteFile(path)
    }
    selectedFiles.value = []
    await loadFiles()
    confirmBatchDelete.value = false
  } catch (error) {
    console.error('Batch delete failed:', error)
    confirmBatchDelete.value = false
    alert(`批量删除失败: ${error instanceof Error ? error.message : '未知错误'}`)
  }
}

// 取消删除操作
const cancelDeleteFile = () => {
  confirmDelete.value = null
}

// 取消批量删除操作
const cancelBatchDeleteFile = () => {
  confirmBatchDelete.value = false
}

const handleCreateDirectory = async () => {
  // TODO: 实现创建目录功能
}

const handleUploadClick = () => {
  fileUploadRef.value?.triggerUpload()
}

const handlePreviewClose = () => {
  // Handle preview close if needed
}
</script>

<style scoped>
.file-manager {
  padding: 1.5rem;
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

.file-actions {
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

.file-actions-right {
  display: flex;
  gap: 0.5rem;
  align-items: center;
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
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-secondary {
  background-color: #f5f5f5;
  color: #333333;
  border-color: #e0e0e0;
}

.btn-secondary:hover {
  background-color: #e0e0e0;
  border-color: #bdbdbd;
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

.file-list-container {
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  width: 100%;
  box-sizing: border-box;
}

.loading, .empty-state, .error-state {
  padding: 2rem;
  text-align: center;
  color: #999999;
}

.error-state {
  color: #d32f2f;
}

.error-message {
  margin-top: 0.5rem;
  margin-bottom: 1rem;
  color: #d32f2f;
  font-family: monospace;
  white-space: pre-wrap;
  word-break: break-all;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .file-manager {
    padding: 0.75rem;
  }
  
  .page-header h2 {
    font-size: 1.25rem;
  }
  
  .file-actions {
    flex-direction: column;
    gap: 0.75rem;
    align-items: stretch;
    padding: 0.75rem;
  }
  
  .file-actions-right {
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .btn {
    padding: 0.4375rem 0.875rem;
    font-size: 0.8125rem;
  }
  
  .file-list-container {
    border-radius: 6px;
  }
}

/* 超小屏幕适配 */
@media (max-width: 480px) {
  .file-manager {
    padding: 0.5rem;
  }
  
  .page-header {
    margin-bottom: 1rem;
  }
  
  .page-header h2 {
    font-size: 1.125rem;
  }
  
  .file-actions {
    padding: 0.5rem;
    gap: 0.5rem;
  }
  
  .file-actions-right {
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
  .file-manager {
    padding: 1rem;
  }
  
  .file-actions {
    padding: 0.875rem;
  }
  
  .btn {
    padding: 0.5rem 0.875rem;
    font-size: 0.8125rem;
  }
}

/* 暗色主题样式 */
.dark-theme .file-manager {
  background-color: #1a1a1a;
}

.dark-theme .page-header {
  border-bottom-color: #404040;
}

.dark-theme .page-header h2 {
  color: #e0e0e0;
}

.dark-theme .file-actions {
  background-color: #2d2d2d;
  border-bottom-color: #404040;
}

.dark-theme .file-list-container {
  background-color: #1a1a1a;
}

.dark-theme .btn-secondary {
  background-color: #3d3d3d;
  border-color: #555555;
  color: #e0e0e0;
}

.dark-theme .btn-secondary:hover:not(:disabled) {
  background-color: #4d4d4d;
  border-color: #666666;
}

.dark-theme .btn-danger {
  background-color: #d32f2f;
  border-color: #d32f2f;
  color: #ffffff;
}

.dark-theme .btn-danger:hover:not(:disabled) {
  background-color: #c62828;
  border-color: #c62828;
}

.dark-theme .btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dark-theme .empty-state {
  background-color: #2d2d2d;
  border-color: #404040;
}

.dark-theme .empty-state h3 {
  color: #e0e0e0;
}

.dark-theme .empty-state p {
  color: #b0b0b0;
}
</style>