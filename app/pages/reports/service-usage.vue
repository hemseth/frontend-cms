<script setup lang="ts">
const { t } = useI18n()
const exportUtils = useExport()
const branch = useBranch()

const breadcrumbItems = computed(() => [
  { label: t('nav.home'), to: '/' },
  { label: t('report.title'), to: '/reports' },
  { label: t('report.serviceUsage') }
])

const dateRange = ref({
  start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
  end: new Date().toISOString().split('T')[0]
})

const isLoading = ref(false)
const servicesData = ref<any[]>([])

const totalRevenue = computed(() => servicesData.value.reduce((sum, s) => sum + s.revenue, 0))
const totalCount = computed(() => servicesData.value.reduce((sum, s) => sum + s.count, 0))

async function fetchServiceUsage() {
  isLoading.value = true
  try {
    const params: any = {
      startDate: dateRange.value.start,
      endDate: dateRange.value.end
    }
    if (branch.currentBranchId.value) {
      params.branchId = branch.currentBranchId.value
    }
    const res = await $api<any>('/reports/services/usage', { params })
    servicesData.value = res?.data || []
  } catch (e) {
    console.error('Failed to fetch service usage:', e)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchServiceUsage()
})

function onDateChange() {
  fetchServiceUsage()
}

function exportCSV() {
  exportUtils.exportToCSV(servicesData.value, [
    { key: 'name', label: 'Service' },
    { key: 'count', label: 'Usage Count' },
    { key: 'revenue', label: 'Revenue' }
  ], 'service-usage')
}

function exportExcel() {
  exportUtils.exportToXLSX(servicesData.value, [
    { key: 'name', label: 'Service' },
    { key: 'count', label: 'Usage Count' },
    { key: 'revenue', label: 'Revenue' }
  ], 'service-usage', t('report.serviceUsage'))
}

function printReport() {
  window.print()
}
</script>

<template>
  <div class="p-6 space-y-6">
    <UBreadcrumb :items="breadcrumbItems" />

    <PrintLayout :title="t('report.serviceUsage')" :show-signature="true">
      <div class="flex items-center justify-between mb-6 no-print">
        <div>
          <h1 class="text-2xl font-bold">
            {{ t('report.serviceUsage') }}
          </h1>
          <p class="text-gray-600 dark:text-gray-400 mt-1">
            Service utilization statistics
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
          <UButton icon="i-lucide-refresh-cw" :loading="isLoading" @click="fetchServiceUsage">
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
                Total Services
              </p>
              <p class="text-3xl font-bold mt-1">
                {{ servicesData.length }}
              </p>
            </div>
            <div class="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <UIcon name="i-lucide-list" class="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </UCard>
        <UCard>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">
                Total Usage
              </p>
              <p class="text-3xl font-bold mt-1">
                {{ totalCount }}
              </p>
            </div>
            <div class="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <UIcon name="i-lucide-activity" class="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </UCard>
        <UCard>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">
                Total Revenue
              </p>
              <p class="text-3xl font-bold mt-1 text-green-600">
                ${{ totalRevenue.toFixed(2) }}
              </p>
            </div>
            <div class="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <UIcon name="i-lucide-dollar-sign" class="w-8 h-8 text-green-600" />
            </div>
          </div>
        </UCard>
      </div>

      <UCard>
        <UTable
          :data="servicesData"
          :columns="[
            { accessorKey: 'name', header: 'Service Name' },
            { accessorKey: 'count', header: 'Times Used' },
            { accessorKey: 'revenue', header: 'Revenue' }
          ]"
          :loading="isLoading"
        >
          <template #name-cell="{ row }">
            <span class="font-medium">{{ row.original.name }}</span>
          </template>
          <template #count-cell="{ row }">
            <UBadge color="primary" variant="soft">
              {{ row.original.count }}
            </UBadge>
          </template>
          <template #revenue-cell="{ row }">
            <span class="font-medium text-green-600">${{ row.original.revenue.toFixed(2) }}</span>
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
