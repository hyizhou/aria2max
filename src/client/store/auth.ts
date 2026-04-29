import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiClient from '@/services/api'

export const useAuthStore = defineStore('auth', () => {
  const requiresAuth = ref(false)
  const isAuthenticated = ref(false)
  const checked = ref(false)

  async function checkStatus(): Promise<void> {
    try {
      const data = await apiClient.get('/auth/status') as { requiresAuth: boolean; isAuthenticated: boolean }
      requiresAuth.value = data.requiresAuth
      isAuthenticated.value = data.isAuthenticated
    } catch {
      requiresAuth.value = false
      isAuthenticated.value = false
    } finally {
      checked.value = true
    }
  }

  async function login(password: string): Promise<boolean> {
    try {
      await apiClient.post('/auth/login', { password })
      isAuthenticated.value = true
      return true
    } catch {
      return false
    }
  }

  async function logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout')
    } finally {
      isAuthenticated.value = false
    }
  }

  return { requiresAuth, isAuthenticated, checked, checkStatus, login, logout }
})
