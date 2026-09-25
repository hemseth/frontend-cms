<script setup lang="ts">
/**
 * Weekly shift roster, Monday to Sunday. Drag a shift from the palette onto a
 * day, drag an assigned shift to move it, or use the menu in each cell (which
 * also works by keyboard and on touch screens, where drag and drop does not).
 *
 * Fully controlled: the backend has no shift model, so assignments arrive as
 * `modelValue` and every change is emitted; nothing here stores anything.
 */
import { computed, ref } from 'vue'
import type { StaffRef } from '~/types/hr'
import type { LeaveRecord } from '~/utils/leave'
import type { RosterAssignment, ShiftDef } from '~/utils/roster'

const props = withDefaults(defineProps<{
  staff: StaffRef[]
  modelValue: RosterAssignment[]
  /** Any date in the week to show; the grid always starts on that week's Monday. */
  weekStart: string
  shifts?: ShiftDef[]
  /** People on leave cannot be rostered on those days. */
  leaves?: LeaveRecord[]
  holidays?: string[]
  readonly?: boolean
  maxWeeklyHours?: number
}>(), {
  shifts: () => DEFAULT_SHIFTS,
  leaves: () => [],
  holidays: () => [],
  readonly: false,
  maxWeeklyHours: DEFAULT_MAX_WEEKLY_HOURS
})

const emit = defineEmits<{
  'update:modelValue': [assignments: RosterAssignment[]]
  'update:weekStart': [date: string]
  'rejected': [payload: { staffId: string, date: string, reason: 'on_leave' | 'unknown_shift' }]
}>()

const { t, locale } = useI18n()

const SHIFT_CLASS: Record<string, string> = {
  MORNING: 'bg-info/20 text-info border-info/40',
  AFTERNOON: 'bg-primary/20 text-primary border-primary/40',
  NIGHT: 'bg-secondary/20 text-secondary border-secondary/40'
}
const FALLBACK_CLASS = 'bg-neutral/20 text-muted border-default'

const MIME = 'application/x-shift'

const dates = computed(() => weekDates(props.weekStart))
const shiftByCode = computed(() => new Map(props.shifts.map(s => [s.code, s])))
const holidaySet = computed(() => new Set(props.holidays))

function chipClass(code: string): string {
  return SHIFT_CLASS[code] ?? FALLBACK_CLASS
}

function pad(hour: number): string {
  return String(Math.floor(hour) % 24).padStart(2, '0')
}

function shiftRange(shift: ShiftDef): string {
  return `${pad(shift.startHour)}-${pad(shift.endHour)}`
}

/** `staffId|date` keys for days a person is on approved or pending leave this week. */
const onLeave = computed(() => {
  const keys = new Set<string>()
  const week = new Set(dates.value)
  for (const leave of props.leaves) {
    if (leave.status === 'rejected') continue
    const start = parseIsoDate(leave.startDate)
    const end = parseIsoDate(leave.endDate)
    if (!start || !end || end < start) continue
    for (let d = start; d <= end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      const iso = toIsoDate(d)
      if (week.has(iso)) keys.add(`${leave.staffId}|${iso}`)
    }
  }
  return keys
})

function isOnLeave(staffId: string, date: string): boolean {
  return onLeave.value.has(`${staffId}|${date}`)
}

function isRestDay(date: string): boolean {
  const d = parseIsoDate(date)
  return !!d && (d.getDay() === 0 || holidaySet.value.has(date))
}

function hoursFor(staffId: string): number {
  return weeklyHours(props.modelValue, staffId, dates.value, props.shifts)
}

function isOver(staffId: string): boolean {
  return hoursFor(staffId) > props.maxWeeklyHours
}

function change(next: RosterAssignment[]) {
  emit('update:modelValue', next)
}

function place(staffId: string, date: string, code: string): boolean {
  if (props.readonly) return false
  if (!shiftByCode.value.has(code)) {
    emit('rejected', { staffId, date, reason: 'unknown_shift' })
    return false
  }
  if (isOnLeave(staffId, date)) {
    emit('rejected', { staffId, date, reason: 'on_leave' })
    return false
  }
  change(assignShift(props.modelValue, staffId, date, code))
  return true
}

