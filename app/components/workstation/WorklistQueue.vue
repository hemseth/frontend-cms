<script setup lang="ts">
import { computed } from 'vue'
import StatusChip from './StatusChip.vue'
import WorkstationState from './WorkstationState.vue'
import type { WorklistItem, WorkStatus } from '~/types/workstation'

const props = defineProps<{
  items: WorklistItem[]
  selectedId?: string
  loading?: boolean
  error?: string
  lastUpdated?: Date | null
  now: number
  statuses: WorkStatus[]
}>()
const day = defineModel<string>('day', { required: true })
const status = defineModel<WorkStatus | 'all'>('status', { required: true })
const search = defineModel<string>('search', { required: true })
const emit = defineEmits<{ select: [item: WorklistItem], refresh: [] }>()

const { t } = useI18n()
const statusOptions = computed(() => [
  { label: t('workstation.allStatuses'), value: 'all' },
  ...props.statuses.map(value => ({ label: t(`workstation.status.${value}`), value }))
])
const sexLabel = (gender?: number) => (gender === 2 ? t('workstation.sex.femaleShort') : gender === 1 ? t('workstation.sex.maleShort') : '')
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="space-y-2 border-b border-default p-3">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        :placeholder="t('workstation.searchPlaceholder')"
        class="w-full"
      />
      <div class="flex gap-2">
        <USelect v-model="status" :items="statusOptions" class="flex-1" />
        <UInput
          v-model="day"
          type="date"
          class="w-40"
          :aria-label="t('common.date')"
        />
      </div>
      <div class="flex items-center justify-between text-xs text-muted">
        <span>{{ t('workstation.inQueue', { n: items.length }) }}</span>
        <span class="flex items-center gap-1">
          <template v-if="lastUpdated">{{ t('workstation.updatedAt', { time: lastUpdated.toLocaleTimeString() }) }}</template>
          <UButton
            icon="i-lucide-refresh-cw"
            size="xs"
            variant="ghost"
            color="neutral"
            :loading="loading"
            :aria-label="t('common.refresh')"
            @click="emit('refresh')"
          />
        </span>
      </div>
      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        :title="error"
        class="text-xs"
      />
    </div>

    <div class="flex-1 overflow-y-auto" role="listbox" :aria-label="t('workstation.queue')">
      <WorkstationState v-if="loading && !items.length" state="loading" />
      <WorkstationState v-else-if="!items.length" state="empty" :message="t('workstation.queueEmpty')" />
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        role="option"
        :aria-selected="item.id === selectedId"
        class="flex w-full items-start gap-3 border-b border-default px-3 py-2.5 text-left transition hover:bg-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        :class="item.id === selectedId ? 'bg-elevated' : ''"
        @click="emit('select', item)"
      >
        <span class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {{ item.queueNo || '-' }}
        </span>
        <span class="min-w-0 flex-1">
          <span class="block truncate text-sm font-medium">{{ item.patient.nameKh || item.patient.nameEn || '-' }}</span>
          <span v-if="item.patient.nameKh && item.patient.nameEn" class="block truncate text-xs text-muted">{{ item.patient.nameEn }}</span>
          <span class="block text-xs text-muted">
            <template v-if="ageOf(item.patient.dob) !== null">{{ t('workstation.ageYears', { n: ageOf(item.patient.dob) }) }}</template>
            {{ sexLabel(item.patient.gender) }}
            • {{ t('workstation.waitingMinutes', { n: minutesSince(item.arrivedAt, now) }) }}
          </span>
          <span v-if="item.subtitle" class="block truncate text-xs text-muted">{{ item.subtitle }}</span>
        </span>
        <StatusChip :status="item.status" size="xs" />
      </button>
    </div>
  </div>
</template>
