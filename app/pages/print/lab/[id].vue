<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

const route = useRoute()
const isLoading = ref(true)
const labData = ref<any[]>([])
const patient = ref<any>(null)
const visit = ref<any>(null)
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

    if (!visitId || !patientId) throw new Error('Missing Visit or Patient ID in URL')

    // Fetch Labs, Patient, and Visit details in parallel
    const [labRes, patientRes, visitRes]: any[] = await Promise.all([
      $api(`/patients/${patientId}/visits/${visitId}/labs`),
      $api(`/patients/${patientId}`),
      $api(`/patients/${patientId}/visits/${visitId}`)
    ])

    labData.value = labRes.data || []
    patient.value = patientRes.data || {}
    visit.value = visitRes.data || {}
  } catch (e: any) {
    console.error('Failed to fetch lab results', e)
    errorMsg.value = e.message || e.toString()
  } finally {
    isLoading.value = false
    if (labData.value.length > 0) {
      setTimeout(() => window.print(), 1000)
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
    Loading Results...
  </div>
  <div v-else-if="errorMsg" class="flex flex-col justify-center items-center h-screen text-red-500">
    <h2 class="text-xl font-bold">
      Error Loading Labs
    </h2>
    <p class="mt-2">
      {{ errorMsg }}
    </p>
  </div>
  <div v-else-if="labData.length === 0" class="flex justify-center items-center h-screen text-red-500">
    No Lab Results
    Found
  </div>
  <div
    v-else
    class="mx-auto p-4 bg-white text-black print:p-2 font-khmer flex flex-col min-h-screen transition-all duration-300 shadow-lg print:shadow-none"
    :class="paperSize === 'A5' ? 'w-[148mm]' : 'w-[210mm]'"
  >
    <!-- New Lab Header Component -->
    <PrintLabHeader :patient="patient" :visit="visit" />

    <!-- Results List -->
    <!-- Main Results Table -->
    <table class="w-full text-sm border-collapse border border-blue-200">
      <thead class="bg-blue-50/50 print:bg-transparent">
        <tr class="border-b border-blue-200 text-left text-blue-900 font-bold">
          <th class="py-1 px-2 w-[5%] text-center border-r border-blue-100">
            N°
          </th>
          <th class="py-1 px-2 w-[40%] border-r border-blue-100">
            Test Name / ឈ្មោះតេស្ត
          </th>
          <th class="py-1 px-2 w-[20%] text-center border-r border-blue-100">
            Result / លទ្ធផល
          </th>
          <th class="py-1 px-2 w-[20%] text-center border-r border-blue-100">
            Ref. Range
          </th>
          <th class="py-1 px-2 w-[15%] text-left">
            Unit
          </th>
        </tr>
      </thead>
      <tbody>
        <template v-for="(lab, index) in labData" :key="index">
          <!-- Case A: Service Has Parameters (Grouped) -->
          <template v-if="lab.parameters && lab.parameters.length > 0">
            <!-- Header Row -->
            <tr class="bg-gray-100 print:bg-gray-100 font-bold text-blue-900 border-b border-blue-100">
              <td colspan="5" class="py-1 px-2">
                {{ index + 1 }}. {{ lab.serviceName }} {{ lab.serviceNameKh ? `- ${lab.serviceNameKh}`
                  : '' }}
              </td>
            </tr>

            <!-- Parameter Rows -->
            <tr
              v-for="(param, pIdx) in lab.parameters"
              :key="`${index}-${pIdx}`"
              class="border-b border-blue-100 last:border-b-0 hover:bg-gray-50 print:hover:bg-transparent"
            >
              <!-- Indent parameter name (skip Index col, or merge? keeping it simple: distinct N col is empty or dot?) -->
              <!-- User tried colspan 2. Let's do: Empty N col, Name in Name col -->

              <td colspan="2" class="py-1 px-3 align-top border-r border-blue-100">
                <div class="text-gray-800 font-medium pl-4">
                  - {{ param.labelEn }} {{ param.labelKh }}
                </div>
              </td>
              <td
                class="py-1 px-2 text-center align-top font-bold text-gray-900 border-r border-blue-100"
              >
                {{ param.value || '-' }}
              </td>
              <td class="py-1 px-2 align-top text-center text-gray-600 text-xs border-r border-blue-100">
                {{ param.refRange || '' }}
              </td>
              <td class="py-1 px-2 align-top text-gray-600 text-xs">
                {{ param.unit || '' }}
              </td>
            </tr>
          </template>

          <!-- Case B: Simple Text Result (No Parameters) -->
          <template v-else-if="lab.result">
            <tr class="border-b border-blue-100 hover:bg-gray-50 print:hover:bg-transparent">
              <td class="py-1 px-2 text-center text-gray-500 text-xs border-r border-blue-100">
                {{ index + 1 }}
              </td>
              <td class="py-1 px-2 border-r border-blue-100 font-bold text-blue-900">
                {{ lab.serviceName }} {{ lab.serviceNameKh ? `- ${lab.serviceNameKh}` : '' }}
              </td>
              <td
                class="py-1 px-2 text-center align-top font-bold text-gray-900 border-r border-blue-100"
              >
                {{ lab.result }}
              </td>
              <td class="py-1 px-2 align-top text-center text-gray-600 text-xs border-r border-blue-100">
                <!-- No range for text result -->
              </td>
              <td class="py-1 px-2 align-top text-gray-600 text-xs">
                <!-- No unit for text result -->
              </td>
            </tr>
          </template>
        </template>
      </tbody>
    </table>

    <!-- Footer -->
    <div class="mt-auto">
      <div class="mt-8 pt-4 flex justify-between items-end text-sm text-blue-900 px-8 break-inside-avoid">
        <!-- Left Signature (Empty or Lab Tech) -->
        <div class="text-center w-1/3">
          <!-- <p class="mb-12 font-bold">P. Labo / អ្នកធ្វើតេស្ត</p>
                     <p class="font-khmer">...................................</p> -->
        </div>

        <!-- Right Signature -->
        <div class="text-center w-1/2 relative">
          <p class="text-[12pt] font-khmer mb-2">
            ថ្ងៃទី {{ new Date().getDate() }} - {{ new Date().getMonth() + 1 }} - {{ new
              Date().getFullYear() }}
          </p>
          <p class="font-size=[11pt] font-khmer-moul mb-12">
            អ្នកបច្ចេកទេសមន្ទីរពិសោធន៍
          </p>
          <!-- Placeholder for signature or name -->
          <p class="font-khmer text-size=[11pt] text-xl text-blue-800 tracking-wide mt-32">
            {{ patient.nameKh }}
          </p>
        </div>
      </div>

      <div class="text-center text-[10px] text-gray-400 mt-12 border-t pt-2">
        <p>
          អាសយដ្ឋាន៖ ភូមិ​ ត្រពាំងស្វាយ - ឃុំ​ បង្កង - ស្រុក​ បាធាយ - ខេត្ត​ កំពង់ចាម ទូរស័ព្ទទំនាក់ទំនង៖ 062
          66 25
          858 / 077 923 983
        </p>
      </div>
    </div>
  </div>
</template>

<style>
/* Local fonts defined in main.css */

.font-khmer {
    font-family: 'Battambang', 'Hanuman', serif;
}

.font-khmer-moul {
    font-family: 'Moul', serif;
}
</style>
