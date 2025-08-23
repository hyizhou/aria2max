<template>
  <div class="add-task-page">
    <div class="page-header">
      <button class="back-button" @click="goBack">
        <i class="fas fa-arrow-left"></i>
        返回
      </button>
      <h2>添加下载任务</h2>
    </div>
    
    <div class="page-content">
      <form @submit.prevent="addTask" class="add-task-form">
        <!-- 顶部导航按钮 -->
        <div class="tab-navigation">
          <button 
            type="button" 
            class="tab-button" 
            :class="{ active: activeTab === 'content' }"
            @click="activeTab = 'content'"
          >
            <i class="fas fa-link"></i>
            下载链接
          </button>
          <button 
            type="button" 
            class="tab-button" 
            :class="{ active: activeTab === 'settings' }"
            @click="activeTab = 'settings'"
          >
            <i class="fas fa-cog"></i>
            下载选项
          </button>
        </div>
        
        <!-- 下载链接区域 -->
        <div v-show="activeTab === 'content'" class="content-section">
          <!-- URL输入区域 -->
          <div class="url-input-section">
            <div class="section-header">
              <p class="section-description">每行输入一个下载链接，支持HTTP/HTTPS/FTP/Magnet链接</p>
            </div>
            <div class="form-group">
              <textarea
                v-model="urls"
                class="url-textarea"
                placeholder="请输入下载链接，每行一个&#10;例如:&#10;https://example.com/file1.zip&#10;magnet:?xt=urn:btih:..."
                rows="12"
              ></textarea>
              <div class="file-upload-buttons-bottom">
                <label class="file-upload-button small">
                  <i class="fas fa-file-upload"></i>
                  种子文件
                  <input type="file" @change="handleTorrentUpload" accept=".torrent" hidden>
                </label>
                <label class="file-upload-button small">
                  <i class="fas fa-link"></i>
                  Metalink文件
                  <input type="file" @change="handleMetalinkUpload" accept=".metalink,.meta4" hidden>
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 下载选项区域 -->
        <div v-show="activeTab === 'settings'" class="settings-section">
          <div class="section-header">
          </div>
          
          <!-- 下载选项过滤 -->
          <div class="settings-filter">
            <div class="filter-option">
              <input 
                type="checkbox" 
                id="global-filter" 
                v-model="filterOptions.global" 
                class="filter-checkbox"
              >
              <label for="global-filter" class="filter-label">全局</label>
            </div>
            <div class="filter-option">
              <input 
                type="checkbox" 
                id="http-filter" 
                v-model="filterOptions.http" 
                class="filter-checkbox"
              >
              <label for="http-filter" class="filter-label">HTTP选项</label>
            </div>
            <div class="filter-option">
              <input 
                type="checkbox" 
                id="bittorrent-filter" 
                v-model="filterOptions.bittorrent" 
                class="filter-checkbox"
              >
              <label for="bittorrent-filter" class="filter-label">BitTorrent选项</label>
            </div>
          </div>
          
          <!-- 全部选项 -->
          <div v-show="filterOptions.global" class="settings-content">
            <div class="settings-list">
              <div class="setting-item">
                <div class="setting-row">
                  <div class="setting-info">
                    <label for="downloadDir" class="setting-label">下载目录</label>
                    <span class="setting-key">(dir)</span>
                    <button type="button" class="help-button" title="指定文件下载保存的目录路径">?</button>
                  </div>
                  <input
                    id="downloadDir"
                    v-model="taskData.options.dir"
                    type="text"
                    class="form-control setting-input"
                    :placeholder="defaultDownloadDir"
                  />
                </div>
              </div>
              
              <div class="setting-item">
                <div class="setting-row">
                  <div class="setting-info">
                    <label for="maxDownloadLimit" class="setting-label">最大下载速度 (B/s)</label>
                    <span class="setting-key">(max-download-limit)</span>
                    <button type="button" class="help-button" title="限制最大下载速度，0表示无限制">?</button>
                  </div>
                  <input
                    id="maxDownloadLimit"
                    v-model="taskData.options.maxDownloadLimit"
                    type="number"
                    class="form-control setting-input"
                    min="0"
                  />
                </div>
              </div>
              
              <div class="setting-item">
                <div class="setting-row">
                  <div class="setting-info">
                    <label for="fileAllocation" class="setting-label">文件分配方法</label>
                    <span class="setting-key">(file-allocation)</span>
                    <button type="button" class="help-button" title="设置文件分配方法">?</button>
                  </div>
                  <select
                    id="fileAllocation"
                    v-model="taskData.options.fileAllocation"
                    class="form-control setting-input"
                  >
                    <option value="">默认</option>
                    <option value="none">None</option>
                    <option value="prealloc">Prealloc</option>
                    <option value="falloc">Falloc</option>
                    <option value="trunc">Trunc</option>
                  </select>
                </div>
              </div>
              
              <div class="setting-item">
                <div class="setting-row">
                  <div class="setting-info">
                    <label for="forceSave" class="setting-label">强制保存</label>
                    <span class="setting-key">(force-save)</span>
                    <button type="button" class="help-button" title="是否强制保存下载文件">?</button>
                  </div>
                  <select
                    id="forceSave"
                    v-model="taskData.options.forceSave"
                    class="form-control setting-input"
                  >
                    <option value="">默认</option>
                    <option value="true">是</option>
                    <option value="false">否</option>
                  </select>
                </div>
              </div>
              
              <div class="setting-item">
                <div class="setting-row">
                  <div class="setting-info">
                    <label for="parameterizedUri" class="setting-label">参数化URL支持</label>
                    <span class="setting-key">(parameterized-uri)</span>
                    <button type="button" class="help-button" title="是否启用参数化URL支持">?</button>
                  </div>
                  <select
                    id="parameterizedUri"
                    v-model="taskData.options.parameterizedUri"
                    class="form-control setting-input"
                  >
                    <option value="">默认</option>
                    <option value="true">是</option>
                    <option value="false">否</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          <!-- HTTP选项 -->
          <div v-show="filterOptions.http" class="settings-content">
            <div class="settings-list">
              <div class="setting-item">
                <div class="setting-row">
                  <div class="setting-info">
                    <label for="downloadDirHttp" class="setting-label">下载目录</label>
                    <span class="setting-key">(dir)</span>
                    <button type="button" class="help-button" title="">?</button>
                  </div>
                  <input
                    id="downloadDirHttp"
                    v-model="taskData.options.dir"
                    type="text"
                    class="form-control setting-input"
                    :placeholder="defaultDownloadDir"
                  />
                </div>
              </div>
              
              <div class="setting-item">
                <div class="setting-row">
                  <div class="setting-info">
                    <label for="maxConnectionPerServerHttp" class="setting-label">单服务器连接数</label>
                    <span class="setting-key">(max-connection-per-server)</span>
                    <button type="button" class="help-button" title="">?</button>
                  </div>
                  <input
                    id="maxConnectionPerServerHttp"
                    v-model="taskData.options.maxConnectionPerServer"
                    type="number"
                    class="form-control setting-input"
                    min="1"
                    max="16"
                  />
                </div>
              </div>
              
              <div class="setting-item">
                <div class="setting-row">
                  <div class="setting-info">
                    <label for="splitHttp" class="setting-label">文件分片数</label>
                    <span class="setting-key">(split)</span>
                    <button type="button" class="help-button" title="">?</button>
                  </div>
                  <input
                    id="splitHttp"
                    v-model="taskData.options.split"
                    type="number"
                    class="form-control setting-input"
                    min="1"
                    max="16"
                  />
                </div>
              </div>
              
              <div class="setting-item">
                <div class="setting-row">
                  <div class="setting-info">
                    <label for="maxDownloadLimitHttp" class="setting-label">最大下载速度 (B/s)</label>
                    <span class="setting-key">(max-download-limit)</span>
                    <button type="button" class="help-button" title="">?</button>
                  </div>
                  <input
                    id="maxDownloadLimitHttp"
                    v-model="taskData.options.maxDownloadLimit"
                    type="number"
                    class="form-control setting-input"
                    min="0"
                  />
                </div>
              </div>
              
              <div class="setting-item">
                <div class="setting-row">
                  <div class="setting-info">
                    <label for="userAgentHttp" class="setting-label">用户代理</label>
                    <span class="setting-key">(user-agent)</span>
                    <button type="button" class="help-button" title="例如: aria2/1.36.0">?</button>
                  </div>
                  <input
                    id="userAgentHttp"
                    v-model="taskData.options.userAgent"
                    type="text"
                    class="form-control setting-input"
                    placeholder="例如: aria2/1.36.0"
                  />
                </div>
              </div>
              
              <div class="setting-item">
                <div class="setting-row">
                  <div class="setting-info">
                    <label for="refererHttp" class="setting-label">引用页</label>
                    <span class="setting-key">(referer)</span>
                    <button type="button" class="help-button" title="例如: https://example.com">?</button>
                  </div>
                  <input
                    id="refererHttp"
                    v-model="taskData.options.referer"
                    type="text"
                    class="form-control setting-input"
                    placeholder="例如: https://example.com"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <!-- BitTorrent选项 -->
          <div v-show="filterOptions.bittorrent" class="settings-content">
            <div class="settings-list">
              <div class="setting-item">
                <div class="setting-row">
                  <div class="setting-info">
                    <label for="downloadDirBt" class="setting-label">下载目录</label>
                    <span class="setting-key">(dir)</span>
                    <button type="button" class="help-button" title="">?</button>
                  </div>
                  <input
                    id="downloadDirBt"
                    v-model="taskData.options.dir"
                    type="text"
                    class="form-control setting-input"
                    :placeholder="defaultDownloadDir"
                  />
                </div>
              </div>
              
              <div class="setting-item">
                <div class="setting-row">
                  <div class="setting-info">
                    <label for="btMaxPeersBt" class="setting-label">最大连接数</label>
                    <span class="setting-key">(bt-max-peers)</span>
                    <button type="button" class="help-button" title="">?</button>
                  </div>
                  <input
                    id="btMaxPeersBt"
                    v-model="taskData.options.btMaxPeers"
                    type="number"
                    class="form-control setting-input"
                    min="0"
                    max="1000"
                  />
                </div>
              </div>
              
              <div class="setting-item">
                <div class="setting-row">
                  <div class="setting-info">
                    <label for="btRequestPeerSpeedLimitBt" class="setting-label">请求速度限制 (B/s)</label>
                    <span class="setting-key">(bt-request-peer-speed-limit)</span>
                    <button type="button" class="help-button" title="">?</button>
                  </div>
                  <input
                    id="btRequestPeerSpeedLimitBt"
                    v-model="taskData.options.btRequestPeerSpeedLimit"
                    type="number"
                    class="form-control setting-input"
                    min="0"
                  />
                </div>
              </div>
              
              <div class="setting-item">
                <div class="setting-row">
                  <div class="setting-info">
                    <label for="btRemoveUnselectedFileBt" class="setting-label">删除未选择的文件</label>
                    <span class="setting-key">(bt-remove-unselected-file)</span>
                    <button type="button" class="help-button" title="">?</button>
                  </div>
                  <select
                    id="btRemoveUnselectedFileBt"
                    v-model="taskData.options.btRemoveUnselectedFile"
                    class="form-control setting-input"
                  >
                    <option value="">默认</option>
                    <option value="true">是</option>
                    <option value="false">否</option>
                  </select>
                </div>
              </div>
              
              <div class="setting-item">
                <div class="setting-row">
                  <div class="setting-info">
                    <label for="btEnableLpdBt" class="setting-label">启用本地发现</label>
                    <span class="setting-key">(bt-enable-lpd)</span>
                    <button type="button" class="help-button" title="是否启用本地Peer发现功能">?</button>
                  </div>
                  <select
                    id="btEnableLpdBt"
                    v-model="taskData.options.btEnableLpd"
                    class="form-control setting-input"
                  >
                    <option value="">默认</option>
                    <option value="true">是</option>
                    <option value="false">否</option>
                  </select>
                </div>
              </div>
              
              <div class="setting-item">
                <div class="setting-row">
                  <div class="setting-info">
                    <label for="btHashCheckSeedBt" class="setting-label">哈希检查后做种</label>
                    <span class="setting-key">(bt-hash-check-seed)</span>
                    <button type="button" class="help-button" title="哈希检查完成后是否继续做种">?</button>
                  </div>
                  <select
                    id="btHashCheckSeedBt"
                    v-model="taskData.options.btHashCheckSeed"
                    class="form-control setting-input"
                  >
                    <option value="">默认</option>
                    <option value="true">是</option>
                    <option value="false">否</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" @click="goBack">取消</button>
          <button type="submit" class="btn btn-primary" :disabled="addingTask">
            {{ addingTask ? '添加中...' : '添加任务' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTaskStore } from '@/store'
import { useConfigStore } from '@/store'

const router = useRouter()
const taskStore = useTaskStore()
const configStore = useConfigStore()

const addingTask = ref(false)
const activeTab = ref('content') // 'content' 或 'settings'
const settingsTab = ref('all') // 'all', 'http', 'bittorrent'

// 下载选项过滤
const filterOptions = reactive({
  global: true,
  http: false,
  bittorrent: false
})

// URL输入（支持多行）
const urls = ref('')

// 任务数据
const taskData = reactive({
  uri: '',
  options: {
    dir: '',
    maxConnectionPerServer: '',
    split: '',
    userAgent: '',
    referer: '',
    maxDownloadLimit: '',
    maxUploadLimit: '',
    btMaxPeers: '',
    btRequestPeerSpeedLimit: '',
    btRemoveUnselectedFile: '',
    btEnableLpd: '',
    btHashCheckSeed: '',
    fileAllocation: '',
    forceSave: '',
    parameterizedUri: ''
  }
})

// 默认下载目录
const defaultDownloadDir = ref('')

onMounted(async () => {
  // 获取默认下载目录
  await configStore.fetchConfig()
  defaultDownloadDir.value = configStore.downloadDir
})

// 返回上一页
const goBack = () => {
  router.back()
}

// 处理种子文件上传
const handleTorrentUpload = async (event: any) => {
  const file = event.target.files[0]
  if (!file) return
  
  try {
    addingTask.value = true
    // 调用任务存储的添加种子文件方法
    await taskStore.addTorrentFile(file, taskData.options)
    alert('种子文件添加成功')
    router.push('/tasks')
  } catch (error: any) {
    console.error('Failed to add torrent file:', error)
    let errorMessage = '添加种子文件失败'
    if (error && error.error && error.error.message) {
      errorMessage = error.error.message
    } else if (error && error.message) {
      errorMessage = error.message
    }
    alert(`添加种子文件失败: ${errorMessage}`)
  } finally {
    addingTask.value = false
    // 清空文件输入
    event.target.value = ''
  }
}

// 处理Metalink文件上传
const handleMetalinkUpload = async (event: any) => {
  const file = event.target.files[0]
  if (!file) return
  
  try {
    addingTask.value = true
    // 调用任务存储的添加Metalink文件方法
    await taskStore.addMetalinkFile(file, taskData.options)
    alert('Metalink文件添加成功')
    router.push('/tasks')
  } catch (error: any) {
    console.error('Failed to add metalink file:', error)
    let errorMessage = '添加Metalink文件失败'
    if (error && error.error && error.error.message) {
      errorMessage = error.error.message
    } else if (error && error.message) {
      errorMessage = error.message
    }
    alert(`添加Metalink文件失败: ${errorMessage}`)
  } finally {
    addingTask.value = false
    // 清空文件输入
    event.target.value = ''
  }
}

// 添加任务
const addTask = async () => {
  if (!urls.value.trim()) {
    alert('请输入至少一个下载链接')
    return
  }
  
  addingTask.value = true
  
  try {
    // 将多行URL分割成数组
    const urlList = urls.value.split('\n').filter(url => url.trim() !== '')
    
    // 过滤掉空值选项
    const options: any = {}
    Object.keys(taskData.options).forEach(key => {
      const value = (taskData.options as any)[key]
      if (value !== '' && value !== undefined && value !== null) {
        (options as any)[key] = value
      }
    })
    
    // 如果只有一个URL，使用原来的添加任务方法
    if (urlList.length === 1) {
      await taskStore.addTask(urlList[0], options)
    } else {
      // 如果有多个URL，批量添加任务
      for (const url of urlList) {
        if (url.trim()) {
          await taskStore.addTask(url.trim(), options)
        }
      }
    }
    
    // 显示成功消息并返回任务列表
    alert(`${urlList.length}个任务添加成功`)
    router.push('/tasks')
  } catch (error: any) {
    console.error('Failed to add task:', error)
    let errorMessage = '添加任务失败'
    if (error && error.error && error.error.message) {
      errorMessage = error.error.message
    } else if (error && error.message) {
      errorMessage = error.message
    }
    alert(`添加任务失败: ${errorMessage}`)
  } finally {
    addingTask.value = false
  }
}
</script>

<style scoped>
.add-task-page {
  padding: 0;
  width: 100%;
  max-width: 100%;
  margin: 0;
  background-color: white;
}

.page-header {
  display: flex;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
  background-color: white;
}

.back-button {
  background: none;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: background-color 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-right: 1rem;
}

.back-button:hover {
  background-color: #f5f5f5;
}

.page-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #333333;
}

