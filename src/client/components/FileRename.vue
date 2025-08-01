<template>
  <Modal 
    :visible="visible"
    title="重命名文件" 
    width="400px"
    @close="close"
  >
    <div class="rename-form">
      <p>当前文件名: {{ oldName }}</p>
      <input 
        v-model="newName" 
        type="text" 
        class="form-input"
        placeholder="输入新文件名"
        style="width: 100%; margin: 1rem 0; padding: 0.5rem;"
        @keyup.enter="confirm"
      >
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="close">取消</button>
        <button class="btn btn-primary" @click="confirm">确定</button>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import Modal from '@/components/Modal.vue'
import { useFileStore } from '@/store'

const fileStore = useFileStore()
const visible = ref(false)
const oldPath = ref('')
const oldName = ref('')
const newName = ref('')

const show = (path: string) => {
  oldPath.value = path
  oldName.value = path.split('/').pop() || ''
  newName.value = oldName.value
  visible.value = true
}

const close = () => {
  visible.value = false
  oldPath.value = ''
  oldName.value = ''
  newName.value = ''
}

const confirm = async () => {
  try {
    const newPath = oldPath.value.replace(oldName.value, newName.value)
    await fileStore.renameFile(oldPath.value, newPath)
    close()
    // Emit event to notify parent component
    emit('renameComplete')
  } catch (error) {
    console.error('Failed to rename file:', error)
  }
}

const emit = defineEmits<{
  (e: 'renameComplete'): void
}>()

// Expose method to parent component
defineExpose({
  show
})

// Close modal when Escape key is pressed
watch(visible, (newVal) => {
  if (newVal) {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close()
      }
    }
    document.addEventListener('keydown', handleEsc)
    
    // Clean up event listener
    return () => {
      document.removeEventListener('keydown', handleEsc)
    }
  }
})
</script>

<style scoped>
.rename-form p {
  margin: 0 0 1rem 0;
  color: #333333;
}

.form-input {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

.form-input:focus {
  outline: none;
  border-color: #1976d2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
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
</style>