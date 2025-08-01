import { defineStore } from 'pinia'

// UI store
export const useUIStore = defineStore('ui', {
  state: () => ({
    sidebarVisible: true,
    loading: false,
    notifications: [] as any[],
    theme: 'light' // 'light' or 'dark'
  }),
  
  actions: {
    toggleSidebar() {
      this.sidebarVisible = !this.sidebarVisible
    },
    
    showSidebar() {
      this.sidebarVisible = true
    },
    
    hideSidebar() {
      this.sidebarVisible = false
    },
    
    showLoading() {
      this.loading = true
    },
    
    hideLoading() {
      this.loading = false
    },
    
    addNotification(notification: any) {
      this.notifications.push(notification)
    },
    
    removeNotification(id: string) {
      const index = this.notifications.findIndex(n => n.id === id)
      if (index !== -1) {
        this.notifications.splice(index, 1)
      }
    },
    
    // 初始化时根据屏幕宽度设置侧边栏状态
    initializeSidebar() {
      // 更精确的移动端检测
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768
      this.sidebarVisible = !isMobile
    },

    // 主题相关方法
    setTheme(theme: 'light' | 'dark') {
      this.theme = theme
      // 保存到 localStorage
      localStorage.setItem('theme', theme)
      // 应用主题到文档
      this.applyTheme(theme)
    },

    toggleTheme() {
      const newTheme = this.theme === 'light' ? 'dark' : 'light'
      this.setTheme(newTheme)
    },

    applyTheme(theme: 'light' | 'dark') {
      // 移除现有的主题类
      document.documentElement.classList.remove('light-theme', 'dark-theme')
      // 添加新的主题类
      document.documentElement.classList.add(`${theme}-theme`)
    },

    // 初始化主题
    initializeTheme() {
      // 从 localStorage 获取保存的主题，如果没有则使用系统偏好
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const theme = savedTheme || (systemPrefersDark ? 'dark' : 'light')
      this.theme = theme
      this.applyTheme(theme)
    }
  }
})