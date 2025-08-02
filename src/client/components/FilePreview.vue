<template>
  <Modal 
    :visible="visible"
    :title="getTitle()"
    width="800px"
    @close="close"
  >
    <div class="file-preview-container">
      <!-- Video Preview -->
      <div v-if="getFileType(filePath) === 'video'">
        <video 
          controls 
          autoplay 
          style="width: 100%; max-height: 60vh;"
        >
          <source :src="`/api/files/download?path=${encodeURIComponent(filePath)}`" :type="getVideoType(filePath)">
          您的浏览器不支持视频播放。
        </video>
      </div>
      
      <!-- Audio Preview -->
      <div v-else-if="getFileType(filePath) === 'audio'">
        <audio 
          controls 
          autoplay 
          style="width: 100%;"
        >
          <source :src="`/api/files/download?path=${encodeURIComponent(filePath)}`" :type="getAudioType(filePath)">
          您的浏览器不支持音频播放。
        </audio>
      </div>
      
      <!-- Image Preview -->
      <div v-else-if="getFileType(filePath) === 'image'">
        <img 
          :src="`/api/files/download?path=${encodeURIComponent(filePath)}`" 
          :alt="filePath.split('/').pop()"
          style="max-width: 100%; max-height: 60vh;"
        >
      </div>
      
      <!-- Text Preview -->
      <div v-else-if="getFileType(filePath) === 'text'" class="text-preview">
        <pre>{{ textContent }}</pre>
      </div>
      
      <!-- Unknown file type -->
      <div v-else class="unknown-file">
        <p>该文件类型无法预览。</p>
        <p>文件名: {{ filePath.split('/').pop() }}</p>
      </div>
      
      <p class="file-name">{{ filePath.split('/').pop() }}</p>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import Modal from '@/components/Modal.vue'

const visible = ref(false)
const filePath = ref('')
const textContent = ref('')

const show = async (path: string) => {
  filePath.value = path
  visible.value = true
  
  // For text files, fetch the content
  if (getFileType(path) === 'text') {
    await fetchTextContent(path)
  }
}

const close = () => {
  visible.value = false
  filePath.value = ''
  textContent.value = ''
}

const fetchTextContent = async (path: string) => {
  try {
    const response = await fetch(`/api/files/download?path=${encodeURIComponent(path)}`)
    textContent.value = await response.text()
  } catch (error) {
    console.error('Failed to fetch text content:', error)
    textContent.value = '无法加载文件内容'
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
  
  // Text files
  const textExtensions = ['txt', 'md', 'json', 'xml', 'html', 'css', 'js', 'ts', 'vue', 'py', 'java', 'cpp', 'c', 'h', 'log']
  if (textExtensions.includes(ext)) {
    return 'text'
  }
  
  // Image files
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg']
  if (imageExtensions.includes(ext)) {
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
  show
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