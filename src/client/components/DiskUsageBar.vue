<script setup lang="ts">
// 文件管理页当前目录所在磁盘的紧凑占用展示
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatBytes } from '@shared/utils/format'
import type { DiskUsageInfo } from '@shared/types'

interface Props {
  usage: DiskUsageInfo | null
  loading?: boolean
}

const props = defineProps<Props>()
const { t } = useI18n()

const safePercentage = computed(() => {
  if (!props.usage || props.usage.total <= 0) return 0
  return Math.min(100, Math.max(0, props.usage.percentage))
})
</script>

<template>
  <section class="disk-usage-bar" aria-live="polite">
    <div class="disk-header">
      <div class="disk-title">
        <i class="fas fa-hdd"></i>
        <span>{{ t('files.diskUsage') }}</span>
      </div>
      <span class="disk-partition" :title="usage?.device">{{ usage?.device || '-' }}</span>
    </div>

    <div v-if="loading" class="disk-message">
      {{ t('common.loading') }}
    </div>
    <div v-else-if="!usage || usage.error || usage.total <= 0" class="disk-message">
      {{ usage?.error || t('files.diskUnavailable') }}
    </div>
    <template v-else>
      <div
        class="disk-progress-track"
        role="progressbar"
        :aria-label="`${t('files.diskUsage')} - ${usage.device}`"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="safePercentage"
      >
        <div class="disk-progress-fill" :style="{ width: safePercentage + '%' }"></div>
      </div>

      <div class="disk-values">
        <span>{{ safePercentage }}%</span>
        <span>
          {{ t('files.diskUsed') }} {{ formatBytes(usage.used) }} / {{ formatBytes(usage.total) }}
        </span>
        <span>{{ t('files.diskAvailable') }} {{ formatBytes(usage.free) }}</span>
      </div>
    </template>
  </section>
</template>

<style scoped>
.disk-usage-bar {
  display: grid;
  grid-template-columns: auto minmax(140px, 1fr) auto;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  padding: 0.6rem 0.75rem;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.disk-header {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
  white-space: nowrap;
}

.disk-title {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: #333333;
  font-size: 0.8125rem;
  font-weight: 600;
}

.disk-title i {
  color: #1976d2;
  font-size: 0.875rem;
}

.disk-partition {
  max-width: 12rem;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #666666;
  font-size: 0.75rem;
}

.disk-message {
  grid-column: 2 / -1;
  color: #999999;
  font-size: 0.8125rem;
  text-align: right;
}

.disk-progress-track {
  height: 0.375rem;
  overflow: hidden;
  border-radius: 999px;
  background-color: #eeeeee;
}

.disk-progress-fill {
  height: 100%;
  min-width: 0.25rem;
  border-radius: inherit;
  background-color: #1976d2;
  transition: width 0.2s ease;
}

.disk-values {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.65rem;
  color: #666666;
  font-size: 0.75rem;
  white-space: nowrap;
}

.disk-values > span:first-child {
  color: #333333;
  font-size: 0.8125rem;
  font-weight: 600;
}

@media (max-width: 768px) {
  .disk-usage-bar {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.5rem;
    padding: 0.6rem;
  }

  .disk-header {
    min-width: 0;
  }

  .disk-title span {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .disk-partition {
    max-width: 8rem;
  }

  .disk-message {
    grid-column: 2;
    grid-row: 1;
  }

  .disk-progress-track {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .disk-values {
    grid-column: 1 / -1;
    grid-row: 3;
    justify-content: space-between;
    gap: 0.35rem;
    font-size: 0.6875rem;
    white-space: normal;
  }

  .disk-values > span:nth-child(2) {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.dark-theme .disk-usage-bar {
  background-color: #2d2d2d;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.dark-theme .disk-title,
.dark-theme .disk-values > span:first-child {
  color: #e0e0e0;
}

.dark-theme .disk-title i {
  color: #64b5f6;
}

.dark-theme .disk-progress-fill {
  background-color: #64b5f6;
}

.dark-theme .disk-partition,
.dark-theme .disk-values {
  color: #999999;
}

.dark-theme .disk-progress-track {
  background-color: #3d3d3d;
}
</style>
