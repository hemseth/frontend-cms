<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const { t } = useI18n()
const auth = useAuth()
const branch = useBranch()

const breadcrumbItems = computed(() => [
  { label: t('nav.home'), to: '/' },
  { label: t('report.title'), to: '/reports' },
  { label: t('report.dailyReport') }
])

const selectedDate = ref(new Date().toISOString().split('T')[0])
const isLoading = ref(false)

const stats = ref({
  totalPatients: 0,
  newPatients: 0,
  totalVisits: 0,
  totalRevenue: 0,
  totalBilled: 0,
  balanceDue: 0,
  byDepartment: { opd: 0, ipd: 0, laboratory: 0, pharmacy: 0 },
  byPaymentMethod: { cash: 0, aba: 0, wing: 0 },
  recentVisits: [] as any[],
  recentPayments: [] as any[]
})

async function fetchDailyStats() {
  isLoading.value = true
  try {
    const params: any = { date: selectedDate.value }
    if (branch.currentBranchId.value) {
      params.branchId = branch.currentBranchId.value
    }

    const [visitsRes, paymentsRes, patientStats] = await Promise.all([
      $api<any>('/visits/stats', { params }),
      $api<any>('/payments/stats', { params }),
      $api<any>('/patients/stats', { params })
    ])

    stats.value = {
      totalPatients: patientStats?.data?.total || 0,
      newPatients: patientStats?.data?.newToday || 0,
      totalVisits: visitsRes?.data?.today || 0,
      totalRevenue: paymentsRes?.data?.totalPaid || 0,
      totalBilled: paymentsRes?.data?.totalBilled || 0,
      balanceDue: paymentsRes?.data?.balanceDue || 0,
      byDepartment: visitsRes?.data?.todayByDepartment || { opd: 0, ipd: 0, laboratory: 0, pharmacy: 0 },
      byPaymentMethod: { cash: 0, aba: 0, wing: 0 },
      recentVisits: [],
      recentPayments: []
    }
  } catch (e) {
    console.error('Failed to fetch daily stats:', e)
  } finally {
    isLoading.value = false
  }
}

const collectionRate = computed(() => {
  if (stats.value.totalBilled === 0) return 0
  return Math.round((stats.value.totalRevenue / stats.value.totalBilled) * 100)
})

function printReport() {
  window.print()
}

onMounted(() => {
  fetchDailyStats()
})
</script>

<template>
  <div class="p-6 space-y-6">
    <UBreadcrumb :items="breadcrumbItems" />

    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">
          {{ t('report.dailyReport') }}
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">
          {{ selectedDate }}
        </p>
      </div>
      <div class="flex items-center gap-4 no-print">
        <UInput v-model="selectedDate" type="date" @change="fetchDailyStats" />
        <UButton icon="i-lucide-refresh-cw" :loading="isLoading" @click="fetchDailyStats">
          {{ t('common.refresh') }}
        </UButton>
        <UButton icon="i-lucide-printer" color="primary" @click="printReport">
          {{ t('common.print') || 'Print' }}
        </UButton>
      </div>
    </div>

    <!-- Patient & Visit Stats -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">
              Total Patients
            </p>
            <p class="text-3xl font-bold mt-1">
              {{ stats.totalPatients }}
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
              New Patients
            </p>
            <p class="text-3xl font-bold mt-1 text-green-600">
              {{ stats.newPatients }}
            </p>
          </div>
          <div class="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
            <UIcon name="i-lucide-user-plus" class="w-8 h-8 text-green-600" />
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">
              {{ t('visit.title') }}
            </p>
            <p class="text-3xl font-bold mt-1">
              {{ stats.totalVisits }}
            </p>
          </div>
          <div class="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
            <UIcon name="i-lucide-stethoscope" class="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">
              Collection Rate
            </p>
            <p class="text-3xl font-bold mt-1 text-primary-600">
              {{ collectionRate }}%
            </p>
          </div>
          <div class="p-3 bg-primary-100 dark:bg-primary-900/20 rounded-lg">
            <UIcon name="i-lucide-percent" class="w-8 h-8 text-primary-600" />
          </div>
        </div>
      </UCard>
    </div>

    <!-- Financial Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">
              Total Billed
            </p>
            <p class="text-2xl font-bold mt-1">
              ${{ stats.totalBilled.toFixed(2) }}
            </p>
          </div>
          <div class="p-3 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
            <UIcon name="i-lucide-receipt" class="w-8 h-8 text-amber-600" />
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">
              Total Collected
            </p>
            <p class="text-2xl font-bold mt-1 text-green-600">
              ${{ stats.totalRevenue.toFixed(2) }}
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
              Balance Due
            </p>
            <p class="text-2xl font-bold mt-1 text-red-600">
              ${{ stats.balanceDue.toFixed(2) }}
            </p>
          </div>
          <div class="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
            <UIcon name="i-lucide-alert-circle" class="w-8 h-8 text-red-600" />
          </div>
        </div>
      </UCard>
    </div>

    <!-- Department Stats -->
    <UCard>
      <template #header>
        <h3 class="font-semibold">
          Visits by Department
        </h3>
      </template>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <UIcon name="i-lucide-stethoscope" class="w-8 h-8 text-blue-600 mx-auto mb-2" />
          <p class="text-3xl font-bold">
            {{ stats.byDepartment.opd }}
          </p>
          <p class="text-sm text-gray-500">
            {{ t('nav.opd') }}
          </p>
        </div>
        <div class="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <UIcon name="i-lucide-bed" class="w-8 h-8 text-green-600 mx-auto mb-2" />
          <p class="text-3xl font-bold">
            {{ stats.byDepartment.ipd }}
          </p>
          <p class="text-sm text-gray-500">
            {{ t('nav.ipd') }}
          </p>
        </div>
        <div class="text-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <UIcon name="i-lucide-flask-conical" class="w-8 h-8 text-amber-600 mx-auto mb-2" />
          <p class="text-3xl font-bold">
            {{ stats.byDepartment.laboratory }}
          </p>
          <p class="text-sm text-gray-500">
            {{ t('nav.lab') }}
          </p>
        </div>
        <div class="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <UIcon name="i-lucide-pill" class="w-8 h-8 text-purple-600 mx-auto mb-2" />
          <p class="text-3xl font-bold">
            {{ stats.byDepartment.pharmacy }}
          </p>
          <p class="text-sm text-gray-500">
            {{ t('nav.pharmacy') }}
          </p>
        </div>
      </div>
    </UCard>
  </div>
</template>

<style scoped>
@media print {
  :deep(.no-print) {
    display: none !important;
  }

  .print-only {
    display: block !important;
  }

  .p-6 {
    padding: 0 !important;
  }

  .space-y-6 > * + * {
    margin-top: 1rem;
  }

  .bg-blue-100, .bg-green-100, .bg-purple-100, .bg-amber-100, .bg-primary-100, .bg-red-100 {
    background-color: transparent !important;
  }

  .dark\:bg-blue-900\/20, .dark\:bg-green-900\/20, .dark\:bg-purple-900\/20, .dark\:bg-amber-900\/20, .dark\:bg-primary-900\/20, .dark\:bg-red-900\/20 {
    background-color: transparent !important;
  }
}
</style>
