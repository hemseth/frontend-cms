<script setup lang="ts">
import { ref, computed } from 'vue'
import type { StaffMember } from '~/utils/staffProfile'

/**
 * One day for every staff member: shift, clock in/out, breaks, worked, late, status. HR records or
 * corrects a day (PUT /attendance); every correction is audited on the server.
 */
interface AttendanceRecord {
  _id: string
  staffId: string
  date: string
  shiftId?: string
  clockIn?: string
  clockOut?: string
  breaks: Array<{ type: string, start: string, end?: string }>
  status: string
  workedMinutes: number
  lateMinutes: number
  earlyLeaveMinutes: number
  overtimeMinutes: number
  source: string
  note?: string
}
interface Shift { _id: string, code: string, nameEn: string, nameKh?: string, startTime: string, endTime: string, status: string }

const { t, locale } = useI18n()
const toast = useToast()
const auth = useAuth()
const canEdit = computed(() => auth.can('attendance', 'update'))
const date = ref(clinicToday())

// Exposed before the awaits below (Vue does not allow defineExpose after an await).
let reloadShifts: () => Promise<void> = async () => {}
defineExpose({ refreshShifts: () => reloadShifts() })

const { data: staffRes } = await useAsyncData('hr-att-staff', () => $api<{ data: { data: StaffMember[] } }>('/staff', { params: { limit: 500 } }))
const { data: shiftRes, refresh: refreshShifts } = await useAsyncData('hr-att-shifts', () => $api<{ data: Shift[] }>('/shifts'))
reloadShifts = refreshShifts
const { data: dayRes, refresh, status } = await useAsyncData('hr-att-day', () => $api<{ data: AttendanceRecord[] }>('/attendance', { params: { from: date.value, to: date.value } }), { watch: [date] })

const staff = computed(() => (staffRes.value as { data?: { data?: StaffMember[] } })?.data?.data || [])
const shifts = computed(() => (shiftRes.value as { data?: Shift[] })?.data || [])
const records = computed(() => new Map(((dayRes.value as { data?: AttendanceRecord[] })?.data || []).map(r => [r.staffId, r])))
const shiftName = (id?: string) => {
  const s = shifts.value.find(x => x._id === id)
  return s ? `${s.code} ${s.startTime}–${s.endTime}` : ''
}
const name = (s: StaffMember) => (locale.value === 'km' ? s.nameKh || s.nameEn : s.nameEn || s.nameKh) || ''
const rows = computed(() => staff.value.map(s => ({ staff: s, record: records.value.get(s._id) })))
const counts = computed(() => {
  const all = [...records.value.values()]
  return {
    present: all.filter(r => r.status === 'present' || r.status === 'late').length,
    late: all.filter(r => r.status === 'late').length,
    absent: all.filter(r => r.status === 'absent').length,
    leave: all.filter(r => r.status === 'leave').length,
    missing: staff.value.length - all.length
  }
})

// Record / correct
const open = ref(false)
const saving = ref(false)
const form = ref({ staffId: '', staffName: '', shiftId: '', clockIn: '', clockOut: '', lunchStart: '', lunchEnd: '', status: '', note: '' })
const shiftOptions = computed(() => shifts.value.filter(s => s.status === 'active').map(s => ({ label: `${s.code} · ${locale.value === 'km' ? s.nameKh || s.nameEn : s.nameEn} (${s.startTime}–${s.endTime})`, value: s._id })))
const statusOptions = computed(() => ['absent', 'leave', 'holiday', 'off'].map(value => ({ label: t(`hr.attendance.status.${value}`), value })))

function edit(s: StaffMember, r?: AttendanceRecord) {
  const lunch = r?.breaks?.[0]
  form.value = {
    staffId: s._id,
    staffName: name(s),
    shiftId: r?.shiftId || s.shiftId || '',
    clockIn: clinicHm(r?.clockIn),
    clockOut: clinicHm(r?.clockOut),
    lunchStart: clinicHm(lunch?.start),
    lunchEnd: clinicHm(lunch?.end),
    status: r && !r.clockIn && ['absent', 'leave', 'holiday', 'off'].includes(r.status) ? r.status : '',
    note: r?.note || ''
  }
  open.value = true
}

