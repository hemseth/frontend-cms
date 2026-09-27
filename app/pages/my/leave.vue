<script setup lang="ts">
import { ref, computed } from 'vue'
import type { LeaveBalanceRow, LeaveRequestRow, LeaveTypeRow, OvertimeRow } from '~/types/hrLeave'

/**
 * Self-service leave and overtime: balances, own requests (cancel while pending), new requests;
 * and, for a supervisor, the team's requests waiting for them (/my/team).
 */
interface MyLeave { requests: LeaveRequestRow[], balances: LeaveBalanceRow[], types: LeaveTypeRow[] }
interface Team { team: Array<{ _id: string, nameEn?: string, nameKh?: string }>, leave: LeaveRequestRow[], overtime: OvertimeRow[] }

const { t, locale } = useI18n()
const toast = useToast()
const leave = ref<MyLeave | null>(null)
const overtime = ref<OvertimeRow[]>([])
const team = ref<Team | null>(null)
const error = ref('')
const busy = ref(false)
const busyId = ref('')

async function load() {
  try {
    const [l, o, tm] = await Promise.all([
      $api<{ data: MyLeave }>('/my/leave'),
      $api<{ data: OvertimeRow[] }>('/my/overtime'),
      $api<{ data: Team }>('/my/team')
    ])
    leave.value = l.data
    overtime.value = o.data
    team.value = tm.data
    error.value = ''
  } catch (err) {
    error.value = getApiErrorMessage(err, t('messages.errorOccurred'))
  }
}
await load()

const balances = computed(() => (leave.value?.balances || []).filter(b => b.entitlement > 0))
const teamNames = computed(() => Object.fromEntries((team.value?.team || []).map(s => [s._id, (locale.value === 'km' ? s.nameKh || s.nameEn : s.nameEn || s.nameKh) || ''])))
const typeName = (code: string) => {
  const x = leave.value?.types.find(tp => tp.code === code)
  return x ? (locale.value === 'km' ? x.nameKh || x.nameEn : x.nameEn) : code
}

async function run(fn: () => Promise<unknown>, done?: string) {
  try {
    await fn()
    if (done) toast.add({ title: done, color: 'success' })
    await load()
    return true
  } catch (err) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(err, t('messages.errorOccurred')), color: 'error' })
    return false
  }
}
async function requestLeave(body: Record<string, unknown>) {
  busy.value = true
  await run(() => $api('/my/leave', { method: 'POST', body }), t('hr.leave.requested'))
  busy.value = false
}
async function requestOvertime(body: Record<string, unknown>) {
  busy.value = true
  await run(() => $api('/my/overtime', { method: 'POST', body }), t('hr.ot.requested'))
  busy.value = false
}
async function cancel(kind: 'leave' | 'overtime', row: { _id: string }) {
  if (!window.confirm(t('hr.leave.cancelConfirm'))) return
  busyId.value = row._id
  await run(() => $api(`/my/${kind}/${row._id}/cancel`, { method: 'PUT' }))
  busyId.value = ''
}
async function decide(kind: 'leave' | 'overtime', row: { _id: string }, decision: 'approve' | 'reject') {
  const note = decision === 'reject' ? window.prompt(t('hr.leave.rejectReason')) ?? undefined : undefined
  if (decision === 'reject' && note === undefined) return
  busyId.value = row._id
  await run(() => $api(`/my/team/${kind}/${row._id}/decide`, { method: 'POST', body: { decision, ...(note ? { note } : {}) } }))
  busyId.value = ''
}
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-4">
    <UBreadcrumb :items="[{ label: t('nav.home'), to: '/' }, { label: t('hr.my.leaveTitle') }]" />
    <UAlert
      v-if="error"
      color="warning"
      variant="subtle"
      icon="i-lucide-info"
      :description="error"
    />
    <template v-else-if="leave">
      <div v-if="balances.length" class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <UCard v-for="b in balances" :key="b.leaveTypeId">
          <p class="text-xs text-muted">
            {{ typeName(b.code) }}
          </p>
          <p class="text-2xl font-bold">
            {{ b.remaining ?? '–' }}<span class="text-sm font-normal text-muted"> / {{ b.entitlement }}</span>
          </p>
          <p v-if="b.pending" class="text-xs text-warning">
            {{ t('hr.leave.pendingDays', { n: b.pending }) }}
          </p>
        </UCard>
      </div>

      <UCard>
        <template #header>
          <h3 class="font-semibold">
            {{ t('hr.my.requestLeave') }}
          </h3>
        </template>
        <HrRequestForm
          kind="leave"
          :types="leave.types"
          :busy="busy"
          @submit="requestLeave"
        />
        <div class="mt-4">
          <HrLeaveRequestList
            kind="leave"
            :rows="leave.requests"
            :types="leave.types"
            :can-cancel="(row) => ['pending_supervisor', 'pending_hr'].includes(row.status)"
            :busy-id="busyId"
            @cancel="(row) => cancel('leave', row)"
          />
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h3 class="font-semibold">
            {{ t('hr.my.requestOvertime') }}
          </h3>
        </template>
        <HrRequestForm kind="overtime" :busy="busy" @submit="requestOvertime" />
        <div class="mt-4">
          <HrLeaveRequestList
            kind="overtime"
            :rows="overtime"
            :can-cancel="(row) => row.status === 'pending'"
            :busy-id="busyId"
            @cancel="(row) => cancel('overtime', row)"
          />
        </div>
      </UCard>

      <UCard v-if="team?.team.length">
        <template #header>
          <h3 class="font-semibold">
            {{ t('hr.my.teamTitle') }}
          </h3>
        </template>
        <div class="space-y-4">
          <HrLeaveRequestList
            kind="leave"
            :rows="team.leave"
            :staff-names="teamNames"
            can-decide
            :busy-id="busyId"
            @decide="(row, d) => decide('leave', row, d)"
          />
          <HrLeaveRequestList
            kind="overtime"
            :rows="team.overtime"
            :staff-names="teamNames"
            can-decide
            :busy-id="busyId"
            @decide="(row, d) => decide('overtime', row, d)"
          />
        </div>
      </UCard>
    </template>
  </div>
</template>
