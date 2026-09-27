<script setup lang="ts">
import { ref, computed } from 'vue'
import type { StaffRef } from '~/types/hr'
import type { OvertimeRow } from '~/types/hrLeave'

/** HR overtime: requests to decide, record overtime for staff, approved totals for the month. */
const { t, locale } = useI18n()
const toast = useToast()
const auth = useAuth()
const canCreate = computed(() => auth.can('overtime', 'create'))
const canApprove = computed(() => auth.can('overtime', 'approve'))
const canUpdate = computed(() => auth.can('overtime', 'update'))

const { data: staffRes } = await useAsyncData('ot-staff', () => $api<{ data: { data: StaffRef[] } }>('/staff', { params: { limit: 500 } }))
const staff = computed(() => (staffRes.value as { data?: { data?: StaffRef[] } })?.data?.data || [])
const staffNames = computed(() => Object.fromEntries(staff.value.map(s => [s._id, (locale.value === 'km' ? s.nameKh || s.nameEn : s.nameEn || s.nameKh) || ''])))
const staffOptions = computed(() => staff.value.map(s => ({ label: staffNames.value[s._id] || s._id, value: s._id })))

const statusFilter = ref('pending')
const month = ref(clinicToday().slice(0, 7))
const statusOptions = computed(() => ['pending', 'approved', 'rejected', 'cancelled'].map(value => ({ label: t(`hr.leave.status.${value}`), value })))
const { data, refresh } = await useAsyncData('ot-list', () => $api<{ data: OvertimeRow[] }>('/overtime', {
  params: { status: statusFilter.value, from: `${month.value}-01`, to: `${month.value}-31` }
}), { watch: [statusFilter, month] })
const rows = computed(() => (data.value as { data?: OvertimeRow[] })?.data || [])
const totals = computed(() => {
  if (statusFilter.value !== 'approved') return []
  const byStaff = new Map<string, number>()
  for (const r of rows.value) byStaff.set(r.staffId, (byStaff.get(r.staffId) || 0) + r.minutes)
  return [...byStaff.entries()].map(([staffId, minutes]) => ({ staffId, minutes }))
})

const busyId = ref('')
const creating = ref(false)
const showNew = ref(false)
async function decide(row: { _id: string }, decision: 'approve' | 'reject') {
  const note = decision === 'reject' ? window.prompt(t('hr.leave.rejectReason')) ?? undefined : undefined
  if (decision === 'reject' && note === undefined) return
  busyId.value = row._id
  try {
    await $api(`/overtime/${row._id}/approve`, { method: 'POST', body: { decision, ...(note ? { note } : {}) } })
    await refresh()
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
    await $api(`/overtime/${row._id}/cancel`, { method: 'PUT' })
    await refresh()
  } catch (error) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(error, t('messages.errorOccurred')), color: 'error' })
  } finally {
    busyId.value = ''
  }
}
async function create(body: Record<string, unknown>) {
  creating.value = true
  try {
    await $api('/overtime', { method: 'POST', body })
    toast.add({ title: t('hr.ot.requested'), color: 'success' })
    showNew.value = false
    await refresh()
  } catch (error) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(error, t('messages.errorOccurred')), color: 'error' })
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <UBreadcrumb :items="[{ label: t('nav.home'), to: '/' }, { label: t('hr.ot.title') }]" />
    <UCard>
      <div class="space-y-3">
        <div class="flex flex-wrap items-center gap-2">
          <UInput v-model="month" type="month" />
          <USelect v-model="statusFilter" :items="statusOptions" class="w-40" />
          <UButton
            v-if="canCreate"
            class="ml-auto"
            icon="i-lucide-plus"
            :label="t('hr.ot.new')"
            @click="showNew = !showNew"
          />
        </div>
        <div v-if="showNew" class="rounded-lg bg-muted p-3">
          <HrRequestForm
            kind="overtime"
            :staff-options="staffOptions"
            :busy="creating"
            @submit="create"
          />
        </div>
        <HrLeaveRequestList
          kind="overtime"
          :rows="rows"
          :staff-names="staffNames"
          :can-decide="canApprove"
          :can-cancel="(row) => canUpdate && ['pending', 'approved'].includes(row.status)"
          :busy-id="busyId"
          @decide="decide"
          @cancel="cancel"
        />
        <div v-if="totals.length" class="rounded-lg border border-default p-3">
          <p class="mb-2 text-sm font-medium">
            {{ t('hr.ot.approvedTotals') }}
          </p>
          <p v-for="row in totals" :key="row.staffId" class="text-sm">
            {{ staffNames[row.staffId] }}: <strong>{{ formatMinutes(row.minutes) }}</strong>
          </p>
        </div>
        <p class="text-xs text-muted">
          {{ t('hr.ot.help') }}
        </p>
      </div>
    </UCard>
  </div>
</template>
