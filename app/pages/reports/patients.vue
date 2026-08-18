<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const { t } = useI18n()
const auth = useAuth()
const branch = useBranch()

const breadcrumbItems = computed(() => [
  { label: t('nav.home'), to: '/' },
  { label: t('report.title'), to: '/reports' },
  { label: t('report.patientAnalysis') }
])

const dateRange = ref({
  start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
  end: new Date().toISOString().split('T')[0]
})

const isLoading = ref(false)
const stats = ref({
  total: 0,
  male: 0,
  female: 0,
  byAge: [] as any[],
  byProvince: [] as any[],
  byMonth: [] as any[],
  newThisMonth: 0,
  returningRate: 0
})

async function fetchStats() {
  isLoading.value = true
  try {
    const params: any = {
      startDate: dateRange.value.start,
      endDate: dateRange.value.end
    }
    if (branch.currentBranchId.value) {
      params.branchId = branch.currentBranchId.value
    }
    const res = await $api<any>('/patients/stats/analysis', { params })
    if (res?.data) {
      stats.value = res.data
    }
  } catch (e) {
    console.error('Failed to fetch stats:', e)
  } finally {
    isLoading.value = false
  }
}

const genderPercentages = computed(() => {
  const total = stats.value.male + stats.value.female
  if (total === 0) return { male: 0, female: 0 }
  return {
    male: Math.round((stats.value.male / total) * 100),
    female: Math.round((stats.value.female / total) * 100)
  }
})

const maxProvinceCount = computed(() => {
  return Math.max(...(stats.value.byProvince?.map(p => p.count) || [1]))
})

function printReport() {
  window.print()
}

onMounted(() => {
  fetchStats()
})
</script>

<template>
  <div class="p-6 space-y-6">
    <UBreadcrumb :items="breadcrumbItems" />

    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">
          {{ t('report.patientAnalysis') }}
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">
          Patient demographics and statistics
        </p>
      </div>
      <div class="flex items-center gap-4 no-print">
        <div class="flex items-center gap-2">
          <UInput v-model="dateRange.start" type="date" />
          <span class="text-gray-500">-</span>
          <UInput v-model="dateRange.end" type="date" />
        </div>
        <UButton icon="i-lucide-refresh-cw" :loading="isLoading" @click="fetchStats">
          {{ t('common.refresh') }}
        </UButton>
        <UButton icon="i-lucide-printer" color="primary" @click="printReport">
          {{ t('common.print') || 'Print' }}
        </UButton>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">
              {{ t('patient.total') }}
            </p>
            <p class="text-3xl font-bold mt-1">
              {{ stats.total }}
            </p>
          </div>
          <div class="p-3 bg-primary-100 dark:bg-primary-900/20 rounded-lg">
            <UIcon name="i-lucide-users" class="w-8 h-8 text-primary-600" />
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">
              {{ t('patient.male') }}
            </p>
            <p class="text-3xl font-bold mt-1">
              {{ stats.male }}
            </p>
            <p class="text-xs text-gray-500">
              {{ genderPercentages.male }}%
            </p>
          </div>
          <div class="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <UIcon name="i-lucide-user" class="w-8 h-8 text-blue-600" />
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">
              {{ t('patient.female') }}
            </p>
            <p class="text-3xl font-bold mt-1">
              {{ stats.female }}
            </p>
            <p class="text-xs text-gray-500">
              {{ genderPercentages.female }}%
            </p>
          </div>
          <div class="p-3 bg-pink-100 dark:bg-pink-900/20 rounded-lg">
            <UIcon name="i-lucide-user" class="w-8 h-8 text-pink-600" />
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">
              New This Month
            </p>
            <p class="text-3xl font-bold mt-1">
              {{ stats.newThisMonth }}
            </p>
          </div>
          <div class="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
            <UIcon name="i-lucide-user-plus" class="w-8 h-8 text-green-600" />
          </div>
        </div>
      </UCard>
    </div>

    <!-- Charts Row -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Gender Distribution -->
      <UCard>
        <template #header>
          <h3 class="font-semibold">
            {{ t('patient.gender') }} Distribution
          </h3>
        </template>
        <div class="space-y-4">
          <div>
            <div class="flex justify-between text-sm mb-1">
              <span>{{ t('patient.male') }}</span>
              <span class="font-medium">{{ stats.male }} ({{ genderPercentages.male }}%)</span>
            </div>
            <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                class="h-full bg-blue-500 rounded-full transition-all"
                :style="{ width: `${genderPercentages.male}%` }"
              />
            </div>
          </div>
          <div>
            <div class="flex justify-between text-sm mb-1">
              <span>{{ t('patient.female') }}</span>
              <span class="font-medium">{{ stats.female }} ({{ genderPercentages.female }}%)</span>
            </div>
            <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                class="h-full bg-pink-500 rounded-full transition-all"
                :style="{ width: `${genderPercentages.female}%` }"
              />
            </div>
          </div>
        </div>
      </UCard>

      <!-- Top Provinces -->
      <UCard>
        <template #header>
          <h3 class="font-semibold">
            {{ t('patient.province') }} Distribution
          </h3>
        </template>
        <div class="space-y-3">
          <div
            v-for="(item, index) in stats.byProvince?.slice(0, 6)"
            :key="index"
            class="flex items-center gap-3"
          >
            <span class="w-6 h-6 flex items-center justify-center bg-primary-100 dark:bg-primary-900/20 rounded-full text-xs font-bold">
              {{ index + 1 }}
            </span>
            <span class="flex-1 font-medium truncate">{{ item.name }}</span>
            <div class="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                class="h-full bg-primary-500 rounded-full"
                :style="{ width: `${(item.count / maxProvinceCount) * 100}%` }"
              />
            </div>
            <span class="text-gray-500 text-sm w-16 text-right">{{ item.count }}</span>
            <UBadge color="primary" variant="soft" size="sm">
              {{ Math.round(item.percentage) }}%
            </UBadge>
          </div>
          <div v-if="!stats.byProvince?.length" class="text-center text-gray-500 py-8">
            {{ t('common.noData') }}
          </div>
        </div>
      </UCard>
    </div>

    <!-- Age Distribution -->
    <UCard>
      <template #header>
        <h3 class="font-semibold">
          {{ t('patient.age') }} Distribution
        </h3>
      </template>
      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div
          v-for="(item, index) in stats.byAge"
          :key="index"
          class="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
        >
          <p class="text-sm text-gray-500 mb-1">
            {{ item.label }}
          </p>
          <p class="text-2xl font-bold text-primary-600">
            {{ item.count }}
          </p>
        </div>
        <div v-if="!stats.byAge?.length" class="col-span-7 text-center text-gray-500 py-8">
          {{ t('common.noData') }}
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

  .grid {
    break-inside: avoid;
  }

  .bg-primary-100, .bg-blue-100, .bg-pink-100, .bg-green-100 {
    background-color: transparent !important;
  }

  .dark\:bg-primary-900\/20, .dark\:bg-blue-900\/20, .dark\:bg-pink-900\/20, .dark\:bg-green-900\/20 {
    background-color: transparent !important;
  }
}
</style>
