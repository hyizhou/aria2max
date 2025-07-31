import { defineStore } from 'pinia'
import { systemApi } from '@/services/api'

// Config store
export const useConfigStore = defineStore('config', {
  state: () => ({
    aria2RpcUrl: '' as string,
    rpcSecret: '' as string,
    downloadDir: '' as string,
    autoDeleteMetadata: false as boolean,
    loading: false
  }),
  
  actions: {
    async fetchConfig() {
      this.loading = true
      try {
        const response = await systemApi.getConfig()
        this.aria2RpcUrl = response.ARIA2_RPC_URL
        this.rpcSecret = response.ARIA2_RPC_SECRET || ''
        this.downloadDir = response.DOWNLOAD_DIR
        this.autoDeleteMetadata = response.AUTO_DELETE_METADATA || false
      } catch (error) {
        console.error('Failed to fetch config:', error)
      } finally {
        this.loading = false
      }
    },
    
    async saveConfig(config: { aria2RpcUrl: string; rpcSecret: string; downloadDir: string; autoDeleteMetadata?: boolean }) {
      try {
        const response = await systemApi.saveConfig({
          ARIA2_RPC_URL: config.aria2RpcUrl,
          ARIA2_RPC_SECRET: config.rpcSecret,
          DOWNLOAD_DIR: config.downloadDir,
          AUTO_DELETE_METADATA: config.autoDeleteMetadata || false
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