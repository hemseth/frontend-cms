<template>
  <div class="w-full pt-2 mb-2 font-khmer text-blue-900 print:text-blue-900 relative">
    <div class="absolute top-1 right-4 print:right-0">
      <img
        v-if="qrCodeUrl"
        :src="qrCodeUrl"
        alt="Patient QR"
        class="w-20 h-20 object-contain"
      >
    </div>
    <!-- Row 1: Logo & Clinic Name -->
    <div class="flex justify-center items-center gap-4 mb-4 px-4">
      <div class="text-blue-900 text-6xl font-bold leading-none select-none">
        +
      </div>
      <div class="text-center">
        <h1 class="text-[13pt] font-weight=[700] font-khmer-moul tracking-wide mb-1 leading-tight">
          មន្ទីរសម្រាកព្យាបាលជំងឺ ញ៉ែម ពីង
        </h1>
        <h2 class="text-xl font-bold uppercase tracking-wider">
          {{ clinicNameEn }}
        </h2>
      </div>
      <div class="text-blue-900 text-6xl font-bold leading-none select-none">
        +
      </div>
    </div>

    <!-- Row 2: 3 Columns (Doctor Info, Title, Invoice Details) -->
    <div class="flex justify-between items-start text-sm  relative px-2">
      <!-- Left: Doctor/Services -->
      <div class="space-y-1 w-1/3">
        <div class="flex">
          <span class="mr-2">•</span>
          <p class="font-khmer-moul text-[11pt]">
            វេជ្ជបណ្ឌិត ញ៉ែម ពីង
          </p>
        </div>
        <div class="flex">
          <span class="mr-2">•</span>
          <p class="font-khmer-moul text-[11pt]">
            ឆ្លុះអេកូពណ៍
          </p>
        </div>
        <div class="flex">
          <span class="mr-2">•</span>
          <p class="font-khmer-moul text-[11pt]">
            ថតកាំរស្មីអ៊ិច
          </p>
        </div>
      </div>

      <!-- Center: Title -->
      <div class="w-1/3 text-center pt-2">
        <h3 class="text-[13pt] font-khmer-moul tracking-wide">
          {{ title || 'វិក្កយបត្រ' }}
        </h3>
      </div>

      <!-- Right: Invoice Details -->
      <div class="w-1/3 text-right space-y-1 pt-2">
        <div class="flex justify-between pl-8">
          <span>លេខវិក្កយបត្រ :</span>
          <span>{{ invoiceNo }}</span>
        </div>
        <div class="flex justify-between pl-8">
          <span>ថ្ងៃបង់ប្រាក់ :</span>
          <span>{{ formatNumericKhmerDate(payDate) }}</span>
        </div>
      </div>
    </div>

    <!-- Patient Info Grid -->
    <div class="p-2 print:bg-transparent text-sm leading-relaxed">
      <div class="grid grid-cols-12 gap-y-1">
        <!-- Line 1: ID, Name, Gender, Age -->
        <div class="col-span-4 flex">
          <span class="min-w-[100px]">លេខកូដ :</span>
          <span>{{ patientCode }}</span>
        </div>
        <div class="col-span-5 flex">
          <span class="min-w-[50px]">ឈ្មោះអ្នកជំងឺ :</span>
          <span class="px-2 font-khmer">{{ patientNameKh }}</span>
        </div>
        <div class="col-span-3 flex justify-end">
          <span class="mr-2">ភេទ :</span>
          <span>{{ gender }}</span>
          <span class="mx-4">|</span>
          <span class="mr-2">អាយុ :</span>
          <span>{{ toKhmerNumber(age) }} ឆ្នាំ</span>
        </div>

        <!-- Line 2: Phone, Address -->
        <div class="col-span-4 flex">
          <span class="min-w-[100px]">លេខទូរស័ព្ទ :</span>
          <span class="px-2">{{ patientPhone }}</span>
        </div>
        <div class="col-span-8 flex">
          <span class="min-w-[90px]">ទីលំនៅបច្ចុប្បន្ន :</span>
          <span class="px-2 truncate">{{ address }}</span>
        </div>
        <!-- Line 3: Vitals -->
        <div
          v-if="vitals && !hideVitals"
          class="col-span-12 flex flex-wrap gap-x-4 gap-y-1 py-1 border-t border-dashed border-blue-200 mt-1"
        >
          <div>
            T.A: <span class="font-bold">{{ vitals.bp || '___/___' }}</span> <span
              class="text-xs"
            >mmHg</span>
          </div>
          <div>
            P: <span class="font-bold">{{ vitals.heartRate || '___' }}</span> <span
              class="text-xs"
            >/mn</span>
          </div>
          <div>
            RR: <span class="font-bold">{{ vitals.respRate || '___' }}</span> <span
              class="text-xs"
            >/mn</span>
          </div>
          <div>
            T: <span class="font-bold">{{ vitals.temp || '___' }}</span> <span class="text-xs">°C</span>
          </div>
          <div>
            Poids: <span class="font-bold">{{ vitals.weight || '___' }}</span> <span
              class="text-xs"
            >Kg</span>
          </div>
          <div>
            Height: <span class="font-bold">{{ vitals.height || '___' }}</span> <span
              class="text-xs"
            >cm</span>
          </div>
          <div>
            SpO2: <span class="font-bold">{{ vitals.oxygen || '___' }}</span> <span
              class="text-xs"
            >%</span>
          </div>
        </div>
        <!-- Line 4: Diagnosis -->
        <div v-if="!hideDiagnosis" class="col-span-12 flex pt-1">
          <span class="min-w-[100px]">រោគវិនិច្ឆ័យ :</span>
          <span class="font-bold ml-2">{{ diagnosis }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import QRCode from 'qrcode'

const props = defineProps<{
  patient?: any
  visit?: any
  clinic?: any
  branch?: any
  invoiceNo?: string
  payDate?: string
  title?: string
  hideVitals?: boolean
  hideDiagnosis?: boolean
}>()

const { toKhmerNumber, formatKhmerDate, formatNumericKhmerDate } = useKhmerUtils()

const clinicNameEn = computed(() => props.branch?.name || props.clinic?.name || 'CLINIC')

const patientCode = computed(() => props.patient?.pId ? `P-${String(props.patient.pId).padStart(6, '0')}` : 'P-......')
// ...

const patientNameKh = computed(() => {
  return props.patient?.nameKh || props.patient?.name || props.patient?.nameEn || 'Unknown'
})

const patientPhone = computed(() => props.patient?.phone || '..................')

const gender = computed(() => {
  const g = props.patient?.gender || props.patient?.sex || 'M'
  return (g === 'M' || g === 'Male' || g === 1) ? 'ប្រុស' : 'ស្រី'
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
  if (props.patient?.villageName) parts.push(`${props.patient.villageName}`)
  if (props.patient?.communeName) parts.push(`${props.patient.communeName}`)
  if (props.patient?.districtName) parts.push(`${props.patient.districtName}`)
  if (props.patient?.provinceName) parts.push(`${props.patient.provinceName}`)

  if (parts.length > 0) return parts.join(' - ')
  return props.patient?.address || '...................................................................'
})

const diagnosis = computed(() => {
  if (props.visit?.diagnosis && Array.isArray(props.visit.diagnosis)) {
    return props.visit.diagnosis.map((d: any) => d.nameEn || d.nameKh || d.name).join(', ')
  }
  return props.visit?.notes || '...................................................................'
})

const vitals = computed(() => {
  return props.visit?.vitals || null
})

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
    font-family: 'Battambang', 'Hanuman', 'Noto Sans Khmer', serif;
}

.font-khmer-moul {
    font-family: 'Moul', serif;
}
</style>
