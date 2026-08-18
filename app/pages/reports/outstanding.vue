<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

const { t } = useI18n()
const exportUtils = useExport()
const branch = useBranch()

const breadcrumbItems = computed(() => [
  { label: t('nav.home'), to: '/' },
  { label: t('report.title'), to: '/reports' },
  { label: t('report.outstandingReport') }
])

const dateRange = ref({
  start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
  end: new Date().toISOString().split('T')[0]
})

const isLoading = ref(false)
const outstandingData = ref<any[]>([])

const totalOutstanding = computed(() =>
  outstandingData.value.reduce((sum, item) => sum + item.balance, 0)
)

async function fetchOutstanding() {
  isLoading.value = true
  try {
    const params: any = {
      startDate: dateRange.value.start,
      endDate: dateRange.value.end
    }
    if (branch.currentBranchId.value) {
      params.branchId = branch.currentBranchId.value
    }
    const res = await $api<any>('/reports/revenue/outstanding', { params })
    outstandingData.value = res?.data || []
  } catch (e) {
    console.error('Failed to fetch outstanding balances:', e)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchOutstanding()
})

function onDateChange() {
  fetchOutstanding()
}

const columns = [
  { key: 'patientName', label: 'Patient Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'totalBilled', label: 'Total Billed' },
  { key: 'totalPaid', label: 'Total Paid' },
  { key: 'balance', label: 'Balance' },
  { key: 'paymentCount', label: 'Payments' },
  { key: 'lastPayment', label: 'Last Payment' }
]

const tableColumns: TableColumn<any>[] = columns.map(c => ({ accessorKey: c.key, header: c.label }))

function exportCSV() {
  const data = outstandingData.value.map(item => ({
    patientName: item.patientName,
    phone: item.phone,
    totalBilled: `$${item.totalBilled.toFixed(2)}`,
    totalPaid: `$${item.totalPaid.toFixed(2)}`,
    balance: `$${item.balance.toFixed(2)}`,
    paymentCount: item.paymentCount,
    lastPayment: item.lastPayment ? new Date(item.lastPayment).toLocaleDateString() : 'N/A'
  }))
  exportUtils.exportToCSV(data, columns, 'outstanding-balances')
}

function exportExcel() {
  const data = outstandingData.value.map(item => ({
    patientName: item.patientName,
    phone: item.phone,
    totalBilled: item.totalBilled,
    totalPaid: item.totalPaid,
    balance: item.balance,
    paymentCount: item.paymentCount,
    lastPayment: item.lastPayment ? new Date(item.lastPayment).toLocaleDateString() : 'N/A'
  }))
  exportUtils.exportToXLSX(data, columns, 'outstanding-balances', t('report.outstandingReport'))
}

function printReport() {
  window.print()
}
</script>

<template>
  <div class="p-6 space-y-6">
    <UBreadcrumb :items="breadcrumbItems" />

    <PrintLayout :title="t('report.outstandingReport')" :show-signature="true">
      <div class="flex items-center justify-between mb-6 no-print">
        <div>
          <h1 class="text-2xl font-bold">
            {{ t('report.outstandingReport') }}
          </h1>
          <p class="text-gray-600 dark:text-gray-400 mt-1">
            Outstanding patient balances
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
          <UButton icon="i-lucide-refresh-cw" :loading="isLoading" @click="fetchOutstanding">
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

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <UCard>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">
                Total Outstanding
              </p>
              <p class="text-3xl font-bold mt-1 text-red-600">
                ${{ totalOutstanding.toFixed(2) }}
              </p>
            </div>
            <div class="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
              <UIcon name="i-lucide-credit-card" class="w-8 h-8 text-red-600" />
            </div>
          </div>
        </UCard>
        <UCard>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">
                Total Patients
              </p>
              <p class="text-3xl font-bold mt-1">
                {{ outstandingData.length }}
              </p>
            </div>
            <div class="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <UIcon name="i-lucide-users" class="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </UCard>
        <UCard>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">
                Total Billed
              </p>
              <p class="text-3xl font-bold mt-1">
                ${{ outstandingData.reduce((s, i) => s + i.totalBilled, 0).toFixed(2) }}
              </p>
            </div>
            <div class="p-3 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
              <UIcon name="i-lucide-receipt" class="w-8 h-8 text-amber-600" />
            </div>
          </div>
        </UCard>
      </div>

      <UCard>
        <UTable :data="outstandingData" :columns="tableColumns" :loading="isLoading">
          <template #totalBilled-cell="{ row }">
            ${{ row.original.totalBilled.toFixed(2) }}
          </template>
          <template #totalPaid-cell="{ row }">
            ${{ row.original.totalPaid.toFixed(2) }}
          </template>
          <template #balance-cell="{ row }">
            <span class="font-medium text-red-600">${{ row.original.balance.toFixed(2) }}</span>
          </template>
          <template #lastPayment-cell="{ row }">
            {{ row.original.lastPayment ? new Date(row.original.lastPayment).toLocaleDateString() : 'N/A' }}
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