function onSelect(event: Event, staffId: string, date: string) {
  const code = (event.target as HTMLSelectElement).value
  if (!code) {
    if (!props.readonly) change(clearShift(props.modelValue, staffId, date))
    return
  }
  // Put the select back to the stored value if the placement was refused.
  if (!place(staffId, date, code)) {
    (event.target as HTMLSelectElement).value = findShift(props.modelValue, staffId, date) ?? ''
  }
}

// ------------------------------------------------------------- drag & drop ---
type DragPayload
  = | { kind: 'palette', shift: string }
    | { kind: 'cell', staffId: string, date: string }

const dragOver = ref('')

function startPaletteDrag(event: DragEvent, shift: string) {
  if (props.readonly || !event.dataTransfer) return
  event.dataTransfer.setData(MIME, JSON.stringify({ kind: 'palette', shift } satisfies DragPayload))
  event.dataTransfer.effectAllowed = 'copy'
}

function startCellDrag(event: DragEvent, staffId: string, date: string) {
  if (props.readonly || !event.dataTransfer) return
  event.dataTransfer.setData(MIME, JSON.stringify({ kind: 'cell', staffId, date } satisfies DragPayload))
  event.dataTransfer.effectAllowed = 'move'
}

/** Drag data comes from outside this component, so it is checked, not trusted. */
function readPayload(event: DragEvent): DragPayload | null {
  const raw = event.dataTransfer?.getData(MIME)
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Partial<DragPayload> & Record<string, unknown>
    if (value.kind === 'palette' && typeof value.shift === 'string') return { kind: 'palette', shift: value.shift }
    if (value.kind === 'cell' && typeof value.staffId === 'string' && typeof value.date === 'string') {
      return { kind: 'cell', staffId: value.staffId, date: value.date }
    }
  } catch {
    // Not ours.
  }
  return null
}

function onDrop(event: DragEvent, staffId: string, date: string) {
  dragOver.value = ''
  const payload = readPayload(event)
  if (!payload || props.readonly) return

  if (payload.kind === 'palette') {
    place(staffId, date, payload.shift)
    return
  }

  if (payload.staffId === staffId && payload.date === date) return
  const code = findShift(props.modelValue, payload.staffId, payload.date)
  if (!code) return
  if (isOnLeave(staffId, date)) {
    emit('rejected', { staffId, date, reason: 'on_leave' })
    return
  }
  change(moveShift(props.modelValue, { staffId: payload.staffId, date: payload.date }, { staffId, date }))
}

function staffName(person: StaffRef): string {
  return locale.value === 'km' ? (person.nameKh || person.nameEn || '-') : (person.nameEn || person.nameKh || '-')
}

function dayMonth(iso: string): string {
  return formatIsoDmy(iso).slice(0, 5)
}

