<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const exportUtils = useExport()

const paymentId = computed(() => route.query.paymentId as string || '')

const breadcrumbItems = computed(() => [
  { label: t('nav.home'), to: '/' },
  { label: t('report.title'), to: '/reports' },
  { label: t('report.invoiceReport') }
])

const isLoading = ref(false)
const invoiceData = ref<any>(null)
const selectedPaymentId = ref(paymentId.value)

const payments = ref<any[]>([])
const searchPayment = ref('')

function formatMoney(value: unknown) {
  const amount = Number(value || 0)
  const currency = invoiceData.value?.currency || 'USD'
  return new Intl.NumberFormat(currency === 'KHR' ? 'km-KH' : 'en-US', {
    style: 'currency', currency,
    minimumFractionDigits: currency === 'KHR' ? 0 : 2,
    maximumFractionDigits: currency === 'KHR' ? 0 : 2
  }).format(amount)
}

const clinicDisplayName = computed(() => invoiceData.value?.branch?.nameKh
  || invoiceData.value?.branch?.name || invoiceData.value?.clinic?.nameKh
  || invoiceData.value?.clinic?.name || 'Clinic')
const clinicAddress = computed(() => invoiceData.value?.branch?.address
  || invoiceData.value?.clinic?.address || '')

async function searchPayments(query: string) {
  if (!query || query.length < 2) {
    payments.value = []
    return
  }

  try {
    const res = await $api<any>('/payments', { params: { search: query, limit: 10 } })
    payments.value = res?.data || []
  } catch (e) {
    console.error('Failed to search payments:', e)
  }
}

watch(searchPayment, (val) => {
  if (val.length >= 2) {
    searchPayments(val)
  } else {
    payments.value = []
  }
})

async function fetchInvoice(id: string) {
  if (!id) return

  isLoading.value = true
  try {
    const res = await $api<any>(`/reports/invoice/${id}`)
    invoiceData.value = res?.data
  } catch (e) {
    console.error('Failed to fetch invoice:', e)
    invoiceData.value = null
  } finally {
    isLoading.value = false
  }
}

watch(selectedPaymentId, (val) => {
  if (val) {
    fetchInvoice(val)
    navigateTo({ query: { paymentId: val } }, { replace: true })
  }
})

onMounted(() => {
  if (paymentId.value) {
    selectedPaymentId.value = paymentId.value
  }
})

function printInvoice() {
  window.print()
}
</script>

<template>
  <div class="p-6 space-y-6">
    <UBreadcrumb :items="breadcrumbItems" />

    <div class="flex items-center justify-between no-print">
      <div>
        <h1 class="text-2xl font-bold">
          {{ t('report.invoiceReport') }}
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">
          Patient invoice and billing details
        </p>
      </div>
    </div>

    <UCard class="no-print">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_auto]">
        <UInput
          v-model="searchPayment"
          :placeholder="t('report.selectPatient')"
          icon="i-lucide-search"
          class="w-full"
        />
        <USelect
          v-model="selectedPaymentId"
          :options="payments.map(p => ({ label: `Invoice #${p.paymentId || p._id} - ${p.patientId}`, value: p._id }))"
          :placeholder="'Select Invoice'"
          class="w-full"
        />
        <UButton
          v-if="invoiceData"
          icon="i-lucide-printer"
          color="primary"
          @click="printInvoice"
        >
          {{ t('common.print') }}
        </UButton>
      </div>
    </UCard>

    <div v-if="isLoading" class="flex justify-center py-12">
      <ULoading size="lg" />
    </div>

    <template v-if="invoiceData">
      <div class="max-w-3xl mx-auto">
        <PrintLayout :title="t('report.invoiceReport')">
          <UCard>
            <div class="invoice-header mb-6">
              <div class="flex justify-between items-start">
                <div>
                  <h2 class="text-xl font-bold">
                    INVOICE
                  </h2>
                  <p class="text-gray-600">
                    {{ invoiceData.invoiceNumber }}
                  </p>
                </div>
                <div class="text-right">
                  <p class="font-medium">
                    {{ t('report.clinicInfo') }}
                  </p>
                  <p class="text-sm text-gray-500">
                    {{ clinicDisplayName }}
                  </p>
                  <p class="text-sm text-gray-500">
                    {{ clinicAddress }}
                  </p>
                </div>
              </div>
              <div class="mt-4 pt-4 border-t">
                <p><strong>Date:</strong> {{ new Date(invoiceData.date).toLocaleDateString() }}</p>
              </div>
            </div>

            <div class="patient-info mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h3 class="font-semibold mb-2">
                Bill To:
              </h3>
              <p><strong>Patient:</strong> {{ invoiceData.patient.name }}</p>
              <p><strong>Phone:</strong> {{ invoiceData.patient.phone || 'N/A' }}</p>
              <p><strong>Address:</strong> {{ invoiceData.patient.address || 'N/A' }}</p>
            </div>

            <UTable
              :data="invoiceData.items || []"
              :columns="[
                { accessorKey: 'name', header: 'Service / Item' },
                { accessorKey: 'category', header: 'Category' },
                { accessorKey: 'quantity', header: 'Qty' },
                { accessorKey: 'price', header: 'Unit Price' },
                { accessorKey: 'subtotal', header: 'Total' }
              ]"
              class="mb-6"
            >
              <template #price-cell="{ row }">
                {{ formatMoney(row.original.price) }}
              </template>
              <template #subtotal-cell="{ row }">
                {{ formatMoney(row.original.subtotal || (row.original.price * row.original.quantity)) }}
              </template>
            </UTable>

            <div class="flex justify-end">
              <div class="w-64 space-y-2">
                <div class="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{{ formatMoney(invoiceData.subtotal) }}</span>
                </div>
                <div class="flex justify-between">
                  <span>Discount:</span>
                  <span>-{{ formatMoney(invoiceData.discount) }}</span>
                </div>
                <div class="flex justify-between">
                  <span>Tax:</span>
                  <span>{{ formatMoney(invoiceData.tax) }}</span>
                </div>
                <div class="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>{{ formatMoney(invoiceData.total) }}</span>
                </div>
                <div class="flex justify-between text-green-600">
                  <span>Paid:</span>
                  <span>{{ formatMoney(invoiceData.paid) }}</span>
                </div>
                <div v-if="invoiceData.balance > 0" class="flex justify-between text-red-600">
                  <span>Balance:</span>
                  <span>{{ formatMoney(invoiceData.balance) }}</span>
                </div>
              </div>
            </div>

            <div class="mt-6 pt-6 border-t">
              <p class="text-sm text-gray-500">
                <strong>Payment Method:</strong> {{ invoiceData.paymentMethod?.toUpperCase() || 'CASH' }}
              </p>
            </div>
          </UCard>
        </PrintLayout>
      </div>
    </template>

    <UCard v-else-if="!isLoading && !invoiceData" class="text-center py-12">
      <UIcon name="i-lucide-file-text" class="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <p class="text-gray-500">
        Select an invoice to view
      </p>
    </UCard>
  </div>
</template>

<style scoped>
@media print {
  :deep(.no-print) {
    display: none !important;
  }

  .invoice-header {
    display: flex;
    justify-content: space-between;
  }
}
</style>
