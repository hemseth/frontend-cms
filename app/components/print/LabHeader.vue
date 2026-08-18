<template>
  <div class="w-full pt-2 mb-6 font-khmer text-blue-800 print:text-blue-800 relative">
    <div class="absolute top-1 right-4 print:right-0">
      <img
        v-if="qrCodeUrl"
        :src="qrCodeUrl"
        alt="Patient QR"
        class="w-20 h-20 object-contain"
      >
    </div>
    <!-- Row 1: Logo & Clinic Name -->
    <div class="flex justify-center items-center gap-8 mb-2 px-4">
      <div class="text-blue-900 text-6xl font-bold leading-none select-none">
        +
      </div>
      <div class="text-center">
        <h1 class="text-[14pt]  text-blue-800 font-khmer-moul tracking-wide mb-1">
          មន្ទីរសម្រាកព្យាបាលជំងឺ ញឹម ពីង
        </h1>
        <h2 class="text-lg md:text-xl font-bold text-blue-800 uppercase tracking-wider">
          CLINIC NHEM PING
        </h2>
      </div>
      <div class="text-blue-900 text-6xl font-bold leading-none select-none">
        +
      </div>
    </div>

    <!-- Row 2: Contact, Date & Title -->
    <div class="flex justify-between items-start text-[11pt]text-blue-800 mb-2 px-2 font-bold relative">
      <!-- Left: Services/Contact -->
      <div class="space-y-1 w-1/3">
        <p>- ពិនិត្យ និងព្យាបាលជំងឺទូទៅ</p>
        <p>- វះកាត់តូច</p>
        <p>- ឆែករកសិរី X ឆ្លុះអេក ពណ៌</p>
      </div>

      <!-- Center: Title (Absolute centered or just flex column) -->
      <!-- We can put the title in the next row or absolute if we want exact layout -->

      <!-- Right: Dates -->
      <div class="text-right w-1/3 pt-2">
        <p class="mb-1">
          ថ្ងៃមកពិនិត្យ : {{ formatDate(dateIn) }}
        </p>
        <p>ថ្ងៃណាត់ជួប : .........................</p>
      </div>
    </div>

    <!-- Title Centered -->
    <div class="text-center mb-4 mt-2">
      <h3 class="text-[14pt]  text-blue-800 font-khmer-moul">
        {{ title || 'ប័ណ្ណវិភាគ' }}
      </h3>
    </div>

    <!-- Row 4: Patient Info Grid -->
    <!-- Mimic the background color if possible, though printing usually removes bg -->
    <div class="p-2 font-bold text-[11pt] leading-none">
      <div class="grid grid-cols-12 gap-y-[8pt]">
        <!-- Line 1 -->
        <div class="col-span-4 flex">
          <span class="min-w-[100px]">លេខកូដអ្នកជំងឺ :</span>
          <span class="px-2">{{ patientCode }}</span>
        </div>
        <div class="col-span-5 flex">
          <span class="min-w-[50px]">ឈ្មោះ :</span>
          <span class="px-2 font-khmer font-bold">{{ patientNameKh }}</span>
        </div>
        <div class="col-span-3 flex justify-end">
          <span class="mr-2">ភេទ :</span>
          <span>{{ gender }}</span>
          <span class="mx-4">|</span>
          <span class="mr-2">អាយុ :</span>
          <span>{{ age }} ឆ្នាំ</span>
        </div>
        <!-- Line 2 -->
        <div class="col-span-4 flex">
          <span class="min-w-[100px]">លេខទូរស័ព្ទ :</span>
          <span class="px-2">{{ patientPhone }}</span>
        </div>
        <div class="col-span-8 flex">
          <span class="min-w-[90px]">ទីលំនៅបច្ចុប្បន្ន :</span>
          <span class="px-2">{{ address }}</span>
        </div>
        <!-- Line 3: Diagnosis -->
        <div v-if="!hideDiagnosis" class="col-span-12 flex mt-1">
          <span class="min-w-[100px]">រោគវិនិច្ឆ័យ :</span>
          <span class="font-bold ml-2">{{ diagnosis }}</span>
        </div>
      </div>
    </div>

    <!-- Row 5: Vitals -->
    <!-- T.A: 125/83 mmHg  RR: /mn  T: 37 C  Poids: 71 Kg  Height: cm  SpO2: 95 % -->
    <div v-if="!hideVitals" class="font-bold text-[11pt] flex flex-wrap justify-between px-2  print:bg-transparent">
      <div>T.A: <span class="text-blue-800">{{ vitals?.bp || '___/___' }}</span> mmHg</div>
      <div>RR: <span class="text-blue-800">{{ vitals?.rr || '___' }}</span> /mn</div>
      <div>T: <span class="text-blue-800">{{ vitals?.temp || '___' }}</span> °C</div>
      <div>Poids: <span class="text-blue-800">{{ vitals?.weight || '___' }}</span> Kg</div>
      <div>Height: <span class="text-blue-800">{{ vitals?.height || '___' }}</span> cm</div>
      <div>SpO2: <span class="text-blue-800">{{ vitals?.spo2 || '___' }}</span> %</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import QRCode from 'qrcode'