.page-content {
  padding: 0;
  background-color: white;
  min-height: calc(100vh - 120px);
  width: 100%;
  max-width: 100%;
  margin: 0;
}

.add-task-form {
  background: white;
  border-radius: 0;
  padding: 2rem;
  box-shadow: none;
  margin-bottom: 0;
  width: 100%;
  max-width: 100%;
}

/* Tab导航 */
.tab-navigation {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 1rem;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: none;
  border: 1px solid #e0e0e0;
  border-radius: 4px 4px 0 0;
  cursor: pointer;
  font-weight: 500;
  color: #666666;
  transition: all 0.2s ease;
}

.tab-button:hover {
  background-color: #f8f9fa;
  color: #333333;
}

.tab-button.active {
  background-color: #1976d2;
  color: white;
  border-color: #1976d2;
}

/* 下载选项子导航 */
.settings-sub-navigation {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 1rem;
}

.sub-tab-button {
  padding: 0.5rem 1rem;
  background: none;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  color: #666666;
  transition: all 0.2s ease;
}

.sub-tab-button:hover {
  background-color: #f8f9fa;
  color: #333333;
}

.sub-tab-button.active {
  background-color: #1976d2;
  color: white;
  border-color: #1976d2;
}

.settings-content {
  margin-bottom: 1.5rem;
}

