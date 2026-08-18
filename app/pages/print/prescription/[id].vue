<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

const route = useRoute()
const isLoading = ref(true)
const rxData = ref<any[]>([])
const visitData = ref<any>(null)
const patientData = ref<any>(null)
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
    const visitId = route.params.id as string
    const patientId = route.query.patientId as string

    if (!visitId || !patientId) throw new Error('Missing Visit or Patient ID')

    // Fetch Data in parallel
    const [rxRes, visitRes, patientRes]: any = await Promise.all([
      $api(`/patients/${patientId}/visits/${visitId}/prescriptions`),
      $api(`/patients/${patientId}/visits/${visitId}`),
      $api(`/patients/${patientId}`)
    ])

    rxData.value = rxRes.data || []
    visitData.value = visitRes.data || null
    patientData.value = patientRes.data || null
  } catch (e: any) {
    console.error('Failed to fetch data', e)
    errorMsg.value = e.message || e.toString()
  } finally {
    isLoading.value = false
    if (rxData.value.length > 0) {
      setTimeout(() => window.print(), 800)
    }
  }
})

function calculateAge(dob: string) {
  if (!dob) return 'N/A'
  const birthDate = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

function formatFreq(item: any) {
  // Format usage instructions e.g. "1-0-1-0"
  return `${item.morning || 0} - ${item.afternoon || 0} - ${item.evening || 0} - ${item.night || 0}`
}

const { formatKhmerDate } = useKhmerUtils()
</script>

<template>
  <PrintControls v-model:font-size="fontSize" v-model:paper-size="paperSize" />
  <component is="style">
    @page { size: {{ paperSize }} portrait; margin: 1cm; }
  </component>

  <div v-if="isLoading" class="flex justify-center items-center h-screen">
    Loading Prescription...
  </div>
  <div v-else-if="errorMsg" class="flex flex-col justify-center items-center h-screen text-red-500">
    <h2 class="text-xl font-bold">
      Error Loading Prescription
    </h2>
    <p class="mt-2">
      {{ errorMsg }}
    </p>
  </div>
  <div v-else-if="rxData.length === 0" class="flex justify-center items-center h-screen text-red-500">
    No Prescriptions
    Found
  </div>
  <div
    v-else
    class="min-h-screen bg-gray-100 dark:bg-gray-900 flex justify-center py-8 print:p-0 print:bg-white print:block"
  >
    <!-- Page Preview -->
    <div
      class="bg-white text-black shadow-lg p-[10mm] flex flex-col relative print:shadow-none print:w-full print:min-h-0 print:p-0 print:m-0 transition-all duration-300"
      :class="paperSize === 'A5' ? 'w-[148mm] min-h-[210mm]' : 'w-[210mm] min-h-[297mm]'"
    >
      <!-- Header (Reusing Lab/Clinical Layout) -->
      <PrintLabHeader :patient="patientData" :visit="visitData" title="វេជ្ជបញ្ជា" />

      <!-- Medicines Table -->
      <div class="flex-grow">
        <table class="w-full border border-gray-200 text-sm font-khmer border-collapse">
          <thead>
            <tr class="bg-gray-100 text-blue-900 border-y border-gray-200">
              <th class="py-2 px-1 text-center w-10 border-r border-gray-200">
                ល.រ
              </th>
              <th class="py-2 px-2 text-left border-r border-gray-200">
                ឈ្មោះថ្នាំ
              </th>
              <th class="py-2 px-1 text-center w-24 border-r border-gray-200">
                កម្រិតថ្នាំ<br><span
                  class="text-[10px]"
                >(Dose)</span>
              </th>
              <th class="py-2 px-1 text-center w-12 border-r border-gray-200 font-bold">
                ព្រឹក
              </th>
              <th class="py-2 px-1 text-center w-12 border-r border-gray-200 font-bold">
                ថ្ងៃត្រង់
              </th>
              <th class="py-2 px-1 text-center w-12 border-r border-gray-200 font-bold">
                ល្ងាច
              </th>
              <th class="py-2 px-1 text-center w-12 border-r border-gray-200 font-bold">
                យប់
              </th>
              <th class="py-2 px-1 text-center w-20 border-r border-gray-200">
                ចំនួនថ្ងៃ<br>លេបថ្នាំ
              </th>
              <th class="py-2 px-1 text-center w-20">
                ចំនួនថ្នាំ<br>សរុប
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in rxData" :key="index" class="border-b border-gray-100 ">
              <td class="py-1 text-center border-r border-gray-200">
                {{ index + 1 }}
              </td>
              <td class="py-1 px-2 border-r border-gray-200">
                <div class="font-bold border-gray-200">
                  {{ item.medication }}
                </div>
                <div v-if="item.notes" class="text-[10px] italic text-gray-500">
                  {{ item.notes }}
                </div>
              </td>
              <td class="py-1 text-center border-r border-gray-200">
                {{ item.unitPrice ? '' : (item.dose
                  || '-') }}
              </td>
              <td class="py-1 text-center border-r border-gray-200 font-bold">
                {{ item.morning || 0 }}
              </td>
              <td class="py-1 text-center border-r border-gray-200 font-bold">
                {{ item.afternoon || 0 }}
              </td>
              <td class="py-1 text-center border-r border-gray-200 font-bold">
                {{ item.evening || 0 }}
              </td>
              <td class="py-1 text-center border-r border-gray-200 font-bold">
                {{ item.night || 0 }}
              </td>
              <td class="py-1 text-center border-r border-gray-200 font-semibold">
                {{ item.days ? item.days + ' ថ្ងៃ' : (item.duration || '-') }}
              </td>
              <td class="py-1 text-center font-bold">
                {{ item.quantity }}
              </td>
            </tr>
            <!-- Empty rows to fill space if needed -->
            <tr
              v-for="i in Math.max(10 - rxData.length)"
              :key="'empty-' + i"
              class="border-b border-gray-100 h-10"
            >
              <td class="border-r border-gray-200" />
              <td class="border-r border-gray-200" />
              <td class="border-r border-gray-200" />
              <td class="border-r border-gray-200" />
              <td class="border-r border-gray-200" />
              <td class="border-r border-gray-200" />
              <td class="border-r border-gray-200" />
              <td class="border-r border-gray-200" />
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer -->
      <div class="mt-8 flex flex-col items-end px-4 font-khmer text-blue-900">
        <p class="text-sm">
          ថ្ងៃទី {{ formatKhmerDate(visitData?.dateIn || new Date()) }}
        </p>
        <div class="text-center mt-2">
          <p class="font-bold">
            គ្រូពេទ្យព្យាបាល
          </p>
          <div class="h-16" />
          <p class="font-bold text-lg">
            ដុំ ទៀន
          </p>
        </div>
      </div>

      <div class="mt-4 pt-4 border-t border-gray-200 text-xs font-khmer text-gray-600 italic">
        <p>* កំណត់ចំនាំ: សូមយកវេជ្ជបញ្ជាមកវិញ ពេលពិនិត្យលើកក្រោយ</p>
      </div>
    </div>
  </div>
</template>

<style>
.font-khmer {
    font-family: 'Battambang', 'Hanuman', serif;
}

.font-khmer-moul {
    font-family: 'Moul', serif;
}
</style>
