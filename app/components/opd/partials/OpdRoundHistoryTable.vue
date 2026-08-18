<template>
  <div class="h-full flex flex-col bg-white dark:bg-gray-900 overflow-hidden font-khmer">
    <!-- Top Filter / Status Header -->
    <div class="p-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-history" class="w-5 h-5 text-primary-500" />
        <span class="font-bold text-sm text-gray-800 dark:text-gray-200">
          ប្រវត្តិចូលពិនិត្យ & ព្យាបាល (Patient Visit History & Clinical Rounds)
        </span>
        <UBadge v-if="visits.length > 0" color="primary" variant="subtle" size="xs">
          {{ visits.length }} លើក (Visits)
        </UBadge>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="ghost"
          size="xs"
          :loading="isLoading"
          @click="fetchHistory"
        >
          ផ្ទុកឡើងវិញ
        </UButton>
      </div>
    </div>

    <!-- Empty / No Patient State -->
    <div v-if="!patientId" class="flex-1 flex flex-col items-center justify-center p-8 text-gray-400">
      <UIcon name="i-lucide-user-x" class="w-12 h-12 mb-2 stroke-1" />
      <p class="text-sm font-medium">សូមជ្រើសរើសអ្នកជំងឺជាមុនសិន ដើម្បីមើលប្រវត្តិចូលពេទ្យ</p>
      <p class="text-xs text-gray-500 mt-1">Please select a patient to view clinical history and rounds</p>
    </div>

    <!-- Loading State -->
    <div v-else-if="isLoading" class="flex-1 flex items-center justify-center p-8 text-gray-500">
      <div class="flex flex-col items-center gap-2">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary-500" />
        <span class="text-sm">កំពុងទាញយកប្រវត្តិចូលពេទ្យ...</span>
      </div>
    </div>

    <!-- Empty History -->
    <div v-else-if="visits.length === 0" class="flex-1 flex flex-col items-center justify-center p-8 text-gray-400">
      <UIcon name="i-lucide-folder-open" class="w-12 h-12 mb-2 stroke-1 text-emerald-500" />
      <p class="text-sm font-bold text-gray-700 dark:text-gray-300">អ្នកជំងឺទើបមកពិនិត្យលើកដំបូង (First-time visit)</p>
      <p class="text-xs text-gray-500 mt-1">គ្មានប្រវត្តិចូលពិនិត្យពីមុននៅក្នុងប្រព័ន្ធទេ</p>
    </div>

    <!-- Visit History List / Timeline -->
    <div v-else class="flex-1 overflow-y-auto p-3 space-y-3">
      <div
        v-for="(v, index) in visits"
        :key="v._id || index"
        class="border border-gray-200 dark:border-gray-800 rounded-lg p-3.5 bg-white dark:bg-gray-800/40 hover:border-primary-400 transition-all shadow-xs"
      >
        <!-- Visit Header -->
        <div class="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-gray-100 dark:border-gray-800">
          <div class="flex items-center gap-2.5">
            <span class="px-2 py-0.5 rounded text-xs font-bold bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
              {{ v.dept || 'OPD' }}
            </span>
            <span class="font-bold text-sm text-gray-900 dark:text-white">
              កូដពិនិត្យ: {{ v.visitId || v.visitNo || 'N/A' }}
            </span>
            <span class="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <UIcon name="i-lucide-calendar" class="w-3.5 h-3.5" />
              {{ formatDate(v.dateIn || v.createdAt) }}
            </span>
          </div>

          <div class="flex items-center gap-2">
            <span v-if="v.doctorName || v.doctor?.nameKh || v.doctor?.nameEn" class="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium">
              👨‍⚕️ {{ v.doctorName || v.doctor?.nameKh || v.doctor?.nameEn }}
            </span>
            <UButton
              v-if="getMedicationsForVisit(v._id).length > 0"
              icon="i-lucide-copy"
              size="xs"
              color="primary"
              variant="soft"
              label="ចម្លងវេជ្ជបញ្ជា (Copy Rx)"
              @click="copyMedications(getMedicationsForVisit(v._id))"
            />
          </div>
        </div>

        <!-- Visit Body (Diagnosis, Vitals, Medications, Labs) -->
        <div class="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2.5 text-xs">
          <!-- Diagnosis & Notes -->
          <div class="md:col-span-4 space-y-1.5 border-r border-gray-100 dark:border-gray-800 pr-2">
            <div class="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
              <UIcon name="i-lucide-stethoscope" class="w-3.5 h-3.5 text-indigo-500" />
              រោគវិនិច្ឆ័យ (Diagnosis):
            </div>
            <div v-if="v.diagnosis && v.diagnosis.length > 0" class="flex flex-wrap gap-1">
              <span
                v-for="(d, dIdx) in v.diagnosis"
                :key="dIdx"
                class="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium text-[11px]"
              >
                {{ d.code ? `[${d.code}] ` : '' }}{{ d.nameKh || d.nameEn || d.name || d }}
              </span>
            </div>
            <div v-else class="text-gray-400 italic text-[11px]">
              {{ v.notes || 'មិនមានកត់ត្រារោគវិនិច្ឆ័យ' }}
            </div>

            <!-- Vitals Summary -->
            <div v-if="v.vitals && Object.keys(v.vitals).length > 0" class="pt-2 border-t border-dashed border-gray-100 dark:border-gray-800">
              <div class="font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                <UIcon name="i-lucide-activity" class="w-3.5 h-3.5 text-rose-500" />
                សញ្ញាជីវិត (Vitals):
              </div>
              <div class="grid grid-cols-2 gap-1 text-[11px] text-gray-600 dark:text-gray-400">
                <span v-if="v.vitals.bp">BP: <b>{{ v.vitals.bp }}</b></span>
                <span v-if="v.vitals.pulse">Pulse: <b>{{ v.vitals.pulse }}</b> bpm</span>
                <span v-if="v.vitals.temp">Temp: <b>{{ v.vitals.temp }}</b> °C</span>
                <span v-if="v.vitals.spo2">SpO2: <b>{{ v.vitals.spo2 }}</b> %</span>
                <span v-if="v.vitals.weight">Weight: <b>{{ v.vitals.weight }}</b> kg</span>
              </div>
            </div>
          </div>

          <!-- Prescriptions -->
          <div class="md:col-span-5 space-y-1.5 border-r border-gray-100 dark:border-gray-800 pr-2">
            <div class="font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-between">
              <span class="flex items-center gap-1">
                <UIcon name="i-lucide-pill" class="w-3.5 h-3.5 text-emerald-500" />
                ថ្នាំដែលបានចេញ (Prescription):
              </span>
              <span class="text-[10px] text-gray-400">
                {{ getMedicationsForVisit(v._id).length }} មុខ
              </span>
            </div>
            <div v-if="getMedicationsForVisit(v._id).length > 0" class="space-y-1 max-h-36 overflow-y-auto pr-1">
              <div
                v-for="(med, mIdx) in getMedicationsForVisit(v._id)"
                :key="mIdx"
                class="p-1.5 rounded bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 flex items-start justify-between text-[11px]"
              >
                <div>
                  <span class="font-bold text-gray-800 dark:text-gray-200">
                    {{ med.nameEn || med.nameKh || med.name }}
                  </span>
                  <div class="text-[10px] text-gray-500 flex items-center gap-2 mt-0.5">
                    <span>ព្រឹក: {{ med.morningDose || med.morning || med.qmor || 0 }}</span>
                    <span>ថ្ងៃ: {{ med.afternoonDose || med.afternoon || med.qaft || 0 }}</span>
                    <span>ល្ងាច: {{ med.eveningDose || med.evening || med.qeve || 0 }}</span>
                    <span>យប់: {{ med.nightDose || med.night || med.qngt || 0 }}</span>
                    <span v-if="med.days || med.duration">({{ med.days || med.duration }} ថ្ងៃ)</span>
                  </div>
                  <div v-if="med.usage || med.instructions" class="text-[10px] text-emerald-600 dark:text-emerald-400 italic">
                    {{ med.usage || med.instructions }}
                  </div>
                </div>
                <span class="font-bold text-primary-600 dark:text-primary-400 whitespace-nowrap pl-2">
                  {{ med.quantity || med.qty || 1 }} {{ med.unit || '' }}
                </span>
              </div>
            </div>
            <div v-else class="text-gray-400 italic text-[11px]">
              គ្មានការចេញវេជ្ជបញ្ជា
            </div>
          </div>

          <!-- Lab / Imaging Results -->
          <div class="md:col-span-3 space-y-1.5">
            <div class="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
              <UIcon name="i-lucide-flask-conical" class="w-3.5 h-3.5 text-amber-500" />
              តេស្តពិសោធន៍ (Labs):
            </div>
            <div v-if="getLabsForVisit(v._id).length > 0" class="space-y-1 max-h-36 overflow-y-auto">
              <div
                v-for="(lab, lIdx) in getLabsForVisit(v._id)"
                :key="lIdx"
                class="p-1.5 rounded bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40 text-[11px]"
              >
                <div class="font-medium text-amber-900 dark:text-amber-300">
                  {{ lab.serviceName || lab.name || 'Lab Test' }}
                </div>
                <div v-if="lab.status" class="text-[10px] text-gray-500">
                  ស្ថានភាព: {{ lab.status }}
                </div>
              </div>
            </div>
            <div v-else class="text-gray-400 italic text-[11px]">
              គ្មានតេស្តពិសោធន៍
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