function move(weeks: number) {
  emit('update:weekStart', shiftWeek(props.weekStart, weeks))
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between gap-2 flex-wrap">
      <h3 class="font-semibold flex items-center gap-2">
        <UIcon name="i-lucide-calendar-clock" class="w-5 h-5 text-primary" />
        {{ t('hr.shiftRoster') }}
      </h3>

      <div class="flex items-center gap-1">
        <UButton
          icon="i-lucide-chevron-left"
          color="neutral"
          variant="ghost"
          size="sm"
          :aria-label="t('hr.previousWeek')"
          @click="move(-1)"
        />
        <span class="min-w-40 text-center text-sm font-medium">
          {{ t('hr.weekOf', { date: dates[0] ? formatIsoDmy(dates[0]) : '' }) }}
        </span>
        <UButton
          icon="i-lucide-chevron-right"
          color="neutral"
          variant="ghost"
          size="sm"
          :aria-label="t('hr.nextWeek')"
          @click="move(1)"
        />
      </div>
    </div>

    <!-- Palette -->
    <div v-if="!readonly" class="flex items-center gap-2 flex-wrap">
      <span class="text-xs text-muted">{{ t('hr.dragHint') }}</span>
      <span
        v-for="shift in shifts"
        :key="shift.code"
        draggable="true"
        class="inline-flex items-center gap-1.5 rounded border px-2 py-1 text-xs font-medium cursor-grab active:cursor-grabbing select-none"
        :class="chipClass(shift.code)"
        @dragstart="startPaletteDrag($event, shift.code)"
      >
        {{ t(`hr.shift_${shift.code}`) }}
        <span class="opacity-70">{{ shiftRange(shift) }}</span>
        <UBadge
          v-if="nightHoursOf(shift) > 0"
          color="secondary"
          variant="subtle"
          size="sm"
        >
          {{ t('hr.nightPremium') }}
        </UBadge>
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
              v-for="date in dates"
              :key="date"
              scope="col"
              class="px-2 py-2 text-center min-w-28"
              :class="isRestDay(date) ? 'bg-success/10' : ''"
            >
              <div class="font-medium">
                {{ t(`hr.day_${parseIsoDate(date)?.getDay() ?? 0}`) }}
              </div>
              <div class="text-[10px] text-muted">
                {{ dayMonth(date) }}
                <UBadge
                  v-if="isRestDay(date)"
                  color="success"
                  variant="subtle"
                  size="sm"
                >
                  {{ t('hr.restDayPremium') }}
                </UBadge>
              </div>
            </th>
            <th scope="col" class="px-2 py-2 text-center whitespace-nowrap">
              {{ t('hr.weeklyHours') }}
            </th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="person in staff"
            :key="person._id"
            class="border-t border-default"
            :class="isOver(person._id) ? 'bg-warning/5' : ''"
          >
            <th scope="row" class="sticky left-0 z-10 bg-default text-left font-normal px-3 py-1.5">
              <div class="font-medium truncate">
                {{ staffName(person) }}
              </div>
            </th>

            <td
              v-for="date in dates"
              :key="date"
              class="p-1 align-middle border-s border-default/40"
              :class="[
                isRestDay(date) ? 'bg-success/5' : '',
                dragOver === `${person._id}|${date}` ? 'ring-2 ring-inset ring-primary' : ''
              ]"
              @dragover.prevent="dragOver = `${person._id}|${date}`"
              @dragleave="dragOver = ''"
              @drop.prevent="onDrop($event, person._id, date)"
            >
              <div v-if="isOnLeave(person._id, date)" class="text-center text-[10px] text-muted italic py-2">
                {{ t('hr.onLeave') }}
              </div>

              <template v-else>
                <div
                  v-if="findShift(modelValue, person._id, date)"
                  :draggable="!readonly"
                  class="mb-1 rounded border px-1.5 py-0.5 text-center font-medium select-none"
                  :class="[chipClass(findShift(modelValue, person._id, date)!), readonly ? '' : 'cursor-grab active:cursor-grabbing']"
                  @dragstart="startCellDrag($event, person._id, date)"
                >
                  {{ t(`hr.shift_${findShift(modelValue, person._id, date)}`) }}
                </div>

                <select
                  v-if="!readonly"
                  :value="findShift(modelValue, person._id, date) ?? ''"
                  class="w-full rounded border border-default bg-default px-1 py-0.5 text-[11px]"
                  :aria-label="`${staffName(person)} ${date}`"
                  @change="onSelect($event, person._id, date)"
                >
                  <option value="">
                    {{ t('hr.noShift') }}
                  </option>
                  <option v-for="shift in shifts" :key="shift.code" :value="shift.code">
                    {{ t(`hr.shift_${shift.code}`) }} ({{ shiftRange(shift) }})
                  </option>
                </select>
              </template>
            </td>

            <td class="px-2 text-center tabular-nums whitespace-nowrap">
              <span class="font-medium" :class="isOver(person._id) ? 'text-warning' : ''">
                {{ hoursFor(person._id) }}
              </span>
              <div v-if="isOver(person._id)" class="text-[10px] text-warning">
                {{ t('hr.overHours', { max: maxWeeklyHours }) }}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
