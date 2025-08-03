<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useConfigStore } from '@/store'
import SettingItem from '@/components/SettingItem.vue'
import { aria2Settings, defaultAria2Config } from '@/config/aria2Config'

const configStore = useConfigStore()

const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const testResult = ref<{ success: boolean; message: string } | null>(null)

const config = ref({
  aria2RpcUrl: '',
  aria2RpcSecret: '',
  downloadDir: '',
  aria2ConfigPath: '',
  autoDeleteMetadata: false,
  autoDeleteAria2FilesOnRemove: false,
  autoDeleteAria2FilesOnSchedule: false
})

const aria2Config = ref<Record<string, any>>(defaultAria2Config)

const activeTab = ref('system')

onMounted(async () => {
  await loadConfig()
  // 加载保存的Aria2配置
  const savedConfig = localStorage.getItem('aria2Config')
  if (savedConfig) {
    try {
      const config = JSON.parse(savedConfig)
      Object.assign(aria2Config.value, config)
    } catch (error) {
      console.error('加载配置失败:', error)
    }
  }
})

const loadConfig = async () => {
  loading.value = true
  try {
    await configStore.fetchConfig()
    
    config.value.aria2RpcUrl = configStore.aria2RpcUrl
    config.value.aria2RpcSecret = configStore.aria2RpcSecret
    config.value.downloadDir = configStore.downloadDir
    config.value.aria2ConfigPath = configStore.aria2ConfigPath || ''
    config.value.autoDeleteMetadata = configStore.autoDeleteMetadata
    config.value.autoDeleteAria2FilesOnRemove = configStore.autoDeleteAria2FilesOnRemove
    config.value.autoDeleteAria2FilesOnSchedule = configStore.autoDeleteAria2FilesOnSchedule
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
  if (activeTab.value === 'aria2') {
    try {
      const config = { ...aria2Config.value }
      localStorage.setItem('aria2Config', JSON.stringify(config))
      console.log('配置已保存:', config)
      testResult.value = {
        success: true,
        message: '配置保存成功！'
      }
    } catch (error: any) {
      console.error('保存配置失败:', error)
      testResult.value = {
        success: false,
        message: error?.message || '配置保存失败'
      }
    } finally {
      saving.value = false
    }
    return
  }

  saving.value = true
  try {
    // 构建要保存的配置对象，包含所有字段
    const configToSave = {
      aria2RpcUrl: config.value.aria2RpcUrl,
      aria2RpcSecret: config.value.aria2RpcSecret || '',
      downloadDir: config.value.downloadDir,
      aria2ConfigPath: config.value.aria2ConfigPath || '',
      autoDeleteMetadata: config.value.autoDeleteMetadata,
      autoDeleteAria2FilesOnRemove: config.value.autoDeleteAria2FilesOnRemove,
      autoDeleteAria2FilesOnSchedule: config.value.autoDeleteAria2FilesOnSchedule
    }

    await configStore.saveConfig(configToSave)
    
    // 显示保存成功提示
    testResult.value = {
      success: true,
      message: '配置保存成功，已立即生效'
    }
    
    // 3秒后清除提示
    setTimeout(() => {
      testResult.value = null
    }, 3000)
  } catch (error: any) {
    console.error('Save config failed:', error)
    testResult.value = {
      success: false,
      message: error?.message || '配置保存失败'
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
  } catch (error: any) {
    console.error('Test connection failed:', error)
    testResult.value = {
      success: false,
      message: error?.message || '连接测试失败'
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
                      <label for="aria2RpcSecret" class="setting-label">RPC 密钥</label>
                      <button 
                        type="button" 
                        class="help-button" 
                        title="留空表示不修改现有RPC密钥。只有在此字段输入新值时，才会更新RPC密钥配置。"
                      >?</button>
                    </div>
                    <input
                      id="aria2RpcSecret"
                      v-model="config.aria2RpcSecret"
                      type="password"
                      class="form-control setting-input"
                      placeholder="留空表示不修改现有密钥"
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
                      <label for="aria2ConfigPath" class="setting-label">Aria2配置文件路径</label>
                      <button 
                        type="button" 
                        class="help-button" 
                        data-tooltip="指定aria2配置文件路径。配置后所有修改将持久化保存至该文件，aria2重启后配置保持不变。留空时配置仅保存在内存中，重启后恢复初始状态"
                        title=""
                      >?</button>
                    </div>
                    <input
                      id="aria2ConfigPath"
                      v-model="config.aria2ConfigPath"
                      type="text"
                      class="form-control setting-input"
                      placeholder="/path/to/aria2.conf"
                    />
                  </div>
                </div>
                
                <div class="setting-item">
                  <div class="setting-row">
                    <div class="setting-info">
                      <label class="setting-label">自动删除元数据</label>
                      <button 
                        type="button" 
                        class="help-button" 
                        data-tooltip="启用自动删除元数据文件(.torrent, .metalink等)，下载完成后自动清理这些元数据文件，节省磁盘空间"
                        title=""
                      >?</button>
                    </div>
                    <div class="toggle-button-group">
                      <label class="toggle-switch">
                        <input
                          v-model="config.autoDeleteMetadata"
                          type="checkbox"
                        />
                        <span class="toggle-slider"></span>
                      </label>
                    </div>
                  </div>
                </div>
                
                <div class="setting-item">
                  <div class="setting-row">
                    <div class="setting-info">
                      <label class="setting-label">删除任务时自动删除.aria2文件</label>
                      <button 
                        type="button" 
                        class="help-button" 
                        data-tooltip="删除下载任务时自动删除对应的.aria2文件，避免产生残留文件"
                        title=""
                      >?</button>
                    </div>
                    <div class="toggle-button-group">
                      <label class="toggle-switch">
                        <input
                          v-model="config.autoDeleteAria2FilesOnRemove"
                          type="checkbox"
                        />
                        <span class="toggle-slider"></span>
                      </label>
                    </div>
                  </div>
                </div>
                
                <div class="setting-item">
                  <div class="setting-row">
                    <div class="setting-info">
                      <label class="setting-label">定时清理无任务关联的.aria2文件</label>
                      <button 
                        type="button" 
                        class="help-button" 
                        data-tooltip="每30分钟自动清理一次无任务关联的.aria2文件，系统会扫描并删除没有对应下载任务的.aria2控制文件"
                        title=""
                      >?</button>
                    </div>
                    <div class="toggle-button-group">
                      <label class="toggle-switch">
                        <input
                          v-model="config.autoDeleteAria2FilesOnSchedule"
                          type="checkbox"
                        />
                        <span class="toggle-slider"></span>
                      </label>
                    </div>
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
            <div class="aria2-settings-intro coming-soon">
              <p><i class="fas fa-tools"></i> Aria2 设置功能正在开发中，敬请期待...</p>
              <p class="sub-text">此页面将提供完整的 Aria2 配置选项管理功能</p>
            </div>
            
            <div class="aria2-categories">
              <div class="settings-section">
                <h3>Aria2 设置</h3>
                <SettingItem
                  v-for="setting in aria2Settings"
                  :key="setting.key"
                  v-model="aria2Config[setting.key]"
                  :label="setting.label"
                  :type="setting.type"
                  :helpText="setting.helpText"
                  :placeholder="setting.placeholder"
                  :options="setting.options"
                  :min="setting.min"
                  :max="setting.max"
                />
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
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.5rem;
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

.aria2-settings-intro.coming-soon {
  text-align: center;
  background-color: #fff3cd;
  border-left: 4px solid #ffc107;
  padding: 2rem;
}

.aria2-settings-intro.coming-soon p {
  margin: 0.5rem 0;
  font-size: 1.1rem;
  color: #856404;
}

.aria2-settings-intro.coming-soon .sub-text {
  font-size: 0.9rem;
  color: #856404;
  opacity: 0.8;
}

.aria2-settings-intro.coming-soon i {
  font-size: 1.5rem;
  margin-right: 0.5rem;
  color: #ffc107;
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
  flex-wrap: nowrap;
}

.setting-info {
  min-width: 150px;
  max-width: 220px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.help-button {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background-color: #e0e0e0;
  border: none;
  color: #666666;
  font-size: 11px;
  font-weight: bold;
  cursor: help;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
  position: relative;
}

.help-button:hover {
  background-color: #1976d2;
  color: white;
}

/* 悬停提示样式 */
.help-button[data-tooltip]:hover::after {
  content: attr(data-tooltip);
  position: absolute;
  background-color: #333;
  color: white;
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 13px;
  z-index: 1000;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-width: 350px;
  white-space: normal;
  line-height: 1.5;
  min-width: 300px;
}

/* 添加小三角形指向图标 */
.help-button[data-tooltip]:hover::before {
  content: '';
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: -4px;
  border-width: 4px;
  border-style: solid;
  border-color: #333 transparent transparent transparent;
  z-index: 1001;
}

.toggle-button-group {
  flex-shrink: 0;
  margin-left: auto;
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


.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 26px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .4s;
  border-radius: 26px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .4s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background-color: #1976d2;
}

input:checked + .toggle-slider:before {
  transform: translateX(24px);
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


/* DEMO 标签页样式 */
.demo-intro {
  margin-bottom: 1.5rem;
  color: #666666;
  font-size: 1rem;
}

.demo-result {
  margin-top: 2rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}

.demo-result h4 {
  margin: 0 0 0.5rem 0;
  color: #333333;
}

.demo-result pre {
  margin: 0;
  padding: 0.5rem;
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 0.875rem;
  color: #333333;
  overflow-x: auto;
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

/* 暗色主题样式 */
.dark-theme .settings {
  background-color: #1a1a1a;
}

.dark-theme .page-header h2 {
  color: #e0e0e0;
}

.dark-theme .settings-tabs {
  background-color: #2d2d2d;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.dark-theme .tab-buttons {
  background-color: #252525;
  border-bottom-color: #404040;
}

.dark-theme .tab-button {
  color: #b0b0b0;
}

.dark-theme .tab-button:hover {
  background-color: #3d3d3d;
  color: #e0e0e0;
}

.dark-theme .tab-button.active {
  color: #64b5f6;
  border-bottom-color: #64b5f6;
  background-color: #2d2d2d;
}

.dark-theme .tab-panel {
  background-color: #2d2d2d;
}

.dark-theme .form-group label {
  color: #e0e0e0;
}

.dark-theme .form-control {
  background-color: #3d3d3d;
  border-color: #555555;
  color: #e0e0e0;
}

.dark-theme .form-control:focus {
  border-color: #1976d2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.3);
}

.dark-theme .form-help {
  color: #b0b0b0;
}

.dark-theme .checkbox-text {
  color: #e0e0e0;
}

.dark-theme .category-section {
  border-color: #404040;
}

.dark-theme .category-title {
  background-color: #252525;
  color: #e0e0e0;
  border-bottom-color: #404040;
}

.dark-theme .setting-label {
  color: #e0e0e0;
}

.dark-theme .setting-item label {
  color: #e0e0e0;
}

.dark-theme .toggle-slider {
  background-color: #555555;
}

.dark-theme .toggle-slider:before {
  background-color: #e0e0e0;
}

.dark-theme input:checked + .toggle-slider {
  background-color: #1976d2;
}

.dark-theme .btn-secondary {
  background-color: #3d3d3d;
  border-color: #555555;
  color: #e0e0e0;
}

.dark-theme .btn-secondary:hover {
  background-color: #4d4d4d;
  border-color: #666666;
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

/* 遗漏的暗色主题样式 */

.dark-theme .page-header {
  border-bottom-color: #404040;
}

.dark-theme .loading {
  color: #b0b0b0;
}

.dark-theme .test-result {
  background-color: #2d2d2d;
  border-color: #404040;
  color: #e0e0e0;
}

.dark-theme .test-result.success {
  background-color: #1b5e20;
  color: #81c784;
  border-color: #2e7d32;
}

.dark-theme .test-result.error {
  background-color: #b71c1c;
  color: #ef9a9a;
  border-color: #c62828;
}

.dark-theme .settings-list {
  background-color: #2d2d2d;
}

.dark-theme .setting-item {
  border-bottom-color: #404040;
}

.dark-theme .setting-item:last-child {
  border-bottom-color: transparent;
}

.dark-theme .input-group {
  border-color: #404040;
}

.dark-theme .help-button {
  background-color: #555555;
  color: #e0e0e0;
}

.dark-theme .help-button:hover {
  background-color: #1976d2;
  color: white;
}

.dark-theme .help-button[data-tooltip]:hover::after {
  background-color: #333;
  color: white;
}

.dark-theme .help-button[data-tooltip]:hover::before {
  border-color: #333 transparent transparent transparent;
}

.dark-theme .coming-soon {
  background-color: #2d2d2d;
  border-color: #404040;
}

.dark-theme .coming-soon p {
  color: #e0e0e0;
}

.dark-theme .coming-soon .sub-text {
  color: #b0b0b0;
}

.dark-theme .coming-soon i {
  color: #64b5f6;
}

.dark-theme .form-checkbox-label {
  color: #e0e0e0;
}

.dark-theme .form-checkbox {
  background-color: #3d3d3d;
  border-color: #555555;
}

/* 下拉选择框暗色主题样式 */
.dark-theme select.form-control {
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23e0e0e0' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.5rem center;
  background-repeat: no-repeat;
  background-size: 1.5em 1.5em;
  padding-right: 2.5rem;
  appearance: none;
}

.dark-theme select.form-control option {
  background-color: #3d3d3d;
  color: #e0e0e0;
}

.dark-theme select.form-control option:hover {
  background-color: #4d4d4d;
}

.dark-theme select.form-control option:checked {
  background-color: #1976d2;
  color: #ffffff;
}

/* 完善 aria2-settings-intro 暗色主题样式 */
.dark-theme .aria2-settings-intro {
  background-color: #2d2d2d;
  border-left: 4px solid #64b5f6;
}

.dark-theme .aria2-settings-intro.coming-soon {
  background-color: #2d2d2d;
  border-left: 4px solid #64b5f6;
  border-radius: 4px;
}
</style>
