<script setup lang="ts">
/**
 * Live net pay preview. Every figure comes from the shared payroll engine
 * (utils/payroll.ts), so it matches the payslip, the NSSF report and the Excel
 * export. Nothing here is saved.
 */
import { computed, reactive, watch } from 'vue'
import type { PayrollAmounts, PayrollResult, PayrollRules } from '~/utils/payroll'

const props = withDefaults(defineProps<{
  /** Starting values, e.g. a staff member's current salary. */
  initial?: Partial<PayrollAmounts>
  rules?: PayrollRules
  /** Show the "use these values" button. */
  showApply?: boolean
}>(), {
  showApply: false
})

const emit = defineEmits<{
  change: [payload: { amounts: PayrollAmounts, result: PayrollResult }]
  apply: [payload: { amounts: PayrollAmounts, body: Record<string, number> }]
}>()

const { t } = useI18n()
const { stored: rateInput, rate } = useExchangeRate()

type MoneyKey = 'baseSalary' | 'positionAllowance' | 'transportAllowance' | 'housingAllowance'
  | 'otherAllowances' | 'bonus' | 'lateDeduction' | 'advanceRepayment' | 'otherDeductions'
type OtKey = 'weekday' | 'restDay' | 'night'

const form = reactive({
  baseSalary: 0,
  positionAllowance: 0,
  transportAllowance: 0,
  housingAllowance: 0,
  otherAllowances: 0,
  bonus: 0,
  lateDeduction: 0,
  advanceRepayment: 0,
  otherDeductions: 0,
  absenceDays: 0,
  otHours: { weekday: 0, restDay: 0, night: 0 } as Record<OtKey, number>
})

const earningFields: Array<{ key: MoneyKey, label: string }> = [
  { key: 'baseSalary', label: 'hr.baseSalary' },
  { key: 'positionAllowance', label: 'hr.positionAllowance' },
  { key: 'transportAllowance', label: 'hr.transportAllowance' },
  { key: 'housingAllowance', label: 'hr.housingAllowance' },
  { key: 'otherAllowances', label: 'hr.otherAllowances' },
  { key: 'bonus', label: 'hr.bonus' }
]
const otFields: Array<{ key: OtKey, label: string }> = [
  { key: 'weekday', label: 'hr.otHoursWeekday' },
  { key: 'restDay', label: 'hr.otHoursRestDay' },
  { key: 'night', label: 'hr.otHoursNight' }
]
const deductionFields: Array<{ key: MoneyKey, label: string }> = [
  { key: 'lateDeduction', label: 'hr.late' },
  { key: 'advanceRepayment', label: 'hr.advanceRepayment' },
  { key: 'otherDeductions', label: 'hr.otherDeductions' }
]

const activeRules = computed(() => props.rules ?? DEFAULT_PAYROLL_RULES)

// Overtime and absence are typed as hours and days; money comes from the engine.
const overtime = computed(() => overtimeFromHours(form.baseSalary, form.otHours, activeRules.value))
const absenceDeduction = computed(() => absenceFromDays(form.baseSalary, form.absenceDays, activeRules.value))

const amounts = computed<PayrollAmounts>(() => ({
  baseSalary: toAmount(form.baseSalary),
  positionAllowance: toAmount(form.positionAllowance),
  transportAllowance: toAmount(form.transportAllowance),
  housingAllowance: toAmount(form.housingAllowance),
  otherAllowances: toAmount(form.otherAllowances),
  overtime: overtime.value,
  bonus: toAmount(form.bonus),
  absenceDeduction: absenceDeduction.value,
  lateDeduction: toAmount(form.lateDeduction),
  advanceRepayment: toAmount(form.advanceRepayment),
  otherDeductions: toAmount(form.otherDeductions)
}))

const result = computed(() => computePayroll(amounts.value, activeRules.value))
const netKhr = computed(() => usdToKhr(result.value.net, rate.value))
const employerPct = computed(() => `${(activeRules.value.nssfEmployerRate * 100).toFixed(1)}%`)
const employeePct = computed(() => `${(activeRules.value.nssfEmployeeRate * 100).toFixed(0)}%`)

function seed(values?: Partial<PayrollAmounts>) {
  if (!values) return
  form.baseSalary = toAmount(values.baseSalary)
  form.positionAllowance = toAmount(values.positionAllowance)
  form.transportAllowance = toAmount(values.transportAllowance)
  form.housingAllowance = toAmount(values.housingAllowance)
  form.otherAllowances = toAmount(values.otherAllowances)
  form.bonus = toAmount(values.bonus)
  form.lateDeduction = toAmount(values.lateDeduction)
  form.advanceRepayment = toAmount(values.advanceRepayment)
  form.otherDeductions = toAmount(values.otherDeductions)
}

