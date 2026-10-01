<script setup lang="ts">
const { t } = useI18n()
const exportUtils = useExport()
const branch = useBranch()

const breadcrumbItems = computed(() => [
  { label: t('nav.home'), to: '/' },
  { label: t('report.title'), to: '/reports' },
  { label: t('report.coverageReport') }
])

const dateRange = ref({
  start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
  end: new Date().toISOString().slice(0, 10)
})

interface CoverageSummaryRow {
  coverageType: string
  currency: string
  patientCount: number
  invoiceCount: number
  billed: number
  received: number
  outstanding: number
}

interface CoverageClaimRow {
  patientId: string
  pId: number | null
  nameKh: string
  nameEn: string
  coverageType: string
  beneficiaryNumber: string
  currency: string
  invoiceCount: number
  billed: number
  received: number
  outstanding: number
}

interface CoverageResponse {
  data?: {
    summary?: CoverageSummaryRow[]
    claims?: CoverageClaimRow[]
  }
}

const isLoading = ref(false)
const summary = ref<CoverageSummaryRow[]>([])
const claims = ref<CoverageClaimRow[]>([])

// Schemes billed to a payer rather than to the patient. Self-pay and private insurance still
// belong in the payer mix, but they are not claims, so they are kept out of the claim table.
const CLAIMABLE = ['hef', 'nssf', 'idpoor']
const claimRows = computed(() => claims.value.filter(row => CLAIMABLE.includes(row.coverageType)))
const coverageLabel = (type: string) => t(`workstation.coverage.${type}`)
const money = (value: number, currency: string) =>
  `${currency === 'KHR' ? Math.round(value).toLocaleString() : value.toFixed(2)} ${currency}`

async function fetchCoverage() {
  isLoading.value = true
  try {
    const params: Record<string, string> = {
      startDate: dateRange.value.start,
      endDate: dateRange.value.end
    }
    if (branch.currentBranchId.value) {
      params.branchId = branch.currentBranchId.value
    }
    const res = await $api<CoverageResponse>('/reports/coverage', { params })
    summary.value = res?.data?.summary || []
    claims.value = res?.data?.claims || []
  } catch (e) {
    console.error('Failed to fetch coverage report:', e)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchCoverage()
})

const exportColumns = [
  { key: 'pId', label: 'Patient ID' },
  { key: 'nameKh', label: 'Name (KH)' },
  { key: 'nameEn', label: 'Name (EN)' },
  { key: 'coverageType', label: 'Coverage' },
  { key: 'beneficiaryNumber', label: 'Beneficiary No' },
  { key: 'currency', label: 'Currency' },
  { key: 'invoiceCount', label: 'Invoices' },
  { key: 'billed', label: 'Billed' },
  { key: 'received', label: 'Received' },
  { key: 'outstanding', label: 'Outstanding' }
]

function exportExcel() {
  exportUtils.exportToXLSX(claimRows.value, exportColumns, 'coverage-claims', t('report.coverageReport'))
}

function printReport() {
  window.print()
}
</script>

