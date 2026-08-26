<template>
  <Modal
    :visible="visible"
    :title="t('fileRename.title')"
    width="400px"
    :locked="isSubmitting"
    @close="close"
  >
    <div class="rename-form">
      <input
        ref="nameInputRef"
        v-model="newName"
        type="text"
        class="form-input"
        :class="{ invalid: Boolean(errorMessage) }"
        :placeholder="t('fileRename.placeholder')"
        :aria-label="t('fileRename.newName')"
        :aria-invalid="Boolean(errorMessage)"
        :aria-describedby="errorMessage ? 'rename-error' : undefined"
        autocomplete="off"
        spellcheck="false"
        @keydown.enter.prevent="confirm"
      >
      <p
        v-if="errorMessage"
        id="rename-error"
        class="form-error"
        role="alert"
      >
        {{ errorMessage }}
      </p>
    </div>
    <template #footer>
      <div class="rename-actions">
        <button
          class="btn btn-secondary"
          :disabled="isSubmitting"
          @click="close"
        >
          {{ t('fileRename.cancel') }}
        </button>
        <button
          class="btn btn-primary"
          :disabled="isSubmitting"
          @click="confirm"
        >
          {{ t('fileRename.confirm') }}
        </button>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Modal from '@/components/Modal.vue'
import { useFileStore } from '@/store'
import { getApiErrorMessage } from '@shared/utils/apiErrorMessage'
import {
  getRenamePathInvalidReason,
  type RenamePathInvalidReason
} from '@shared/utils/fileName'

const { t } = useI18n()

const fileStore = useFileStore()
const visible = ref(false)
const oldPath = ref('')
const newName = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)
const nameInputRef = ref<HTMLInputElement | null>(null)

const validationMessageKeys: Record<RenamePathInvalidReason, string> = {
  empty: 'fileRename.errors.empty',
  pathSeparator: 'fileRename.errors.pathSeparator',
  controlCharacter: 'fileRename.errors.controlCharacter',
  relativeComponent: 'fileRename.errors.relativeComponent',
  invalidParentPath: 'fileRename.errors.invalidParentPath',
  differentDirectory: 'fileRename.errors.differentDirectory'
}

const show = (path: string) => {
  oldPath.value = path
  newName.value = path.split('/').pop() || ''
  errorMessage.value = ''
  visible.value = true
}

const close = () => {
  if (isSubmitting.value) return
  visible.value = false
  oldPath.value = ''
  newName.value = ''
  errorMessage.value = ''
  isSubmitting.value = false
}

const confirm = async () => {
  if (isSubmitting.value) return

  try {
    const lastSlash = oldPath.value.lastIndexOf('/')
    const newPath = lastSlash >= 0
      ? `${oldPath.value.substring(0, lastSlash + 1)}${newName.value}`
      : newName.value

    const invalidReason = getRenamePathInvalidReason(oldPath.value, newPath)
    if (invalidReason) {
      errorMessage.value = t(validationMessageKeys[invalidReason])
      nameInputRef.value?.focus()
      return
    }

    isSubmitting.value = true
    errorMessage.value = ''
    await fileStore.renameFile(oldPath.value, newPath)
    isSubmitting.value = false
    close()
    // Emit event to notify parent component
    emit('renameComplete')
  } catch (error) {
    console.error('Failed to rename file:', error)
    errorMessage.value = getApiErrorMessage(error, t('fileRename.errors.failed'))
    nameInputRef.value?.focus()
  } finally {
    isSubmitting.value = false
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
watch(visible, (newVal, _oldValue, onCleanup) => {
  if (newVal) {
    void nextTick(() => nameInputRef.value?.focus())

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close()
      }
    }
    document.addEventListener('keydown', handleEsc)

    // Clean up event listener
    onCleanup(() => {
      document.removeEventListener('keydown', handleEsc)
    })
  }
})

watch(newName, () => {
  errorMessage.value = ''
})
</script>

<style scoped>
.form-input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.5rem 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  color: #333333;
}

.form-input:focus {
  outline: none;
  border-color: #1976d2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
}

.form-input.invalid,
.form-input.invalid:focus {
  border-color: #d32f2f;
  box-shadow: 0 0 0 2px rgba(211, 47, 47, 0.15);
}

.form-error {
  margin: 0.5rem 0 0;
  color: #d32f2f;
  font-size: 0.8125rem;
}

.rename-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  width: 100%;
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

.btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
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

/* 暗色主题样式 */
.dark-theme .form-input {
  background-color: #3d3d3d;
  border-color: #555555;
  color: #e0e0e0;
}

.dark-theme .form-input:focus {
  border-color: #1976d2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.3);
}

.dark-theme .form-input.invalid,
.dark-theme .form-input.invalid:focus {
  border-color: #ef5350;
  box-shadow: 0 0 0 2px rgba(239, 83, 80, 0.2);
}

.dark-theme .form-error {
  color: #ef9a9a;
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

.dark-theme .btn-primary {
  background-color: #1976d2;
  border-color: #1976d2;
  color: #ffffff;
}

.dark-theme .btn-primary:hover {
  background-color: #1565c0;
  border-color: #1565c0;
}

@media (max-width: 768px) {
  .rename-actions .btn {
    flex: 1;
    white-space: nowrap;
  }
}
</style>
