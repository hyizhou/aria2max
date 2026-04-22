<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n()

const label = computed(() => locale.value === 'zh-CN' ? 'EN' : '中文')

const toggle = () => {
  locale.value = locale.value === 'zh-CN' ? 'en' : 'zh-CN'
  localStorage.setItem('language', locale.value)
}
</script>

<template>
  <button class="lang-toggle" @click="toggle" :title="locale === 'zh-CN' ? 'Switch to English' : '切换到中文'">
    {{ label }}
  </button>
</template>

<style scoped>
.lang-toggle {
  background: none;
  border: 1px solid transparent;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  color: inherit;
  transition: all 0.2s ease;
  letter-spacing: 0.5px;
}

.lang-toggle:hover {
  background-color: #f5f5f5;
  border-color: #e0e0e0;
}

/* 暗色主题样式 */
.dark-theme .lang-toggle:hover {
  background-color: #3d3d3d;
  border-color: #555555;
  color: #e0e0e0;
}
</style>
