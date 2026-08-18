<script setup lang="ts">
const { t } = useI18n()
const exportUtils = useExport()
const branch = useBranch()

const breadcrumbItems = computed(() => [
  { label: t('nav.home'), to: '/' },
  { label: t('report.title'), to: '/reports' },
  { label: t('report.topDiseases') }
])

const dateRange = ref({
  start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
  end: new Date().toISOString().split('T')[0]
})

const isLoading = ref(false)
const diseasesData = ref<any[]>([])

const maxCount = computed(() => Math.max(...diseasesData.value.map(d => d.count), 1))

async function fetchTopDiseases() {
  isLoading.value = true
  try {
    const params: any = {
      startDate: dateRange.value.start,
      endDate: dateRange.value.end
    }
    if (branch.currentBranchId.value) {
      params.branchId = branch.currentBranchId.value
    }
    const res = await $api<any>('/reports/diseases/top', { params })
    diseasesData.value = res?.data || []
  } catch (e) {
    console.error('Failed to fetch top diseases:', e)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchTopDiseases()
})

function onDateChange() {
  fetchTopDiseases()
}

function exportCSV() {
  exportUtils.exportToCSV(diseasesData.value, [
    { key: 'name', label: 'Disease' },
    { key: 'count', label: 'Cases' }
  ], 'top-diseases')
}

function exportExcel() {
  exportUtils.exportToXLSX(diseasesData.value, [
    { key: 'name', label: 'Disease' },
    { key: 'count', label: 'Cases' }
  ], 'top-diseases', t('report.topDiseases'))
}

function printReport() {
  window.print()
}
</script>

<template>
  <div class="p-6 space-y-6">
    <UBreadcrumb :items="breadcrumbItems" />

    <PrintLayout :title="t('report.topDiseases')" :show-signature="true">
      <div class="flex items-center justify-between mb-6 no-print">
        <div>
          <h1 class="text-2xl font-bold">
            {{ t('report.topDiseases') }}
          </h1>
          <p class="text-gray-600 dark:text-gray-400 mt-1">
            Most common diagnoses
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
          <UButton icon="i-lucide-refresh-cw" :loading="isLoading" @click="fetchTopDiseases">
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
                Total Diagnoses
              </p>
              <p class="text-3xl font-bold mt-1">
                {{ diseasesData.reduce((s, d) => s + d.count, 0) }}
              </p>
            </div>
            <div class="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <UIcon name="i-lucide-clipboard-list" class="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </UCard>
        <UCard>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500">
                Unique Diseases
              </p>
              <p class="text-3xl font-bold mt-1">
                {{ diseasesData.length }}
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
                Top Disease
              </p>
              <p class="text-lg font-bold mt-1 truncate">
                {{ diseasesData[0]?.name || 'N/A' }}
              </p>
            </div>
            <div class="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <UIcon name="i-lucide-trending-up" class="w-8 h-8 text-green-600" />
            </div>
          </div>
        </UCard>
      </div>

      <UCard>
        <template #header>
          <h3 class="font-semibold">
            Disease Distribution
          </h3>
        </template>
        <div class="space-y-4">
          <div
            v-for="(disease, index) in diseasesData.slice(0, 15)"
            :key="index"
            class="flex items-center gap-4"
          >
            <div class="w-8 h-8 flex items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/20 text-primary-600 font-bold text-sm">
              {{ index + 1 }}
            </div>
            <div class="flex-1">
              <div class="flex justify-between mb-1">
                <span class="font-medium">{{ disease.name }}</span>
                <span class="text-gray-500">{{ disease.count }} cases</span>
              </div>
              <div class="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  class="h-full bg-primary-500 rounded-full transition-all"
                  :style="{ width: `${(disease.count / maxCount) * 100}%` }"
                />
              </div>
            </div>
          </div>
          <div v-if="!diseasesData.length && !isLoading" class="text-center text-gray-500 py-8">
            {{ t('report.noData') }}
          </div>
        </div>
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
