<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useConfigStore } from '@/store'

const configStore = useConfigStore()

const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const testResult = ref<{ success: boolean; message: string } | null>(null)

const config = ref({
  aria2RpcUrl: '',
  rpcSecret: '',
  downloadDir: '',
  autoDeleteMetadata: false
})

const activeTab = ref('system')

onMounted(async () => {
  await loadConfig()
})

const loadConfig = async () => {
  loading.value = true
  try {
    await configStore.fetchConfig()
    config.value.aria2RpcUrl = configStore.aria2RpcUrl
    config.value.rpcSecret = configStore.rpcSecret
    config.value.downloadDir = configStore.downloadDir
    config.value.autoDeleteMetadata = configStore.autoDeleteMetadata
  } catch (error) {
    console.error('Failed to load config:', error)
    testResult.value = {
      success: false,
      message: '加载配置失败'
    }
  } finally {
    loading.value = false
  }
}

const saveConfig = async () => {
  saving.value = true
  try {
    await configStore.saveConfig({
      aria2RpcUrl: config.value.aria2RpcUrl,
      rpcSecret: config.value.rpcSecret,
      downloadDir: config.value.downloadDir,
      autoDeleteMetadata: config.value.autoDeleteMetadata
    })
    
    // 显示保存成功提示
    testResult.value = {
      success: true,
      message: '配置保存成功'
    }
    
    // 重新加载配置以显示最新的值
    await loadConfig()
    
    // 3秒后清除提示
    setTimeout(() => {
      testResult.value = null
    }, 3000)
  } catch (error) {
    console.error('Save config failed:', error)
    testResult.value = {
      success: false,
      message: error.message || '配置保存失败'
    }
  } finally {
    saving.value = false
  }
}

const testConnection = async () => {
  testing.value = true
  testResult.value = null
  
  try {
    await configStore.testConnection()
    testResult.value = {
      success: true,
      message: '连接测试成功'
    }
  } catch (error) {
    console.error('Test connection failed:', error)
    testResult.value = {
      success: false,
      message: '连接测试失败'
    }
  } finally {
    testing.value = false
  }
}
</script>

