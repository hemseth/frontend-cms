<template>
  <div
    class="border rounded-xl p-3.5 transition-all shadow-xs relative overflow-hidden font-khmer flex flex-col justify-between"
    :class="statusClasses"
  >
    <!-- Bed Header -->
    <div class="flex items-start justify-between gap-2 pb-2 border-b border-default">
      <div class="flex items-center gap-2">
        <div
          class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs"
          :class="iconBgClass"
        >
          <UIcon name="i-lucide-bed" class="w-5 h-5" />
        </div>
        <div>
          <h4 class="font-bold text-sm text-highlighted">
            គ្រែ {{ bed.bedCode || bed.code }}
          </h4>
          <span class="text-[11px] text-muted">
            {{ roomName || 'បន្ទប់ទូទៅ' }}
          </span>
        </div>
      </div>

      <UBadge
        :color="badgeColor"
        variant="subtle"
        size="xs"
      >
        {{ statusLabel }}
      </UBadge>
    </div>

    <!-- Bed Content (Patient Details if Occupied, or Quick Admit if Available) -->
    <div class="py-2.5 flex-1 flex flex-col justify-center">
      <!-- Occupied State -->
      <div v-if="bed.status === 'occupied' && (bed.patient || bed.currentAdmission)" class="space-y-1.5 text-xs">
        <div class="flex items-center gap-1.5">
          <UIcon name="i-lucide-user" class="w-4 h-4 text-rose-500 shrink-0" />
          <span class="font-bold text-highlighted truncate">
            {{ bed.patient?.nameKh || bed.patient?.nameEn || bed.patient?.name || 'អ្នកជំងឺសម្រាក' }}
          </span>
        </div>
        <div class="text-[11px] text-muted flex items-center gap-2">
          <span>ចូល: {{ formatDate(bed.currentAdmission?.admissionDate || bed.admissionDate) }}</span>
          <span class="font-bold text-rose-600">({{ daysStayed }} ថ្ងៃ)</span>
        </div>
        <div v-if="bed.currentAdmission?.admissionReason" class="text-[11px] text-toned truncate italic">
          {{ bed.currentAdmission?.admissionReason }}
        </div>
      </div>

      <!-- Available State -->
      <div v-else-if="bed.status === 'available'" class="text-center py-2 text-dimmed">
        <UIcon name="i-lucide-bed-double" class="w-6 h-6 mx-auto mb-1 text-emerald-500/60" />
        <span class="text-xs text-emerald-600 dark:text-emerald-400 font-medium">គ្រែទំនេរ អាចទទួលអ្នកជំងឺបាន</span>
      </div>

      <!-- Maintenance State -->
      <div v-else class="text-center py-2 text-dimmed">
        <UIcon name="i-lucide-wrench" class="w-6 h-6 mx-auto mb-1 text-amber-500/60" />
        <span class="text-xs text-amber-600 dark:text-amber-400 font-medium">កំពុងសម្អាត ឬជួសជុល</span>
      </div>
    </div>

    <!-- Bed Footer Action Buttons -->
    <div class="pt-2 border-t border-default flex items-center justify-between gap-1.5">
      <template v-if="bed.status === 'available'">
        <UButton
          label="ដាក់អ្នកជំងឺចូល (Admit)"
          icon="i-lucide-user-plus"
          color="primary"
          size="xs"
          class="w-full"
          @click="$emit('admit', bed)"
        />
      </template>

      <template v-else-if="bed.status === 'occupied'">
        <UButton
          label="ពិនិត្យ (Round)"
          icon="i-lucide-stethoscope"
          color="neutral"
          variant="outline"
          size="xs"
          @click="$emit('round', bed)"
        />
        <UButton
          label="ចេញពីពេទ្យ (Discharge)"
          icon="i-lucide-log-out"
          color="error"
          variant="soft"
          size="xs"
          @click="$emit('discharge', bed)"
        />
      </template>

      <template v-else>
        <UButton
          label="បើកឱ្យប្រើប្រាស់ (Mark Ready)"
          icon="i-lucide-check"
          color="success"
          variant="soft"
          size="xs"
          class="w-full"
          @click="$emit('set-available', bed)"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  bed: any
  roomName?: string
}>()

defineEmits<{
  (e: 'admit', bed: any): void
  (e: 'discharge', bed: any): void
  (e: 'round', bed: any): void
  (e: 'set-available', bed: any): void
}>()

const statusClasses = computed(() => {
  if (props.bed.status === 'occupied') {
    return 'border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10 hover:border-rose-400'
  } else if (props.bed.status === 'maintenance') {
    return 'border-amber-200 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10 hover:border-amber-400'
  }
  return 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10 hover:border-emerald-400'
})

const iconBgClass = computed(() => {
  if (props.bed.status === 'occupied') return 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-200'
  if (props.bed.status === 'maintenance') return 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200'
  return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200'
})

const badgeColor = computed(() => {
  if (props.bed.status === 'occupied') return 'error'
  if (props.bed.status === 'maintenance') return 'warning'
  return 'success'
})

const statusLabel = computed(() => {
  if (props.bed.status === 'occupied') return 'មានអ្នកជំងឺ'
  if (props.bed.status === 'maintenance') return 'កំពុងសម្អាត'
  return 'ទំនេរ'
})

const daysStayed = computed(() => {
  const dateStr = props.bed.currentAdmission?.admissionDate || props.bed.admissionDate
  if (!dateStr) return 1
  const adm = new Date(dateStr)
  const diff = Date.now() - adm.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  return days > 0 ? days + 1 : 1
})

function formatDate(dateStr?: string | Date) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return String(dateStr)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}
</script>

<style scoped>
.font-khmer {
  font-family: 'Battambang', 'Noto Sans Khmer', serif;
}
</style>
