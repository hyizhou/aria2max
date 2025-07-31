import { defineStore } from 'pinia'

// File store
export const useFileStore = defineStore('file', {
  state: () => ({
    files: [] as any[],
    currentPath: '' as string,
    loading: false
  }),
  
  actions: {
    async fetchFiles(path: string = '') {
      this.loading = true
      try {
        // TODO: 调用后端API获取文件列表
        // const response = await api.getFiles(path)
        // this.files = response.data.files
        // this.currentPath = path
      } catch (error) {
        console.error('Failed to fetch files:', error)
      } finally {
        this.loading = false
      }
    },
    
    async deleteFile(path: string) {
      try {
        // TODO: 调用后端API删除文件
        // const response = await api.deleteFile(path)
        // return response.data
      } catch (error) {
        console.error('Failed to delete file:', error)
        throw error
      }
    },
    
    async createDirectory(path: string) {
      try {
        // TODO: 调用后端API创建目录
        // const response = await api.createDirectory(path)
        // return response.data
      } catch (error) {
        console.error('Failed to create directory:', error)
        throw error
      }
    }
  }
})