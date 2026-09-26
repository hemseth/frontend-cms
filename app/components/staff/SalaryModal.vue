<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { StaffMember } from '~/utils/staffProfile'

/**
 * Salary history (docs/HR_PAYROLL_UPGRADE_PLAN.md): a change of pay is a new record from its
 * effective date. Recorded amounts are never edited; a change that has not started yet can be
 * withdrawn. The server works out which record is current, previous or scheduled.
 */
interface SalaryRecord {
  _id: string
  baseSalary: number
  positionAllowance?: number
  transportAllowance?: number
  housingAllowance?: number
  otherAllowances?: number
  currency?: string
  effectiveDate?: string
  effectiveTo?: string
  reason?: string
  notes?: string
  createdAt?: string
  state: 'current' | 'previous' | 'scheduled'
}

const props = defineProps<{ staffMember?: StaffMember | null }>()
const open = defineModel<boolean>('open', { default: false })
const { t, locale } = useI18n()
const toast = useToast()
const auth = useAuth()
const canWrite = computed(() => auth.can('payroll', 'create'))

const today = () => new Date().toISOString().slice(0, 10)
const blank = () => ({
  baseSalary: 0,
  positionAllowance: 0,
  transportAllowance: 0,
  housingAllowance: 0,
  otherAllowances: 0,
  currency: 'USD' as 'USD' | 'KHR',
  effectiveDate: today(),
  reason: '',
  notes: ''
})
const state = ref(blank())
const submitting = ref(false)

const { data: result, status, refresh } = await useAsyncData('staff-salaries', () => {
  if (!props.staffMember?._id) return Promise.resolve({ data: [] })
  return $api<{ data: SalaryRecord[] }>('/salaries', { params: { staffId: props.staffMember._id, limit: 100 } })
}, { watch: [() => props.staffMember?._id], default: () => ({ data: [] }) })

const salaries = computed<SalaryRecord[]>(() => (result.value as { data?: SalaryRecord[] })?.data || [])
const current = computed(() => salaries.value.find(s => s.state === 'current'))

watch(open, (isOpen) => {
  if (isOpen) {
    refresh()
    state.value = blank()
    // Start from the current pay, so a raise only needs the changed amounts.
    const c = current.value
    if (c) Object.assign(state.value, { baseSalary: c.baseSalary, positionAllowance: c.positionAllowance || 0, transportAllowance: c.transportAllowance || 0, housingAllowance: c.housingAllowance || 0, otherAllowances: c.otherAllowances || 0, currency: (c.currency as 'USD' | 'KHR') || 'USD' })
  }
})

const total = (s: Partial<SalaryRecord>) => Number(s.baseSalary || 0) + Number(s.positionAllowance || 0) + Number(s.transportAllowance || 0) + Number(s.housingAllowance || 0) + Number(s.otherAllowances || 0)
const money = (n: number, currency = 'USD') => (currency === 'KHR' ? `${Math.round(n).toLocaleString('en-US')} ៛` : `$${n.toFixed(2)}`)
const day = (d?: string) => (d ? new Date(d).toLocaleDateString(locale.value === 'km' ? 'km-KH' : 'en-GB', { timeZone: 'UTC' }) : '')
const stateColor = { current: 'success', previous: 'neutral', scheduled: 'info' } as const
/** "Basic salary $800.00 · Housing $50.00" — the parts that are not zero. */
function breakdown(s: SalaryRecord) {
  const parts: Array<[string, number | undefined]> = [
    ['base', s.baseSalary], ['position', s.positionAllowance], ['transport', s.transportAllowance],
    ['housing', s.housingAllowance], ['other', s.otherAllowances]
  ]
  return parts.filter(([key, v]) => key === 'base' || Number(v)).map(([key, v]) => `${t(`staff.pay.${key}`)} ${money(Number(v || 0), s.currency)}`).join(' · ')
}

async function handleSubmit() {
  if (!state.value.baseSalary || state.value.baseSalary <= 0) {
    toast.add({ title: t('staff.pay.baseRequired'), color: 'warning' })
    return
  }
  submitting.value = true
  try {
    const { reason, notes, ...amounts } = state.value
    await $api('/salaries', {
      method: 'POST',
      body: {
        ...amounts,
        staffId: props.staffMember!._id,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {})
      }
    })
    toast.add({ title: t('staff.pay.recorded'), color: 'success' })
    state.value.reason = ''
    state.value.notes = ''
    await refresh()
  } catch (error) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(error, t('messages.errorOccurred')), color: 'error' })
  } finally {
    submitting.value = false
  }
}

