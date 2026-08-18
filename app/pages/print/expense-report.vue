<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

interface ExpenseSummary {
  grandTotal: number
  byCategory: Array<{ _id: string, total: number }>
}

const { t } = useI18n()
const { formatKhmerDate, formatNumericKhmerDate, toKhmerNumber } = useKhmerUtils()
const route = useRoute()
const isLoading = ref(true)
const expenses = ref<any[]>([])
const summaryData = ref<ExpenseSummary | null>(null)
const errorMsg = ref('')

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
    const { category, startDate, endDate, q } = route.query

    // Fetch all matching expenses (no limit for report)
    const res: any = await $api('/expenses', {
      params: {
        category,
        startDate,
        endDate,
        q,
        limit: 1000 // Large limit for report
      }
    })
    expenses.value = res.data

    const summaryRes: any = await $api('/expenses/summary', {
      params: {
        startDate,
        endDate
      }
    })
    summaryData.value = summaryRes.data
  } catch (e: any) {
    console.error('Failed to fetch expenses', e)
    errorMsg.value = e.message || e.toString()
  } finally {
    isLoading.value = false
    // Auto print when loaded
    if (expenses.value.length > 0) {
      setTimeout(() => window.print(), 800)
    }
  }
})
</script>

<template>
  <PrintControls v-model:font-size="fontSize" v-model:paper-size="paperSize" />
  <component is="style">
    @page { size: {{ paperSize }} landscape; margin: 1cm; }
  </component>

  <div v-if="isLoading" class="flex justify-center items-center h-screen font-khmer">
    កំពុងទាញយកទិន្នន័យ...
  </div>
  <div v-else-if="errorMsg" class="flex flex-col justify-center items-center h-screen text-red-500 font-khmer">
    <h2 class="text-xl font-bold">
      កំហុសក្នុងការទាញយករបាយការណ៍
    </h2>
    <p class="mt-2">
      {{ errorMsg }}
    </p>
  </div>
  <div v-else-if="expenses.length === 0" class="flex justify-center items-center h-screen text-red-500 font-khmer">
    មិនមានទិន្នន័យចំណាយសម្រាប់រយៈពេលដែលបានជ្រើសរើសទេ។
  </div>
  <!-- Wrapper for standard PDF preview look on screen -->
  <div
    v-else
    class="min-h-screen bg-gray-100 dark:bg-gray-900 flex justify-center py-8 print:p-0 print:bg-white print:block font-khmer"
  >
    <!-- Page Preview -->
    <div
      class="bg-white text-black shadow-lg p-[10mm] flex flex-col relative print:shadow-none print:w-full print:min-h-0 print:p-0 print:m-0 transition-all duration-300"
      :class="paperSize === 'A5' ? 'w-[210mm] min-h-[148mm]' : 'w-[297mm] min-h-[210mm]'"
    >
      <!-- Clinic Header -->
      <div class="w-full pt-2 mb-4 font-khmer text-blue-900 print:text-blue-900 relative">
        <div class="flex justify-center items-center gap-4 mb-4 px-4">
          <div class="text-blue-900 text-6xl font-bold leading-none select-none">
            +
          </div>
          <div class="text-center">
            <h1 class="text-[14pt] font-weight=[700] font-khmer-moul tracking-wide mb-1 leading-tight">
              មន្ទីរសម្រាកព្យាបាលជំងឺ ញ៉ែម ពីង
            </h1>
            <h2 class="text-xl font-bold uppercase tracking-wider">
              CLINIC NHEM PING
            </h2>
          </div>
          <div class="text-blue-900 text-6xl font-bold leading-none select-none">
            +
          </div>
        </div>

        <div class="text-center mt-2">
          <h3 class="text-[16pt] font-khmer-moul tracking-wide">
            របាយការណ៍ចំណាយ
          </h3>
          <p v-if="route.query.startDate || route.query.endDate" class="text-sm font-bold mt-1">
            ដំណាក់កាល: {{ route.query.startDate || '...' }} ដល់ {{ route.query.endDate || '...' }}
          </p>
        </div>
      </div>

      <!-- Items Table -->
      <table class="w-full mb-8 font-khmer text-sm mt-4 border-collapse">
        <thead>
          <tr class="bg-blue-900 text-white">
            <th class="border border-blue-900 py-2 px-2 w-10">
              ល.រ
            </th>
            <th class="border border-blue-900 py-2 px-2 w-32">
              កាលបរិច្ឆេទ
            </th>
            <th class="border border-blue-900 py-2 px-2 w-32">
              ចំណាត់ថ្នាក់
            </th>
            <th class="border border-blue-900 py-2 px-2">
              ការពិពណ៌នា
            </th>
            <th class="border border-blue-900 py-2 px-2 w-40">
              បង់តាម
            </th>
            <th class="border border-blue-900 py-2 px-2 w-32 text-right">
              ចំនួនប្រាក់
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(item, idx) in expenses"
            :key="item._id"
            class="border-b border-gray-100"
          >
            <td class="border border-gray-300 py-2 px-2 text-center">
              {{ idx + 1 }}
            </td>
            <td class="border border-gray-300 py-2 px-2 text-center">
              {{ new Date(item.date).toLocaleDateString() }}
            </td>
            <td class="border border-gray-300 py-2 px-2 text-center uppercase">
              {{ item.category }}
            </td>
            <td class="border border-gray-300 py-2 px-2">
              {{ item.description }}
            </td>
            <td class="border border-gray-300 py-2 px-2 text-center">
              {{ item.paymentMethod }}
            </td>
            <td class="border border-gray-300 py-2 px-2 text-right font-medium">
              ${{ Number(item.amount).toFixed(2) }}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="bg-gray-100 font-bold">
            <td colspan="5" class="border border-gray-300 py-2 px-2 text-right">
              សរុបរួម:
            </td>
            <td class="border border-gray-300 py-2 px-2 text-right text-red-600">
              ${{ Number(summaryData?.grandTotal || 0).toFixed(2) }}
            </td>
          </tr>
        </tfoot>
      </table>

      <!-- Summary by Category -->
      <div v-if="summaryData?.byCategory?.length" class="w-72 mb-8 ml-auto">
        <h4 class="font-bold mb-2 border-b border-blue-900 pb-1 text-blue-900">
          សេចក្តីសង្ខេបតាមចំណាត់ថ្នាក់
        </h4>
        <div v-for="cat in (summaryData?.byCategory as any[])" :key="cat._id" class="flex justify-between py-1 border-b border-gray-100 last:border-0 text-sm">
          <span class="capitalize text-gray-700">{{ cat._id || 'Other' }}:</span>
          <span class="font-medium">${{ Number(cat.total).toFixed(2) }}</span>
        </div>
        <div class="flex justify-between py-2 border-t-2 border-blue-900 mt-1 font-bold">
          <span>សរុបរួម:</span>
          <span class="text-red-600">${{ Number(summaryData?.grandTotal).toFixed(2) }}</span>
        </div>
      </div>

      <!-- Signature Section -->
      <div class="mt-auto flex justify-between items-end px-16 font-khmer text-blue-900 pb-16">
        <div class="text-center">
          <p class="font-bold mb-20 text-[12pt]">
            អ្នករៀបចំ
          </p>
          <p class="font-bold">
            ..........................................
          </p>
        </div>

        <div class="text-center">
          <p class="font-khmer mb-2">
            កាលបរិច្ឆេទ: {{ formatNumericKhmerDate(new Date()) }}
          </p>
          <p class="font-bold mb-20 text-[12pt]">
            បេឡាករ
          </p>
          <p class="font-bold">
            ..........................................
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div
        class="absolute bottom-[10mm] left-0 w-full text-center text-[10px] text-gray-400 print:fixed print:bottom-2 print:left-0 print:bg-white px-10"
      >
        <p class="border-t pt-2 mx-auto border-gray-200">
          អាសយដ្ឋាន៖ ភូមិ ត្រពាំងស្វាយ - ឃុំ បង្កង - ស្រុក បាធាយ - ខេត្ត កំពង់ចាម ទូរស័ព្ទទំនាក់ទំនង៖
          06266 25 858 / 077 923 983
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.font-khmer {
    font-family: 'Battambang', 'Hanuman', 'Noto Sans Khmer', serif;
}

.font-khmer-moul {
    font-family: 'Moul', serif;
}

table {
    border-collapse: collapse;
}

th, td {
    border: 1px solid #d1d5db;
}

@media print {
    body {
        -webkit-print-color-adjust: exact;
        background-color: white !important;
    }
    .print-controls {
        display: none;
    }
    .bg-gray-100 {
        background-color: white !important;
    }
}
</style>
