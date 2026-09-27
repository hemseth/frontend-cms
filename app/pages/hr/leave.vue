<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { StaffRef } from '~/types/hr'
import type { LeaveBalanceRow, LeaveRequestRow, LeaveTypeRow } from '~/types/hrLeave'
import type { LeaveRecord } from '~/utils/leave'

/**
 * HR leave: requests (decide, cancel, record for staff), the month calendar, balances per year,
 * leave types and the clinic's working week and public holidays.
 */
const { t, locale } = useI18n()
const toast = useToast()
const auth = useAuth()
const canCreate = computed(() => auth.can('leave', 'create'))
const canApprove = computed(() => auth.can('leave', 'approve'))
const canUpdate = computed(() => auth.can('leave', 'update'))
const canSettings = computed(() => auth.can('settings', 'update'))

const tab = ref('requests')
const tabs = computed(() => [
  { label: t('hr.leave.tabs.requests'), value: 'requests', slot: 'requests' as const, icon: 'i-lucide-inbox' },
  { label: t('hr.leave.tabs.calendar'), value: 'calendar', slot: 'calendar' as const, icon: 'i-lucide-calendar-days' },
  { label: t('hr.leave.tabs.balances'), value: 'balances', slot: 'balances' as const, icon: 'i-lucide-scale' },
  { label: t('hr.leave.tabs.types'), value: 'types', slot: 'types' as const, icon: 'i-lucide-list' },
  { label: t('hr.leave.tabs.settings'), value: 'settings', slot: 'settings' as const, icon: 'i-lucide-calendar-cog' }
])

const { data: staffRes } = await useAsyncData('leave-staff', () => $api<{ data: { data: StaffRef[] } }>('/staff', { params: { limit: 500 } }))
const staff = computed(() => (staffRes.value as { data?: { data?: StaffRef[] } })?.data?.data || [])
const staffNames = computed(() => Object.fromEntries(staff.value.map(s => [s._id, (locale.value === 'km' ? s.nameKh || s.nameEn : s.nameEn || s.nameKh) || ''])))
const staffOptions = computed(() => staff.value.map(s => ({ label: staffNames.value[s._id] || s._id, value: s._id })))
const { data: typesRes, refresh: refreshTypes } = await useAsyncData('leave-types', () => $api<{ data: LeaveTypeRow[] }>('/leave/types'))
const types = computed(() => (typesRes.value as { data?: LeaveTypeRow[] })?.data || [])
const activeTypes = computed(() => types.value.filter(x => x.status === 'active'))

// Requests
const statusFilter = ref('pending_supervisor,pending_hr')
const statusOptions = computed(() => [
  { label: t('hr.leave.filter.pending'), value: 'pending_supervisor,pending_hr' },
  { label: t('hr.leave.status.approved'), value: 'approved' },
  { label: t('hr.leave.status.rejected'), value: 'rejected' },
  { label: t('hr.leave.status.cancelled'), value: 'cancelled' }
])
const { data: reqRes, refresh: refreshRequests } = await useAsyncData('leave-requests', () => $api<{ data: LeaveRequestRow[] }>('/leave/requests', { params: { status: statusFilter.value } }), { watch: [statusFilter] })
const requests = computed(() => (reqRes.value as { data?: LeaveRequestRow[] })?.data || [])
const busyId = ref('')
const creating = ref(false)
const showNew = ref(false)

async function decide(row: { _id: string }, decision: 'approve' | 'reject') {
  const note = decision === 'reject' ? window.prompt(t('hr.leave.rejectReason')) ?? undefined : undefined
  if (decision === 'reject' && note === undefined) return
  busyId.value = row._id
  try {
    await $api(`/leave/requests/${row._id}/approve`, { method: 'POST', body: { decision, ...(note ? { note } : {}) } })
    await refreshRequests()
  } catch (error) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(error, t('messages.errorOccurred')), color: 'error' })
  } finally {
    busyId.value = ''
  }
}
async function cancel(row: { _id: string }) {
  if (!window.confirm(t('hr.leave.cancelConfirm'))) return
  busyId.value = row._id
  try {
    await $api(`/leave/requests/${row._id}/cancel`, { method: 'PUT' })
    await refreshRequests()
  } catch (error) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(error, t('messages.errorOccurred')), color: 'error' })
  } finally {
    busyId.value = ''
  }
}
async function createRequest(body: Record<string, unknown>) {
  creating.value = true
  try {
    await $api('/leave/requests', { method: 'POST', body })
    toast.add({ title: t('hr.leave.requested'), color: 'success' })
    showNew.value = false
    await refreshRequests()
  } catch (error) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(error, t('messages.errorOccurred')), color: 'error' })
  } finally {
    creating.value = false
  }
}