async function withdraw(record: SalaryRecord) {
  if (!window.confirm(t('staff.pay.withdrawConfirm', { date: day(record.effectiveDate) }))) return
  try {
    await $api(`/salaries/${record._id}`, { method: 'DELETE' })
    await refresh()
  } catch (error) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(error, t('messages.errorOccurred')), color: 'error' })
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="t('staff.pay.title', { name: staffMember?.nameKh || staffMember?.nameEn || '' })" :ui="{ content: 'sm:max-w-3xl' }">
    <template #body>
      <div class="space-y-6">
        <div v-if="canWrite" class="space-y-4 rounded-lg bg-muted p-4">
          <div>
            <h4 class="font-medium">
              {{ t('staff.pay.newChange') }}
            </h4>
            <p class="text-sm text-muted">
              {{ t('staff.pay.newChangeHelp') }}
            </p>
          </div>
          <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
            <UFormField :label="t('staff.pay.effectiveFrom')" required>
              <UInput v-model="state.effectiveDate" type="date" class="w-full" />
            </UFormField>
            <UFormField :label="t('staff.pay.currency')">
              <USelect v-model="state.currency" :items="['USD', 'KHR']" class="w-full" />
            </UFormField>
            <UFormField :label="t('staff.pay.base')" required>
              <UInput
                v-model.number="state.baseSalary"
                type="number"
                min="0"
                step="0.01"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="t('staff.pay.position')">
              <UInput
                v-model.number="state.positionAllowance"
                type="number"
                min="0"
                step="0.01"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="t('staff.pay.transport')">
              <UInput
                v-model.number="state.transportAllowance"
                type="number"
                min="0"
                step="0.01"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="t('staff.pay.housing')">
              <UInput
                v-model.number="state.housingAllowance"
                type="number"
                min="0"
                step="0.01"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="t('staff.pay.other')">
              <UInput
                v-model.number="state.otherAllowances"
                type="number"
                min="0"
                step="0.01"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="t('staff.pay.reason')" class="md:col-span-2">
              <UInput v-model="state.reason" :placeholder="t('staff.pay.reasonPlaceholder')" class="w-full" />
            </UFormField>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm">{{ t('staff.pay.monthlyTotal') }}: <strong>{{ money(total(state), state.currency) }}</strong></span>
            <UButton
              :loading="submitting"
              icon="i-lucide-plus"
              :label="t('staff.pay.record')"
              @click="handleSubmit"
            />
          </div>
        </div>

        <div>
          <h4 class="mb-2 font-medium">
            {{ t('staff.pay.history') }}
          </h4>
          <p v-if="status === 'pending'" class="text-sm text-muted">
            {{ t('common.loading') }}
          </p>
          <p v-else-if="!salaries.length" class="text-sm text-muted">
            {{ t('staff.pay.none') }}
          </p>
          <ul v-else class="space-y-2">
            <li v-for="s in salaries" :key="s._id" class="rounded-lg border border-default p-3">
              <div class="flex flex-wrap items-center gap-2">
                <UBadge :color="stateColor[s.state]" variant="subtle" size="sm">
                  {{ t(`staff.pay.state.${s.state}`) }}
                </UBadge>
                <span class="text-sm">
                  {{ day(s.effectiveDate || s.createdAt) }}<template v-if="s.effectiveTo"> – {{ day(s.effectiveTo) }}</template>
                </span>
                <span class="ml-auto font-semibold">{{ money(total(s), s.currency) }}</span>
                <UButton
                  v-if="s.state === 'scheduled' && canWrite"
                  size="xs"
                  color="error"
                  variant="ghost"
                  icon="i-lucide-undo-2"
                  :label="t('staff.pay.withdraw')"
                  @click="withdraw(s)"
                />
              </div>
              <p class="mt-1 text-xs text-muted">
                {{ breakdown(s) }}
              </p>
              <p v-if="s.reason || s.notes" class="text-xs">
                {{ [s.reason, s.notes].filter(Boolean).join(' · ') }}
              </p>
            </li>
          </ul>
        </div>
      </div>
    </template>
  </UModal>
</template>
