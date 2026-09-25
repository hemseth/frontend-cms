<script setup lang="ts">
/**
 * Monthly leave overview: one row per staff member, one column per day.
 *
 * Presentational and fully controlled. The backend has no leave model, so the
 * records arrive as a prop and clicks are reported as events; nothing here
 * stores anything.
 */
import { computed } from 'vue'
import type { StaffRef } from '~/types/hr'
import type { LeaveRecord, LeaveType } from '~/utils/leave'

const props = withDefaults(defineProps<{
  staff: StaffRef[]
  leaves: LeaveRecord[]
  /** `YYYY-MM`. */
  period: string
  /** `YYYY-MM-DD` public holidays. Cambodia's move with the lunar calendar, so they are supplied, not hard-coded. */
  holidays?: string[]
  /** Optional annual leave inputs per staff id, for the balance column. */
  balances?: Record<string, { carriedOver?: number, monthsServed: number, takenThisYear?: number }>
  /** Make each day cell a button that emits `select-day`. */
  clickable?: boolean
}>(), {
  holidays: () => [],
  balances: () => ({}),
  clickable: false
})

const emit = defineEmits<{
  'update:period': [period: string]
  'select-day': [payload: { staffId: string, date: string }]
}>()

const { t, locale } = useI18n()

const TYPE_CLASS: Record<LeaveType, string> = {
  annual: 'bg-info/25 text-info',
  sick: 'bg-warning/25 text-warning',
  maternity: 'bg-secondary/25 text-secondary',
  paternity: 'bg-primary/25 text-primary',
  unpaid: 'bg-neutral/25 text-muted',
  other: 'bg-neutral/25 text-muted'
}

const TYPE_LETTER: Record<LeaveType, string> = {
  annual: 'A',
  sick: 'S',
  maternity: 'M',
  paternity: 'P',
  unpaid: 'U',
  other: 'O'
}

const today = new Date()
const parsed = computed(() => parsePeriod(props.period) ?? { year: today.getFullYear(), month: today.getMonth() + 1 })
const dayCount = computed(() => daysInMonth(parsed.value.year, parsed.value.month))
const holidaySet = computed(() => new Set(props.holidays))
const grid = computed(() => buildMonthGrid(props.leaves, parsed.value.year, parsed.value.month))

interface DayHeader {
  day: number
  iso: string
  weekday: number
  isSunday: boolean
  isHoliday: boolean
}

const days = computed<DayHeader[]>(() =>
  Array.from({ length: dayCount.value }, (_, i) => {
    const date = new Date(parsed.value.year, parsed.value.month - 1, i + 1)
    const iso = toIsoDate(date)
    return { day: i + 1, iso, weekday: date.getDay(), isSunday: date.getDay() === 0, isHoliday: holidaySet.value.has(iso) }
  })
)

const periodText = computed(() => periodLabel(props.period, locale.value === 'km' ? 'km' : 'en'))

