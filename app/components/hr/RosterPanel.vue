<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { StaffRef } from '~/types/hr'
import type { LeaveRecord } from '~/utils/leave'
import { weekDates, type RosterAssignment, type ShiftDef } from '~/utils/roster'

/**
 * The weekly roster (ShiftRoster.vue) on the clinic's own shifts: GET /attendance/roster loads a
 * week, "Save roster" sends only the days that changed (PUT /attendance/roster). Attendance then
 * uses the rostered shift for that day ahead of the staff member's default shift.
 */
interface Shift { _id: string, code: string, nameEn: string, nameKh?: string, startTime: string, endTime: string, status: string }
interface Assignment { staffId: string, date: string, shiftId: string }

const props = withDefaults(defineProps<{ leaves?: LeaveRecord[] }>(), { leaves: () => [] })
const { t, locale } = useI18n()
const toast = useToast()
const auth = useAuth()
const canEdit = computed(() => auth.can('attendance', 'update'))

const weekStart = ref(clinicToday())
const { data: staffRes } = await useAsyncData('roster-staff', () => $api<{ data: { data: StaffRef[] } }>('/staff', { params: { limit: 500 } }))
const { data: shiftRes } = await useAsyncData('roster-shifts', () => $api<{ data: Shift[] }>('/shifts'))
const staff = computed(() => (staffRes.value as { data?: { data?: StaffRef[] } })?.data?.data || [])
const shifts = computed(() => ((shiftRes.value as { data?: Shift[] })?.data || []).filter(s => s.status === 'active'))
const hours = (hm: string) => Number(hm.slice(0, 2)) + Number(hm.slice(3, 5)) / 60
const shiftDefs = computed<ShiftDef[]>(() => shifts.value.map(s => ({
  code: s.code,
  startHour: hours(s.startTime),
  endHour: hours(s.endTime),
  label: locale.value === 'km' ? s.nameKh || s.nameEn : s.nameEn
})))
const idByCode = computed(() => new Map(shifts.value.map(s => [s.code, s._id])))
const codeById = computed(() => new Map(shifts.value.map(s => [s._id, s.code])))

const loaded = ref<RosterAssignment[]>([])
const assignments = ref<RosterAssignment[]>([])
const saving = ref(false)
const dates = computed(() => weekDates(weekStart.value))

async function load() {
  const [from, to] = [dates.value[0]!, dates.value[dates.value.length - 1]!]
  try {
    const res: { data: Assignment[] } = await $api('/attendance/roster', { params: { from, to } })
    loaded.value = res.data.map(a => ({ staffId: a.staffId, date: a.date, shift: codeById.value.get(a.shiftId) || '' })).filter(a => a.shift)
    assignments.value = loaded.value.map(a => ({ ...a }))
  } catch (error) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(error, t('messages.errorOccurred')), color: 'error' })
  }
}
watch([dates, codeById], load, { immediate: true })

const key = (a: { staffId: string, date: string }) => `${a.staffId}|${a.date}`
const changes = computed(() => {
  const before = new Map(loaded.value.map(a => [key(a), a.shift]))
  const after = new Map(assignments.value.map(a => [key(a), a.shift]))
  const entries: Array<{ staffId: string, date: string, shiftId: string | null }> = []
  for (const k of new Set([...before.keys(), ...after.keys()])) {
    if (before.get(k) === after.get(k)) continue
    const [staffId, date] = k.split('|') as [string, string]
    const code = after.get(k)
    entries.push({ staffId, date, shiftId: code ? idByCode.value.get(code) ?? null : null })
  }
  return entries
})

async function save() {
  saving.value = true
  try {
    await $api('/attendance/roster', { method: 'PUT', body: { entries: changes.value } })
    toast.add({ title: t('hr.roster.saved', { n: changes.value.length }), color: 'success' })
    await load()
  } catch (error) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(error, t('messages.errorOccurred')), color: 'error' })
  } finally {
    saving.value = false
  }
}

function rejected(payload: { reason: string }) {
  toast.add({ title: t(payload.reason === 'on_leave' ? 'hr.roster.onLeave' : 'hr.roster.unknownShift'), color: 'warning' })
}
</script>

<template>
  <div class="space-y-3">
    <UAlert
      v-if="!shifts.length"
      color="neutral"
      variant="subtle"
      icon="i-lucide-info"
      :description="t('hr.roster.noShifts')"
    />
    <template v-else>
      <HrShiftRoster
        v-model="assignments"
        v-model:week-start="weekStart"
        :staff="staff"
        :shifts="shiftDefs"
        :leaves="props.leaves"
        :readonly="!canEdit"
        @rejected="rejected"
      />
      <div v-if="canEdit" class="flex items-center justify-end gap-3">
        <span v-if="changes.length" class="text-sm text-muted">{{ t('hr.roster.unsaved', { n: changes.length }) }}</span>
        <UButton
          :disabled="!changes.length"
          :loading="saving"
          icon="i-lucide-save"
          :label="t('hr.roster.save')"
          @click="save"
        />
      </div>
    </template>
  </div>
</template>
