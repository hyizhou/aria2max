import { defineStore } from 'pinia'
import { systemApi } from '@/services'

// Config store
export const useConfigStore = defineStore('config', {
  state: () => ({
    aria2RpcUrl: 'http://localhost:6800/jsonrpc',
    downloadDir: '/home/hyizhou/downloads',
    loading: false
  }),
  
  actions: {
    async fetchConfig() {
      this.loading = true
      try {
        console.log('Fetching config...')
        const response = await systemApi.getConfig()
        console.log('Config response:', response)
        this.aria2RpcUrl = response.ARIA2_RPC_URL
        this.downloadDir = response.DOWNLOAD_DIR
      } catch (error) {
        console.error('Failed to fetch config:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async saveConfig(config) {
      this.loading = true
      try {
        const response = await systemApi.saveConfig(config)
        this.aria2RpcUrl = config.ARIA2_RPC_URL
        this.downloadDir = config.DOWNLOAD_DIR
        return response
      } catch (error) {
        console.error('Failed to save config:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async testConnection() {
      this.loading = true
      try {
        console.log('Testing connection...')
        const response = await systemApi.testConnection()
        console.log('Test connection response:', response)
        return response
      } catch (error) {
        console.error('Failed to test connection:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    async fetchSystemStatus() {
      try {
        const response = await systemApi.getSystemStatus()
        return response
      } catch (error) {
        console.error('Failed to fetch system status:', error)
        throw error
      }
    }
  }
})