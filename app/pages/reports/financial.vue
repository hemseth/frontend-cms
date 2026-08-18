<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const { t } = useI18n()
const auth = useAuth()
const branch = useBranch()

const breadcrumbItems = computed(() => [
  { label: t('nav.home'), to: '/' },
  { label: t('report.title'), to: '/reports' },
  { label: t('report.financialReport') }
])

const dateRange = ref({
  start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
  end: new Date().toISOString().split('T')[0]
})

const isLoading = ref(false)

const stats = ref({
  totalRevenue: 0,
  totalExpenses: 0,
  netProfit: 0,
  totalBilled: 0,
  totalPaid: 0,
  balanceDue: 0,
  byService: [] as any[],
  byPaymentMethod: [] as any[],
  monthlyTrend: [] as any[],
  revenueByDepartment: [] as any[]
})

async function fetchFinancialStats() {
  isLoading.value = true
  try {
    const params: any = {
      startDate: dateRange.value.start,
      endDate: dateRange.value.end
    }
    if (branch.currentBranchId.value) {
      params.branchId = branch.currentBranchId.value
    }

    const [paymentsRes, revenuesRes, expensesRes] = await Promise.all([
      $api<any>('/payments/stats', { params }),
      $api<any>('/revenues/stats', { params }),
      $api<any>('/expenses/stats', { params })
    ])

    const totalRevenue = paymentsRes?.data?.totalPaid || 0
    const totalExpenses = expensesRes?.data?.total || 0

    stats.value = {
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      totalBilled: paymentsRes?.data?.totalBilled || 0,
      totalPaid: totalRevenue,
      balanceDue: paymentsRes?.data?.balanceDue || 0,
      byService: [],
      byPaymentMethod: [],
      monthlyTrend: [],
      revenueByDepartment: []
    }
  } catch (e) {
    console.error('Failed to fetch financial stats:', e)
  } finally {
    isLoading.value = false
  }
}

const profitMargin = computed(() => {
  if (stats.value.totalRevenue === 0) return 0
  return Math.round((stats.value.netProfit / stats.value.totalRevenue) * 100)
})

const collectionRate = computed(() => {
  if (stats.value.totalBilled === 0) return 0
  return Math.round((stats.value.totalPaid / stats.value.totalBilled) * 100)
})

function printReport() {
  window.print()
}

onMounted(() => {
  fetchFinancialStats()
})
</script>

