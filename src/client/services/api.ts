// API 服务层
import axios, { AxiosInstance, AxiosError } from 'axios'
import type {
  TaskListResponse,
  AddTaskResponse,
  Aria2TaskDetail,
  FileListResponse,
  SystemConfig,
  SystemStatusResponse,
  SystemInfo,
  RealtimeSpeedResponse,
  DeviceNetworkSpeedResponse,
  TestConnectionResponse,
  ApiErrorResponse
} from '@shared/types'

// 创建 axios 实例
const apiClient: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
apiClient.interceptors.request.use(
  config => {
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
  (error: AxiosError<ApiErrorResponse>) => {
    if (error.response) {
      console.error('API Error Response:', error.response.status, error.response.data)
      return Promise.reject(error.response.data)
    } else if (error.request) {
      console.error('Network Error - No Response:', error.request)
      console.error('Error config:', error.config)
      return Promise.reject({
        error: {
          code: 0,
          message: 'Network error - No response received'
        }
      })
    } else {
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
  async getTasks(): Promise<TaskListResponse> {
    return await apiClient.get('/tasks')
  },

  // 添加下载任务
  async addTask(data: { uri: string; options?: Record<string, string | number> }): Promise<AddTaskResponse> {
    return await apiClient.post('/tasks', data)
  },

  // 添加种子文件任务
  async addTorrentFile(file: File, options: Record<string, string | number> = {}): Promise<AddTaskResponse> {
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
  async addMetalinkFile(file: File, options: Record<string, string | number> = {}): Promise<AddTaskResponse> {
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
  async getTaskDetail(gid: string): Promise<Aria2TaskDetail> {
    return await apiClient.get(`/tasks/${gid}`)
  },

  // 暂停下载任务
  async pauseTask(gid: string): Promise<{ success: boolean }> {
    return await apiClient.put(`/tasks/${gid}/pause`)
  },

  // 继续下载任务
  async resumeTask(gid: string): Promise<{ success: boolean }> {
    return await apiClient.put(`/tasks/${gid}/resume`)
  },

  // 删除下载任务
  async deleteTask(gid: string, deleteFile = false): Promise<{ success: boolean }> {
    const params = deleteFile ? { deleteFile: 'true' } : {}
    return await apiClient.delete(`/tasks/${gid}`, { params })
  },

  // 清理元数据任务
  async cleanMetadataTasks(): Promise<{ success: boolean; message: string; deletedTasks: Array<{ gid: string; name: string; status: string }> }> {
    return await apiClient.post('/tasks/clean-metadata')
  }
}

// 文件管理 API
export const fileApi = {
  // 获取文件列表
  async getFiles(path = ''): Promise<FileListResponse> {
    return await apiClient.get('/files', { params: { path } })
  },

  // 下载文件
  async downloadFile(path: string): Promise<Blob> {
    return await apiClient.get('/files/download', {
      params: { path },
      responseType: 'blob'
    })
  },

  // 删除文件或目录
  async deleteFile(path: string): Promise<{ success: boolean }> {
    return await apiClient.delete('/files', { data: { path } })
  },

  // 创建目录
  async createDirectory(path: string): Promise<{ success: boolean }> {
    return await apiClient.post('/files/mkdir', { path })
  },

  // 重命名文件或目录
  async renameFile(oldPath: string, newPath: string): Promise<{ success: boolean }> {
    return await apiClient.put('/files/rename', { oldPath, newPath })
  },

  // 上传文件
  async uploadFile(file: File, path = '', onUploadProgress?: (progressEvent: { loaded: number; total: number; progress: number }) => void): Promise<{ success: boolean }> {
    const formData = new FormData()
    formData.append('file', file)
    if (path) {
      formData.append('path', path)
    }

    return await apiClient.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: onUploadProgress ? (progressEvent) => {
        onUploadProgress({
          loaded: progressEvent.loaded,
          total: progressEvent.total || 0,
          progress: progressEvent.total ? progressEvent.loaded / progressEvent.total : 0
        })
      } : undefined
    })
  }
}

// 系统管理 API
export const systemApi = {
  // 获取系统状态
  async getSystemStatus(): Promise<SystemStatusResponse> {
    return await apiClient.get('/system/status')
  },

  // 获取系统信息
  async getSystemInfo(): Promise<SystemInfo> {
    return await apiClient.get('/system/info')
  },

  // 获取配置信息
  async getConfig(): Promise<SystemConfig> {
    return await apiClient.get('/system/config')
  },

  // 保存配置信息
  async saveConfig(config: Partial<SystemConfig>): Promise<{ success: boolean }> {
    return await apiClient.put('/system/config', config)
  },

  // 测试连接
  async testConnection(config: Partial<SystemConfig>): Promise<TestConnectionResponse> {
    return await apiClient.post('/system/test-connection', config)
  },

  // 获取实时网速（轻量级接口）
  async getRealtimeSpeed(): Promise<RealtimeSpeedResponse> {
    return await apiClient.get('/system/realtime-speed')
  },

  // 获取设备网速（专门用于网速显示）
  async getDeviceNetworkSpeed(): Promise<DeviceNetworkSpeedResponse> {
    return await apiClient.get('/system/device-network-speed')
  }
}

// 默认导出 axios 实例
export default apiClient
