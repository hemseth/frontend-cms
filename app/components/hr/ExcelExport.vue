<script setup lang="ts">
/**
 * Exports the payroll register and the NSSF summary to one .xlsx file using
 * exceljs. exceljs is loaded on click, so it costs nothing until it is used.
 */
import { computed, ref } from 'vue'
import type { NssfRow, PayrollSheetRow } from '~/utils/payroll'
import type { PayrollWorkbookLabels } from '~/utils/hr-excel'

const props = withDefaults(defineProps<{
  rows: PayrollSheetRow[]
  nssfRows: NssfRow[]
  /** `YYYY-MM`. */
  period: string
  clinicName: string
  khrPerUsd: number
  label?: string
  size?: 'xs' | 'sm' | 'md'
}>(), {
  size: 'sm'
})

const { t, locale } = useI18n()
const toast = useToast()
const isExporting = ref(false)

const labels = computed<PayrollWorkbookLabels>(() => ({
  sheetPayroll: t('hr.sheetPayroll'),
  sheetNssf: t('hr.sheetNssf'),
  payrollTitle: t('hr.payrollRegister'),
  nssfTitle: t('hr.nssfReport'),
  period: t('hr.periodLabel'),
  exchangeRate: t('hr.exchangeRate'),
  total: t('hr.total'),
  missingNssfNo: t('hr.missingNssfNoShort'),
  columns: {
    no: '#',
    employeeId: t('hr.employeeId'),
    nameKh: t('common.nameKh'),
    nameEn: t('common.nameEn'),
    nssfNo: t('hr.nssfNo'),
    base: t('hr.baseSalary'),
    allowances: t('hr.allowances'),
    overtime: t('hr.overtime'),
    bonus: t('hr.bonus'),
    gross: t('hr.gross'),
    nssfEmployee: t('hr.nssfEmployee'),
    taxable: t('hr.taxableIncome'),
    incomeTax: t('hr.incomeTax'),
    advance: t('hr.advanceRepayment'),
    absence: t('hr.absence'),
    late: t('hr.late'),
    other: t('hr.otherDeductions'),
    totalDeductions: t('hr.totalDeductions'),
    netUsd: t('hr.netPayUsd'),
    netKhr: t('hr.netPayKhr'),
    nssfEmployer: t('hr.employerNssf'),
    employerCost: t('hr.employerCost'),
    status: t('common.status'),
    contributionBase: t('hr.contributionBase'),
    employee: t('hr.employeeShare'),
    employer: t('hr.employerShare')
  }
}))

async function exportFile() {
  if (!props.rows.length) {
    toast.add({ title: t('hr.exportNothing'), color: 'warning' })
    return
  }
  // The period becomes part of a file name, so only accept the expected shape.
  const parsed = parsePeriod(props.period)
  if (!parsed) {
    toast.add({ title: t('hr.exportFailed'), color: 'error' })
    return
  }

  isExporting.value = true
  try {
    const buffer = await buildPayrollWorkbook({
      clinicName: props.clinicName,
      periodText: periodLabel(props.period, locale.value === 'km' ? 'km' : 'en'),
      khrPerUsd: props.khrPerUsd,
      rows: props.rows,
      nssfRows: props.nssfRows,
      nssfTotals: summariseNssf(props.nssfRows),
      labels: labels.value
    })
    downloadArrayBuffer(buffer, `payroll-${props.period}.xlsx`)
    toast.add({ title: t('hr.exportedOk'), color: 'success' })
  } catch (e) {
    toast.add({
      title: t('hr.exportFailed'),
      description: e instanceof Error ? e.message : undefined,
      color: 'error'
    })
  } finally {
    isExporting.value = false
  }
}
</script>

<template>
  <UButton
    :label="label || t('hr.exportExcel')"
    icon="i-lucide-file-spreadsheet"
    color="neutral"
    variant="outline"
    :size="size"
    :loading="isExporting"
    :disabled="isExporting || !rows.length"
    @click="exportFile"
  />
</template>
