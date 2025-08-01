<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  currentPath: string
}

interface Emits {
  (e: 'navigate', path: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const pathSegments = computed(() => {
  if (!props.currentPath) {
    return [{ name: '根目录', path: '' }]
  }
  
  const segments = props.currentPath.split('/').filter(segment => segment)
  const result = [{ name: '根目录', path: '' }]
  
  let currentPath = ''
  segments.forEach(segment => {
    currentPath += '/' + segment
    result.push({ name: segment, path: currentPath })
  })
  
  return result
})

const handleNavigate = (path: string) => {
  emit('navigate', path)
}
</script>

<template>
  <div class="file-breadcrumb">
    <nav class="breadcrumb">
      <ol class="breadcrumb-list">
        <li 
          v-for="(segment, index) in pathSegments" 
          :key="segment.path"
          class="breadcrumb-item"
        >
          <button 
            class="breadcrumb-link"
            :class="{ 'active': index === pathSegments.length - 1 }"
            @click="handleNavigate(segment.path)"
          >
            {{ segment.name }}
          </button>
          <span v-if="index < pathSegments.length - 1" class="separator">/</span>
        </li>
      </ol>
    </nav>
  </div>
</template>

<style scoped>
.file-breadcrumb {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.breadcrumb-list {
  display: flex;
  flex-wrap: wrap;
  list-style: none;
  padding: 0;
  margin: 0;
  gap: 0.5rem;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.breadcrumb-link {
  background: none;
  border: none;
  color: #666666;
  cursor: pointer;
  font-size: 0.875rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.breadcrumb-link:hover {
  background-color: #f5f5f5;
  color: #333333;
}

.breadcrumb-link.active {
  color: #1976d2;
  font-weight: 500;
  cursor: default;
}

.breadcrumb-link.active:hover {
  background-color: transparent;
}

.separator {
  color: #999999;
  font-size: 0.875rem;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .file-breadcrumb {
    padding: 0.75rem;
  }
  
  .breadcrumb-list {
    gap: 0.25rem;
  }
  
  .breadcrumb-link {
    font-size: 0.75rem;
    padding: 0.125rem 0.25rem;
  }
  
  .separator {
    font-size: 0.75rem;
  }
}
</style>