const props = defineProps<{
  patient?: any
  visit?: any
  title?: string
  hideVitals?: boolean
  hideDiagnosis?: boolean
}>()

const patientCode = computed(() => props.patient?.pId ? `P-${String(props.patient.pId).padStart(6, '0')}` : 'P-000000')
// Prefer Khmer name, fallback to English
const patientNameKh = computed(() => {
  if (props.patient?.nameKh && props.patient?.nameEn) {
    return `${props.patient.nameKh} - ${props.patient.nameEn}`
  }
  return props.patient?.nameKh || props.patient?.name || props.patient?.nameEn || 'Unknown'
})

const patientPhone = computed(() => props.patient?.phone || '..................')
const gender = computed(() => {
  const g = props.patient?.gender || props.patient?.sex || 'M'
  return (g === 'M' || g === 'Male') ? 'ប្រុស' : 'ស្រី'
})

const age = computed(() => {
  if (!props.patient?.dob) return '...'
  const dob = new Date(props.patient.dob)
  const diff = Date.now() - dob.getTime()
  const ageDate = new Date(diff)
  return Math.abs(ageDate.getUTCFullYear() - 1970)
})

const address = computed(() => {
  const parts = []
  if (props.patient?.villageName) parts.push(`ភូមិ${props.patient.villageName}`)
  if (props.patient?.communeName) parts.push(`ឃុំ${props.patient.communeName}`)
  // if (props.patient?.districtName) parts.push(`ស្រុក${props.patient.districtName}`)
  // if (props.patient?.provinceName) parts.push(`ខេត្ត${props.patient.provinceName}`)

  // If we have full address strings, use them.
  if (parts.length > 0) return parts.join(' - ') + ` - ខេត្ត${props.patient?.provinceName || '...'}`

  return props.patient?.address || '...................................................................'
})

const diagnosis = computed(() => {
  if (props.visit?.diagnosis && Array.isArray(props.visit.diagnosis)) {
    return props.visit.diagnosis.map((d: any) => d.nameEn || d.nameKh || d.name).join(', ')
  }
  return props.visit?.notes || '...................................................................'
})

const dateIn = computed(() => props.visit?.dateIn || new Date())

function formatDate(d: string | Date) {
  if (!d) return ''
  const date = new Date(d)
  return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`
}

const vitals = computed(() => props.visit?.vitals || {})

const qrCodeUrl = ref('')

watch(() => props.patient, async () => {
  if (patientCode.value) {
    try {
      qrCodeUrl.value = await QRCode.toDataURL(patientCode.value, {
        width: 100,
        margin: 0,
        color: {
          dark: '#1e3a8a', // blue-900
          light: '#00000000' // transparent
        }
      })
    } catch (e) {
      console.error('QR Gen Error:', e)
    }
  }
}, { immediate: true })
</script>

<style scoped>
/* Local fonts defined in main.css */

.font-khmer {
    font-family: 'Battambang', 'Noto Sans Khmer', serif;
}

.font-khmer-moul {
    font-family: 'Moul', serif;
}
</style>
