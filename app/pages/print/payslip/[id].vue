<script setup lang="ts">
/**
 * Print page for one stored payroll. Figures come from the shared payroll
 * engine, not from the stored totals: the backend has no NSSF deduction and
 * its tax calculation is wrong for USD salaries, so a payslip built from the
 * stored `netSalary` would go out wrong. When the two disagree the page says so.
 */
import { computed, onMounted, ref } from 'vue'
import PayslipPreview from '~/components/hr/PayslipPreview.vue'
import type { ClinicRef, PayrollRecord, StaffRef } from '~/types/hr'
import type { PayslipData } from '~/utils/payroll'
import { usePayrollRules } from '~/composables/hr/usePayrollRules'

definePageMeta({
  layout: false
})

const { t } = useI18n()
// The payslip recomputes from the stored amounts, so it must use the same brackets the server did.
const { rules: payrollRules, load: loadPayrollRules } = usePayrollRules()
const route = useRoute()
const { clinicId } = useAuth()
const { selectedClinicId } = useClinicContext()
const { stored: rateInput, rate } = useExchangeRate()
const { fetchPayroll, fetchStaff, fetchClinic } = usePayroll()

const payrollId = String(route.params.id || '')
const isLoading = ref(true)
const loadError = ref('')

const loaded = ref<{ record: PayrollRecord, person?: StaffRef, clinic?: ClinicRef | null } | null>(null)

onMounted(async () => {
  try {
    // Without the clinic's brackets the recompute falls back to the defaults; reconcileWithStored flags any mismatch.
    await loadPayrollRules().catch(() => {})
    const record = await fetchPayroll(payrollId)
    if (!record) {
      loadError.value = t('hr.payslipNotFound')
      return
    }
    const activeClinicId = clinicId.value || selectedClinicId.value || ''
    const [staffList, clinic] = await Promise.all([
      fetchStaff(),
      activeClinicId ? fetchClinic(String(activeClinicId)) : Promise.resolve(null)
    ])
    loaded.value = {
      record,
      person: staffList.find(s => String(s._id) === String(record.staffId)),
      clinic
    }
  } catch (e) {
    loadError.value = getApiErrorMessage(e, t('hr.loadFailed'))
  } finally {
    isLoading.value = false
  }
})

// Derived, so changing the exchange rate above the payslip updates it in place.
const payslip = computed<PayslipData | null>(() => {
  if (!loaded.value) return null
  const { record, person, clinic } = loaded.value

  const amounts = toPayrollAmounts(record)
  const result = computePayroll(amounts, payrollRules.value)
  const check = reconcileWithStored(record, result)

  return {
    clinicName: clinic?.name || '-',
    clinicNameKh: clinic?.nameKh,
    employee: {
      nameKh: person?.nameKh,
      nameEn: person?.nameEn || record.staffName,
      employeeId: displayEmployeeId(person ?? { _id: record.staffId }),
      nssfNo: person?.nssfNo,
      position: person?.role
    },
    period: record.period,
    payrollId: record._id,
    amounts,
    result,
    khrPerUsd: rate.value,
    issuedAt: new Date(),
    reconciliation: check.matches || check.storedNet === null
      ? undefined
      : { storedNet: check.storedNet, computedNet: check.computedNet }
  }
})

function printPayslip() {
  window.print()
}
</script>

<template>
  <div class="min-h-screen bg-gray-100 dark:bg-gray-900 py-6 print:bg-white print:py-0">
    <!-- Screen only -->
    <div class="mx-auto max-w-[210mm] px-4 mb-4 flex items-end justify-between gap-3 flex-wrap print:hidden">
      <UButton
        :label="t('common.close')"
        icon="i-lucide-arrow-left"
        color="neutral"
        variant="outline"
        size="sm"
        @click="$router.back()"
      />

      <div class="flex items-end gap-3">
        <UFormField :label="t('hr.exchangeRate')" :hint="t('hr.khrPerUsd')" class="w-44">
          <UInput
            v-model.number="rateInput"
            type="number"
            min="1"
            size="sm"
          />
        </UFormField>
        <UButton
          :label="t('common.print')"
          icon="i-lucide-printer"
          size="sm"
          :disabled="!payslip"
          @click="printPayslip"
        />
      </div>
    </div>

    <div v-if="isLoading" class="mx-auto max-w-[210mm] px-4 space-y-3">
      <USkeleton class="h-24 w-full" />
      <USkeleton class="h-64 w-full" />
    </div>

    <UAlert
      v-else-if="loadError"
      class="mx-auto max-w-[210mm]"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="loadError"
    />

    <PayslipPreview v-else-if="payslip" :data="payslip" />
  </div>
</template>

<style>
@page {
  size: A4;
  margin: 12mm;
}
</style>
