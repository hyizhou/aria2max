<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import Header from '@/components/Header.vue'
import Sidebar from '@/components/Sidebar.vue'
import { useUIStore } from '@/store'

const uiStore = useUIStore()

const handleResize = () => {
  const isMobile = window.innerWidth <= 768
  if (isMobile) {
    uiStore.hideSidebar()
  } else {
    uiStore.showSidebar()
  }
}

// 更精确的移动端检测
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768
}

onMounted(() => {
  // 初始化主题
  uiStore.initializeTheme()
  
  // 使用更精确的移动端检测
  const isMobile = isMobileDevice()
  if (isMobile) {
    uiStore.hideSidebar()
  } else {
    uiStore.showSidebar()
  }
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <Header />
  <div class="app-container">
    <Sidebar />
    <main class="main-content" :class="{ 'sidebar-hidden': !uiStore.sidebarVisible }">
      <router-view />
    </main>
  </div>
</template>

<style>
/* Global styles - 这些样式会应用到 index.html 中的 #app 元素 */
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  height: 100vh;
  display: flex;
  flex-direction: column;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.app-container {
  display: flex;
  margin-top: 60px;
  flex: 1;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.main-content {
  flex: 1;
  margin-left: 0px;
  transition: margin-left 0.3s ease, width 0.3s ease;
  padding: 0;
  overflow-x: hidden;
  overflow-y: auto;
  width: calc(100% - 250px);
  box-sizing: border-box;
}

.main-content.sidebar-hidden {
  margin-left: 0;
  width: 100%;
}

/* 桌面端适配 (> 1024px) */
@media (min-width: 1025px) {
  .main-content {
    margin-left: 0px;
    width: calc(100% - 250px);
  }
  
  .main-content.sidebar-hidden {
    margin-left: 0;
    width: 100%;
  }
}

/* 移动端适配 */
@media (max-width: 768px) {
  .app-container {
    margin-top: 0; /* 移动端不需要margin-top，因为Header是fixed的 */
  }
  
  .main-content {
    margin-left: 0;
    padding: 0;
    width: 100%;
    overflow-y: auto;
  }
  
  /* 在移动端，无论侧边栏是否隐藏，主内容都占满宽度 */
  .main-content.sidebar-hidden {
    margin-left: 0;
    width: 100%;
  }
}

/* 平板端适配 (769px - 1024px) */
@media (min-width: 769px) and (max-width: 1024px) {
  .main-content {
    margin-left: 0px;
    width: calc(100% - 200px);
  }
  
  .main-content.sidebar-hidden {
    margin-left: 0;
    width: 100%;
  }
}

/* 超小屏幕适配 */
@media (max-width: 480px) {
  .app-container {
    margin-top: 0; /* 超小屏幕不需要margin-top，因为Header是fixed的 */
  }
  
  .main-content {
    margin-left: 0;
    padding: 0;
    width: 100%;
    overflow-y: auto;
  }
  
  /* 在超小屏幕，无论侧边栏是否隐藏，主内容都占满宽度 */
  .main-content.sidebar-hidden {
    margin-left: 0;
    width: 100%;
  }
}

/* 深色主题样式 */
.dark-theme {
  background-color: #1a1a1a;
  color: #e0e0e0;
}

.dark-theme #app {
  color: #e0e0e0;
}

.dark-theme .settings-form,
.dark-theme .settings-tabs {
  background-color: #2d2d2d;
  color: #e0e0e0;
}

.dark-theme .page-header h2 {
  color: #e0e0e0;
}

.dark-theme .form-group label,
.dark-theme .form-label {
  color: #e0e0e0;
}

.dark-theme .form-control {
  background-color: #3d3d3d;
  border-color: #555555;
  color: #e0e0e0;
}

.dark-theme .form-control:focus {
  border-color: #64b5f6;
  box-shadow: 0 0 0 2px rgba(100, 181, 246, 0.2);
}

.dark-theme .form-help {
  color: #b0b0b0;
}

.dark-theme .tab-buttons {
  background-color: #252525;
  border-bottom-color: #404040;
}

.dark-theme .tab-button {
  color: #b0b0b0;
}

.dark-theme .tab-button:hover {
  background-color: #3d3d3d;
  color: #e0e0e0;
}

.dark-theme .tab-button.active {
  background-color: #2d2d2d;
  color: #64b5f6;
  border-bottom-color: #64b5f6;
}

.dark-theme .category-section {
  border-color: #404040;
  background-color: #2d2d2d;
}

.dark-theme .category-title {
  background-color: #252525;
  border-bottom-color: #404040;
  color: #e0e0e0;
}

.dark-theme .category-title i {
  color: #64b5f6;
}

.dark-theme .theme-toggle {
  background-color: #3d3d3d;
  border-color: #555555;
}

.dark-theme .theme-btn {
  color: #b0b0b0;
}

.dark-theme .theme-btn:hover {
  background-color: rgba(100, 181, 246, 0.1);
  color: #e0e0e0;
}

.dark-theme .theme-btn.active {
  background-color: #1976d2;
  color: #ffffff;
}

.dark-theme .aria2-settings-intro {
  background-color: #3d3d3d;
  border-left-color: #64b5f6;
}
</style>