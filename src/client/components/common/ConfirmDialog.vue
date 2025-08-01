<template>
  <div class="confirm-overlay" @click="onCancel">
    <div class="confirm-dialog" @click.stop>
      <div class="confirm-header">
        <h3>{{ title }}</h3>
      </div>
      <div class="confirm-body">
        <p>{{ message }}</p>
        <div v-if="checkboxLabel" class="confirm-checkbox">
          <label class="checkbox-label">
            <input 
              type="checkbox" 
              v-model="checkboxValue"
              @change="onCheckboxChange"
            />
            {{ checkboxLabel }}
          </label>
        </div>
      </div>
      <div class="confirm-footer">
        <button class="btn btn-secondary" @click="onCancel">{{ cancelText }}</button>
        <button class="btn" :class="confirmButtonType" @click="onConfirm">{{ confirmText }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  confirmButtonType?: 'btn-danger' | 'btn-primary' | 'btn-secondary'
  checkboxLabel?: string
  initialCheckboxValue?: boolean
}

interface Emits {
  (e: 'confirm'): void
  (e: 'confirmWithCheckbox', checkboxValue: boolean): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  title: '确认',
  confirmText: '确定',
  cancelText: '取消',
  confirmButtonType: 'btn-danger',
  checkboxLabel: undefined,
  initialCheckboxValue: false
})

const emit = defineEmits<Emits>()

const checkboxValue = ref(props.initialCheckboxValue)

const onConfirm = () => {
  if (props.checkboxLabel !== undefined) {
    emit('confirmWithCheckbox', checkboxValue.value)
  } else {
    emit('confirm')
  }
}

const onCancel = () => {
  emit('cancel')
}

const onCheckboxChange = () => {
  // Checkbox value is automatically updated by v-model
}
</script>

<style scoped>
.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.confirm-dialog {
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  width: 90%;
  max-width: 400px;
  overflow: hidden;
}

.confirm-header {
  padding: 1.5rem 1.5rem 0;
}

.confirm-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #333333;
}

.confirm-body {
  padding: 1rem 1.5rem;
}

.confirm-body p {
  margin: 0;
  color: #666666;
  line-height: 1.5;
}

.confirm-checkbox {
  margin-top: 1rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: #333333;
}

.checkbox-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.confirm-footer {
  padding: 1rem 1.5rem 1.5rem;
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.confirm-footer .btn {
  min-width: 80px;
  padding: 0.5rem 1rem;
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

.btn-secondary {
  background-color: #f5f5f5;
  color: #333333;
  border-color: #e0e0e0;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #e0e0e0;
  border-color: #bdbdbd;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-danger {
  background-color: #f44336;
  color: #ffffff;
  border-color: #f44336;
}

.btn-danger:hover:not(:disabled) {
  background-color: #d32f2f;
  border-color: #d32f2f;
}

.btn-primary {
  background-color: #1976d2;
  color: #ffffff;
  border-color: #1976d2;
}

.btn-primary:hover:not(:disabled) {
  background-color: #1565c0;
  border-color: #1565c0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .confirm-dialog {
    width: 95%;
    margin: 0 1rem;
  }
}
</style>