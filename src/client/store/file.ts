import { defineStore } from 'pinia'
import { fileApi } from '@/services'
import type { FileItem } from '@shared/types'

interface FileState {
  files: FileItem[]
  currentPath: string
  loading: boolean
  error: string | null
}

export const useFileStore = defineStore('file', {
  state: (): FileState => ({
    files: [],
    currentPath: '',
    loading: false,
    error: null
  }),

  actions: {
    async fetchFiles(path = ''): Promise<void> {
      this.loading = true
      this.error = null
      try {
        const response = await fileApi.getFiles(path)
        if (response.error) {
          this.error = response.error
          this.files = []
        } else {
          this.files = response.files as FileItem[]
        }
        this.currentPath = path
      } catch (error) {
        const err = error as Error
        console.error('Failed to fetch files:', error)
        this.error = err.message || 'An unknown error occurred.'
        this.files = []
      } finally {
        this.loading = false
      }
    },

    async downloadFile(path: string): Promise<{ success: boolean }> {
      try {
        const downloadUrl = `/api/files/download?path=${encodeURIComponent(path)}`
        const link = document.createElement('a')
        link.href = downloadUrl
        link.setAttribute('download', path.split('/').pop() || 'download')
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        return { success: true }
      } catch (error) {
        console.error('Failed to download file:', error)
        throw error
      }
    },

    async deleteFile(path: string): Promise<{ success: boolean }> {
      try {
        const response = await fileApi.deleteFile(path)
        await this.fetchFiles(this.currentPath)
        return response
      } catch (error) {
        console.error('Failed to delete file:', error)
        throw error
      }
    },

    async createDirectory(path: string): Promise<{ success: boolean }> {
      try {
        const response = await fileApi.createDirectory(path)
        await this.fetchFiles(this.currentPath)
        return response
      } catch (error) {
        console.error('Failed to create directory:', error)
        throw error
      }
    },

    async renameFile(oldPath: string, newPath: string): Promise<{ success: boolean }> {
      try {
        const response = await fileApi.renameFile(oldPath, newPath)
        await this.fetchFiles(this.currentPath)
        return response
      } catch (error) {
        console.error('Failed to rename file:', error)
        throw error
      }
    },

    async uploadFile(file: File, path = '', onUploadProgress?: (progressEvent: { loaded: number; total: number; progress: number }) => void): Promise<{ success: boolean }> {
      try {
        const response = await fileApi.uploadFile(file, path, onUploadProgress)
        await this.fetchFiles(this.currentPath)
        return response
      } catch (error) {
        console.error('Failed to upload file:', error)
        throw error
      }
    }
  }
})
