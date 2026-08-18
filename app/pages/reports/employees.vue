<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

const { t } = useI18n()
const exportUtils = useExport()
const branch = useBranch()

const breadcrumbItems = computed(() => [
  { label: t('nav.home'), to: '/' },
  { label: t('report.title'), to: '/reports' },
  { label: t('report.employeeList') }
])

const isLoading = ref(false)
const employees = ref<any[]>([])

const columns = [
  { key: 'nameEn', label: 'Name' },
  { key: 'nameKh', label: 'Khmer Name' },
  { key: 'role', label: 'Role' },
  { key: 'specialization', label: 'Specialization' },
  { key: 'phone', label: 'Phone' },
  { key: 'gender', label: 'Gender' },
  { key: 'active', label: 'Status' }
]

const tableColumns: TableColumn<any>[] = columns.map(c => ({ accessorKey: c.key, header: c.label }))

async function fetchEmployees() {
  isLoading.value = true
  try {
    const params: any = {}
    if (branch.currentBranchId.value) {
      params.branchId = branch.currentBranchId.value
    }
    const res = await $api<any>('/reports/employees', { params })
    employees.value = res?.data || []
  } catch (e) {
    console.error('Failed to fetch employees:', e)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchEmployees()
})

function exportCSV() {
  exportUtils.exportToCSV(employees.value, columns, 'employee-list')
}

function exportExcel() {
  exportUtils.exportToXLSX(employees.value, columns, 'employee-list', t('report.employeeList'))
}

function printReport() {
  window.print()
}
</script>

<template>
  <div class="p-6 space-y-6">
    <UBreadcrumb :items="breadcrumbItems" />

    <PrintLayout :title="t('report.employeeList')" :show-signature="true">
      <div class="flex items-center justify-between mb-6 no-print">
        <div>
          <h1 class="text-2xl font-bold">
            {{ t('report.employeeList') }}
          </h1>
          <p class="text-gray-600 dark:text-gray-400 mt-1">
            Staff directory
          </p>
        </div>
        <div class="flex items-center gap-4">
          <UButton icon="i-lucide-refresh-cw" :loading="isLoading" @click="fetchEmployees">
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
                Total Staff
              </p>
              <p class="text-3xl font-bold mt-1">
                {{ employees.length }}
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
                Doctors
              </p>
              <p class="text-3xl font-bold mt-1">
                {{ employees.filter(e => e.role === 'Doctor').length }}
              </p>
            </div>
            <div class="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <UIcon name="i-lucide-user-md" class="w-8 h-8 text-green-600" />
            </div>
          </div>
        </UCard>
        <UCard>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">
                Nurses
              </p>
              <p class="text-3xl font-bold mt-1">
                {{ employees.filter(e => e.role === 'Nurse').length }}
              </p>
            </div>
            <div class="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <UIcon name="i-lucide-user" class="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </UCard>
        <UCard>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">
                Active
              </p>
              <p class="text-3xl font-bold mt-1 text-green-600">
                {{ employees.filter(e => e.active === 1).length }}
              </p>
            </div>
            <div class="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <UIcon name="i-lucide-check-circle" class="w-8 h-8 text-green-600" />
            </div>
          </div>
        </UCard>
      </div>

      <UCard>
        <UTable :data="employees" :columns="tableColumns" :loading="isLoading">
          <template #active-cell="{ row }">
            <UBadge :color="row.original.active === 1 ? 'success' : 'error'">
              {{ row.original.active === 1 ? 'Active' : 'Inactive' }}
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
