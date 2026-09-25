<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import ReportDataTable from '~/components/reports/ReportDataTable.vue'
import type { ReportColumn } from '~/types/reports'

type TabKey = 'valuation' | 'expiry' | 'movement' | 'variance'

const { t } = useI18n()

const today = new Date().toISOString().slice(0, 10)
const monthStart = `${today.slice(0, 8)}01`
const range = reactive({ start: monthStart, end: today })
const activeTab = ref<TabKey>('valuation')

const TABS: Record<TabKey, { endpoint: string, dated: boolean, columns: ReportColumn[] }> = {
  valuation: {
    endpoint: '/reports/pharmacy/inventory-valuation',
    dated: false,
    columns: [
      { key: 'medicineCode', labelKey: 'report.cols.code' },
      { key: 'medicineName', labelKey: 'report.cols.medicine' },
      { key: 'stockQuantity', labelKey: 'report.cols.stockQty', format: 'number' },
      { key: 'saleUnit', labelKey: 'report.cols.unit' },
      { key: 'inventoryValueAtCost', labelKey: 'report.cols.valueAtCost', format: 'money' },
      { key: 'inventoryValueAtRetail', labelKey: 'report.cols.valueAtRetail', format: 'money' },
      { key: 'currency', labelKey: 'report.cols.currency' },
      { key: 'stockStatus', labelKey: 'common.status' }
    ]
  },
  expiry: {
    endpoint: '/reports/pharmacy/expiry-alerts',
    dated: false,
    columns: [
      { key: 'medicineName', labelKey: 'report.cols.medicine' },
      { key: 'batchNumber', labelKey: 'report.cols.batch' },
      { key: 'expiryDate', labelKey: 'report.cols.expiryDate', format: 'date' },
      { key: 'daysToExpiry', labelKey: 'report.cols.daysToExpiry', format: 'number' },
      { key: 'quantity', labelKey: 'report.cols.qtyBase', format: 'number' },
      { key: 'totalValue', labelKey: 'report.cols.value', format: 'money' },
      { key: 'location', labelKey: 'report.cols.location' }
    ]
  },
  movement: {
    endpoint: '/reports/pharmacy/stock-movement',
    dated: true,
    columns: [
      { key: 'date', labelKey: 'common.date', format: 'date' },
      { key: 'medicineName', labelKey: 'report.cols.medicine' },
      { key: 'transactionType', labelKey: 'report.cols.type' },
      { key: 'referenceType', labelKey: 'report.cols.reference' },
      { key: 'quantity', labelKey: 'report.cols.qtyBase', format: 'number' },
      { key: 'balance', labelKey: 'report.cols.balance', format: 'number' },
      { key: 'totalCost', labelKey: 'report.cols.cost', format: 'money' },
      { key: 'supplierName', labelKey: 'report.cols.supplier' }
    ]
  },
  variance: {
    endpoint: '/reports/pharmacy/purchase-price-variance',
    dated: true,
    columns: [
      { key: 'purchaseDate', labelKey: 'common.date', format: 'date' },
      { key: 'poNumber', labelKey: 'report.cols.invoice' },
      { key: 'medicineName', labelKey: 'report.cols.medicine' },
      { key: 'supplierName', labelKey: 'report.cols.supplier' },
      { key: 'unitStandardPrice', labelKey: 'report.cols.standardPrice', format: 'money' },
      { key: 'unitActualPrice', labelKey: 'report.cols.actualPrice', format: 'money' },
      { key: 'priceVariancePercent', labelKey: 'report.cols.variance', format: 'percent' },
      { key: 'totalVariance', labelKey: 'report.cols.totalVariance', format: 'money' }
    ]
  }
}

const tabItems = (Object.keys(TABS) as TabKey[]).map(key => ({ label: t(`report.pharmacyTabs.${key}`), value: key }))
const state = reactive<Record<TabKey, { rows: Record<string, unknown>[], loading: boolean, error: string }>>({
  valuation: { rows: [], loading: false, error: '' },
  expiry: { rows: [], loading: false, error: '' },
  movement: { rows: [], loading: false, error: '' },
  variance: { rows: [], loading: false, error: '' }
})

async function load(key: TabKey = activeTab.value) {
  const tab = TABS[key]
  state[key].loading = true
  state[key].error = ''
  try {
    const res: { data?: Record<string, unknown>[] } = await $api(tab.endpoint, {
      params: tab.dated ? { startDate: range.start, endDate: range.end } : {}
    })
    state[key].rows = res?.data ?? []
  } catch (err) {
    state[key].rows = []
    state[key].error = getApiErrorMessage(err, t('report.loadFailed'))
  } finally {
    state[key].loading = false
  }
}

onMounted(() => load())
</script>

<template>
  <div class="p-4 space-y-4">
    <UBreadcrumb :items="[{ label: t('nav.home'), to: '/' }, { label: t('report.title'), to: '/reports' }, { label: t('report.pharmacyReports') }]" />
    <h1 class="text-xl font-bold">
      {{ t('report.pharmacyReports') }}
    </h1>

    <UTabs
      v-model="activeTab"
      :items="tabItems"
      :content="false"
      @update:model-value="(key) => load(key as TabKey)"
    />

    <div v-if="TABS[activeTab].dated" class="flex flex-wrap items-end gap-2">
      <UFormField :label="t('report.from')">
        <UInput v-model="range.start" type="date" />
      </UFormField>
      <UFormField :label="t('report.to')">
        <UInput v-model="range.end" type="date" />
      </UFormField>
      <UButton :label="t('common.refresh')" icon="i-lucide-refresh-cw" @click="load()" />
    </div>

    <UCard>
      <ReportDataTable
        :columns="TABS[activeTab].columns"
        :rows="state[activeTab].rows"
        :loading="state[activeTab].loading"
        :error="state[activeTab].error"
      />
    </UCard>
  </div>
</template>