// Calendar
const period = ref(clinicToday().slice(0, 7))
const { data: calRes } = await useAsyncData('leave-calendar', () => $api<{ data: LeaveRecord[] }>('/leave/calendar', { params: { month: period.value } }), { watch: [period] })
const calendarLeaves = computed(() => (calRes.value as { data?: LeaveRecord[] })?.data || [])

// Settings (working week and holidays)
const { data: settingsRes, refresh: refreshSettings } = await useAsyncData('hr-settings', () => $api<{ data: { weekendDays: number[], publicHolidays: Array<{ date: string, name: string }> } }>('/hr-settings'))
const holidays = computed(() => ((settingsRes.value as { data?: { publicHolidays?: Array<{ date: string }> } })?.data?.publicHolidays || []).map(h => h.date))
const settingsForm = ref<{ weekendDays: number[], publicHolidays: Array<{ date: string, name: string }> }>({ weekendDays: [0], publicHolidays: [] })
const savingSettings = ref(false)
watch(settingsRes, (v) => {
  const d = (v as { data?: { weekendDays: number[], publicHolidays: Array<{ date: string, name: string }> } })?.data
  if (d) settingsForm.value = { weekendDays: [...d.weekendDays], publicHolidays: d.publicHolidays.map(h => ({ ...h })) }
}, { immediate: true })
function toggleWeekend(day: number, on: boolean | 'indeterminate') {
  const set = new Set(settingsForm.value.weekendDays)
  if (on === true) set.add(day)
  else set.delete(day)
  settingsForm.value.weekendDays = [...set].sort()
}
async function saveSettings() {
  savingSettings.value = true
  try {
    await $api('/hr-settings', { method: 'PUT', body: { weekendDays: settingsForm.value.weekendDays, publicHolidays: settingsForm.value.publicHolidays.filter(h => h.date && h.name.trim()) } })
    toast.add({ title: t('hr.leave.settingsSaved'), color: 'success' })
    await refreshSettings()
  } catch (error) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(error, t('messages.errorOccurred')), color: 'error' })
  } finally {
    savingSettings.value = false
  }
}

// Balances
const year = ref(Number(clinicToday().slice(0, 4)))
const { data: balRes } = await useAsyncData('leave-balances', () => $api<{ data: LeaveBalanceRow[] }>('/leave/balances', { params: { year: year.value } }), { watch: [year] })
const balanceTypes = computed(() => activeTypes.value.filter(x => x.annualDays > 0 || x.accruesPerMonth))
const balanceByStaff = computed(() => {
  const map = new Map<string, Record<string, LeaveBalanceRow>>()
  for (const b of (balRes.value as { data?: LeaveBalanceRow[] })?.data || []) {
    map.set(b.staffId, { ...(map.get(b.staffId) || {}), [b.leaveTypeId]: b })
  }
  return map
})

// Types
const editingType = ref<Partial<LeaveTypeRow> | null>(null)
const savingType = ref(false)
const categoryOptions = computed(() => ['annual', 'sick', 'maternity', 'paternity', 'unpaid', 'other'].map(value => ({ label: t(`hr.leave_${value}`), value })))
const onlyForOptions = computed(() => ['any', 'female', 'male'].map(value => ({ label: t(`hr.leave.onlyFor.${value}`), value })))
function editType(row?: LeaveTypeRow) {
  editingType.value = row ? { ...row } : { code: '', nameEn: '', nameKh: '', category: 'other', annualDays: 0, payPercent: 100, countCalendarDays: false, requiresDocument: false, onlyFor: 'any', status: 'active' }
}
async function saveType() {
  const { _id, ...body } = editingType.value!
  savingType.value = true
  try {
    const payload = { ...body, nameKh: body.nameKh || undefined, accruesPerMonth: body.accruesPerMonth || undefined }
    if (_id) await $api(`/leave/types/${_id}`, { method: 'PUT', body: payload })
    else await $api('/leave/types', { method: 'POST', body: payload })
    editingType.value = null
    await refreshTypes()
  } catch (error) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(error, t('messages.errorOccurred')), color: 'error' })
  } finally {
    savingType.value = false
  }
}
const typeName = (x: LeaveTypeRow) => (locale.value === 'km' ? x.nameKh || x.nameEn : x.nameEn)
</script>

