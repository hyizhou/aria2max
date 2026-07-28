<template>
  <Modal 
    :visible="visible"
    :title="getTitle()"
    width="800px"
    @close="close"
  >
    <div class="file-preview-container">
      <!-- Video Preview -->
      <div v-if="previewKind === 'video'">
        <video
          controls
          autoplay
          style="width: 100%; max-height: 60vh;"
        >
          <source :src="previewUrl" :type="getVideoType(filePath)">
          {{ t('filePreview.unsupportedVideo') }}
        </video>
      </div>

      <!-- Audio Preview -->
      <div v-else-if="previewKind === 'audio'">
        <audio
          controls
          autoplay
          style="width: 100%;"
        >
          <source :src="previewUrl" :type="getAudioType(filePath)">
          {{ t('filePreview.unsupportedAudio') }}
        </audio>
      </div>

      <!-- Image Preview -->
      <div v-else-if="previewKind === 'image'">
        <img
          :src="previewUrl"
          :alt="filePath.split('/').pop()"
          style="max-width: 100%; max-height: 60vh;"
        >
      </div>

      <!-- Text Preview -->
      <div v-else-if="previewKind === 'text'" class="text-preview">
        <pre>{{ textContent }}</pre>
      </div>

      <!-- Unknown / unsupported file type -->
      <div v-else class="unknown-file">
        <p>{{ isZip ? '该类型暂不支持在线预览，请下载后查看' : t('filePreview.unknownType') }}</p>
        <p>{{ t('filePreview.fileName', { name: filePath.split('/').pop() }) }}</p>
      </div>
      
      <p class="file-name">{{ filePath.split('/').pop() }}</p>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '@/components/Modal.vue'
import { fileApi } from '@/services/api'
import { isTextFile, isImageFile } from '@shared/utils/fileTypes'

const { t } = useI18n()

const visible = ref(false)
const filePath = ref('')
const textContent = ref('')
// zip 内文件预览：isZip=true 时走 zip-entry 接口，zipPath 为压缩包相对路径，filePath 为条目路径
const isZip = ref(false)
const zipPath = ref('')

// 预览资源 URL：普通文件走下载接口，zip 内文件走 zip-entry 接口
const previewUrl = computed(() => {
  if (isZip.value) {
    return fileApi.getZipEntryUrl(zipPath.value, filePath.value)
  }
  return `/api/files/download?path=${encodeURIComponent(filePath.value)}`
})

// 预览种类：zip 内仅支持文本/图片，其余类型后端 zip-entry 接口不支持，按 unsupported 处理
const previewKind = computed(() => {
  const kind = getFileType(filePath.value)
  if (isZip.value && kind !== 'text' && kind !== 'image') return 'unsupported'
  return kind
})

const show = async (path: string) => {
  isZip.value = false
  zipPath.value = ''
  filePath.value = path
  visible.value = true

  // For text files, fetch the content
  if (getFileType(path) === 'text') {
    await fetchTextContent(path)
  }
}

// 预览压缩包内的单个条目
const showZipEntry = async (targetZipPath: string, entry: string) => {
  isZip.value = true
  zipPath.value = targetZipPath
  filePath.value = entry
  visible.value = true

  if (getFileType(entry) === 'text') {
    await fetchTextContent(entry)
  }
}

const close = () => {
  visible.value = false
  filePath.value = ''
  textContent.value = ''
  isZip.value = false
  zipPath.value = ''
}

const fetchTextContent = async (path: string) => {
  try {
    if (isZip.value) {
      textContent.value = await fileApi.getZipEntryText(zipPath.value, path)
    } else {
      const response = await fetch(`/api/files/download?path=${encodeURIComponent(path)}`)
      textContent.value = await response.text()
    }
  } catch (error) {
    console.error('Failed to fetch text content:', error)
    textContent.value = error instanceof Error ? error.message : '无法加载文件内容'
  }
}

const getFileType = (filePath: string) => {
  const ext = filePath.split('.').pop()?.toLowerCase()

  // Video files
  const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'wmv', 'flv']
  if (videoExtensions.includes(ext)) {
    return 'video'
  }

  // Audio files
  const audioExtensions = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma']
  if (audioExtensions.includes(ext)) {
    return 'audio'
  }

  // Text / image：与后端共用 shared/fileTypes 列表，避免两端漂移
  if (isTextFile(filePath)) {
    return 'text'
  }
  if (isImageFile(filePath)) {
    return 'image'
  }

  return 'unknown'
}

const getVideoType = (filePath: string) => {
  const ext = filePath.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'mp4':
      return 'video/mp4'
    case 'webm':
      return 'video/webm'
    case 'ogg':
      return 'video/ogg'
    case 'mov':
      return 'video/quicktime'
    case 'avi':
      return 'video/x-msvideo'
    case 'mkv':
      return 'video/x-matroska'
    case 'wmv':
      return 'video/x-ms-wmv'
    case 'flv':
      return 'video/x-flv'
    default:
      return 'video/mp4'
  }
}

const getAudioType = (filePath: string) => {
  const ext = filePath.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'mp3':
      return 'audio/mpeg'
    case 'wav':
      return 'audio/wav'
    case 'flac':
      return 'audio/flac'
    case 'aac':
      return 'audio/aac'
    case 'ogg':
      return 'audio/ogg'
    case 'm4a':
      return 'audio/mp4'
    case 'wma':
      return 'audio/x-ms-wma'
    default:
      return 'audio/mpeg'
  }
}

const getTitle = () => {
  const fileType = getFileType(filePath.value)
  switch (fileType) {
    case 'video':
      return '视频预览'
    case 'audio':
      return '音频预览'
    case 'image':
      return '图片预览'
    case 'text':
      return '文本预览'
    default:
      return '文件预览'
  }
}

const emit = defineEmits<{
  (e: 'close'): void
}>()

// Expose method to parent component
defineExpose({
  show,
  showZipEntry
})

// Close modal when Escape key is pressed
watch(visible, (newVal) => {
  if (!newVal) {
    emit('close')
  }
})
</script>

<style scoped>
.file-preview-container {
  text-align: center;
}

.file-name {
  margin-top: 1rem;
  font-size: 1rem;
  color: #666666;
}

.text-preview {
  text-align: left;
  max-height: 60vh;
  overflow-y: auto;
}

.text-preview pre {
  background-color: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
  white-space: pre-wrap;
  word-wrap: break-word;
  margin: 0;
}

.unknown-file {
  padding: 2rem;
  color: #666666;
}

/* 暗色主题样式 */
.dark-theme .file-name {
  color: #b0b0b0;
}

.dark-theme .text-preview pre {
  background-color: #3d3d3d;
  color: #e0e0e0;
}

.dark-theme .unknown-file {
  color: #b0b0b0;
}
</style>