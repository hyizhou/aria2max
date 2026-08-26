<template>
  <div class="file-manager">
    <div class="page-header">
      <h2>{{ t('files.heading') }}</h2>
    </div>
    
    <FileBreadcrumb
      v-if="!fileStore.zipMode"
      :current-path="fileStore.currentPath"
      @navigate="handleNavigate"
    />

    <!-- 压缩包浏览模式：自定义面包屑（文件系统段 / 压缩包名 / 内部段） -->
    <div v-else class="zip-breadcrumb-bar">
      <template v-for="(seg, idx) in zipBreadcrumbs" :key="idx">
        <button
          class="crumb-btn"
          :class="{ active: idx === zipBreadcrumbs.length - 1 }"
          @click="handleZipCrumb(seg)"
        >
          <i v-if="seg.isZipRoot" class="fas fa-file-archive"></i>
          <span>{{ seg.name }}</span>
        </button>
        <i v-if="idx < zipBreadcrumbs.length - 1" class="fas fa-chevron-right crumb-sep"></i>
      </template>
    </div>

    <div class="file-actions" v-if="!fileStore.zipMode">
      <div class="file-actions-left">
        <label class="select-all">
          <input
            type="checkbox"
            :checked="selectedFiles.length === fileStore.files.length && fileStore.files.length > 0"
            @change="handleSelectAll"
          />
          {{ t('common.selectAll') }}
        </label>
      </div>
      <div class="file-actions-right">
        <button class="btn btn-secondary" @click="loadFiles">
          <i class="fas fa-sync-alt"></i>
          {{ t('common.refresh') }}
        </button>
        <button class="btn btn-secondary" @click="handleUploadClick">
          {{ t('files.uploadFile') }}
        </button>
        <button class="btn btn-secondary" @click="handleCreateDirectory">
          {{ t('files.createDirectory') }}
        </button>
        <button
          class="btn btn-danger"
          :disabled="selectedFiles.length === 0"
          @click="handleBatchDelete"
        >
          {{ t('files.deleteSelected') }}
        </button>
      </div>
    </div>

    <div class="file-list-container">
      <div v-if="isLoading" class="loading">
        <p>{{ t('common.loading') }}</p>
      </div>

      <div v-else-if="currentError" class="error-state">
        <p>{{ t('files.loadFailed') }}</p>
        <p class="error-message">{{ currentError }}</p>
        <button v-if="!fileStore.zipMode" class="btn btn-secondary" @click="loadFiles">{{ t('common.refresh') }}</button>
      </div>

      <div v-else-if="currentFiles.length === 0" class="empty-state">
        <p>{{ fileStore.zipMode ? '空目录' : t('files.emptyDirectory') }}</p>
      </div>

      <div v-else class="file-items">
        <FileItem
          v-for="file in currentFiles"
          :key="file.path"
          :file="file"
          :selected="fileStore.zipMode ? false : selectedFiles.includes(file.path)"
          :read-only="fileStore.zipMode"
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
    :title="t('files.confirmDeleteTitle')"
    :message="t('files.confirmDeleteMessage')"
    :confirm-text="t('files.confirmDelete')"
    @confirm="confirmDeleteFile"
    @cancel="cancelDeleteFile"
  />
  
  <!-- 批量删除确认弹窗 -->
  <ConfirmDialog
    v-if="confirmBatchDelete"
    :title="t('files.confirmBatchDeleteTitle')"
    :message="t('files.confirmBatchDeleteMessage', { count: selectedFiles.length })"
    :confirm-text="t('files.confirmDelete')"
    @confirm="confirmBatchDeleteFiles"
    @cancel="cancelBatchDeleteFile"
  />

  <!-- 新建目录弹窗 -->
  <div v-if="showCreateDirectory" class="confirm-overlay" @click="showCreateDirectory = false">
    <div class="confirm-dialog" @click.stop>
      <div class="confirm-header">
        <h3>{{ t('files.createDirectoryTitle') }}</h3>
      </div>
      <div class="confirm-body">
        <input
          ref="directoryNameInput"
          v-model="newDirectoryName"
          class="directory-name-input"
          :placeholder="t('files.createDirectoryPlaceholder')"
          @keyup.enter="confirmCreateDirectory"
          @keyup.escape="showCreateDirectory = false"
        />
      </div>
      <div class="confirm-footer">
        <button class="btn btn-secondary" @click="showCreateDirectory = false">{{ t('common.cancel') }}</button>
        <button class="btn btn-primary" @click="confirmCreateDirectory">{{ t('common.ok') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFileStore } from '@/store'
import { fileApi } from '@/services/api'
import FileItem from '@/components/FileItem.vue'
import FileBreadcrumb from '@/components/FileBreadcrumb.vue'
import FileUpload from '@/components/FileUpload.vue'
import FileRename from '@/components/FileRename.vue'
import FilePreview from '@/components/FilePreview.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import type { FileItem as FileItemType } from '@shared/types'

const fileStore = useFileStore()
const { t } = useI18n()
const loading = ref(false)
const selectedFiles = ref<string[]>([])
const fileUploadRef = ref<typeof FileUpload | null>(null)
const fileRenameRef = ref<typeof FileRename | null>(null)
const filePreviewRef = ref<typeof FilePreview | null>(null)

// 压缩包内浏览的列表数据（zipMode/zipFilePath/zipInnerDir 持久在 fileStore，路由切换可恢复）
const zipEntries = ref<FileItemType[]>([])
const zipLoading = ref(false)
const zipError = ref('')

const zipFileName = computed(() => fileStore.zipFilePath.split('/').pop() || '')

// 压缩包浏览模式下的列表/加载/错误（统一供模板分支使用）
const currentFiles = computed<FileItemType[]>(() => (fileStore.zipMode ? zipEntries.value : fileStore.files))
const isLoading = computed(() => (fileStore.zipMode ? zipLoading.value : loading.value))
const currentError = computed(() => (fileStore.zipMode ? zipError.value : fileStore.error))

// zip 模式面包屑：文件系统段（点击退出 zip）+ 压缩包名 + 压缩包内段
const zipBreadcrumbs = computed(() => {
  const segs: Array<{ name: string; path: string; isFs: boolean; isZipRoot: boolean }> = []
  // 文件系统段（压缩包所在目录链）
  segs.push({ name: t('fileBreadcrumb.root'), path: '', isFs: true, isZipRoot: false })
  let acc = ''
  fileStore.currentPath.split('/').filter(Boolean).forEach(s => {
    acc = acc ? `${acc}/${s}` : s
    segs.push({ name: s, path: acc, isFs: true, isZipRoot: false })
  })
  // 压缩包名（zip 根）
  segs.push({ name: zipFileName.value, path: '', isFs: false, isZipRoot: true })
  // 压缩包内段
  let innerAcc = ''
  fileStore.zipInnerDir.split('/').filter(Boolean).forEach(s => {
    innerAcc = innerAcc ? `${innerAcc}/${s}` : s
    segs.push({ name: s, path: innerAcc, isFs: false, isZipRoot: false })
  })
  return segs
})

// 删除确认状态管理
const confirmDelete = ref<{path: string, show: boolean} | null>(null)
const confirmBatchDelete = ref<boolean>(false)
const showCreateDirectory = ref(false)
const newDirectoryName = ref('')
const directoryNameInput = ref<HTMLInputElement | null>(null)

onMounted(async () => {
  // 路由返回时若仍处于 zip 浏览模式，恢复压缩包内列表
  if (fileStore.zipMode) {
    await loadZipEntries(fileStore.zipInnerDir)
  } else {
    await loadFiles()
  }
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
  // zip 浏览模式下的目录导航：path 为压缩包内目录
  if (fileStore.zipMode) {
    fileStore.navigateZip(path)
    await loadZipEntries(path)
    return
  }
  fileStore.currentPath = path
  await loadFiles()
}

// 进入压缩包浏览
const enterZip = async (path: string) => {
  fileStore.enterZip(path)
  zipError.value = ''
  await loadZipEntries('')
}

// 退出压缩包浏览，回到普通文件管理
const exitZip = () => {
  fileStore.exitZip()
  zipEntries.value = []
  zipError.value = ''
}

const loadZipEntries = async (dir: string) => {
  zipLoading.value = true
  zipError.value = ''
  try {
    const res = await fileApi.getZipList(fileStore.zipFilePath, dir)
    zipEntries.value = res.files || []
    zipError.value = res.error || ''
  } catch (error) {
    zipError.value = error instanceof Error ? error.message : '加载失败'
    zipEntries.value = []
  } finally {
    zipLoading.value = false
  }
}

// zip 模式面包屑点击：文件系统段→退出zip并导航；zip根→回根；内部段→进入
const handleZipCrumb = async (seg: { path: string; isFs: boolean; isZipRoot: boolean }) => {
  if (seg.isFs) {
    exitZip()
    await handleNavigate(seg.path)
  } else if (seg.isZipRoot) {
    fileStore.navigateZip('')
    await loadZipEntries('')
  } else {
    fileStore.navigateZip(seg.path)
    await loadZipEntries(seg.path)
  }
}

const handleFileAction = async (action: string, path: string, isDir?: boolean) => {
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
        await fileStore.downloadFile(path, !!isDir)
        break
      case 'preview':
        if (fileStore.zipMode) {
          // 压缩包内点文件 → 预览该条目（走 zip-entry 接口）
          filePreviewRef.value?.showZipEntry(fileStore.zipFilePath, path)
        } else if (path.toLowerCase().endsWith('.zip')) {
          // 普通模式点 .zip → 像进目录一样浏览压缩包内容
          await enterZip(path)
        } else {
          filePreviewRef.value?.show(path)
        }
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

// 提取后端返回的错误信息
function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'error' in error) {
    const apiError = error as { error: { message?: string } }
    return apiError.error.message || t('common.unknownError')
  }
  if (error instanceof Error) return error.message
  return t('common.unknownError')
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
    alert(t('files.deleteFailed', { message: getErrorMessage(error) }))
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
    alert(t('files.batchDeleteFailed', { message: getErrorMessage(error) }))
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

const handleCreateDirectory = () => {
  newDirectoryName.value = ''
  showCreateDirectory.value = true
  nextTick(() => {
    directoryNameInput.value?.focus()
  })
}

const confirmCreateDirectory = async () => {
  const name = newDirectoryName.value.trim()
  if (!name) return

  try {
    const fullPath = fileStore.currentPath ? `${fileStore.currentPath}/${name}` : name
    await fileStore.createDirectory(fullPath)
    showCreateDirectory.value = false
  } catch (error) {
    console.error('Create directory failed:', error)
    alert(t('files.createDirectoryFailed', { message: error instanceof Error ? error.message : t('common.unknownError') }))
  }
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

/* 压缩包浏览模式面包屑 */
.zip-breadcrumb-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.crumb-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background: none;
  border: none;
  color: #666666;
  cursor: pointer;
  font-size: 0.875rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.crumb-btn:hover {
  background-color: #f5f5f5;
  color: #333333;
}

.crumb-btn.active {
  color: #1976d2;
  font-weight: 500;
  cursor: default;
}

.crumb-btn.active:hover {
  background-color: transparent;
}

.crumb-sep {
  font-size: 0.625rem;
  color: #999999;
}

.dark-theme .zip-breadcrumb-bar {
  background-color: #2d2d2d;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.dark-theme .crumb-btn {
  color: #b0b0b0;
}

.dark-theme .crumb-btn:hover {
  background-color: #3d3d3d;
  color: #e0e0e0;
}

.dark-theme .crumb-btn.active {
  color: #64b5f6;
}

.dark-theme .crumb-sep {
  color: #666666;
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

.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.confirm-dialog {
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  width: 90%;
  max-width: 400px;
  overflow: hidden;
}

.confirm-header {
  padding: 1.5rem 1.5rem 0;
}

.confirm-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #333333;
}

.confirm-body {
  padding: 1rem 1.5rem;
}

.confirm-footer {
  padding: 1rem 1.5rem 1.5rem;
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.confirm-footer .btn {
  min-width: 80px;
  padding: 0.5rem 1rem;
}

.btn-primary {
  background-color: #1976d2;
  color: #ffffff;
  border-color: #1976d2;
}

.btn-primary:hover {
  background-color: #1565c0;
  border-color: #1565c0;
}

.dark-theme .confirm-dialog {
  background-color: #2d2d2d;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.dark-theme .confirm-header h3 {
  color: #e0e0e0;
}

.dark-theme .btn-primary {
  background-color: #1976d2;
  border-color: #1976d2;
  color: #ffffff;
}

.dark-theme .btn-primary:hover {
  background-color: #1565c0;
  border-color: #1565c0;
}

.directory-name-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 0.875rem;
  outline: none;
  box-sizing: border-box;
}

.directory-name-input:focus {
  border-color: #1976d2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
}

.dark-theme .directory-name-input {
  background-color: #3d3d3d;
  border-color: #555555;
  color: #e0e0e0;
}

.dark-theme .directory-name-input:focus {
  border-color: #1976d2;
}
</style>