async function save() {
  const f = form.value
  saving.value = true
  try {
    await $api('/attendance', {
      method: 'PUT',
      body: {
        staffId: f.staffId,
        date: date.value,
        ...(f.shiftId ? { shiftId: f.shiftId } : {}),
        ...(f.clockIn ? { clockIn: f.clockIn } : {}),
        ...(f.clockOut ? { clockOut: f.clockOut } : {}),
        ...(f.lunchStart ? { breaks: [{ type: 'lunch', start: f.lunchStart, ...(f.lunchEnd ? { end: f.lunchEnd } : {}) }] } : {}),
        ...(f.status && !f.clockIn ? { status: f.status } : {}),
        ...(f.note.trim() ? { note: f.note.trim() } : {})
      }
    })
    open.value = false
    await refresh()
  } catch (error) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(error, t('messages.errorOccurred')), color: 'error' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-wrap items-center gap-3">
      <UInput v-model="date" type="date" />
      <UBadge color="success" variant="subtle">
        {{ t('hr.attendance.count.present', { n: counts.present }) }}
      </UBadge>
      <UBadge color="warning" variant="subtle">
        {{ t('hr.attendance.count.late', { n: counts.late }) }}
      </UBadge>
      <UBadge color="error" variant="subtle">
        {{ t('hr.attendance.count.absent', { n: counts.absent }) }}
      </UBadge>
      <UBadge color="info" variant="subtle">
        {{ t('hr.attendance.count.leave', { n: counts.leave }) }}
      </UBadge>
      <UBadge color="neutral" variant="outline">
        {{ t('hr.attendance.count.missing', { n: counts.missing }) }}
      </UBadge>
      <UButton
        class="ml-auto"
        size="sm"
        variant="ghost"
        icon="i-lucide-refresh-cw"
        :loading="status === 'pending'"
        :aria-label="t('common.refresh')"
        @click="refresh()"
      />
    </div>
    <div class="overflow-x-auto rounded-lg border border-default">
      <table class="w-full text-sm">
        <thead class="bg-muted text-left">
          <tr>
            <th class="px-3 py-2">
              {{ t('staff.employment.code') }}
            </th>
            <th class="px-3 py-2">
              {{ t('hr.employee') }}
            </th>
            <th class="px-3 py-2">
              {{ t('hr.attendance.shift') }}
            </th>
            <th class="px-3 py-2">
              {{ t('hr.attendance.clockIn') }}
            </th>
            <th class="px-3 py-2">
              {{ t('hr.attendance.clockOut') }}
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
              {{ t('hr.attendance.statusLabel') }}
            </th>
            <th class="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="{ staff: s, record: r } in rows" :key="s._id" class="border-t border-default">
            <td class="px-3 py-2 text-muted">
              {{ s.employeeCode || '–' }}
            </td>
            <td class="px-3 py-2 font-medium">
              {{ name(s) }}
            </td>
            <td class="px-3 py-2 text-xs">
              {{ shiftName(r?.shiftId || s.shiftId) || '–' }}
            </td>
            <td class="px-3 py-2">
              {{ clinicHm(r?.clockIn) || '–' }}
            </td>
            <td class="px-3 py-2">
              {{ clinicHm(r?.clockOut) || '–' }}
            </td>
            <td class="px-3 py-2">
              {{ formatMinutes(r?.workedMinutes) }}
            </td>
            <td class="px-3 py-2" :class="r?.lateMinutes ? 'text-warning' : ''">
              {{ formatMinutes(r?.lateMinutes) }}
            </td>
            <td class="px-3 py-2">
              {{ formatMinutes(r?.overtimeMinutes) }}
            </td>
            <td class="px-3 py-2">
              <UBadge
                v-if="r"
                :color="ATTENDANCE_STATUS_COLOR[r.status] || 'neutral'"
                variant="subtle"
                size="sm"
              >
                {{ t(`hr.attendance.status.${r.status}`) }}
              </UBadge>
              <span v-else class="text-xs text-muted">{{ t('hr.attendance.notRecorded') }}</span>
            </td>
            <td class="px-3 py-2 text-right">
              <UButton
                v-if="canEdit"
                size="xs"
                variant="ghost"
                icon="i-lucide-pencil"
                :aria-label="t('common.edit')"
                @click="edit(s, r)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <UModal v-model:open="open" :title="t('hr.attendance.editTitle', { name: form.staffName, date })">
      <template #body>
        <div class="grid grid-cols-2 gap-3">
          <UFormField :label="t('hr.attendance.shift')" class="col-span-2">
            <USelect
              v-model="form.shiftId"
              :items="shiftOptions"
              :placeholder="t('hr.attendance.noShift')"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('hr.attendance.clockIn')">
            <UInput v-model="form.clockIn" type="time" class="w-full" />
          </UFormField>
          <UFormField :label="t('hr.attendance.clockOut')">
            <UInput v-model="form.clockOut" type="time" class="w-full" />
          </UFormField>
          <UFormField :label="t('hr.attendance.lunchStart')">
            <UInput v-model="form.lunchStart" type="time" class="w-full" />
          </UFormField>
          <UFormField :label="t('hr.attendance.lunchEnd')">
            <UInput v-model="form.lunchEnd" type="time" class="w-full" />
          </UFormField>
          <UFormField :label="t('hr.attendance.dayStatus')" :help="t('hr.attendance.dayStatusHelp')" class="col-span-2">
            <USelect
              v-model="form.status"
              :items="statusOptions"
              :placeholder="t('hr.attendance.fromClock')"
              :disabled="!!form.clockIn"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('hr.attendance.note')" class="col-span-2">
            <UInput v-model="form.note" class="w-full" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            :label="t('common.cancel')"
            @click="open = false"
          />
          <UButton :loading="saving" :label="t('common.save')" @click="save" />
        </div>
      </template>
    </UModal>
  </div>
</template>