.section-header {
  margin-bottom: 1.5rem;
}

.section-header h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #333333;
}

.section-description {
  margin: 0;
  color: #666666;
  font-size: 0.875rem;
}

/* 文件上传区域 */
.file-upload-section {
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
  text-align: left;
}

.file-upload-buttons {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: flex-start;
  margin-top: 0.5rem;
}

.file-upload-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
  font-size: 0.9rem;
  color: #666666;
}

.file-upload-button.small {
  padding: 0.25rem 0.5rem;
  font-size: 0.8rem;
  border: 1px solid #cccccc;
  background-color: #ffffff;
}

.file-upload-button:hover {
  background-color: #e9ecef;
  border-color: #adb5bd;
  transform: none;
  box-shadow: none;
}

.file-upload-button.small:hover {
  background-color: #f8f9fa;
  border-color: #999999;
}

.file-upload-button i {
  font-size: 1rem;
}

.upload-hint {
  margin-top: 1.5rem;
  text-align: center;
}

.upload-hint p {
  color: #666666;
  font-size: 0.9rem;
  margin: 0;
}

/* URL输入区域 */
.url-input-section {
  padding-bottom: 2.5rem;
}

.url-textarea {
  width: 100%;
  padding: 1.5rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 0.875rem;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  resize: vertical;
  min-height: 250px;
  box-sizing: border-box;
  background-color: #fafafa;
}

