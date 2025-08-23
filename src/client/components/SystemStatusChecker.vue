<template>
  <div v-if="systemInfo && systemInfo.disk && systemInfo.disk.error" class="system-status-warning">
    <div class="warning-content">
      <i class="fas fa-exclamation-triangle warning-icon"></i>
      <div class="warning-text">
        <h4>系统配置警告</h4>
        <p>{{ systemInfo.disk.error }}</p>
        <p v-if="systemInfo.disk.path">路径: {{ systemInfo.disk.path }}</p>
        <div class="warning-actions">
          <button @click="goToSettings" class="btn btn-primary btn-sm">
            <i class="fas fa-cog"></i> 前往设置
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { systemApi } from '@/services/api'

const router = useRouter()
const systemInfo = ref<any>(null)

onMounted(async () => {
  try {
    systemInfo.value = await systemApi.getSystemInfo()
  } catch (error) {
    console.error('Failed to fetch system info:', error)
  }
})

const goToSettings = () => {
  router.push('/settings')
}
</script>

<style scoped>
.system-status-warning {
  background-color: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.warning-content {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.warning-icon {
  color: #f39c12;
  font-size: 1.5rem;
  flex-shrink: 0;
  margin-top: 0.25rem;
}

.warning-text h4 {
  margin: 0 0 0.5rem 0;
  color: #856404;
  font-weight: 600;
}

.warning-text p {
  margin: 0.25rem 0;
  color: #856404;
  font-size: 0.9rem;
}

.warning-actions {
  margin-top: 0.75rem;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.8rem;
}

.btn-primary {
  background-color: #1976d2;
  color: #ffffff;
  border-color: #1976d2;
}

.btn-primary:hover:not(:disabled) {
  background-color: #1565c0;
  border-color: #1565c0;
}

/* 暗色主题样式 */
.dark-theme .system-status-warning {
  background-color: #332e1d;
  border-color: #5c5333;
}

.dark-theme .warning-text h4,
.dark-theme .warning-text p {
  color: #e0c76d;
}

.dark-theme .warning-icon {
  color: #e0c76d;
}

.dark-theme .btn-primary {
  background-color: #1976d2;
  border-color: #1976d2;
}

.dark-theme .btn-primary:hover:not(:disabled) {
  background-color: #1565c0;
  border-color: #1565c0;
}
</style>