const props = defineProps<{
  patientId?: string
}>()

const emit = defineEmits<{
  (e: 'copy-medications', medications: any[]): void
}>()

const isLoading = ref(false)
const historyData = ref<any>(null)
const visits = ref<any[]>([])
const prescriptions = ref<any[]>([])
const labs = ref<any[]>([])

async function fetchHistory() {
  if (!props.patientId) {
    historyData.value = null
    visits.value = []
    prescriptions.value = []
    labs.value = []
    return
  }

  isLoading.value = true
  try {
    const res: any = await $api(`/reports/patient/${props.patientId}/history`)
    historyData.value = res?.data || {}
    visits.value = historyData.value.visits || []
    prescriptions.value = historyData.value.prescriptions || []
    labs.value = historyData.value.labs || []
  } catch (err) {
    console.error('Failed to fetch patient history:', err)
    visits.value = []
    prescriptions.value = []
    labs.value = []
  } finally {
    isLoading.value = false
  }
}

watch(() => props.patientId, (newId) => {
  if (newId) {
    fetchHistory()
  } else {
    visits.value = []
    prescriptions.value = []
    labs.value = []
  }
}, { immediate: true })

function getMedicationsForVisit(visitId: string): any[] {
  if (!visitId || !prescriptions.value) return []
  const rxList = prescriptions.value.filter((p: any) => p.visitId === visitId || String(p.visitId?._id || p.visitId) === String(visitId))
  const meds: any[] = []
  rxList.forEach((rx: any) => {
    if (Array.isArray(rx.medications)) {
      meds.push(...rx.medications)
    }
  })
  return meds
}

function getLabsForVisit(visitId: string): any[] {
  if (!visitId || !labs.value) return []
  return labs.value.filter((l: any) => l.visitId === visitId || String(l.visitId?._id || l.visitId) === String(visitId))
}

function copyMedications(meds: any[]) {
  if (!meds || meds.length === 0) return
  emit('copy-medications', meds)
}

function formatDate(dateStr: string | Date | undefined) {
  if (!dateStr) return 'N/A'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return String(dateStr)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<style scoped>
.font-khmer {
  font-family: 'Battambang', 'Noto Sans Khmer', serif;
}
</style>
