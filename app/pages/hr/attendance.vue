<script setup lang="ts">
import { ref } from 'vue'

/** HR attendance: the day board, the monthly timesheet and shift set-up (attendance:read). */
const { t } = useI18n()
const tab = ref('daily')
const tabs = [
  { label: t('hr.attendance.tabs.daily'), value: 'daily', slot: 'daily' as const, icon: 'i-lucide-calendar-check' },
  { label: t('hr.attendance.tabs.roster'), value: 'roster', slot: 'roster' as const, icon: 'i-lucide-calendar-range' },
  { label: t('hr.attendance.tabs.timesheet'), value: 'timesheet', slot: 'timesheet' as const, icon: 'i-lucide-table' },
  { label: t('hr.attendance.tabs.shifts'), value: 'shifts', slot: 'shifts' as const, icon: 'i-lucide-clock' }
]
const daily = ref<{ refreshShifts: () => void } | null>(null)
</script>

<template>
  <div class="space-y-4">
    <UBreadcrumb :items="[{ label: t('nav.home'), to: '/' }, { label: t('hr.attendance.title') }]" />
    <UCard>
      <UTabs v-model="tab" :items="tabs" :unmount-on-hide="false">
        <template #daily>
          <div class="pt-4">
            <HrAttendanceDaily ref="daily" />
          </div>
        </template>
        <template #roster>
          <div class="pt-4">
            <HrRosterPanel />
          </div>
        </template>
        <template #timesheet>
          <div class="pt-4">
            <HrAttendanceTimesheet />
          </div>
        </template>
        <template #shifts>
          <div class="pt-4">
            <HrShiftManager @changed="daily?.refreshShifts()" />
          </div>
        </template>
      </UTabs>
    </UCard>
  </div>
</template>