<template>
  <div class="p-6 space-y-6">
    <UBreadcrumb :items="breadcrumbItems" />

    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">
          {{ t('report.financialReport') }}
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">
          Financial overview and analytics
        </p>
      </div>
      <div class="flex items-center gap-4 no-print">
        <div class="flex items-center gap-2">
          <UInput v-model="dateRange.start" type="date" />
          <span class="text-gray-500">-</span>
          <UInput v-model="dateRange.end" type="date" />
        </div>
        <UButton icon="i-lucide-refresh-cw" :loading="isLoading" @click="fetchFinancialStats">
          {{ t('common.refresh') }}
        </UButton>
        <UButton icon="i-lucide-printer" color="primary" @click="printReport">
          {{ t('common.print') || 'Print' }}
        </UButton>
      </div>
    </div>

    <!-- Revenue Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">
              Total Revenue
            </p>
            <p class="text-3xl font-bold mt-1 text-green-600">
              ${{ stats.totalRevenue.toFixed(2) }}
            </p>
          </div>
          <div class="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
            <UIcon name="i-lucide-trending-up" class="w-8 h-8 text-green-600" />
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">
              Total Expenses
            </p>
            <p class="text-3xl font-bold mt-1 text-red-600">
              ${{ stats.totalExpenses.toFixed(2) }}
            </p>
          </div>
          <div class="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
            <UIcon name="i-lucide-trending-down" class="w-8 h-8 text-red-600" />
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">
              Net Profit
            </p>
            <p class="text-3xl font-bold mt-1" :class="stats.netProfit >= 0 ? 'text-primary-600' : 'text-red-600'">
              ${{ stats.netProfit.toFixed(2) }}
            </p>
          </div>
          <div class="p-3 bg-primary-100 dark:bg-primary-900/20 rounded-lg">
            <UIcon name="i-lucide-wallet" class="w-8 h-8 text-primary-600" />
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">
              Profit Margin
            </p>
            <p class="text-3xl font-bold mt-1" :class="profitMargin >= 0 ? 'text-green-600' : 'text-red-600'">
              {{ profitMargin }}%
            </p>
          </div>
          <div class="p-3 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
            <UIcon name="i-lucide-percent" class="w-8 h-8 text-amber-600" />
          </div>
        </div>
      </UCard>
    </div>

    <!-- Billing Stats -->
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
          <div class="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <UIcon name="i-lucide-file-text" class="w-8 h-8 text-blue-600" />
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
              ${{ stats.totalPaid.toFixed(2) }}
            </p>
          </div>
          <div class="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
            <UIcon name="i-lucide-check-circle" class="w-8 h-8 text-green-600" />
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">
              Outstanding
            </p>
            <p class="text-2xl font-bold mt-1 text-red-600">
              ${{ stats.balanceDue.toFixed(2) }}
            </p>
            <p class="text-xs text-gray-500">
              Collection: {{ collectionRate }}%
            </p>
          </div>
          <div class="p-3 bg-red-100 dark:bg-red-900/20 rounded-lg">
            <UIcon name="i-lucide-clock" class="w-8 h-8 text-red-600" />
          </div>
        </div>
      </UCard>
    </div>

    <!-- Collection Progress -->
    <UCard>
      <template #header>
        <h3 class="font-semibold">
          Collection Progress
        </h3>
      </template>
      <div class="space-y-3">
        <div>
          <div class="flex justify-between text-sm mb-1">
            <span>Collected</span>
            <span class="font-medium">${{ stats.totalPaid.toFixed(2) }} ({{ collectionRate }}%)</span>
          </div>
          <div class="h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              class="h-full bg-green-500 rounded-full transition-all"
              :style="{ width: `${collectionRate}%` }"
            />
          </div>
        </div>
        <div>
          <div class="flex justify-between text-sm mb-1">
            <span>Outstanding</span>
            <span class="font-medium">${{ stats.balanceDue.toFixed(2) }} ({{ 100 - collectionRate }}%)</span>
          </div>
          <div class="h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              class="h-full bg-red-500 rounded-full transition-all"
              :style="{ width: `${100 - collectionRate}%` }"
            />
          </div>
        </div>
      </div>
    </UCard>

    <!-- Quick Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <UCard>
        <template #header>
          <h3 class="font-semibold">
            Income vs Expenses
          </h3>
        </template>
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 bg-green-500 rounded-full" />
              <span>{{ t('revenue.title') }}</span>
            </div>
            <span class="font-bold text-green-600">${{ stats.totalRevenue.toFixed(2) }}</span>
          </div>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-3 h-3 bg-red-500 rounded-full" />
              <span>{{ t('expense.title') }}</span>
            </div>
            <span class="font-bold text-red-600">${{ stats.totalExpenses.toFixed(2) }}</span>
          </div>
          <hr class="border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <span class="font-semibold">{{ t('report.netProfit') || 'Net Profit' }}</span>
            <span class="font-bold text-xl" :class="stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'">
              ${{ stats.netProfit.toFixed(2) }}
            </span>
          </div>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h3 class="font-semibold">
            {{ t('payment.method') }} Distribution
          </h3>
        </template>
        <div class="space-y-4">
          <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-banknote" class="w-5 h-5 text-green-600" />
              <span>Cash</span>
            </div>
            <UBadge color="success" variant="soft">
              Primary
            </UBadge>
          </div>
          <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-credit-card" class="w-5 h-5 text-blue-600" />
              <span>ABA QR</span>
            </div>
            <UBadge color="info" variant="soft">
              Popular
            </UBadge>
          </div>
          <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-smartphone" class="w-5 h-5 text-orange-600" />
              <span>Wing</span>
            </div>
            <UBadge color="warning" variant="soft">
              Available
            </UBadge>
          </div>
        </div>
      </UCard>
    </div>
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

  .bg-green-100, .bg-red-100, .bg-primary-100, .bg-amber-100, .bg-blue-100 {
    background-color: transparent !important;
  }

  .dark\:bg-green-900\/20, .dark\:bg-red-900\/20, .dark\:bg-primary-900\/20, .dark\:bg-amber-900\/20, .dark\:bg-blue-900\/20 {
    background-color: transparent !important;
  }
}
</style>
