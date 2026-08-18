<script setup lang="ts">
const { t } = useI18n()
const exportUtils = useExport()
const branch = useBranch()

const breadcrumbItems = computed(() => [
  { label: t('nav.home'), to: '/' },
  { label: t('report.title'), to: '/reports' },
  { label: t('report.departmentReport') }
])

const dateRange = ref({
  start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
  end: new Date().toISOString().split('T')[0]
})

const isLoading = ref(false)
const departmentData = ref<any[]>([])

const totalVisits = computed(() => departmentData.value.reduce((sum, d) => sum + d.totalVisits, 0))
const totalRevenue = computed(() => departmentData.value.reduce((sum, d) => sum + d.totalRevenue, 0))

async function fetchDepartmentPerformance() {
  isLoading.value = true
  try {
    const params: any = {
      startDate: dateRange.value.start,
      endDate: dateRange.value.end
    }
    if (branch.currentBranchId.value) {
      params.branchId = branch.currentBranchId.value
    }
    const res = await $api<any>('/reports/departments/performance', { params })
    departmentData.value = res?.data || []
  } catch (e) {
    console.error('Failed to fetch department performance:', e)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchDepartmentPerformance()
})

function onDateChange() {
  fetchDepartmentPerformance()
}

function exportCSV() {
  exportUtils.exportToCSV(departmentData.value, [
    { key: 'department', label: 'Department' },
    { key: 'totalVisits', label: 'Total Visits' },
    { key: 'completedVisits', label: 'Completed' },
    { key: 'totalRevenue', label: 'Revenue' },
    { key: 'totalBilled', label: 'Total Billed' }
  ], 'department-performance')
}

function exportExcel() {
  exportUtils.exportToXLSX(departmentData.value, [
    { key: 'department', label: 'Department' },
    { key: 'totalVisits', label: 'Total Visits' },
    { key: 'completedVisits', label: 'Completed' },
    { key: 'totalRevenue', label: 'Revenue' },
    { key: 'totalBilled', label: 'Total Billed' }
  ], 'department-performance', t('report.departmentReport'))
}

function printReport() {
  window.print()
}

function getDepartmentIcon(dept: string) {
  switch (dept) {
    case 'opd': return 'i-lucide-stethoscope'
    case 'ipd': return 'i-lucide-bed'
    case 'laboratory': return 'i-lucide-test-tube'
    case 'pharmacy': return 'i-lucide-pill'
    default: return 'i-lucide-building'
  }
}

function getDepartmentColor(dept: string) {
  switch (dept) {
    case 'opd': return 'blue'
    case 'ipd': return 'green'
    case 'laboratory': return 'amber'
    case 'pharmacy': return 'purple'
    default: return 'gray'
  }
}
</script>

<template>
  <div class="p-6 space-y-6">
    <UBreadcrumb :items="breadcrumbItems" />

    <PrintLayout :title="t('report.departmentReport')" :show-signature="true">
      <div class="flex items-center justify-between mb-6 no-print">
        <div>
          <h1 class="text-2xl font-bold">
            {{ t('report.departmentReport') }}
          </h1>
          <p class="text-gray-600 dark:text-gray-400 mt-1">
            Department performance metrics
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
          <UButton icon="i-lucide-refresh-cw" :loading="isLoading" @click="fetchDepartmentPerformance">
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
                Total Visits
              </p>
              <p class="text-3xl font-bold mt-1">
                {{ totalVisits }}
              </p>
            </div>
            <div class="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <UIcon name="i-lucide-activity" class="w-8 h-8 text-blue-600" />
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
        <UCard>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">
                Departments
              </p>
              <p class="text-3xl font-bold mt-1">
                {{ departmentData.length }}
              </p>
            </div>
            <div class="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <UIcon name="i-lucide-building" class="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </UCard>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <UCard
          v-for="dept in departmentData"
          :key="dept.department"
          :class="`border-l-4 border-${getDepartmentColor(dept.department)}-500`"
        >
          <div class="flex items-center gap-3 mb-4">
            <div :class="`p-3 bg-${getDepartmentColor(dept.department)}-100 dark:bg-${getDepartmentColor(dept.department)}-900/20 rounded-lg`">
              <UIcon :name="getDepartmentIcon(dept.department)" :class="`w-6 h-6 text-${getDepartmentColor(dept.department)}-600`" />
            </div>
            <div>
              <p class="font-semibold capitalize">
                {{ dept.department }}
              </p>
              <p class="text-sm text-gray-500">
                {{ dept.totalVisits }} visits
              </p>
            </div>
          </div>
          <div class="space-y-2">
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">Completed</span>
              <span class="font-medium">{{ dept.completedVisits }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">Revenue</span>
              <span class="font-medium text-green-600">${{ dept.totalRevenue.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-gray-500">Billed</span>
              <span class="font-medium">${{ dept.totalBilled.toFixed(2) }}</span>
            </div>
          </div>
        </UCard>
      </div>

      <UCard>
        <UTable
          :data="departmentData"
          :columns="[
            { accessorKey: 'department', header: 'Department' },
            { accessorKey: 'totalVisits', header: 'Total Visits' },
            { accessorKey: 'completedVisits', header: 'Completed' },
            { accessorKey: 'totalRevenue', header: 'Revenue' },
            { accessorKey: 'totalBilled', header: 'Total Billed' }
          ]"
          :loading="isLoading"
        >
          <template #department-cell="{ row }">
            <div class="flex items-center gap-2">
              <UIcon :name="getDepartmentIcon(row.original.department)" :class="`w-5 h-5 text-${getDepartmentColor(row.original.department)}-600`" />
              <span class="capitalize font-medium">{{ row.original.department }}</span>
            </div>
          </template>
          <template #totalRevenue-cell="{ row }">
            ${{ row.original.totalRevenue.toFixed(2) }}
          </template>
          <template #totalBilled-cell="{ row }">
            ${{ row.original.totalBilled.toFixed(2) }}
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
