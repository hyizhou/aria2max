<template>
  <div class="setting-item">
    <div class="setting-row">
      <div class="setting-info">
        <label :for="settingId" class="setting-label">{{ label }}</label>
        <span v-if="keyName" class="setting-key">({{ keyName }})</span>
        <button 
          v-if="helpText"
          type="button" 
          class="help-button" 
          :title="helpText"
        >?</button>
      </div>
      
      <!-- 文本输入 -->
      <div v-if="type === 'text'" class="input-group">
        <input
          :id="settingId"
          :value="modelValue"
          @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
          type="text"
          class="form-control setting-input"
          :placeholder="placeholder"
        />
      </div>
      
      <!-- 密码输入 -->
      <div v-else-if="type === 'password'" class="input-group">
        <input
          :id="settingId"
          :value="modelValue"
          @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
          type="password"
          class="form-control setting-input"
          :placeholder="placeholder"
        />
      </div>
      
      <!-- 数字输入 -->
      <div v-else-if="type === 'number'" class="input-group">
        <input
          :id="settingId"
          :value="modelValue"
          @input="$emit('update:modelValue', parseInt(($event.target as HTMLInputElement).value))"
          type="number"
          class="form-control setting-input"
          :placeholder="placeholder"
          :min="min"
          :max="max"
        />
      </div>
      
      <!-- 开关类型 -->
      <div v-else-if="type === 'boolean'" class="toggle-button-group">
        <label class="toggle-switch">
          <input
            :id="settingId"
            :checked="modelValue"
            @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
            type="checkbox"
          />
          <span class="toggle-slider"></span>
        </label>
      </div>
      
      <!-- 选择框 -->
      <div v-else-if="type === 'select'" class="input-group">
        <select
          :id="settingId"
          :value="modelValue"
          @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
          class="form-control setting-input"
        >
          <option v-for="option in options" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Option {
  value: string | number
  label: string
}

interface Props {
  label: string
  type: 'text' | 'password' | 'number' | 'boolean' | 'select'
  modelValue: any
  keyName?: string
  helpText?: string
  placeholder?: string
  min?: number
  max?: number
  options?: Option[]
}

const props = withDefaults(defineProps<Props>(), {
  helpText: '',
  placeholder: '',
  min: undefined,
  max: undefined,
  options: () => []
})

defineEmits<{
  'update:modelValue': [value: any]
}>()

const settingId = computed(() => `setting-${Math.random().toString(36).substr(2, 9)}`)
</script>

<style scoped>
.setting-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.setting-row {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* 桌面端栅格布局 - 匹配AddTask.vue样式 */
@media (min-width: 769px) {
  .setting-row {
    display: grid;
    grid-template-columns: 2fr 3fr;
    gap: 1rem;
    align-items: center;
  }
}

.setting-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.setting-label {
  font-weight: 500;
  color: #666666;
  margin-bottom: 0;
}

.setting-key {
  font-size: 0.8rem;
  color: #999999;
  font-weight: normal;
}

.input-group {
  width: 100%;
}

.setting-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.2s ease;
  box-sizing: border-box;
}

.setting-input:focus {
  outline: none;
  border-color: #1976d2;
  box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.2);
}

.help-button {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: #e0e0e0;
  border: none;
  color: #666666;
  font-size: 12px;
  font-weight: bold;
  cursor: help;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.help-button:hover {
  background-color: #1976d2;
  color: white;
}

/* 悬停提示样式 - 匹配AddTask.vue效果 */
.help-button[title]:hover::after {
  content: attr(title);
  position: absolute;
  background-color: #333;
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
  white-space: nowrap;
  z-index: 1000;
  margin-top: 40px;
  margin-left: -20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.toggle-button-group {
  display: flex;
  align-items: center;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: 0.4s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: 0.4s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background-color: #1976d2;
}

input:checked + .toggle-slider:before {
  transform: translateX(26px);
}
</style>