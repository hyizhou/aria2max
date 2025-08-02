<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  visible: boolean
  title?: string
  width?: string
}

interface Emits {
  (e: 'close'): void
  (e: 'confirm'): void
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  title: '',
  width: '500px'
})

const emit = defineEmits<Emits>()

const showModal = ref(false)

watch(() => props.visible, (newVal) => {
  showModal.value = newVal
})

const closeModal = () => {
  showModal.value = false
  emit('close')
}

const confirm = () => {
  emit('confirm')
}
</script>

<template>
  <teleport to="body">
    <div v-if="showModal" class="modal-overlay" @click="closeModal">
      <div class="modal-container" :style="{ width }" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">{{ title }}</h3>
          <button class="modal-close" @click="closeModal">
            <i class="icon-close"></i>
          </button>
        </div>
        <div class="modal-body">
          <slot></slot>
        </div>
        <div class="modal-footer">
          <slot name="footer">
            <button class="btn btn-secondary" @click="closeModal">取消</button>
            <button class="btn btn-primary" @click="confirm">确定</button>
          </slot>
        </div>
      </div>
    </div>
  </teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-container {
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.modal-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #333333;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #999999;
  padding: 0.25rem;
  border-radius: 4px;
}

.modal-close:hover {
  background-color: #f5f5f5;
  color: #666666;
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e0e0e0;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.btn-primary {
  background-color: #1976d2;
  color: #ffffff;
  border-color: #1976d2;
}

.btn-primary:hover {
  background-color: #1565c0;
  border-color: #1565c0;
}

.btn-secondary {
  background-color: #f5f5f5;
  color: #333333;
  border-color: #e0e0e0;
}

.btn-secondary:hover {
  background-color: #e0e0e0;
  border-color: #bdbdbd;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .modal-container {
    width: 90% !important;
    max-width: 400px;
    margin: 1rem;
  }
  
  .modal-header {
    padding: 0.75rem 1rem;
  }
  
  .modal-title {
    font-size: 1.125rem;
  }
  
  .modal-close {
    font-size: 1.25rem;
  }
  
  .modal-body {
    padding: 1rem;
  }
  
  .modal-footer {
    padding: 0.75rem 1rem;
    flex-direction: column-reverse;
    gap: 0.5rem;
  }
  
  .btn {
    width: 100%;
    padding: 0.4375rem 0.875rem;
    font-size: 0.8125rem;
  }
}

/* 超小屏幕适配 */
@media (max-width: 480px) {
  .modal-container {
    width: 95% !important;
    max-width: 320px;
    margin: 0.5rem;
  }
  
  .modal-header {
    padding: 0.625rem 0.75rem;
  }
  
  .modal-title {
    font-size: 1rem;
  }
  
  .modal-close {
    font-size: 1.125rem;
  }
  
  .modal-body {
    padding: 0.75rem;
  }
  
  .modal-footer {
    padding: 0.625rem 0.75rem;
  }
  
  .btn {
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
  }
}

/* 暗色主题样式 */
.dark-theme .modal-overlay {
  background-color: rgba(0, 0, 0, 0.7);
}

.dark-theme .modal-container {
  background-color: #2d2d2d;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.dark-theme .modal-header {
  border-bottom-color: #404040;
}

.dark-theme .modal-title {
  color: #e0e0e0;
}

.dark-theme .modal-close {
  color: #b0b0b0;
}

.dark-theme .modal-close:hover {
  background-color: #3d3d3d;
  color: #e0e0e0;
}

.dark-theme .modal-footer {
  border-top-color: #404040;
}

.dark-theme .btn-primary {
  background-color: #1976d2;
  border-color: #1976d2;
  color: #ffffff;
}

.dark-theme .btn-primary:hover {
  background-color: #1565c0;
  border-color: #1565c0;
}

.dark-theme .btn-secondary {
  background-color: #3d3d3d;
  border-color: #555555;
  color: #e0e0e0;
}

.dark-theme .btn-secondary:hover {
  background-color: #4d4d4d;
  border-color: #666666;
}
</style>