watch(() => props.initial, seed, { immediate: true })

watch([amounts, result], () => {
  emit('change', { amounts: amounts.value, result: result.value })
}, { immediate: true })

function reset() {
  seed(props.initial ?? EMPTY_AMOUNTS)
  form.absenceDays = 0
  form.otHours = { weekday: 0, restDay: 0, night: 0 }
}

function apply() {
  emit('apply', { amounts: amounts.value, body: toBackendPayload(amounts.value) })
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 class="font-semibold flex items-center gap-2">
            <UIcon name="i-lucide-calculator" class="w-5 h-5 text-primary" />
            {{ t('hr.calcTitle') }}
          </h3>
          <p class="text-xs text-muted mt-0.5">
            {{ t('hr.calcHint') }}
          </p>
        </div>

        <UFormField :label="t('hr.exchangeRate')" :hint="t('hr.khrPerUsd')" class="w-44">
          <UInput
            v-model.number="rateInput"
            type="number"
            min="1"
            size="sm"
          />
        </UFormField>
      </div>
    </template>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Inputs -->
      <div class="space-y-5">
        <section>
          <h4 class="text-sm font-semibold mb-2">
            {{ t('hr.earnings') }}
          </h4>
          <div class="grid grid-cols-2 gap-3">
            <UFormField v-for="field in earningFields" :key="field.key" :label="t(field.label)">
              <UInput
                v-model.number="form[field.key]"
                type="number"
                min="0"
                step="0.01"
                size="sm"
                class="w-full"
              />
            </UFormField>
          </div>
        </section>

        <section>
          <h4 class="text-sm font-semibold mb-2">
            {{ t('hr.overtime') }}
          </h4>
          <div class="grid grid-cols-3 gap-3">
            <UFormField v-for="field in otFields" :key="field.key" :label="t(field.label)">
              <UInput
                v-model.number="form.otHours[field.key]"
                type="number"
                min="0"
                step="0.5"
                size="sm"
                class="w-full"
              />
            </UFormField>
          </div>
          <p class="text-xs text-muted mt-1">
            {{ t('hr.otHint') }}
          </p>
        </section>

        <section>
          <h4 class="text-sm font-semibold mb-2">
            {{ t('hr.deductions') }}
          </h4>
          <div class="grid grid-cols-2 gap-3">
            <UFormField :label="t('hr.absenceDays')">
              <UInput
                v-model.number="form.absenceDays"
                type="number"
                min="0"
                step="0.5"
                size="sm"
                class="w-full"
              />
            </UFormField>
            <UFormField v-for="field in deductionFields" :key="field.key" :label="t(field.label)">
              <UInput
                v-model.number="form[field.key]"
                type="number"
                min="0"
                step="0.01"
                size="sm"
                class="w-full"
              />
            </UFormField>
          </div>
        </section>
      </div>

      <!-- Live result -->
      <div class="rounded-lg border border-default bg-elevated/30 p-4 space-y-3 self-start lg:sticky lg:top-4">
        <dl class="text-sm space-y-1.5">
          <div class="flex justify-between">
            <dt>{{ t('hr.baseSalary') }}</dt>
            <dd class="tabular-nums">
              {{ formatUsd(amounts.baseSalary) }}
            </dd>
          </div>
          <div class="flex justify-between">
            <dt>{{ t('hr.allowances') }}</dt>
            <dd class="tabular-nums">
              {{ formatUsd(result.allowances) }}
            </dd>
          </div>
          <div class="flex justify-between">
            <dt>{{ t('hr.overtime') }}</dt>
            <dd class="tabular-nums">
              {{ formatUsd(amounts.overtime) }}
            </dd>
          </div>
          <div class="flex justify-between">
            <dt>{{ t('hr.bonus') }}</dt>
            <dd class="tabular-nums">
              {{ formatUsd(amounts.bonus) }}
            </dd>
          </div>
          <div class="flex justify-between font-semibold border-t border-default pt-1.5">
            <dt>{{ t('hr.gross') }}</dt>
            <dd class="tabular-nums">
              {{ formatUsd(result.gross) }}
            </dd>
          </div>
        </dl>

        <dl class="text-sm space-y-1.5 text-error">
          <div class="flex justify-between">
            <dt>{{ t('hr.nssfEmployee') }} {{ employeePct }}</dt>
            <dd class="tabular-nums">
              -{{ formatUsd(result.nssfEmployee) }}
            </dd>
          </div>
          <div class="flex justify-between">
            <dt>{{ t('hr.incomeTax') }}</dt>
            <dd class="tabular-nums">
              -{{ formatUsd(result.incomeTax) }}
            </dd>
          </div>
          <div class="flex justify-between">
            <dt>{{ t('hr.absence') }}</dt>
            <dd class="tabular-nums">
              -{{ formatUsd(amounts.absenceDeduction) }}
            </dd>
          </div>
          <div class="flex justify-between">
            <dt>{{ t('hr.late') }}</dt>
            <dd class="tabular-nums">
              -{{ formatUsd(amounts.lateDeduction) }}
            </dd>
          </div>
          <div class="flex justify-between">
            <dt>{{ t('hr.advanceRepayment') }}</dt>
            <dd class="tabular-nums">
              -{{ formatUsd(amounts.advanceRepayment) }}
            </dd>
          </div>
          <div class="flex justify-between">
            <dt>{{ t('hr.otherDeductions') }}</dt>
            <dd class="tabular-nums">
              -{{ formatUsd(amounts.otherDeductions) }}
            </dd>
          </div>
          <div class="flex justify-between font-semibold border-t border-default pt-1.5">
            <dt>{{ t('hr.totalDeductions') }}</dt>
            <dd class="tabular-nums">
              -{{ formatUsd(result.totalDeductions) }}
            </dd>
          </div>
        </dl>

        <div
          class="rounded-md p-3 text-center"
          :class="result.net < 0 ? 'bg-error/10' : 'bg-success/10'"
        >
          <div class="text-xs uppercase tracking-wide text-muted">
            {{ t('hr.netPay') }}
          </div>
          <div class="text-2xl font-bold tabular-nums" :class="result.net < 0 ? 'text-error' : 'text-success'">
            {{ formatUsd(result.net) }}
          </div>
          <div class="text-sm tabular-nums text-muted">
            {{ formatKhr(netKhr) }}
          </div>
        </div>

        <UAlert
          v-if="result.net < 0"
          color="error"
          variant="subtle"
          icon="i-lucide-octagon-alert"
          :title="t('hr.negativeNet')"
        />

        <details class="text-xs">
          <summary class="cursor-pointer text-muted select-none">
            {{ t('hr.taxBreakdown') }}
            <span class="ms-1">({{ t('hr.effectiveRate') }} {{ result.effectiveTaxRate }}%)</span>
          </summary>
          <table class="w-full mt-2">
            <tbody>
              <tr v-for="slice in result.taxSlices" :key="slice.from" class="border-b border-default last:border-b-0">
                <td class="py-1">
                  {{ formatUsd(slice.from) }} - {{ slice.to === null ? '∞' : formatUsd(slice.to) }}
                </td>
                <td class="py-1 text-right">
                  {{ (slice.rate * 100).toFixed(0) }}%
                </td>
                <td class="py-1 text-right tabular-nums">
                  {{ formatUsd(slice.tax) }}
                </td>
              </tr>
              <tr v-if="!result.taxSlices.length">
                <td class="py-1 text-muted">
                  {{ t('hr.noTaxDue') }}
                </td>
              </tr>
            </tbody>
          </table>
        </details>

        <div class="border-t border-default pt-3 text-sm">
          <div class="flex justify-between">
            <span>{{ t('hr.employerNssf') }} {{ employerPct }}</span>
            <span class="tabular-nums">{{ formatUsd(result.nssfEmployer) }}</span>
          </div>
          <div class="flex justify-between font-semibold">
            <span>{{ t('hr.employerCost') }}</span>
            <span class="tabular-nums">{{ formatUsd(result.employerCost) }}</span>
          </div>
          <p class="text-xs text-muted mt-1">
            {{ t('hr.employerNote') }}
          </p>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <p class="text-xs text-muted">
          {{ t('hr.rateLocalNote') }}
        </p>
        <div class="flex items-center gap-2">
          <UButton
            :label="t('hr.reset')"
            color="neutral"
            variant="outline"
            size="sm"
            @click="reset"
          />
          <UButton
            v-if="showApply"
            :label="t('hr.applyValues')"
            icon="i-lucide-check"
            size="sm"
            @click="apply"
          />
        </div>
      </div>
    </template>
  </UCard>
</template>
