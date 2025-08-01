<template>
  <div>
    <!-- Hidden file input -->
    <input 
      ref="fileInput"
      type="file" 
      @change="handleFileSelect"
      style="display: none;"
    >
    
    <!-- Upload Progress Modal -->
    <Modal 
      :visible="showProgress"
      title="文件上传中" 
      width="400px"
      @close="() => {}"
    >
      <div class="upload-progress">
        <p>文件名: {{ fileName }}</p>
        <div class="progress-container">
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: progress + '%' }"
            ></div>
          </div>
          <div class="progress-text">{{ progress }}%</div>
        </div>
        <div class="upload-stats" v-if="speed > 0">
          <p>上传速度: {{ formatSpeed(speed) }}</p>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Modal from '@/components/Modal.vue'
import { useFileStore } from '@/store'

const fileStore = useFileStore()
const fileInput = ref<HTMLInputElement | null>(null)
const showProgress = ref(false)
const progress = ref(0)
const speed = ref(0)
const fileName = ref('')

const triggerUpload = () => {
  if (fileInput.value) {
    fileInput.value.click()
  }
}

const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    try {
      const file = target.files[0]
      fileName.value = file.name
      showProgress.value = true
      progress.value = 0
      
      const startTime = Date.now()
      
      await fileStore.uploadFile(file, fileStore.currentPath, (progressEvent: any) => {
        if (progressEvent.total) {
          const prog = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          progress.value = prog
          
          // Calculate upload speed
          const elapsedTime = (Date.now() - startTime) / 1000 // seconds
          if (elapsedTime > 0) {
            const spd = progressEvent.loaded / elapsedTime // bytes per second
            speed.value = spd
          }
        }
      })
      
      showProgress.value = false
      target.value = '' // Clear the input
      
      // Emit event to notify parent component
      emit('uploadComplete')
    } catch (error) {
      showProgress.value = false
      console.error('Failed to upload file:', error)
    }
  }
}

const formatSpeed = (bytesPerSecond: number) => {
  if (bytesPerSecond < 1024) {
    return bytesPerSecond.toFixed(2) + ' B/s'
  } else if (bytesPerSecond < 1024 * 1024) {
    return (bytesPerSecond / 1024).toFixed(2) + ' KB/s'
  } else {
    return (bytesPerSecond / (1024 * 1024)).toFixed(2) + ' MB/s'
  }
}

const emit = defineEmits<{
  (e: 'uploadComplete'): void
}>()

// Expose method to parent component
defineExpose({
  triggerUpload
})
</script>

<style scoped>
.progress-container {
  display: flex;
  align-items: center;
  margin: 1rem 0;
}

.progress-bar {
  flex: 1;
  height: 20px;
  background-color: #f0f0f0;
  border-radius: 10px;
  overflow: hidden;
  margin-right: 1rem;
}

.progress-fill {
  height: 100%;
  background-color: #1976d2;
  transition: width 0.3s ease;
}

.progress-text {
  font-weight: 500;
  color: #333333;
}

.upload-stats {
  text-align: center;
  color: #666666;
  font-size: 0.875rem;
}
</style>