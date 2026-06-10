import { defineStore } from 'pinia'
import { systemApi } from '@/services/api'
import { systemSettings, defaultSystemConfig } from './systemConfig'

// 从 systemSettings 自动推导默认值（boolean → false, 其他 → 空字符串或 API 默认值）
const storeDefaults: Record<string, any> = {
  aria2RpcUrl: 'http://localhost:6800/jsonrpc',
  downloadDir: '/tmp',
  ...defaultSystemConfig
}

// Config store
export const useConfigStore = defineStore('config', {
  state: () => ({
    ...storeDefaults,
    loading: false
  }),

  actions: {
    async fetchConfig() {
      this.loading = true
      try {
        const response = await systemApi.getConfig()
        // 从 API 响应自动填充所有配置字段
        for (const setting of systemSettings) {
          if (response[setting.key] !== undefined) {
            (this as any)[setting.key] = response[setting.key]
          }
        }
      } catch (error) {
        console.error('Failed to fetch config:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async saveConfig(config: Record<string, any>) {
      try {
        const response = await systemApi.saveConfig(config)

        if (!response || (response.success === false)) {
          throw new Error('Failed to save config')
        }

        await this.fetchConfig()

        return response
      } catch (error) {
        console.error('Failed to save config:', error)
        throw error
      }
    },

    async testConnection(config?: { aria2RpcUrl: string; aria2RpcSecret: string }) {
      try {
        const response = await systemApi.testConnection(config || {})
        return response
      } catch (error) {
        console.error('Failed to test connection:', error)
        throw error
      }
    }
  }
})