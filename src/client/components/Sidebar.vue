<script setup lang="ts">
import { ref } from 'vue'
import { useUIStore } from '@/store'
import { useRoute, useRouter } from 'vue-router'

const uiStore = useUIStore()
const route = useRoute()
const router = useRouter()

// 检测是否为移动端设备
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768
}

const menus = ref([
  { name: '仪表板', path: '/dashboard', icon: 'fas fa-home' },
  { name: '下载任务', path: '/tasks', icon: 'fas fa-tasks' },
  { name: '文件管理', path: '/files', icon: 'fas fa-folder' },
  { name: '系统状态', path: '/system-status', icon: 'fas fa-chart-line' },
  { name: '系统设置', path: '/settings', icon: 'fas fa-cog' }
])

const isActive = (path: string) => {
  return route.path === path
}

const handleMenuClick = (path: string) => {
  router.push(path).then(() => {
    // 只在移动端点击菜单项后隐藏侧边栏
    if (isMobile()) {
      setTimeout(() => {
        uiStore.hideSidebar()
      }, 100)
    }
  }).catch((error) => {
    console.error('Navigation error:', error)
  })
}

const handleOverlayClick = () => {
  uiStore.hideSidebar()
}
</script>

<template>
  <!-- 移动端遮罩层 -->
  <div 
    class="sidebar-overlay"
    :class="{ 'sidebar-overlay-visible': uiStore.sidebarVisible }"
    @click="handleOverlayClick"
    v-if="uiStore.sidebarVisible && isMobile()"
  ></div>
  
  <aside class="sidebar" :class="{ 'sidebar-hidden': !uiStore.sidebarVisible }">
    
    <nav class="menu">
      <ul class="menu-list">
        <li v-for="menu in menus" :key="menu.path" class="menu-item">
          <div 
            class="menu-link" 
            :class="{ 'active': isActive(menu.path) }"
            @click="handleMenuClick(menu.path)"
          >
            <i :class="menu.icon"></i>
            <span class="menu-text">{{ menu.name }}</span>
          </div>
        </li>
      </ul>
    </nav>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 250px;
  min-height: calc(100vh - 60px);
  height: 100%;
  background-color: #ffffff;
  border-right: 1px solid #e0e0e0;
  transition: width 0.3s ease, opacity 0.3s ease, visibility 0.3s ease;
  position: relative;
  top: 0;
  left: 0;
  overflow-y: auto;
  z-index: 900;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.sidebar-hidden {
  width: 0;
  opacity: 0;
  visibility: hidden;
  border-right: none;
}

.menu-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.menu-item {
  border-bottom: 1px solid #f0f0f0;
}

.menu-link {
  display: flex;
  align-items: center;
  padding: 1rem 1.5rem;
  text-decoration: none;
  color: #666666;
  transition: all 0.2s ease;
  position: relative;
}

.menu-link:hover {
  background-color: #f5f5f5;
  color: #333333;
}

.menu-link.active {
  background-color: #e3f2fd;
  color: #1976d2;
  border-left: 4px solid #1976d2;
}

.menu-text {
  margin-left: 1rem;
  font-size: 1rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .sidebar {
    width: 240px;
    height: calc(100vh - 56px);
    position: fixed;
    top: 56px;
    left: 0;
    z-index: 900;
    transition: transform 0.3s ease;
    transform: translateX(0);
    overflow-y: auto;
  }
  
  .sidebar-hidden {
    transform: translateX(-100%);
  }
  
  .menu-link {
    padding: 0.875rem 1.25rem;
  }
  
  .menu-text {
    font-size: 0.9375rem;
    margin-left: 0.875rem;
  }
  
  .sidebar-hidden {
    transform: translateX(-100%);
  }
}

/* 超小屏幕适配 */
@media (max-width: 480px) {
  .sidebar {
    width: 260px;
    height: calc(100vh - 56px);
    position: fixed;
    top: 56px;
    left: 0;
    z-index: 900;
    transition: transform 0.3s ease;
    overflow-y: auto;
  }
  
  .sidebar-hidden {
    transform: translateX(-100%);
  }
  
  .menu-link {
    padding: 1rem 1rem;
  }
  
  .menu-text {
    font-size: 0.875rem;
    margin-left: 0.75rem;
  }
  
  .sidebar-hidden {
    transform: translateX(-100%);
  }
}

/* 平板端适配 */
@media (max-width: 1024px) {
  .sidebar {
    width: 200px;
  }
  
  .sidebar-hidden {
    width: 0;
    opacity: 0;
    visibility: hidden;
  }
  
  .menu-link {
    padding: 0.875rem 1rem;
  }
  
  .menu-text {
    font-size: 0.875rem;
    margin-left: 0.75rem;
  }
}

/* 遮罩层样式 */
.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 950;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.sidebar-overlay-visible {
  opacity: 1;
  pointer-events: auto;
}

/* 暗色主题样式 */
.dark-theme .sidebar {
  background-color: #252525;
  border-right-color: #404040;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.3);
}

.dark-theme .menu-item {
  border-bottom-color: #404040;
}

.dark-theme .menu-link {
  color: #b0b0b0;
}

.dark-theme .menu-link:hover {
  background-color: #3d3d3d;
  color: #e0e0e0;
}

.dark-theme .menu-link.active {
  background-color: #2d2d2d;
  color: #64b5f6;
  border-left-color: #64b5f6;
}

.dark-theme .sidebar-overlay {
  background-color: rgba(0, 0, 0, 0.7);
}
</style>