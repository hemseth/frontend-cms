<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import ReportDataTable from '~/components/reports/ReportDataTable.vue'
import type { ReportColumn } from '~/types/reports'

type TabKey = 'revenue' | 'expense' | 'profitability'

interface CashFlow {
  operatingActivities: { cashIn: number, cashOut: number, net: number, byCurrency: Array<{ currency: string, cashIn: number, cashOut: number, net: number }> }
  notes: string[]
}

const { t } = useI18n()

const today = new Date().toISOString().slice(0, 10)
const range = reactive({ start: `${today.slice(0, 8)}01`, end: today })
const activeTab = ref<TabKey>('revenue')

const TABS: Record<TabKey, { endpoint: string, columns: ReportColumn[] }> = {
  revenue: {
    endpoint: '/reports/finance/revenue-by-service',
    columns: [
      { key: 'serviceType', labelKey: 'report.cols.category' },
      { key: 'currency', labelKey: 'report.cols.currency' },
      { key: 'totalBilled', labelKey: 'report.cols.billed', format: 'money' },
      { key: 'totalReceived', labelKey: 'report.cols.received', format: 'money' },
      { key: 'totalOutstanding', labelKey: 'report.cols.outstanding', format: 'money' },
      { key: 'transactionCount', labelKey: 'report.cols.invoices', format: 'number' },
      { key: 'collectionRate', labelKey: 'report.cols.collectionRate', format: 'percent' }
    ]
  },
  expense: {
    endpoint: '/reports/finance/expense-by-category',
    columns: [
      { key: 'category', labelKey: 'report.cols.category' },
      { key: 'totalAmount', labelKey: 'common.amount', format: 'money' },
      { key: 'transactionCount', labelKey: 'report.cols.entries', format: 'number' },
      { key: 'averageAmount', labelKey: 'report.cols.average', format: 'money' }
    ]
  },
  profitability: {
    endpoint: '/reports/finance/profitability-by-service',
    columns: [
      { key: 'serviceType', labelKey: 'report.cols.category' },
      { key: 'revenue', labelKey: 'report.cols.received', format: 'money' },
      { key: 'expenses', labelKey: 'report.cols.expenses', format: 'money' },
      { key: 'grossProfit', labelKey: 'report.cols.grossProfit', format: 'money' },
      { key: 'grossProfitMargin', labelKey: 'report.cols.margin', format: 'percent' }
    ]
  }
}

const tabItems = (Object.keys(TABS) as TabKey[]).map(key => ({ label: t(`report.financeTabs.${key}`), value: key }))
const state = reactive<Record<TabKey, { rows: Record<string, unknown>[], loading: boolean, error: string }>>({
  revenue: { rows: [], loading: false, error: '' },
  expense: { rows: [], loading: false, error: '' },
  profitability: { rows: [], loading: false, error: '' }
})
const cashFlow = ref<CashFlow | null>(null)
const cashFlowError = ref('')

const params = () => ({ startDate: range.start, endDate: range.end })

async function load(key: TabKey = activeTab.value) {
  state[key].loading = true
  state[key].error = ''
  try {
    const res: { data?: Record<string, unknown>[] } = await $api(TABS[key].endpoint, { params: params() })
    state[key].rows = res?.data ?? []
  } catch (err) {
    state[key].rows = []
    state[key].error = getApiErrorMessage(err, t('report.loadFailed'))
  } finally {
    state[key].loading = false
  }
}

async function loadCashFlow() {
  cashFlowError.value = ''
  try {
    const res: { data?: CashFlow } = await $api('/reports/finance/cash-flow-statement', { params: params() })
    cashFlow.value = res?.data ?? null
  } catch (err) {
    cashFlow.value = null
    cashFlowError.value = getApiErrorMessage(err, t('report.loadFailed'))
  }
}

function refresh() {
  load()
  loadCashFlow()
}

onMounted(refresh)

const money = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
</script>

<template>
  <div class="p-4 space-y-4">
    <UBreadcrumb :items="[{ label: t('nav.home'), to: '/' }, { label: t('report.title'), to: '/reports' }, { label: t('report.financeAnalysis') }]" />
    <h1 class="text-xl font-bold">
      {{ t('report.financeAnalysis') }}
    </h1>

    <div class="flex flex-wrap items-end gap-2">
      <UFormField :label="t('report.from')">
        <UInput v-model="range.start" type="date" />
      </UFormField>
      <UFormField :label="t('report.to')">
        <UInput v-model="range.end" type="date" />
      </UFormField>
      <UButton :label="t('common.refresh')" icon="i-lucide-refresh-cw" @click="refresh" />
    </div>

    <UCard>
      <template #header>
        <h2 class="font-semibold">
          {{ t('report.cashFlow') }}
        </h2>
      </template>
      <UAlert
        v-if="cashFlowError"
        color="error"
        variant="subtle"
        :title="cashFlowError"
      />
      <div v-else-if="cashFlow" class="space-y-3">
        <div v-for="row in cashFlow.operatingActivities.byCurrency" :key="row.currency" class="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p class="text-muted">
              {{ t('report.cols.cashIn') }} ({{ row.currency }})
            </p>
            <p class="text-lg font-semibold text-success">
              {{ money(row.cashIn) }}
            </p>
          </div>
          <div>
            <p class="text-muted">
              {{ t('report.cols.cashOut') }} ({{ row.currency }})
            </p>
            <p class="text-lg font-semibold text-error">
              {{ money(row.cashOut) }}
            </p>
          </div>
          <div>
            <p class="text-muted">
              {{ t('report.cols.net') }} ({{ row.currency }})
            </p>
            <p class="text-lg font-semibold">
              {{ money(row.net) }}
            </p>
          </div>
        </div>
        <p v-if="!cashFlow.operatingActivities.byCurrency.length" class="text-sm text-muted">
          {{ t('report.noData') }}
        </p>
        <p class="text-xs text-muted">
          {{ t('report.cashFlowScope') }}
        </p>
      </div>
    </UCard>

    <UTabs
      v-model="activeTab"
      :items="tabItems"
      :content="false"
      @update:model-value="(key) => load(key as TabKey)"
    />
    <p v-if="activeTab === 'profitability'" class="text-xs text-muted">
      {{ t('report.profitabilityScope') }}
    </p>

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
