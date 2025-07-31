<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { systemApi } from '@/services'

const config = ref<any>(null)
const error = ref<string | null>(null)
const loading = ref(false)

const testApi = async () => {
  loading.value = true
  error.value = null
  try {
    console.log('Testing API connection...')
    const response = await systemApi.getConfig()
    console.log('API response:', response)
    config.value = response
  } catch (err: any) {
    console.error('API error:', err)
    if (err && err.error) {
      error.value = `${err.error.message} (Code: ${err.error.code})`
    } else if (err && err.message) {
      error.value = err.message
    } else {
      error.value = JSON.stringify(err)
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  testApi()
})
</script>

<template>
  <div class="test-page">
    <h1>API 测试页面</h1>
    
    <div v-if="loading">
      <p>加载中...</p>
    </div>
    
    <div v-else-if="error">
      <p class="error">错误: {{ error }}</p>
    </div>
    
    <div v-else-if="config">
      <h2>配置信息</h2>
      <pre>{{ JSON.stringify(config, null, 2) }}</pre>
    </div>
    
    <button @click="testApi" :disabled="loading">
      {{ loading ? '测试中...' : '重新测试' }}
    </button>
  </div>
</template>

<style scoped>
.test-page {
  padding: 1.5rem;
}

.error {
  color: #f44336;
  background-color: #ffebee;
  padding: 1rem;
  border-radius: 4px;
}

button {
  padding: 0.5rem 1rem;
  background-color: #1976d2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:disabled {
  background-color: #bdbdbd;
  cursor: not-allowed;
}
</style>