<template>
  <div class="settings">
    <div class="page-header">
      <h2>系统设置</h2>
    </div>
    
    <div class="settings-tabs">
      <div class="tab-buttons">
        <button 
          class="tab-button" 
          :class="{ active: activeTab === 'system' }"
          @click="activeTab = 'system'"
        >
          <i class="fas fa-cog"></i>
          系统设置
        </button>
        <button 
          class="tab-button" 
          :class="{ active: activeTab === 'aria2' }"
          @click="activeTab = 'aria2'"
        >
          <i class="fas fa-download"></i>
          Aria2 设置
        </button>
      </div>

      <div class="tab-content">
        <!-- 系统设置 -->
        <div v-if="activeTab === 'system'" class="tab-panel">
          <div class="settings-form">
            <div v-if="loading" class="loading">
              <p>加载中...</p>
            </div>
            
            <form v-else @submit.prevent="saveConfig">
              <div class="settings-list">
                <div class="setting-item">
                  <div class="setting-row">
                    <div class="setting-info">
                      <label for="aria2RpcUrl" class="setting-label">Aria2 RPC 地址</label>
                    </div>
                    <div class="input-group">
                      <input
                        id="aria2RpcUrl"
                        v-model="config.aria2RpcUrl"
                        type="text"
                        class="form-control setting-input"
                        placeholder="例如: http://localhost:6800/jsonrpc"
                      />
                      <button
                        type="button"
                        class="btn btn-secondary"
                        :disabled="testing"
                        @click="testConnection"
                      >
                        {{ testing ? '测试中...' : '测试连接' }}
                      </button>
                    </div>
                  </div>
                </div>

                <div class="setting-item">
                  <div class="setting-row">
                    <div class="setting-info">
                      <label for="rpcSecret" class="setting-label">RPC 密钥</label>
                    </div>
                    <input
                      id="rpcSecret"
                      v-model="config.rpcSecret"
                      type="password"
                      class="form-control setting-input"
                      placeholder="输入 RPC 密钥（可选）"
                    />
                  </div>
                </div>
                
                <div class="setting-item">
                  <div class="setting-row">
                    <div class="setting-info">
                      <label for="downloadDir" class="setting-label">下载目录</label>
                    </div>
                    <input
                      id="downloadDir"
                      v-model="config.downloadDir"
                      type="text"
                      class="form-control setting-input"
                      placeholder="例如: /home/user/downloads"
                    />
                  </div>
                </div>
                
                <div class="setting-item">
                  <div class="setting-row">
                    <div class="setting-info">
                      <label class="setting-label">自动删除元数据</label>
                    </div>
                    <label class="form-checkbox-label">
                      <input
                        v-model="config.autoDeleteMetadata"
                        type="checkbox"
                        class="form-checkbox"
                      />
                      启用自动删除元数据文件(.torrent, .metalink等)
                    </label>
                  </div>
                </div>
              </div>
              
              <div class="form-actions">
                <button
                  type="submit"
                  class="btn btn-primary"
                  :disabled="saving"
                >
                  {{ saving ? '保存中...' : '保存配置' }}
                </button>
              </div>
              
              <div v-if="testResult" class="test-result" :class="{ 'success': testResult.success, 'error': !testResult.success }">
                {{ testResult.message }}
              </div>
            </form>
          </div>
        </div>

        <!-- Aria2 设置 -->
        <div v-if="activeTab === 'aria2'" class="tab-panel">
          <div class="settings-form">
            <div class="aria2-settings-intro">
              <p>Aria2 设置包含多个配置选项，按功能分类如下：</p>
            </div>
            
            <div class="aria2-categories">
              <div class="category-section">
                <h3 class="category-title">
                  <i class="fas fa-tachometer-alt"></i>
                  基本设置
                </h3>
                <div class="setting-items">
                  <div class="setting-item">
                    <label>最大同时下载数</label>
                    <input type="number" class="form-control" placeholder="5" />
                  </div>
                  <div class="setting-item">
                    <label>单文件最大连接数</label>
                    <input type="number" class="form-control" placeholder="16" />
                  </div>
                  <div class="setting-item">
                    <label>下载速度限制</label>
                    <input type="text" class="form-control" placeholder="例如: 1M" />
                  </div>
                </div>
              </div>

              <div class="category-section">
                <h3 class="category-title">
                  <i class="fas fa-shield-alt"></i>
                  安全设置
                </h3>
                <div class="setting-items">
                  <div class="setting-item">
                    <label>RPC 令牌</label>
                    <input type="password" class="form-control" placeholder="输入 RPC 令牌" />
                  </div>
                  <div class="setting-item">
                    <label>允许的 RPC 地址</label>
                    <input type="text" class="form-control" placeholder="*" />
                  </div>
                </div>
              </div>

              <div class="category-section">
                <h3 class="category-title">
                  <i class="fas fa-hdd"></i>
                  磁盘设置
                </h3>
                <div class="setting-items">
                  <div class="setting-item">
                    <label>磁盘缓存大小</label>
                    <input type="text" class="form-control" placeholder="64M" />
                  </div>
                  <div class="setting-item">
                    <label>预分配空间</label>
                    <select class="form-control">
                      <option>预分配</option>
                      <option>falloc</option>
                      <option>trunc</option>
                    </select>
                  </div>
                </div>
              </div>

              <div class="category-section">
                <h3 class="category-title">
                  <i class="fas fa-globe"></i>
                  网络设置
                </h3>
                <div class="setting-items">
                  <div class="setting-item">
                    <label>用户代理</label>
                    <input type="text" class="form-control" placeholder="aria2/$VERSION" />
                  </div>
                  <div class="setting-item">
                    <label>连接超时时间</label>
                    <input type="number" class="form-control" placeholder="60" />
                  </div>
                </div>
              </div>

              <div class="category-section">
                <h3 class="category-title">
                  <i class="fas fa-bolt"></i>
                  BT 设置
                </h3>
                <div class="setting-items">
                  <div class="setting-item">
                    <label>最大连接数</label>
                    <input type="number" class="form-control" placeholder="55" />
                  </div>
                  <div class="setting-item">
                    <label>启用 DHT</label>
                    <input type="checkbox" class="form-checkbox" checked />
                  </div>
                  <div class="setting-item">
                    <label>启用 PEX</label>
                    <input type="checkbox" class="form-checkbox" checked />
                  </div>
                </div>
              </div>

              <div class="form-actions">
                <button type="button" class="btn btn-secondary">重置默认</button>
                <button type="button" class="btn btn-primary">应用设置</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings {
  padding: 1.5rem;
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

.settings-tabs {
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.tab-buttons {
  display: flex;
  border-bottom: 1px solid #e0e0e0;
  background-color: #f8f9fa;
}

.tab-button {
  flex: 1;
  padding: 1rem 1.5rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  font-size: 1rem;
  font-weight: 500;
  color: #666666;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.tab-button:hover {
  background-color: #e9ecef;
  color: #333333;
}

.tab-button.active {
  color: #1976d2;
  border-bottom-color: #1976d2;
  background-color: #ffffff;
}

.tab-button i {
  font-size: 1.1rem;
}

.tab-content {
  padding: 0;
}

.tab-panel {
  padding: 1.5rem;
}

.settings-form {
  max-width: 100%;
}

.loading {
  padding: 2rem;
  text-align: center;
  color: #999999;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #333333;
}

.form-control {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

.form-control:focus {
  outline: none;
  border-color: #1976d2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
}

.rpc-input-group {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
}

.rpc-input-group .form-control {
  flex: 1;
}

.rpc-input-group .btn-test {
  flex-shrink: 0;
  padding: 0.75rem 1.25rem;
  font-size: 0.9rem;
  white-space: nowrap;
}

.form-help {
  margin-top: 0.25rem;
  font-size: 0.875rem;
  color: #666666;
}

.checkbox-group {
  display: flex;
  align-items: center;
  margin: 0.5rem 0;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.form-checkbox {
  width: 1rem;
  height: 1rem;
  margin-right: 0.5rem;
  cursor: pointer;
}

.checkbox-text {
  font-weight: 500;
  color: #333333;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s ease;
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

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #f5f5f5;
  color: #333333;
  border-color: #e0e0e0;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #e0e0e0;
  border-color: #bdbdbd;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.test-result {
  margin-top: 1rem;
  padding: 0.75rem;
  border-radius: 4px;
  font-weight: 500;
}

.test-result.success {
  background-color: #e8f5e9;
  color: #4caf50;
  border: 1px solid #c8e6c9;
}

.test-result.error {
  background-color: #ffebee;
  color: #f44336;
  border: 1px solid #ffcdd2;
}

.aria2-settings-intro {
  margin-bottom: 2rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 4px;
  border-left: 4px solid #1976d2;
}

.aria2-categories {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.category-section {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.category-title {
  margin: 0;
  padding: 1rem 1.5rem;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #333333;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.category-title i {
  color: #1976d2;
}

.settings-list {
  padding: 1.5rem;
  background-color: #ffffff;
}

.setting-item {
  padding: 1rem 0;
  border-bottom: 1px solid #f0f0f0;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.setting-info {
  min-width: 150px;
  max-width: 220px;
  flex-shrink: 0;
}

.setting-label {
  font-weight: 600;
  color: #333333;
  font-size: 0.875rem;
  margin: 0;
}

.form-control.setting-input {
  flex: 1;
  min-width: 200px;
  width: 100%;
}

.input-group {
  display: flex;
  gap: 0.5rem;
  flex: 1;
}

.input-group .form-control {
  flex: 1;
}

.btn-secondary {
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  white-space: nowrap;
}

.form-checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  gap: 0.75rem;
  font-size: 0.875rem;
  color: #333333;
}

.form-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.setting-items {
  padding: 1.5rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.setting-item label {
  font-weight: 500;
  color: #333333;
  font-size: 0.9rem;
}

.setting-item .form-control {
  width: 100%;
}

.setting-item .form-checkbox {
  width: 1rem;
  height: 1rem;
  cursor: pointer;
}


/* 响应式设计 */
@media (max-width: 768px) {
  .settings {
    padding: 1rem;
  }
  
  .tab-panel {
    padding: 1rem;
  }
  
  .settings-form {
    padding: 0;
  }
  
  .settings-list {
    padding: 1rem;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .tab-buttons {
    flex-direction: column;
  }
  
  .tab-button {
    border-bottom: 1px solid #e0e0e0;
    border-right: none;
    justify-content: flex-start;
  }
  
  .tab-button.active {
    border-bottom: 1px solid #e0e0e0;
    border-right: 3px solid #1976d2;
  }
  
  .settings-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
    padding: 1rem;
  }
  
  .setting-label-col {
    text-align: left;
  }
  
  .setting-label {
    justify-content: flex-start;
  }
  
  .input-group {
    flex-direction: column;
  }
  
  .setting-items {
    grid-template-columns: 1fr;
    padding: 1rem;
  }
  
  .category-title {
    padding: 0.75rem 1rem;
    font-size: 1rem;
  }
  
  .rpc-input-group {
    flex-direction: column;
  }
  
  .rpc-input-group .btn-test, .test-button {
    width: 100%;
  }
}
</style>
