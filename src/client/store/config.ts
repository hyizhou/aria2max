import { defineStore } from 'pinia'
import { systemApi } from '@/services/api'

// Config store
export const useConfigStore = defineStore('config', {
  state: () => ({
    aria2RpcUrl: 'http://localhost:6800/jsonrpc',
    aria2RpcSecret: '',
    downloadDir: '/tmp',
    aria2ConfigPath: '',
    autoDeleteMetadata: false,
    autoDeleteAria2FilesOnRemove: false,
    autoDeleteAria2FilesOnSchedule: false,
    loading: false
  }),
  
  actions: {
    async fetchConfig() {
      this.loading = true
      try {
        const response = await systemApi.getConfig()
        this.aria2RpcUrl = response.aria2RpcUrl || 'http://localhost:6800/jsonrpc'
        this.aria2RpcSecret = response.aria2RpcSecret || ''
        this.downloadDir = response.downloadDir || '/tmp'
        this.aria2ConfigPath = response.aria2ConfigPath || ''
        this.autoDeleteMetadata = response.autoDeleteMetadata || false
        this.autoDeleteAria2FilesOnRemove = response.autoDeleteAria2FilesOnRemove || false
        this.autoDeleteAria2FilesOnSchedule = response.autoDeleteAria2FilesOnSchedule || false
      } catch (error) {
        console.error('Failed to fetch config:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async saveConfig(config: { 
      aria2RpcUrl?: string; 
      aria2RpcSecret?: string; 
      downloadDir?: string; 
      aria2ConfigPath?: string;
      autoDeleteMetadata?: boolean; 
      autoDeleteAria2FilesOnRemove?: boolean;
      autoDeleteAria2FilesOnSchedule?: boolean;
    }) {
      try {
        const response = await systemApi.saveConfig(config)
        
        // 检查后端响应
        if (!response || (response.success === false)) {
          throw new Error(response?.error?.message || 'Failed to save config')
        }
        
        // 保存成功后，立即从后端重新加载最新配置
        await this.fetchConfig()
        
        return response
      } catch (error) {
        console.error('Failed to save config:', error)
        throw error
      }
    },
    
    async testConnection(config?: { aria2RpcUrl: string; aria2RpcSecret: string }) {
      try {
        const response = await systemApi.testConnection(config)
        return response
      } catch (error) {
        console.error('Failed to test connection:', error)
        throw error
      }
    }
  }
})