<template>
  <div class="space-y-4">
    <UBreadcrumb :items="[{ label: t('nav.home'), to: '/' }, { label: t('hr.leave.title') }]" />
    <UCard>
      <UTabs v-model="tab" :items="tabs" :unmount-on-hide="false">
        <template #requests>
          <div class="space-y-3 pt-4">
            <div class="flex flex-wrap items-center gap-2">
              <USelect v-model="statusFilter" :items="statusOptions" class="w-48" />
              <UButton
                v-if="canCreate"
                class="ml-auto"
                icon="i-lucide-plus"
                :label="t('hr.leave.new')"
                @click="showNew = !showNew"
              />
            </div>
            <div v-if="showNew" class="rounded-lg bg-muted p-3">
              <HrRequestForm
                kind="leave"
                :types="activeTypes"
                :staff-options="staffOptions"
                :busy="creating"
                @submit="createRequest"
              />
            </div>
            <HrLeaveRequestList
              kind="leave"
              :rows="requests"
              :types="types"
              :staff-names="staffNames"
              :can-decide="canApprove"
              :can-cancel="(row) => canUpdate && ['pending_supervisor', 'pending_hr', 'approved'].includes(row.status)"
              :busy-id="busyId"
              @decide="decide"
              @cancel="cancel"
            />
          </div>
        </template>

        <template #calendar>
          <div class="pt-4">
            <HrLeaveCalendar
              v-model:period="period"
              :staff="staff"
              :leaves="calendarLeaves"
              :holidays="holidays"
            />
          </div>
        </template>

        <template #balances>
          <div class="space-y-3 pt-4">
            <UInput
              v-model.number="year"
              type="number"
              min="2000"
              max="2100"
              class="w-28"
            />
            <div class="overflow-x-auto rounded-lg border border-default">
              <table class="w-full text-sm">
                <thead class="bg-muted text-left">
                  <tr>
                    <th class="px-3 py-2">
                      {{ t('hr.employee') }}
                    </th>
                    <th v-for="type in balanceTypes" :key="type._id" class="px-3 py-2">
                      {{ typeName(type) }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="person in staff" :key="person._id" class="border-t border-default">
                    <td class="px-3 py-2 font-medium">
                      {{ staffNames[person._id] }}
                    </td>
                    <td v-for="type in balanceTypes" :key="type._id" class="px-3 py-2">
                      <template v-if="balanceByStaff.get(person._id)?.[type._id]">
                        <span class="font-medium">{{ balanceByStaff.get(person._id)![type._id]!.remaining ?? '–' }}</span>
                        <span class="text-xs text-muted"> / {{ balanceByStaff.get(person._id)![type._id]!.entitlement }}</span>
                        <span v-if="balanceByStaff.get(person._id)![type._id]!.pending" class="ml-1 text-xs text-warning">({{ t('hr.leave.pendingDays', { n: balanceByStaff.get(person._id)![type._id]!.pending }) }})</span>
                      </template>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="text-xs text-muted">
              {{ t('hr.leave.balanceHelp') }}
            </p>
          </div>
        </template>

        <template #types>
          <div class="space-y-3 pt-4">
            <div class="flex justify-between">
              <p class="text-sm text-muted">
                {{ t('hr.leave.typesHelp') }}
              </p>
              <UButton
                v-if="canUpdate"
                icon="i-lucide-plus"
                :label="t('hr.leave.addType')"
                @click="editType()"
              />
            </div>
            <ul class="divide-y divide-default rounded-lg border border-default">
              <li
                v-for="type in types"
                :key="type._id"
                class="flex flex-wrap items-center gap-3 px-3 py-2"
                :class="type.status === 'inactive' ? 'opacity-60' : ''"
              >
                <UBadge color="neutral" variant="outline">
                  {{ type.code }}
                </UBadge>
                <span class="font-medium">{{ typeName(type) }}</span>
                <span class="text-xs text-muted">
                  {{ type.accruesPerMonth ? t('hr.leave.accrues', { n: type.accruesPerMonth, max: type.annualDays }) : type.annualDays ? t('hr.leave.perYear', { n: type.annualDays }) : t('hr.leave.noLimit') }}
                  · {{ t('hr.leave.paid', { n: type.payPercent }) }}
                  <template v-if="type.countCalendarDays"> · {{ t('hr.leave.calendarDays') }}</template>
                </span>
                <UButton
                  v-if="canUpdate"
                  class="ml-auto"
                  size="xs"
                  variant="ghost"
                  icon="i-lucide-pencil"
                  :aria-label="t('common.edit')"
                  @click="editType(type)"
                />
              </li>
            </ul>
          </div>
        </template>

        <template #settings>
          <div class="space-y-4 pt-4">
            <div>
              <p class="mb-2 text-sm font-medium">
                {{ t('hr.leave.weekend') }}
              </p>
              <div class="flex flex-wrap gap-3">
                <UCheckbox
                  v-for="d in [1, 2, 3, 4, 5, 6, 0]"
                  :key="d"
                  :model-value="settingsForm.weekendDays.includes(d)"
                  :label="t(`hr.day_${d}`)"
                  :disabled="!canSettings"
                  @update:model-value="(on) => toggleWeekend(d, on)"
                />
              </div>
            </div>
            <div class="space-y-2">
              <p class="text-sm font-medium">
                {{ t('hr.publicHoliday') }}
              </p>
              <div v-for="(h, i) in settingsForm.publicHolidays" :key="i" class="flex flex-wrap items-center gap-2">
                <UInput v-model="h.date" type="date" :disabled="!canSettings" />
                <UInput v-model="h.name" class="min-w-60 flex-1" :disabled="!canSettings" />
                <UButton
                  v-if="canSettings"
                  size="xs"
                  color="error"
                  variant="ghost"
                  icon="i-lucide-x"
                  :aria-label="t('common.delete')"
                  @click="settingsForm.publicHolidays.splice(i, 1)"
                />
              </div>
              <UButton
                v-if="canSettings"
                size="xs"
                variant="soft"
                icon="i-lucide-plus"
                :label="t('hr.leave.addHoliday')"
                @click="settingsForm.publicHolidays.push({ date: '', name: '' })"
              />
            </div>
            <p class="text-xs text-muted">
              {{ t('hr.leave.settingsHelp') }}
            </p>
            <div v-if="canSettings" class="flex justify-end">
              <UButton
                :loading="savingSettings"
                icon="i-lucide-save"
                :label="t('common.save')"
                @click="saveSettings"
              />
            </div>
          </div>
        </template>
      </UTabs>
    </UCard>

    <UModal :open="!!editingType" :title="editingType?._id ? t('hr.leave.editType') : t('hr.leave.addType')" @update:open="(v) => { if (!v) editingType = null }">
      <template #body>
        <div v-if="editingType" class="grid grid-cols-2 gap-3">
          <UFormField :label="t('hr.shift.code')" required>
            <UInput v-model="editingType.code" class="w-full" />
          </UFormField>
          <UFormField :label="t('hr.leave.category')">
            <USelect v-model="editingType.category" :items="categoryOptions" class="w-full" />
          </UFormField>
          <UFormField :label="t('common.nameEn')" required>
            <UInput v-model="editingType.nameEn" class="w-full" />
          </UFormField>
          <UFormField :label="t('common.nameKh')">
            <UInput v-model="editingType.nameKh" class="w-full" />
          </UFormField>
          <UFormField :label="t('hr.leave.annualDays')" :help="t('hr.leave.annualDaysHelp')">
            <UInput
              v-model.number="editingType.annualDays"
              type="number"
              min="0"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('hr.leave.accruesPerMonth')">
            <UInput
              v-model.number="editingType.accruesPerMonth"
              type="number"
              min="0"
              step="0.5"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('hr.leave.payPercent')" :help="t('hr.leave.payPercentHelp')">
            <UInput
              v-model.number="editingType.payPercent"
              type="number"
              min="0"
              max="100"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('hr.leave.onlyForLabel')">
            <USelect v-model="editingType.onlyFor" :items="onlyForOptions" class="w-full" />
          </UFormField>
          <UCheckbox v-model="editingType.countCalendarDays" :label="t('hr.leave.calendarDays')" />
          <UCheckbox v-model="editingType.requiresDocument" :label="t('hr.leave.requiresDocument')" />
          <UCheckbox :model-value="editingType.status !== 'inactive'" :label="t('staff.active')" @update:model-value="(v) => { editingType!.status = v === true ? 'active' : 'inactive' }" />
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            :label="t('common.cancel')"
            @click="editingType = null"
          />
          <UButton :loading="savingType" :label="t('common.save')" @click="saveType" />
        </div>
      </template>
    </UModal>
  </div>
</template>