.file-upload-buttons-bottom {
  display: flex;
  gap: 1rem;
  margin-top: 1rem;
  justify-content: flex-end;
}

.url-textarea:focus {
  outline: none;
  border-color: #1976d2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
}

/* 设置区域 */
.settings-section {
  margin-bottom: 2rem;
}

.settings-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem 0;
}

.settings-section .section-description {
  color: #666666;
  font-size: 1rem;
  margin-top: 0.5rem;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.setting-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* 桌面端栅格布局 */
@media (min-width: 769px) {
  .setting-row {
    display: grid;
    grid-template-columns: 2fr 3fr;
    gap: 1rem;
    align-items: center;
  }
}

.setting-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.setting-label {
  font-weight: 500;
  color: #666666;
  margin-bottom: 0;
}

.setting-key {
  font-size: 0.8rem;
  color: #999999;
  font-weight: normal;
}

.form-help {
  font-weight: 500;
  color: #666666;
}

.setting-input {
  width: 100%;
}

.help-button {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: #e0e0e0;
  border: none;
  color: #666666;
  font-size: 12px;
  font-weight: bold;
  cursor: help;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.help-button:hover {
  background-color: #1976d2;
  color: white;
}

/* 悬停提示样式 */
.help-button[title]:hover::after {
  content: attr(title);
  position: absolute;
  background-color: #333;
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  white-space: nowrap;
  z-index: 1000;
  margin-top: 40px;
  margin-left: -20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 下载选项过滤 */
.settings-filter {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.filter-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.filter-label {
  font-weight: 500;
  color: #333333;
  cursor: pointer;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #333333;
}

.form-help {
  margin-top: 0.25rem;
  font-size: 0.875rem;
  color: #666666;
  line-height: 1.4;
}

.form-control {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.2s ease;
  box-sizing: border-box;
}

.form-control:focus {
  outline: none;
  border-color: #1976d2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e0e0e0;
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

/* 响应式设计 */
@media (max-width: 768px) {
  .page-header {
    padding: 1rem;
  }
  
  .page-header h2 {
    font-size: 1.25rem;
  }
  
  .page-content {
    padding: 1rem;
  }
  
  .add-task-form {
    padding: 1.5rem;
  }
  
  .tab-navigation {
    flex-direction: column;
  }
  
  .tab-button {
    border-radius: 4px;
    justify-content: center;
    width: 100%;
    margin-bottom: 0.5rem;
  }
  
  .settings-sub-navigation {
    flex-direction: column;
  }
  
  .sub-tab-button {
    justify-content: center;
    width: 100%;
    margin-bottom: 0.5rem;
  }
  
  .file-upload-buttons {
    flex-direction: column;
  }
  
  .file-upload-button {
    justify-content: center;
    width: 100%;
    margin-bottom: 1rem;
  }
  
  .settings-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
  }
  
  .url-textarea {
    min-height: 200px;
    padding: 1rem;
  }
}

@media (max-width: 480px) {
  .page-header {
    padding: 0.75rem;
    margin-bottom: 1rem;
  }
  
  .page-header h2 {
    font-size: 1.125rem;
  }
  
  .page-content {
    padding: 0.75rem;
  }
  
  .add-task-form {
    padding: 1rem;
  }
  
  .section-header h3 {
    font-size: 1.125rem;
  }
  
  .form-control {
    padding: 0.625rem;
    font-size: 0.875rem;
  }
  
  .btn {
    padding: 0.625rem 1.25rem;
    font-size: 0.875rem;
  }
  
  .file-upload-button {
    padding: 1rem 1.5rem;
    font-size: 1rem;
  }
  
  .url-textarea {
    min-height: 150px;
    padding: 0.75rem;
    font-size: 1rem;
  }
  
  .form-help {
    font-size: 0.75rem;
  }
}

/* 暗色主题样式 */
.dark-theme .add-task-page {
  background-color: #1a1a1a;
}

.dark-theme .page-header {
  background-color: #252525;
  border-bottom-color: #404040;
}

.dark-theme .page-header h2 {
  color: #e0e0e0;
}

.dark-theme .back-button {
  color: #b0b0b0;
}

.dark-theme .back-button:hover {
  background-color: #3d3d3d;
  color: #e0e0e0;
}

.dark-theme .back-button i {
  color: #b0b0b0;
}

.dark-theme .back-button:hover i {
  color: #e0e0e0;
}

.dark-theme .page-content {
  background-color: #1a1a1a;
}

.dark-theme .add-task-form {
  background-color: #2d2d2d;
  border-color: #404040;
}

.dark-theme .section-header h3 {
  color: #e0e0e0;
}

.dark-theme .form-label,
.dark-theme .form-group label {
  color: #e0e0e0;
}

.dark-theme .form-help {
  color: #b0b0b0;
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

.dark-theme .url-textarea {
  background-color: #3d3d3d;
  border-color: #555555;
  color: #e0e0e0;
}

.dark-theme .file-upload-button {
  background-color: #3d3d3d;
  border-color: #555555;
  color: #e0e0e0;
}

.dark-theme .file-upload-button:hover {
  background-color: #4d4d4d;
}

.dark-theme .tab-navigation {
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
  background-color: #1976d2;
  color: #ffffff;
}

.dark-theme .settings-sub-navigation {
  border-bottom-color: #404040;
}

.dark-theme .sub-tab-button {
  color: #b0b0b0;
}

.dark-theme .sub-tab-button:hover {
  background-color: #3d3d3d;
  color: #e0e0e0;
}

.dark-theme .sub-tab-button.active {
  background-color: #1976d2;
  color: #ffffff;
}

.dark-theme .setting-info .setting-label {
  color: #e0e0e0;
}

.dark-theme .setting-info .setting-key {
  color: #b0b0b0;
}

.dark-theme .setting-info .help-button {
  background-color: #555555;
  color: #e0e0e0;
}

.dark-theme .setting-info .help-button:hover {
  background-color: #666666;
}

.dark-theme .form-actions {
  border-top-color: #404040;
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

.dark-theme .btn-primary {
  background-color: #1976d2;
  border-color: #1976d2;
  color: #ffffff;
}

.dark-theme .btn-primary:hover:not(:disabled) {
  background-color: #1565c0;
  border-color: #1565c0;
}

.dark-theme .settings-filter {
  background-color: #2d2d2d;
  border-color: #404040;
}

.dark-theme .filter-label {
  color: #e0e0e0;
}

.dark-theme .filter-checkbox {
  background-color: #3d3d3d;
  border-color: #555555;
}

.dark-theme .file-upload-button.small:hover {
  background-color: #4d4d4d;
  border-color: #666666;
}

.dark-theme .content-section {
  background-color: #1a1a1a;
  border-color: #404040;
}

.dark-theme .settings-section {
  background-color: #1a1a1a;
  border-color: #404040;
}

.dark-theme .settings-content {
  background-color: #1a1a1a;
  border-color: #404040;
}

.dark-theme .setting-item {
  border-color: #404040;
}

.dark-theme .form-control option {
  background-color: #3d3d3d;
  color: #e0e0e0;
}

.dark-theme .help-button[title]:hover::after {
  background-color: #333;
  color: white;
}

.dark-theme .upload-hint p {
  color: #b0b0b0;
}

.dark-theme .file-upload-section {
  border-color: #404040;
}

.dark-theme .section-header {
  color: #e0e0e0;
}

.dark-theme .setting-row {
  border-color: #404040;
}
</style>
