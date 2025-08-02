<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUIStore } from '@/store'
import NetworkMonitor from '@/components/NetworkMonitor.vue'

const router = useRouter()
const uiStore = useUIStore()

// 添加任务模态框控制
const showAddTaskModal = ref(false)

const toggleSidebar = () => {
  uiStore.toggleSidebar()
}

// 跳转到添加任务页面
const goToAddTask = () => {
  router.push('/add-task')
}

// 切换主题
const toggleTheme = () => {
  uiStore.toggleTheme()
}
</script>

<template>
  <header class="header">
    <div class="header-left">
      <button class="menu-toggle" @click="toggleSidebar">
        <i class="fas fa-bars"></i>
      </button>
      <h1 class="app-title">aria-max</h1>
    </div>
    <div class="header-center">
      <NetworkMonitor />
    </div>
    <div class="header-right">
      <button class="action-button" @click="toggleTheme" :title="uiStore.theme === 'light' ? '切换到暗色主题' : '切换到亮色主题'">
        <i :class="uiStore.theme === 'light' ? 'fas fa-moon' : 'fas fa-sun'"></i>
      </button>
      <button class="action-button" @click="goToAddTask" title="添加下载任务">
        <i class="fas fa-plus"></i>
      </button>
    </div>
  </header>
</template>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 1rem;
  height: 60px;
  background-color: #ffffff;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
}

.header-left {
  display: flex;
  align-items: center;
}

.menu-toggle {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  margin-right: 1rem;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.menu-toggle:hover {
  background-color: #f5f5f5;
}

.app-logo {
  height: 32px;
  width: 32px;
  margin-right: 0.5rem;
  vertical-align: middle;
}

.app-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #333333;
}

.header-center {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.action-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.action-button:hover {
  background-color: #f5f5f5;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .header {
    height: 56px;
    padding: 0 0.5rem;
  }
  
  .header-center {
    flex: 1;
    margin: 0 0.5rem;
    min-width: 0; /* 允许收缩 */
    max-width: 200px; /* 增加最大宽度以显示更多信息 */
    overflow: hidden; /* 防止溢出 */
  }
  
  .menu-toggle {
    font-size: 1.25rem;
    margin-right: 0.5rem;
    padding: 0.4rem;
  }
  
  .app-logo {
    height: 28px;
    width: 28px;
    margin-right: 0.4rem;
  }
  
  .app-title {
    font-size: 1.25rem;
  }
  
  .action-button {
    font-size: 1.25rem;
    padding: 0.4rem;
  }
}

/* 超小屏幕适配 */
@media (max-width: 480px) {
  .header {
    padding: 0 0.4rem;
  }
  
  .header-center {
    flex: 1;
    margin: 0 0.3rem;
    min-width: 0; /* 允许收缩 */
    max-width: 160px; /* 增加最大宽度以显示更多信息 */
    overflow: hidden; /* 防止溢出 */
  }
  
  .menu-toggle {
    margin-right: 0.4rem;
  }
  
  .app-logo {
    height: 24px;
    width: 24px;
    margin-right: 0.3rem;
  }
  
  .app-title {
    font-size: 1.125rem;
  }
}

/* 暗色主题样式 */
.dark-theme .header {
  background-color: #252525;
  border-bottom-color: #404040;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.dark-theme .menu-toggle,
.dark-theme .action-button {
  color: #b0b0b0;
}

.dark-theme .menu-toggle:hover,
.dark-theme .action-button:hover {
  background-color: #3d3d3d;
  color: #e0e0e0;
}

.dark-theme .app-title {
  color: #e0e0e0;
}
</style>