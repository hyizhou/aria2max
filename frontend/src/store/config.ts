import { defineStore } from 'pinia'
import { systemApi } from '@/services/api'

// Config store
export const useConfigStore = defineStore('config', {
  state: () => ({
    aria2RpcUrl: '' as string,
    rpcSecret: '' as string,
    downloadDir: '' as string,
    autoDeleteMetadata: false as boolean,
    autoDeleteAria2Files: false as boolean,
    loading: false
  }),
  
  actions: {
    async fetchConfig() {
      this.loading = true
      try {
        const response = await systemApi.getConfig()
        this.aria2RpcUrl = response.aria2RpcUrl || ''
        this.rpcSecret = response.aria2RpcSecret || ''
        this.downloadDir = response.downloadDir || ''
        this.autoDeleteMetadata = response.autoDeleteMetadata || false
        this.autoDeleteAria2Files = response.autoDeleteAria2Files || false
      } catch (error) {
        console.error('Failed to fetch config:', error)
      } finally {
        this.loading = false
      }
    },
    
    async saveConfig(config: { aria2RpcUrl: string; rpcSecret: string; downloadDir: string; autoDeleteMetadata?: boolean; autoDeleteAria2Files?: boolean }) {
      try {
        const response = await systemApi.saveConfig({
          aria2RpcUrl: config.aria2RpcUrl,
          aria2RpcSecret: config.rpcSecret,
          downloadDir: config.downloadDir,
          autoDeleteMetadata: config.autoDeleteMetadata || false,
          autoDeleteAria2Files: config.autoDeleteAria2Files || false
        })
        
        // 检查后端响应
        if (!response || !response.success) {
          throw new Error(response?.error?.message || 'Failed to save config')
        }
        
        // 更新本地状态
        this.aria2RpcUrl = config.aria2RpcUrl
        this.rpcSecret = config.rpcSecret
        this.downloadDir = config.downloadDir
        this.autoDeleteMetadata = config.autoDeleteMetadata || false
        this.autoDeleteAria2Files = config.autoDeleteAria2Files || false
        
        return response
      } catch (error) {
        console.error('Failed to save config:', error)
        throw error
      }
    },
    
    async testConnection() {
      try {
        const response = await systemApi.testConnection()
        return response
      } catch (error) {
        console.error('Failed to test connection:', error)
        throw error
      }
    }
  }
})