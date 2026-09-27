<script setup lang="ts">
import type { LeaveRequestRow, LeaveTypeRow, OvertimeRow } from '~/types/hrLeave'
import { LEAVE_STATUS_COLOR } from '~/types/hrLeave'

/**
 * Leave or overtime requests as a list, for HR, a supervisor's team or the staff member's own.
 * The parent decides what the buttons do; this only shows them when allowed.
 */
const props = defineProps<{
  kind: 'leave' | 'overtime'
  rows: Array<LeaveRequestRow | OvertimeRow>
  types?: LeaveTypeRow[]
  staffNames?: Record<string, string>
  canDecide?: boolean
  canCancel?: (row: LeaveRequestRow | OvertimeRow) => boolean
  busyId?: string
}>()
const emit = defineEmits<{ decide: [row: LeaveRequestRow | OvertimeRow, decision: 'approve' | 'reject'], cancel: [row: LeaveRequestRow | OvertimeRow] }>()
const { t, locale } = useI18n()

const typeName = (id: string) => {
  const type = props.types?.find(x => x._id === id)
  return type ? (locale.value === 'km' ? type.nameKh || type.nameEn : type.nameEn) : ''
}
const pending = (row: LeaveRequestRow | OvertimeRow) => ['pending', 'pending_supervisor', 'pending_hr'].includes(row.status)
const isLeave = (row: LeaveRequestRow | OvertimeRow): row is LeaveRequestRow => props.kind === 'leave'
const when = (row: LeaveRequestRow | OvertimeRow) => isLeave(row)
  ? `${formatIsoDmy(row.fromDate)}${row.toDate !== row.fromDate ? ` – ${formatIsoDmy(row.toDate)}` : ''}${row.halfDay !== 'none' ? ` (${t(`hr.leave.half.${row.halfDay}`)})` : ''}`
  : `${formatIsoDmy((row as OvertimeRow).date)} ${(row as OvertimeRow).startTime}–${(row as OvertimeRow).endTime}`
const amount = (row: LeaveRequestRow | OvertimeRow) => isLeave(row)
  ? t('hr.leave.daysCount', { n: row.days })
  : formatMinutes((row as OvertimeRow).minutes)
const what = (row: LeaveRequestRow | OvertimeRow) => isLeave(row) ? typeName(row.leaveTypeId) : t(`hr.ot.type.${(row as OvertimeRow).type}`)
const lastNote = (row: LeaveRequestRow | OvertimeRow) => [...row.decisions].reverse().find(d => d.note)?.note
</script>

<template>
  <div>
    <p v-if="!rows.length" class="text-sm text-muted">
      {{ t('hr.leave.none') }}
    </p>
    <ul v-else class="divide-y divide-default rounded-lg border border-default">
      <li v-for="row in rows" :key="row._id" class="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
        <span v-if="staffNames" class="font-medium">{{ staffNames[row.staffId] || '–' }}</span>
        <span class="text-sm">{{ what(row) }}</span>
        <span class="text-sm text-muted">{{ when(row) }}</span>
        <UBadge color="neutral" variant="outline" size="sm">
          {{ amount(row) }}
        </UBadge>
        <UBadge :color="LEAVE_STATUS_COLOR[row.status] || 'neutral'" variant="subtle" size="sm">
          {{ t(`hr.leave.status.${row.status}`) }}
        </UBadge>
        <span v-if="row.reason" class="w-full text-xs text-muted sm:w-auto">{{ row.reason }}</span>
        <span v-if="lastNote(row)" class="text-xs italic text-muted">“{{ lastNote(row) }}”</span>
        <div class="ml-auto flex gap-1">
          <template v-if="canDecide && pending(row)">
            <UButton
              size="xs"
              color="success"
              variant="soft"
              icon="i-lucide-check"
              :loading="busyId === row._id"
              :label="t('hr.leave.approve')"
              @click="emit('decide', row, 'approve')"
            />
            <UButton
              size="xs"
              color="error"
              variant="soft"
              icon="i-lucide-x"
              :disabled="busyId === row._id"
              :label="t('hr.leave.reject')"
              @click="emit('decide', row, 'reject')"
            />
          </template>
          <UButton
            v-if="canCancel?.(row)"
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-lucide-ban"
            :disabled="busyId === row._id"
            :label="t('common.cancel')"
            @click="emit('cancel', row)"
          />
        </div>
      </li>
    </ul>
  </div>
</template>
