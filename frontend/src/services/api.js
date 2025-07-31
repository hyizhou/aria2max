// API 服务层
import axios from 'axios'

// 创建 axios 实例
const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
apiClient.interceptors.request.use(
  config => {
    // 可以在这里添加认证token等
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
apiClient.interceptors.response.use(
  response => {
    return response.data
  },
  error => {
    if (error.response) {
      // 服务器返回错误状态码
      console.error('API Error Response:', error.response.status, error.response.data)
      return Promise.reject(error.response.data)
    } else if (error.request) {
      // 请求发出但没有收到响应
      console.error('Network Error - No Response:', error.request)
      console.error('Error config:', error.config)
      return Promise.reject({ 
        error: { 
          code: 0, 
          message: 'Network error - No response received' 
        } 
      })
    } else {
      // 其他错误
      console.error('General Error:', error.message)
      return Promise.reject({ 
        error: { 
          code: 0, 
          message: error.message 
        } 
      })
    }
  }
)

// 任务管理 API
export const taskApi = {
  // 获取下载任务列表
  async getTasks() {
    return await apiClient.get('/tasks')
  },

  // 添加下载任务
  async addTask(data) {
    return await apiClient.post('/tasks', data)
  },
  
  // 添加种子文件任务
  async addTorrentFile(file, options = {}) {
    const formData = new FormData()
    formData.append('torrent', file)
    formData.append('options', JSON.stringify(options))
    return await apiClient.post('/tasks/torrent', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },
  
  // 添加Metalink文件任务
  async addMetalinkFile(file, options = {}) {
    const formData = new FormData()
    formData.append('metalink', file)
    formData.append('options', JSON.stringify(options))
    return await apiClient.post('/tasks/metalink', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  // 获取任务详情
  async getTaskDetail(gid) {
    return await apiClient.get(`/tasks/${gid}`)
  },

  // 暂停下载任务
  async pauseTask(gid) {
    return await apiClient.put(`/tasks/${gid}/pause`)
  },

  // 继续下载任务
  async resumeTask(gid) {
    return await apiClient.put(`/tasks/${gid}/resume`)
  },

  // 删除下载任务
  async deleteTask(gid, deleteFile = false) {
    const params = deleteFile ? { deleteFile: 'true' } : {}
    return await apiClient.delete(`/tasks/${gid}`, { params })
  }
}

// 文件管理 API
export const fileApi = {
  // 获取文件列表
  async getFiles(path = '') {
    return await apiClient.get('/files', { params: { path } })
  },

  // 下载文件
  async downloadFile(path) {
    return await apiClient.get('/files/download', { 
      params: { path },
      responseType: 'blob'
    })
  },

  // 删除文件或目录
  async deleteFile(path) {
    return await apiClient.delete('/files', { data: { path } })
  },

  // 创建目录
  async createDirectory(path) {
    return await apiClient.post('/files/mkdir', { path })
  },
  
  // 重命名文件或目录
  async renameFile(oldPath, newPath) {
    return await apiClient.put('/files/rename', { oldPath, newPath })
  },
  
  // 上传文件
  async uploadFile(file, path = '', onUploadProgress) {
    const formData = new FormData()
    formData.append('file', file)
    if (path) {
      formData.append('path', path)
    }
    
    return await apiClient.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: onUploadProgress
    })
  }
}

// 系统管理 API
export const systemApi = {
  // 获取系统状态
  async getSystemStatus() {
    return await apiClient.get('/system/status')
  },

  // 获取系统信息
  async getSystemInfo() {
    return await apiClient.get('/system/info')
  },

  // 获取配置信息
  async getConfig() {
    return await apiClient.get('/system/config')
  },

  // 保存配置信息
  async saveConfig(config) {
    return await apiClient.put('/system/config', config);
  },

  // 测试连接
  async testConnection() {
    return await apiClient.post('/system/test-connection')
  },

  // 获取实时网速（轻量级接口）
  async getRealtimeSpeed() {
    return await apiClient.get('/system/realtime-speed')
  }
}

// 默认导出 axios 实例
export default apiClient