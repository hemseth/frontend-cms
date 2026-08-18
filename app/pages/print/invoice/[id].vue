<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import QRCode from 'qrcode'

const { formatKhmerDate, formatNumericKhmerDate } = useKhmerUtils()
const route = useRoute()
const isLoading = ref(true)
const invoiceData = ref<any>(null)
const errorMsg = ref('')
const qrCodeUrl = ref('')

function formatMoney(value: unknown) {
  const amount = Number(value || 0)
  const currency = invoiceData.value?.currency || invoiceData.value?.payment?.currency || 'USD'
  return new Intl.NumberFormat(currency === 'KHR' ? 'km-KH' : 'en-US', {
    style: 'currency', currency,
    minimumFractionDigits: currency === 'KHR' ? 0 : 2,
    maximumFractionDigits: currency === 'KHR' ? 0 : 2
  }).format(amount)
}

// Font Size Control
const fontSize = ref(16)
watch(fontSize, (newVal) => {
  document.documentElement.style.fontSize = `${newVal}px`
})

// Paper Size Control
const paperSize = ref<'A4' | 'A5'>('A4')

definePageMeta({
  layout: false
})

onMounted(async () => {
  // Initialize font size
  document.documentElement.style.fontSize = `${fontSize.value}px`

  try {
    const id = route.params.id
    // Use $api to handle baseURL and auth headers automatically
    // Assuming $api is auto-imported or available globally
    const res: any = await $api(`/payments/${id}/invoice`)
    invoiceData.value = res.data

    // Generate QR Code
    if (invoiceData.value) {
      const patient = invoiceData.value.patient
      // Use Patient ID (Formatted "P-XXXXXX" if pId exists)
      const pId = patient?.pId
      const qrData = pId
        ? `P-${String(pId).padStart(6, '0')}`
        : (patient?._id || invoiceData.value.payment?.patientId || 'N/A')

      qrCodeUrl.value = await QRCode.toDataURL(qrData, { width: 100, margin: 0 })
    }
  } catch (e: any) {
    console.error('Failed to fetch invoice', e)
    errorMsg.value = e.message || e.toString()
  } finally {
    isLoading.value = false
    // Auto print when loaded
    if (invoiceData.value) {
      setTimeout(() => window.print(), 500)
    }
  }
})
</script>

<template>
  <PrintControls v-model:font-size="fontSize" v-model:paper-size="paperSize" />
  <component is="style">
    @page { size: {{ paperSize }} portrait; margin: 1cm; }
  </component>

  <div v-if="isLoading" class="flex justify-center items-center h-screen">
    Loading Invoice...
  </div>
  <div v-else-if="errorMsg" class="flex flex-col justify-center items-center h-screen text-red-500">
    <h2 class="text-xl font-bold">
      Error Loading Invoice
    </h2>
    <p class="mt-2">
      {{ errorMsg }}
    </p>
    <p class="text-sm text-gray-400 mt-1">
      ID: {{ route.params.id }}
    </p>
  </div>
  <div v-else-if="!invoiceData" class="flex justify-center items-center h-screen text-red-500">
    Invoice not found (Data is empty)
  </div>
  <!-- Wrapper for standard PDF preview look on screen -->
  <div
    v-else
    class="min-h-screen bg-gray-100 dark:bg-gray-900 flex justify-center py-8 print:p-0 print:bg-white print:block"
  >
    <!-- Page Preview -->
    <div
      class="bg-white text-black shadow-lg p-[10mm] flex flex-col relative print:shadow-none print:w-full print:min-h-0 print:p-0 print:m-0 transition-all duration-300"
      :class="paperSize === 'A5' ? 'w-[148mm] min-h-[210mm]' : 'w-[210mm] min-h-[297mm]'"
    >
      <!-- New Dedicated Invoice Header -->
      <PrintInvoiceHeader
        :patient="invoiceData.patient"
        :visit="invoiceData.visit"
        :clinic="invoiceData.clinic"
        :branch="invoiceData.branch"
        :invoice-no="invoiceData.invoiceNumber"
        :pay-date="invoiceData.payment.payDate || invoiceData.payment.createdAt"
        hide-vitals
        hide-diagnosis
      />

      <!-- Items Table -->
      <table class="w-full mb-8 font-khmer text-sm mt-4">
        <thead>
          <tr class="border-b-1 border-blue-900 text-blue-900">
            <th class="text-center py-1 w-10">
              ល.រ
            </th>
            <th class="text-center py-1">
              រាយឈ្មោះសេវា
            </th>
            <th class="text-center py-1 w-10">
              ចំនួន
            </th>
            <th class="text-center py-1 w-20">
              តម្លៃ
            </th>
            <th class="text-center py-1 w-20">
              តម្លៃសរុប
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(item, idx) in invoiceData.payment.items"
            :key="idx"
            class="border-b border-gray-100 p-0"
          >
            <td class="py-1 text-center">
              {{ Number(idx) + 1 }}
            </td>
            <td class="py-1 text-left">
              {{ item.name }}
            </td>
            <td class="text-center py-1">
              {{ item.quantity }}
            </td>
            <td class="text-right py-1">
              {{ formatMoney(item.price) }}
            </td>
            <td class="text-right py-1 font-medium">
              {{ formatMoney(item.subtotal || item.price * item.quantity) }}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Totals -->
      <div class="flex justify-end mb-8">
        <div class="w-64 space-y-2 text-sm font-bold text-blue-900">
          <div class="flex justify-between">
            <span class="text-gray-600">សរុប:</span>
            <span>{{ formatMoney(invoiceData.payment.subtotal) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">បញ្ចុះតម្លៃ:</span>
            <span>{{ formatMoney(invoiceData.payment.discount) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-600">ប្រាក់បង់សរុប:</span>
            <span class="text-blue-900">{{ formatMoney(invoiceData.payment.amount) }}</span>
          </div>
        </div>
      </div>

      <!-- Signature Section -->
      <div class="mt-auto flex justify-between items-end px-4 font-khmer text-blue-900 pb-16">
        <div class="text-center">
          <p class="font-khmer" />
          <p class="font-bold mb-10">
            អ្នកប្រគល់ប្រាក់
          </p>
        </div>

        <div class="text-center">
          <p class="font-khmer ">
            {{ formatKhmerDate(invoiceData.payment.payDate
              || invoiceData.payment.createdAt) }}
          </p>
          <p class="font-khmermb-12 mb-10">
            អ្នកគិតប្រាក់
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div
        class="absolute bottom-[10mm] left-0 w-full text-center text-[10px] text-gray-400 print:fixed print:bottom-2 print:left-0 print:bg-white"
      >
        <p class="border-t pt-2 mx-auto border-gray-200">
          អាសយដ្ឋាន៖ ភូមិ ត្រពាំងស្វាយ - ឃុំ បង្កង - ស្រុក បាធាយ - ខេត្ត កំពង់ចាម ទូរស័ព្ទទំនាក់ទំនង៖
          06266 25 858 / 077 923 983
        </p>
      </div>
    </div>
  </div>
</template>