<template>
  <div class="p-6 space-y-6">
    <UBreadcrumb :items="breadcrumbItems" />

    <PrintLayout :title="t('report.coverageReport')" :date-range="dateRange" :show-signature="true">
      <div class="flex items-center justify-between mb-6 no-print">
        <h1 class="text-2xl font-bold">
          {{ t('report.coverageReport') }}
        </h1>
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <UInput
              v-model="dateRange.start"
              type="date"
              class="w-36"
              @change="fetchCoverage"
            />
            <span class="text-muted">-</span>
            <UInput
              v-model="dateRange.end"
              type="date"
              class="w-36"
              @change="fetchCoverage"
            />
          </div>
          <UButton icon="i-lucide-refresh-cw" :loading="isLoading" @click="fetchCoverage">
            {{ t('common.refresh') }}
          </UButton>
          <UButton icon="i-lucide-download" variant="outline" @click="exportExcel">
            {{ t('report.exportExcel') }}
          </UButton>
          <UButton icon="i-lucide-printer" color="primary" @click="printReport">
            {{ t('common.print') }}
          </UButton>
        </div>
      </div>

      <UCard class="mb-6">
        <template #header>
          <h3 class="font-semibold">
            {{ t('report.payerMix') }}
          </h3>
        </template>
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-accented text-left">
              <th class="py-2">
                {{ t('report.cols.coverageType') }}
              </th>
              <th class="py-2 text-right">
                {{ t('report.cols.patients') }}
              </th>
              <th class="py-2 text-right">
                {{ t('report.cols.invoices') }}
              </th>
              <th class="py-2 text-right">
                {{ t('report.cols.billed') }}
              </th>
              <th class="py-2 text-right">
                {{ t('report.cols.received') }}
              </th>
              <th class="py-2 text-right">
                {{ t('report.cols.outstanding') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in summary"
              :key="`${row.coverageType}-${row.currency}`"
              class="border-b border-accented/50"
            >
              <td class="py-2 font-medium">
                {{ coverageLabel(row.coverageType) }}
              </td>
              <td class="py-2 text-right">
                {{ row.patientCount }}
              </td>
              <td class="py-2 text-right">
                {{ row.invoiceCount }}
              </td>
              <td class="py-2 text-right">
                {{ money(row.billed, row.currency) }}
              </td>
              <td class="py-2 text-right">
                {{ money(row.received, row.currency) }}
              </td>
              <td class="py-2 text-right">
                {{ money(row.outstanding, row.currency) }}
              </td>
            </tr>
            <tr v-if="!summary.length && !isLoading">
              <td colspan="6" class="py-8 text-center text-muted">
                {{ t('report.noData') }}
              </td>
            </tr>
          </tbody>
        </table>
      </UCard>

      <UCard>
        <template #header>
          <h3 class="font-semibold">
            {{ t('report.claimLines') }}
          </h3>
        </template>
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-accented text-left">
              <th class="py-2">
                {{ t('report.cols.coverageType') }}
              </th>
              <th class="py-2">
                {{ t('report.cols.beneficiaryNumber') }}
              </th>
              <th class="py-2 text-right">
                {{ t('report.cols.invoices') }}
              </th>
              <th class="py-2 text-right">
                {{ t('report.cols.billed') }}
              </th>
              <th class="py-2 text-right">
                {{ t('report.cols.received') }}
              </th>
              <th class="py-2 text-right">
                {{ t('report.cols.outstanding') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in claimRows"
              :key="`${row.patientId}-${row.currency}`"
              class="border-b border-accented/50"
            >
              <td class="py-2">
                <span class="font-medium">{{ row.nameKh || row.nameEn }}</span>
                <span class="text-muted"> ({{ row.pId ?? '-' }})</span>
                <span class="block text-xs text-muted">{{ coverageLabel(row.coverageType) }}</span>
              </td>
              <td class="py-2">
                <span v-if="row.beneficiaryNumber">{{ row.beneficiaryNumber }}</span>
                <!-- A claim cannot be filed without the scheme number, so flag it instead of printing a blank. -->
                <UBadge
                  v-else
                  color="warning"
                  variant="subtle"
                  size="sm"
                >
                  {{ t('report.cols.beneficiaryNumber') }}
                </UBadge>
              </td>
              <td class="py-2 text-right">
                {{ row.invoiceCount }}
              </td>
              <td class="py-2 text-right">
                {{ money(row.billed, row.currency) }}
              </td>
              <td class="py-2 text-right">
                {{ money(row.received, row.currency) }}
              </td>
              <td class="py-2 text-right">
                {{ money(row.outstanding, row.currency) }}
              </td>
            </tr>
            <tr v-if="!claimRows.length && !isLoading">
              <td colspan="6" class="py-8 text-center text-muted">
                {{ t('report.noData') }}
              </td>
            </tr>
          </tbody>
        </table>
      </UCard>
    </PrintLayout>
  </div>
</template>

<style scoped>
@media print {
  :deep(.no-print) {
    display: none !important;
  }
}
</style>