function move(delta: number) {
  const date = new Date(parsed.value.year, parsed.value.month - 1 + delta, 1)
  emit('update:period', `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)
}

function leaveOn(staffId: string, day: number): LeaveType | null {
  return grid.value.get(String(staffId))?.[day - 1] ?? null
}

function cellClass(staffId: string, header: DayHeader): string {
  const type = leaveOn(staffId, header.day)
  if (type) return TYPE_CLASS[type]
  if (header.isHoliday) return 'bg-success/10'
  if (header.isSunday) return 'bg-elevated'
  return ''
}

function daysTaken(staffId: string): number {
  return leaveDaysInMonth(props.leaves, staffId, parsed.value.year, parsed.value.month, props.holidays)
}

function availableAnnual(staffId: string): number | null {
  const b = props.balances[String(staffId)]
  if (!b) return null
  return annualLeaveBalance({ carriedOver: b.carriedOver, monthsServed: b.monthsServed, taken: b.takenThisYear }).available
}

function staffName(person: StaffRef): string {
  return locale.value === 'km' ? (person.nameKh || person.nameEn || '-') : (person.nameEn || person.nameKh || '-')
}

function staffSubName(person: StaffRef): string {
  const other = locale.value === 'km' ? person.nameEn : person.nameKh
  return other && other !== staffName(person) ? other : ''
}

function cellTitle(person: StaffRef, header: DayHeader): string {
  const type = leaveOn(person._id, header.day)
  const when = formatIsoDmy(header.iso)
  if (type) return `${staffName(person)} · ${t(`hr.leave_${type}`)} · ${when}`
  if (header.isHoliday) return `${t('hr.publicHoliday')} · ${when}`
  return when
}

const hasAnyBalance = computed(() => Object.keys(props.balances).length > 0)
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between gap-2 flex-wrap">
      <h3 class="font-semibold flex items-center gap-2">
        <UIcon name="i-lucide-calendar-days" class="w-5 h-5 text-primary" />
        {{ t('hr.leaveCalendar') }}
      </h3>

      <div class="flex items-center gap-1">
        <UButton
          icon="i-lucide-chevron-left"
          color="neutral"
          variant="ghost"
          size="sm"
          :aria-label="t('hr.previousMonth')"
          @click="move(-1)"
        />
        <span class="min-w-32 text-center text-sm font-medium">{{ periodText }}</span>
        <UButton
          icon="i-lucide-chevron-right"
          color="neutral"
          variant="ghost"
          size="sm"
          :aria-label="t('hr.nextMonth')"
          @click="move(1)"
        />
      </div>
    </div>

    <!-- Legend -->
    <div class="flex items-center gap-x-4 gap-y-1 flex-wrap text-xs">
      <span v-for="(cls, type) in TYPE_CLASS" :key="type" class="inline-flex items-center gap-1.5">
        <span class="inline-flex w-5 h-5 items-center justify-center rounded text-[10px] font-bold" :class="cls">
          {{ TYPE_LETTER[type] }}
        </span>
        {{ t(`hr.leave_${type}`) }}
      </span>
      <span class="inline-flex items-center gap-1.5">
        <span class="inline-block w-5 h-5 rounded bg-success/10 border border-success/40" />
        {{ t('hr.publicHoliday') }}
      </span>
      <span class="inline-flex items-center gap-1.5">
        <span class="inline-block w-5 h-5 rounded bg-elevated border border-default" />
        {{ t('hr.restDay') }}
      </span>
    </div>

    <p v-if="!staff.length" class="text-sm text-muted py-6 text-center">
      {{ t('hr.noStaff') }}
    </p>

    <div v-else class="overflow-x-auto rounded-lg border border-default">
      <table class="w-full text-xs border-collapse">
        <thead>
          <tr class="bg-elevated/50">
            <th scope="col" class="sticky left-0 z-10 bg-elevated text-left px-3 py-2 min-w-44">
              {{ t('hr.employee') }}
            </th>
            <th
              v-for="header in days"
              :key="header.day"
              scope="col"
              class="px-0 py-1 w-7 min-w-7 text-center font-medium"
              :class="header.isHoliday ? 'bg-success/10' : header.isSunday ? 'bg-elevated' : ''"
              :title="formatIsoDmy(header.iso)"
            >
              <div>{{ header.day }}</div>
              <div class="text-[9px] text-muted">
                {{ t(`hr.dayShort_${header.weekday}`) }}
              </div>
            </th>
            <th scope="col" class="px-2 py-2 text-center whitespace-nowrap">
              {{ t('hr.daysTaken') }}
            </th>
            <th v-if="hasAnyBalance" scope="col" class="px-2 py-2 text-center whitespace-nowrap">
              {{ t('hr.annualBalance') }}
            </th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="person in staff" :key="person._id" class="border-t border-default">
            <th scope="row" class="sticky left-0 z-10 bg-default text-left font-normal px-3 py-1.5">
              <div class="font-medium truncate">
                {{ staffName(person) }}
              </div>
              <div v-if="staffSubName(person)" class="text-[10px] text-muted truncate">
                {{ staffSubName(person) }}
              </div>
            </th>

            <td
              v-for="header in days"
              :key="header.day"
              class="p-0 text-center border-s border-default/40"
              :class="cellClass(person._id, header)"
              :title="cellTitle(person, header)"
            >
              <button
                v-if="clickable"
                type="button"
                class="w-full h-7 font-bold hover:ring-1 hover:ring-primary rounded-sm"
                :aria-label="cellTitle(person, header)"
                @click="emit('select-day', { staffId: person._id, date: header.iso })"
              >
                {{ leaveOn(person._id, header.day) ? TYPE_LETTER[leaveOn(person._id, header.day)!] : '' }}
              </button>
              <span v-else class="block h-7 leading-7 font-bold">
                {{ leaveOn(person._id, header.day) ? TYPE_LETTER[leaveOn(person._id, header.day)!] : '' }}
              </span>
            </td>

            <td class="px-2 text-center tabular-nums font-medium">
              {{ daysTaken(person._id) }}
            </td>
            <td
              v-if="hasAnyBalance"
              class="px-2 text-center tabular-nums font-medium"
              :class="(availableAnnual(person._id) ?? 0) < 0 ? 'text-error' : ''"
            >
              {{ availableAnnual(person._id) ?? '-' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="staff.length && !leaves.length" class="text-xs text-muted">
      {{ t('hr.noLeaveData') }}
    </p>
  </div>
</template>
