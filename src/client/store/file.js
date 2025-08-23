import { defineStore } from 'pinia'
import { fileApi } from '@/services'

// File store
export const useFileStore = defineStore('file', {
  state: () => ({
    files: [],
    currentPath: '',
    loading: false,
    error: null
  }),
  
  actions: {
    async fetchFiles(path = '') {
      this.loading = true
      this.error = null // Reset error on each fetch
      try {
        const response = await fileApi.getFiles(path)
        if (response.error) {
          this.error = response.error
          this.files = []
        } else {
          this.files = response.files
        }
        this.currentPath = path
      } catch (error) {
        console.error('Failed to fetch files:', error)
        this.error = error.message || 'An unknown error occurred.'
        this.files = []
      } finally {
        this.loading = false
      }
    },
    
    async downloadFile(path) {
      try {
        // Create a direct download link to the API endpoint
        const downloadUrl = `/api/files/download?path=${encodeURIComponent(path)}`
        const link = document.createElement('a')
        link.href = downloadUrl
        link.setAttribute('download', path.split('/').pop())
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        return { success: true }
      } catch (error) {
        console.error('Failed to download file:', error)
        throw error
      }
    },
    
    async deleteFile(path) {
      try {
        const response = await fileApi.deleteFile(path)
        // 删除成功后刷新文件列表
        await this.fetchFiles(this.currentPath)
        return response
      } catch (error) {
        console.error('Failed to delete file:', error)
        throw error
      }
    },
    
    async createDirectory(path) {
      try {
        const response = await fileApi.createDirectory(path)
        // 创建成功后刷新文件列表
        await this.fetchFiles(this.currentPath)
        return response
      } catch (error) {
        console.error('Failed to create directory:', error)
        throw error
      }
    },
    
    async renameFile(oldPath, newPath) {
      try {
        const response = await fileApi.renameFile(oldPath, newPath)
        // 重命名成功后刷新文件列表
        await this.fetchFiles(this.currentPath)
        return response
      } catch (error) {
        console.error('Failed to rename file:', error)
        throw error
      }
    },
    
    async uploadFile(file, path = '', onUploadProgress) {
      try {
        const response = await fileApi.uploadFile(file, path, onUploadProgress)
        // 上传成功后刷新文件列表
        await this.fetchFiles(this.currentPath)
        return response
      } catch (error) {
        console.error('Failed to upload file:', error)
        throw error
      }
    }
  }
})