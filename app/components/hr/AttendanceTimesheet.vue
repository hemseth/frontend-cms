<script setup lang="ts">
import { ref, computed } from 'vue'

/** Monthly timesheet per staff member (GET /attendance/timesheet), with an Excel export. */
interface TimesheetRow {
  staffId: string
  employeeCode?: string
  nameEn?: string
  nameKh?: string
  role?: string
  daysRecorded: number
  present: number
  late: number
  incomplete: number
  absent: number
  leave: number
  holiday: number
  off: number
  workedMinutes: number
  lateMinutes: number
  earlyLeaveMinutes: number
  overtimeMinutes: number
  missingMinutes: number
}

const { t, locale } = useI18n()
const month = ref(clinicToday().slice(0, 7))
const { data, status } = await useAsyncData('hr-timesheet', () => $api<{ data: { rows: TimesheetRow[] } }>('/attendance/timesheet', { params: { month: month.value } }), { watch: [month] })
const rows = computed(() => (data.value as { data?: { rows?: TimesheetRow[] } })?.data?.rows || [])
const name = (r: TimesheetRow) => (locale.value === 'km' ? r.nameKh || r.nameEn : r.nameEn || r.nameKh) || ''
const hours = (m: number) => Math.round((m / 60) * 100) / 100

async function exportExcel() {
  await downloadExcel(`Timesheet_${month.value}.xlsx`, month.value, [
    { header: t('staff.employment.code'), key: 'code', width: 12 },
    { header: t('hr.employee'), key: 'name', width: 28 },
    { header: t('staff.role'), key: 'role', width: 16 },
    { header: t('hr.attendance.status.present'), key: 'present', width: 10 },
    { header: t('hr.attendance.status.late'), key: 'late', width: 10 },
    { header: t('hr.attendance.status.absent'), key: 'absent', width: 10 },
    { header: t('hr.attendance.status.leave'), key: 'leave', width: 10 },
    { header: t('hr.attendance.status.off'), key: 'off', width: 10 },
    { header: `${t('hr.attendance.worked')} (h)`, key: 'worked', width: 12 },
    { header: `${t('hr.attendance.late')} (min)`, key: 'lateMin', width: 12 },
    { header: `${t('hr.attendance.earlyLeave')} (min)`, key: 'earlyMin', width: 12 },
    { header: `${t('hr.attendance.overtime')} (h)`, key: 'overtime', width: 12 },
    { header: `${t('hr.attendance.missing')} (h)`, key: 'missing', width: 12 }
  ], rows.value.map(r => ({
    code: r.employeeCode || '', name: name(r), role: r.role || '',
    present: r.present, late: r.late, absent: r.absent, leave: r.leave, off: r.off,
    worked: hours(r.workedMinutes), lateMin: r.lateMinutes, earlyMin: r.earlyLeaveMinutes,
    overtime: hours(r.overtimeMinutes), missing: hours(r.missingMinutes)
  })))
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-wrap items-center gap-3">
      <UInput v-model="month" type="month" />
      <p class="text-xs text-muted">
        {{ t('hr.attendance.timesheetHelp') }}
      </p>
      <UButton
        class="ml-auto"
        size="sm"
        variant="outline"
        icon="i-lucide-file-spreadsheet"
        :label="t('common.export')"
        :disabled="!rows.length"
        @click="exportExcel"
      />
    </div>
    <p v-if="status === 'pending'" class="text-sm text-muted">
      {{ t('common.loading') }}
    </p>
    <div v-else class="overflow-x-auto rounded-lg border border-default">
      <table class="w-full text-sm">
        <thead class="bg-muted text-left">
          <tr>
            <th class="px-3 py-2">
              {{ t('hr.employee') }}
            </th>
            <th class="px-3 py-2">
              {{ t('hr.attendance.status.present') }}
            </th>
            <th class="px-3 py-2">
              {{ t('hr.attendance.status.late') }}
            </th>
            <th class="px-3 py-2">
              {{ t('hr.attendance.status.absent') }}
            </th>
            <th class="px-3 py-2">
              {{ t('hr.attendance.status.leave') }}
            </th>
            <th class="px-3 py-2">
              {{ t('hr.attendance.worked') }}
            </th>
            <th class="px-3 py-2">
              {{ t('hr.attendance.late') }}
            </th>
            <th class="px-3 py-2">
              {{ t('hr.attendance.overtime') }}
            </th>
            <th class="px-3 py-2">
              {{ t('hr.attendance.missing') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.staffId" class="border-t border-default">
            <td class="px-3 py-2">
              <span class="font-medium">{{ name(r) }}</span>
              <span class="ml-1 text-xs text-muted">{{ r.employeeCode }}</span>
            </td>
            <td class="px-3 py-2">
              {{ r.present }}
            </td>
            <td class="px-3 py-2">
              {{ r.late }}
            </td>
            <td class="px-3 py-2">
              {{ r.absent }}
            </td>
            <td class="px-3 py-2">
              {{ r.leave }}
            </td>
            <td class="px-3 py-2">
              {{ formatMinutes(r.workedMinutes) }}
            </td>
            <td class="px-3 py-2">
              {{ formatMinutes(r.lateMinutes) }}
            </td>
            <td class="px-3 py-2">
              {{ formatMinutes(r.overtimeMinutes) }}
            </td>
            <td class="px-3 py-2">
              {{ formatMinutes(r.missingMinutes) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
