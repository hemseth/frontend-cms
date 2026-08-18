<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

const { t } = useI18n()
const exportUtils = useExport()
const branch = useBranch()

const breadcrumbItems = computed(() => [
  { label: t('nav.home'), to: '/' },
  { label: t('report.title'), to: '/reports' },
  { label: t('report.payrollSummary') }
])

const dateRange = ref({
  start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
  end: new Date().toISOString().split('T')[0]
})

const isLoading = ref(false)
const payrollData = ref<any[]>([])

const totalGross = computed(() => payrollData.value.reduce((sum, p) => sum + p.earnings.grossSalary, 0))
const totalNet = computed(() => payrollData.value.reduce((sum, p) => sum + p.netSalary, 0))
const totalDeductions = computed(() => payrollData.value.reduce((sum, p) => sum + p.deductions.total, 0))

const columns = [
  { key: 'period', label: 'Period' },
  { key: 'staff.name', label: 'Staff Name' },
  { key: 'staff.role', label: 'Role' },
  { key: 'earnings.grossSalary', label: 'Gross Salary' },
  { key: 'deductions.total', label: 'Deductions' },
  { key: 'netSalary', label: 'Net Salary' },
  { key: 'status', label: 'Status' }
]

const tableColumns: TableColumn<any>[] = columns.map(c => ({ accessorKey: c.key, header: c.label }))

async function fetchPayroll() {
  isLoading.value = true
  try {
    const params: any = {
      startDate: dateRange.value.start,
      endDate: dateRange.value.end
    }
    if (branch.currentBranchId.value) {
      params.branchId = branch.currentBranchId.value
    }
    const res = await $api<any>('/reports/payroll/summary', { params })
    payrollData.value = res?.data || []
  } catch (e) {
    console.error('Failed to fetch payroll:', e)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchPayroll()
})

function onDateChange() {
  fetchPayroll()
}

function exportCSV() {
  const data = payrollData.value.map(p => ({
    period: p.period,
    staffName: p.staff?.name || 'N/A',
    role: p.staff?.role || 'N/A',
    grossSalary: p.earnings?.grossSalary || 0,
    deductions: p.deductions?.total || 0,
    netSalary: p.netSalary || 0,
    status: p.status || 'draft'
  }))
  exportUtils.exportToCSV(data, columns, 'payroll-summary')
}

function exportExcel() {
  const data = payrollData.value.map(p => ({
    period: p.period,
    staffName: p.staff?.name || 'N/A',
    role: p.staff?.role || 'N/A',
    grossSalary: p.earnings?.grossSalary || 0,
    deductions: p.deductions?.total || 0,
    netSalary: p.netSalary || 0,
    status: p.status || 'draft'
  }))
  exportUtils.exportToXLSX(data, columns, 'payroll-summary', t('report.payrollSummary'))
}

function printReport() {
  window.print()
}
</script>

<template>
  <div class="p-6 space-y-6">
    <UBreadcrumb :items="breadcrumbItems" />

    <PrintLayout :title="t('report.payrollSummary')" :show-signature="true">
      <div class="flex items-center justify-between mb-6 no-print">
        <div>
          <h1 class="text-2xl font-bold">
            {{ t('report.payrollSummary') }}
          </h1>
          <p class="text-gray-600 dark:text-gray-400 mt-1">
            Monthly payroll overview
          </p>
        </div>
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <UInput
              v-model="dateRange.start"
              type="date"
              class="w-36"
              @change="onDateChange"
            />
            <span class="text-gray-500">-</span>
            <UInput
              v-model="dateRange.end"
              type="date"
              class="w-36"
              @change="onDateChange"
            />
          </div>
          <UButton icon="i-lucide-refresh-cw" :loading="isLoading" @click="fetchPayroll">
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

      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <UCard>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">
                Total Payroll
              </p>
              <p class="text-2xl font-bold mt-1">
                ${{ totalGross.toFixed(2) }}
              </p>
            </div>
            <div class="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <UIcon name="i-lucide-wallet" class="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </UCard>
        <UCard>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">
                Total Deductions
              </p>
              <p class="text-2xl font-bold mt-1 text-red-600">
                ${{ totalDeductions.toFixed(2) }}
              </p>
            </div>
            <div class="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <UIcon name="i-lucide-minus-circle" class="w-8 h-8 text-red-600" />
            </div>
          </div>
        </UCard>
        <UCard>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">
                Total Net Pay
              </p>
              <p class="text-2xl font-bold mt-1 text-green-600">
                ${{ totalNet.toFixed(2) }}
              </p>
            </div>
            <div class="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <UIcon name="i-lucide-dollar-sign" class="w-8 h-8 text-green-600" />
            </div>
          </div>
        </UCard>
        <UCard>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">
                Employees
              </p>
              <p class="text-2xl font-bold mt-1">
                {{ payrollData.length }}
              </p>
            </div>
            <div class="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <UIcon name="i-lucide-users" class="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </UCard>
      </div>

      <UCard>
        <UTable :data="payrollData" :columns="tableColumns" :loading="isLoading">
          <template #period-cell="{ row }">
            <span class="font-mono">{{ row.original.period }}</span>
          </template>
          <template #staff.name-cell="{ row }">
            {{ row.original.staff?.name || 'N/A' }}
          </template>
          <template #staff.role-cell="{ row }">
            {{ row.original.staff?.role || 'N/A' }}
          </template>
          <template #earnings.grossSalary-cell="{ row }">
            ${{ (row.original.earnings?.grossSalary || 0).toFixed(2) }}
          </template>
          <template #deductions.total-cell="{ row }">
            <span class="text-red-600">-${{ (row.original.deductions?.total || 0).toFixed(2) }}</span>
          </template>
          <template #netSalary-cell="{ row }">
            <span class="font-medium text-green-600">${{ (row.original.netSalary || 0).toFixed(2) }}</span>
          </template>
          <template #status-cell="{ row }">
            <UBadge :color="row.original.status === 'paid' ? 'success' : row.original.status === 'approved' ? 'primary' : 'warning'">
              {{ row.original.status }}
            </UBadge>
          </template>
        </UTable>
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
