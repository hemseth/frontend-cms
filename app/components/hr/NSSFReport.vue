<script setup lang="ts">
/**
 * Monthly NSSF contribution summary, laid out for a filing and for printing.
 *
 * Presentational: the caller builds the rows with `buildNssfRows()` so the same
 * numbers feed the Excel export. Put an export button in the `actions` slot.
 *
 * This is a summary of contributions, not the NSSF portal's own upload
 * template, whose layout is not defined in this repo. Check it against that
 * template before submitting.
 */
import { computed } from 'vue'
import type { NssfRow } from '~/utils/payroll'

const props = defineProps<{
  rows: NssfRow[]
  /** `YYYY-MM`. */
  period: string
  clinicName: string
  /** The clinic's employer registration number with NSSF, when known. */
  employerRegNo?: string
}>()

const { t, locale } = useI18n()

const totals = computed(() => summariseNssf(props.rows))
const periodText = computed(() => periodLabel(props.period, locale.value === 'km' ? 'km' : 'en'))
const employeePct = `${(DEFAULT_PAYROLL_RULES.nssfEmployeeRate * 100).toFixed(0)}%`
const employerPct = `${(DEFAULT_PAYROLL_RULES.nssfEmployerRate * 100).toFixed(1)}%`

function displayName(row: NssfRow): string {
  return locale.value === 'km' ? (row.nameKh || row.nameEn || '-') : (row.nameEn || row.nameKh || '-')
}

function subName(row: NssfRow): string {
  const other = locale.value === 'km' ? row.nameEn : row.nameKh
  return other && other !== displayName(row) ? other : ''
}

function printReport() {
  window.print()
}
</script>

<template>
  <div class="nssf-report space-y-4">
    <div class="no-print flex items-center justify-between gap-2 flex-wrap">
      <p class="text-xs text-muted max-w-xl">
        {{ t('hr.filingNote') }}
      </p>
      <div class="flex items-center gap-2">
        <slot name="actions" />
        <UButton
          :label="t('common.print')"
          icon="i-lucide-printer"
          color="neutral"
          variant="outline"
          size="sm"
          :disabled="!rows.length"
          @click="printReport"
        />
      </div>
    </div>

    <UAlert
      v-if="totals.missingNssfNo > 0"
      class="no-print"
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="t('hr.missingNssfNo', { count: totals.missingNssfNo })"
      :description="t('hr.missingNssfNoHint')"
    />
    <UAlert
      v-if="totals.draftCount > 0"
      class="no-print"
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="t('hr.draftWarning', { count: totals.draftCount })"
    />

    <div class="print-area rounded-lg border border-default p-5 bg-default">
      <div class="text-center mb-4">
        <h2 class="text-lg font-bold">
          {{ t('hr.nssfReport') }}
        </h2>
        <p class="text-sm">
          {{ clinicName }} · {{ periodText }}
        </p>
        <p v-if="employerRegNo" class="text-xs text-muted">
          {{ t('hr.employerRegNo') }}: {{ employerRegNo }}
        </p>
      </div>

      <p v-if="!rows.length" class="py-8 text-center text-muted">
        {{ t('hr.noPayrolls') }}
      </p>

      <table v-else class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-y border-default text-xs uppercase text-muted">
            <th class="py-2 w-8 text-left">
              #
            </th>
            <th class="py-2 text-left">
              {{ t('hr.employee') }}
            </th>
            <th class="py-2 text-left w-32">
              {{ t('hr.nssfNo') }}
            </th>
            <th class="py-2 text-right w-32">
              {{ t('hr.contributionBase') }}
            </th>
            <th class="py-2 text-right w-28">
              {{ t('hr.employeeShare') }} {{ employeePct }}
            </th>
            <th class="py-2 text-right w-28">
              {{ t('hr.employerShare') }} {{ employerPct }}
            </th>
            <th class="py-2 text-right w-28">
              {{ t('hr.totalContribution') }}
            </th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="(row, index) in rows" :key="row.payrollId" class="border-b border-default">
            <td class="py-1.5 text-muted">
              {{ index + 1 }}
            </td>
            <td class="py-1.5">
              <div class="font-medium">
                {{ displayName(row) }}
                <UBadge
                  v-if="row.status === 'draft'"
                  class="no-print ms-1"
                  color="warning"
                  variant="subtle"
                  size="sm"
                >
                  {{ t('hr.status_draft') }}
                </UBadge>
              </div>
              <div v-if="subName(row)" class="text-xs text-muted">
                {{ subName(row) }}
              </div>
            </td>
            <td class="py-1.5 font-mono text-xs" :class="row.nssfNo ? '' : 'text-warning'">
              {{ row.nssfNo || '-' }}
            </td>
            <td class="py-1.5 text-right tabular-nums">
              {{ formatUsd(row.contributionBase) }}
            </td>
            <td class="py-1.5 text-right tabular-nums">
              {{ formatUsd(row.employee) }}
            </td>
            <td class="py-1.5 text-right tabular-nums">
              {{ formatUsd(row.employer) }}
            </td>
            <td class="py-1.5 text-right tabular-nums font-medium">
              {{ formatUsd(row.total) }}
            </td>
          </tr>
        </tbody>

        <tfoot>
          <tr class="border-t-2 border-default font-bold">
            <td colspan="3" class="py-2">
              {{ t('hr.total') }} ({{ t('hr.employees', { count: totals.count }) }})
            </td>
            <td class="py-2 text-right tabular-nums">
              {{ formatUsd(totals.contributionBase) }}
            </td>
            <td class="py-2 text-right tabular-nums">
              {{ formatUsd(totals.employee) }}
            </td>
            <td class="py-2 text-right tabular-nums">
              {{ formatUsd(totals.employer) }}
            </td>
            <td class="py-2 text-right tabular-nums">
              {{ formatUsd(totals.total) }}
            </td>
          </tr>
        </tfoot>
      </table>

      <div class="mt-10 grid grid-cols-2 gap-8 text-center text-xs">
        <div>
          <div class="border-t border-default pt-1 mt-10">
            {{ t('hr.preparedBy') }}
          </div>
        </div>
        <div>
          <div class="border-t border-default pt-1 mt-10">
            {{ t('hr.authorisedBy') }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media print {
  .no-print {
    display: none !important;
  }

  .print-area {
    border: none;
    padding: 0;
  }

  tr {
    page-break-inside: avoid;
  }

  thead {
    display: table-header-group;
  }
}
</style>
