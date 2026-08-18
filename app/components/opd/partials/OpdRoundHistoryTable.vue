<template>
  <div class="h-full flex flex-col bg-white dark:bg-gray-900 overflow-hidden font-khmer select-none text-slate-800 dark:text-slate-100">
    <!-- Top Header: Patient Summary Bar -->
    <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/80 flex items-center justify-between">
      <div>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-history" class="w-5 h-5 text-primary-500" />
          <h2 class="text-base font-bold text-gray-900 dark:text-white">
            ប្រវត្តិអ្នកជំងឺ & ការពិនិត្យ (Patient Medical History)
          </h2>
        </div>
        <div v-if="patientInfo" class="flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-400 mt-1">
          <span class="font-bold text-primary-600 dark:text-primary-400">
            {{ patientInfo.pId ? `P-${String(patientInfo.pId).padStart(6, '0')}` : (patientInfo.code || patientInfo._id || 'P-000000') }}
          </span>
          <span>•</span>
          <span class="font-bold text-gray-900 dark:text-gray-100">
            {{ patientInfo.nameKh || patientInfo.nameEn || patientInfo.name || 'Unknown' }}
          </span>
          <span>•</span>
          <span>{{ patientInfo.gender == 2 || patientInfo.gender === 'Female' ? 'Female' : 'Male' }}</span>
          <span>•</span>
          <span>{{ patientAge ? `${patientAge} yrs` : 'N/A' }}</span>
          <template v-if="patientInfo.bloodGroup">
            <span>•</span>
            <span class="text-rose-600 font-bold">🩸 {{ patientInfo.bloodGroup }}</span>
          </template>
          <template v-if="patientInfo.allergies && patientInfo.allergies.length > 0">
            <span>•</span>
            <span class="px-1.5 py-0.5 rounded text-[11px] font-bold bg-rose-500 text-white">
              ⚠️ ប្រតិកម្ម: {{ Array.isArray(patientInfo.allergies) ? patientInfo.allergies.join(', ') : patientInfo.allergies }}
            </span>
          </template>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          icon="i-lucide-printer"
          color="neutral"
          variant="outline"
          size="sm"
          label="Print History"
          @click="printFullHistory"
        />
        <UButton
          v-if="showCloseButton"
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="$emit('close')"
        />
      </div>
    </div>

    <!-- Filter & Search Controls Bar -->
    <div class="p-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-2.5">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <!-- Department Filter Pills -->
        <div class="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-gray-800/80 rounded-lg">
          <button
            v-for="dept in deptTabs"
            :key="dept.value"
            type="button"
            class="px-3 py-1 text-xs font-semibold rounded-md transition-all"
            :class="selectedDept === dept.value
              ? 'bg-primary-500 text-white shadow-xs font-bold'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'"
            @click="selectedDept = dept.value"
          >
            {{ dept.label }}
          </button>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-xs font-bold px-2.5 py-1 rounded-full bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
            {{ filteredVisits.length }} Visits
          </span>
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            size="xs"
            :loading="isLoading"
            @click="fetchHistory"
          />
        </div>
      </div>

      <!-- Search Query & Date Range -->
      <div class="grid grid-cols-1 md:grid-cols-12 gap-2">
        <div class="md:col-span-6">
          <UInput
            v-model="searchQuery"
            icon="i-lucide-search"
            placeholder="Search by diagnosis, complaint, medication, doctor..."
            size="sm"
            class="w-full"
          />
        </div>
        <div class="md:col-span-3">
          <UInput
            v-model="fromDate"
            type="date"
            size="sm"
            class="w-full"
            placeholder="From Date"
          />
        </div>
        <div class="md:col-span-3">
          <UInput
            v-model="toDate"
            type="date"
            size="sm"
            class="w-full"
            placeholder="To Date"
          />
        </div>
      </div>
    </div>

    <!-- Empty / No Patient State -->
    <div v-if="!patientId" class="flex-1 flex flex-col items-center justify-center p-8 text-gray-400">
      <UIcon name="i-lucide-user-x" class="w-12 h-12 mb-2 stroke-1" />
      <p class="text-sm font-medium">សូមជ្រើសរើសអ្នកជំងឺជាមុនសិន</p>
      <p class="text-xs text-gray-500 mt-1">Please select a patient to view clinical history</p>
    </div>

    <!-- Loading State -->
    <div v-else-if="isLoading" class="flex-1 flex items-center justify-center p-8 text-gray-500">
      <div class="flex flex-col items-center gap-2">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary-500" />
        <span class="text-sm">កំពុងទាញយកប្រវត្តិចូលពិនិត្យ...</span>
      </div>
    </div>

    <!-- No Records Found -->
    <div v-else-if="filteredVisits.length === 0" class="flex-1 flex flex-col items-center justify-center p-8 text-gray-400">
      <UIcon name="i-lucide-folder-open" class="w-12 h-12 mb-2 stroke-1 text-emerald-500" />
      <p class="text-sm font-bold text-gray-700 dark:text-gray-300">មិនមានទិន្នន័យពិនិត្យស្របតាមលក្ខខណ្ឌស្វែងរកទេ</p>
      <p class="text-xs text-gray-500 mt-1">No visit records matching your filter criteria</p>
    </div>

    <!-- Timeline List Content -->
    <div v-else class="flex-1 overflow-y-auto p-4 space-y-6">
      <div
        v-for="(v, index) in filteredVisits"
        :key="v._id || index"
        class="relative pl-6 before:absolute before:left-2 before:top-2.5 before:bottom-0 before:w-0.5 before:bg-gray-200 dark:before:bg-gray-800 last:before:hidden"
      >
        <!-- Timeline Bullet & Date Header -->
        <div class="flex items-center gap-2 mb-2">
          <div class="absolute left-0.5 top-1 w-3.5 h-3.5 rounded-full border-2 border-primary-500 bg-white dark:bg-gray-900 ring-4 ring-white dark:ring-gray-900" />
          <span class="text-xs font-bold text-gray-700 dark:text-gray-300">
            ● {{ formatDateTime(v.dateIn || v.createdAt) }}
          </span>
        </div>

        <!-- Visit Detail Card (Exact ASCII Box Layout) -->
        <div class="border border-gray-200 dark:border-gray-800 rounded-xl p-4 bg-white dark:bg-gray-900/90 shadow-sm hover:border-primary-400 dark:hover:border-primary-600 transition-all space-y-3.5">
          <!-- Card Top Line: Dept, Code, Doctor, Status -->
          <div class="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-gray-100 dark:border-gray-800">
            <div class="flex items-center gap-2">
              <span
                class="px-2.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider"
                :class="v.dept === 'IPD' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300' :
                  v.dept === 'ER' ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300' :
                  'bg-primary-50 text-primary-700 border border-primary-200 dark:bg-primary-950/50 dark:text-primary-300'"
              >
                {{ v.dept || 'OPD' }}
              </span>
              <span class="font-bold text-sm text-gray-900 dark:text-white">
                {{ v.visitId || v.visitNo || 'VIS-' + (v._id?.substring(18) || '000001') }}
              </span>
            </div>

            <div class="flex items-center gap-2">
              <span v-if="v.doctorName || v.doctor?.nameKh || v.doctor?.nameEn" class="text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                👨‍⚕️ {{ v.doctorName || v.doctor?.nameKh || v.doctor?.nameEn }}
              </span>
              <span
                class="text-xs font-bold px-2 py-0.5 rounded-full"
                :class="v.status === 'in_progress' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'"
              >
                {{ v.status === 'in_progress' ? 'In Progress' : 'Completed' }}
              </span>
            </div>
          </div>

          <!-- Chief Complaint / មូលហេតុមកពិនិត្យ -->
          <div>
            <div class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Chief Complaint / រោគសញ្ញាដំបូង
            </div>
            <p class="text-sm font-medium text-gray-900 dark:text-gray-100 leading-relaxed bg-gray-50/60 dark:bg-gray-800/40 p-2 rounded-lg border border-gray-100 dark:border-gray-800/80">
              {{ v.reason || v.notes || 'ក្អក ក្តៅខ្លួន ឈឺក្បាល (General consultation)' }}
            </p>
          </div>

          <!-- Vitals / សញ្ញាជីវិត -->
          <div v-if="v.vitals && Object.keys(v.vitals).length > 0">
            <div class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Vitals / សញ្ញាជីវិត
            </div>
            <div class="flex flex-wrap gap-2 text-xs">
              <span v-if="v.vitals.bp" class="px-2.5 py-1 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-100 dark:border-rose-900/40 font-medium">
                BP: <b class="font-bold">{{ v.vitals.bp }}</b> mmHg
              </span>
              <span v-if="v.vitals.temp" class="px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-900/40 font-medium">
                Temp: <b class="font-bold">{{ v.vitals.temp }}</b> °C
              </span>
              <span v-if="v.vitals.pulse" class="px-2.5 py-1 rounded-md bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-900/40 font-medium">
                Pulse: <b class="font-bold">{{ v.vitals.pulse }}</b> bpm
              </span>
              <span v-if="v.vitals.spo2" class="px-2.5 py-1 rounded-md bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-100 dark:border-sky-900/40 font-medium">
                SpO₂: <b class="font-bold">{{ v.vitals.spo2 }}</b> %
              </span>
              <span v-if="v.vitals.weight" class="px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/40 font-medium">
                Weight: <b class="font-bold">{{ v.vitals.weight }}</b> kg
              </span>
            </div>
          </div>

          <!-- Diagnosis / រោគវិនិច្ឆ័យ -->
          <div>
            <div class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Diagnosis / រោគវិនិច្ឆ័យ
            </div>
            <div v-if="v.diagnosis && v.diagnosis.length > 0" class="flex flex-wrap gap-1.5">
              <span
                v-for="(d, dIdx) in v.diagnosis"
                :key="dIdx"
                class="px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/60 text-xs font-bold"
              >
                {{ d.code ? `${d.code} • ` : '' }}{{ d.nameKh || d.nameEn || d.name || d }}
              </span>
            </div>
            <p v-else class="text-xs text-gray-400 italic">
              មិនមានកត់ត្រាកូដរោគវិនិច្ឆ័យ
            </p>
          </div>

          <!-- Prescription / វេជ្ជបញ្ជា -->
          <div>
            <div class="flex items-center justify-between text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              <span>Prescription / វេជ្ជបញ្ជា</span>
              <span class="text-[11px] text-gray-400 font-normal">
                {{ getMedicationsForVisit(v._id).length }} មុខថ្នាំ
              </span>
            </div>
            <div v-if="getMedicationsForVisit(v._id).length > 0" class="space-y-1.5">
              <div
                v-for="(med, mIdx) in getMedicationsForVisit(v._id)"
                :key="mIdx"
                class="p-2 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800 flex items-start justify-between text-xs"
              >
                <div>
                  <span class="font-bold text-gray-900 dark:text-white text-xs">
                    {{ med.nameEn || med.nameKh || med.name }}
                  </span>
                  <div class="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 flex flex-wrap items-center gap-2">
                    <span>ព្រឹក: <b>{{ med.morningDose || med.morning || med.qmor || 0 }}</b></span>
                    <span>ថ្ងៃ: <b>{{ med.afternoonDose || med.afternoon || med.qaft || 0 }}</b></span>
                    <span>ល្ងាច: <b>{{ med.eveningDose || med.evening || med.qeve || 0 }}</b></span>
                    <span>យប់: <b>{{ med.nightDose || med.night || med.qngt || 0 }}</b></span>
                    <span v-if="med.days || med.duration" class="text-primary-600 font-semibold">({{ med.days || med.duration }} ថ្ងៃ)</span>
                  </div>
                  <div v-if="med.usage || med.instructions" class="text-[11px] text-emerald-600 dark:text-emerald-400 italic mt-0.5">
                    {{ med.usage || med.instructions }}
                  </div>
                </div>
                <span class="font-bold text-primary-600 dark:text-primary-400 whitespace-nowrap pl-2">
                  {{ med.quantity || med.qty || 1 }} {{ med.unit || '' }}
                </span>
              </div>
            </div>
            <p v-else class="text-xs text-gray-400 italic">
              គ្មានការចេញវេជ្ជបញ្ជា
            </p>
          </div>

          <!-- Labs / តេស្តពិសោធន៍ -->
          <div v-if="getLabsForVisit(v._id).length > 0">
            <div class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              Labs: {{ getLabsForVisit(v._id).length }}
            </div>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="(lab, lIdx) in getLabsForVisit(v._id)"
                :key="lIdx"
                class="px-2 py-0.5 rounded text-xs bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/50 dark:border-amber-900/50 font-medium"
              >
                {{ lab.serviceName || lab.name || 'Lab Test' }} ({{ lab.status || 'Done' }})
              </span>
            </div>
          </div>

          <!-- Bottom Action Buttons: View Detail, Print, Amend -->
          <div class="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <UButton
              label="View Detail"
              icon="i-lucide-eye"
              size="xs"
              color="neutral"
              variant="outline"
              @click="viewVisitDetail(v)"
            />
            <UButton
              label="Print"
              icon="i-lucide-printer"
              size="xs"
              color="neutral"
              variant="outline"
              @click="printVisit(v)"
            />
            <UButton
              label="Amend / Edit"
              icon="i-lucide-pencil"
              size="xs"
              color="primary"
              variant="soft"
              @click="editVisit(v)"
            />
            <UButton
              v-if="getMedicationsForVisit(v._id).length > 0"
              label="Copy Rx"
              icon="i-lucide-copy"
              size="xs"
              color="primary"
              variant="solid"
              @click="copyMedications(getMedicationsForVisit(v._id))"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  patientId?: string
  patient?: any
  showCloseButton?: boolean
}>()

const emit = defineEmits<{
  (e: 'copy-medications', medications: any[]): void
  (e: 'close'): void
}>()

const isLoading = ref(false)
const historyData = ref<any>(null)
const patientInfo = ref<any>(props.patient || null)
const visits = ref<any[]>([])
const prescriptions = ref<any[]>([])
const labs = ref<any[]>([])

// Filter State
const selectedDept = ref('ALL')
const searchQuery = ref('')
const fromDate = ref('')
const toDate = ref('')

const deptTabs = [
  { label: 'All', value: 'ALL' },
  { label: 'OPD', value: 'OPD' },
  { label: 'IPD', value: 'IPD' },
  { label: 'ER', value: 'ER' },
  { label: 'Follow-up', value: 'FOLLOWUP' }
]

const patientAge = computed(() => {
  const dob = patientInfo.value?.dob
  if (!dob) return null
  const birthDate = new Date(dob)
  if (isNaN(birthDate.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
})

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
    const [histRes, patRes]: any = await Promise.all([
      $api(`/reports/patient/${props.patientId}/history`),
      !props.patient ? $api(`/patients/${props.patientId}`) : Promise.resolve({ data: props.patient })
    ])

    historyData.value = histRes?.data || {}
    visits.value = historyData.value.visits || []
    prescriptions.value = historyData.value.prescriptions || []
    labs.value = historyData.value.labs || []
    patientInfo.value = patRes?.data || props.patient || null
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

// Filtered visits computation
const filteredVisits = computed(() => {
  return visits.value.filter((v: any) => {
    // Dept filter
    if (selectedDept.value !== 'ALL') {
      const vDept = (v.dept || 'OPD').toUpperCase()
      if (selectedDept.value === 'FOLLOWUP' && !v.isFollowUp) return false
      if (selectedDept.value !== 'FOLLOWUP' && vDept !== selectedDept.value) return false
    }

    // Date range filter
    if (fromDate.value) {
      const vDate = new Date(v.dateIn || v.createdAt)
      if (vDate < new Date(fromDate.value)) return false
    }
    if (toDate.value) {
      const vDate = new Date(v.dateIn || v.createdAt)
      const to = new Date(toDate.value)
      to.setHours(23, 59, 59, 999)
      if (vDate > to) return false
    }

    // Search query filter
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim()
      const dName = (v.doctorName || v.doctor?.nameKh || v.doctor?.nameEn || '').toLowerCase()
      const complaint = (v.reason || v.notes || '').toLowerCase()
      const code = (v.visitId || v.visitNo || '').toLowerCase()
      const diag = (v.diagnosis || []).map((d: any) => `${d.code || ''} ${d.nameKh || ''} ${d.nameEn || ''} ${d.name || ''}`).join(' ').toLowerCase()
      const meds = getMedicationsForVisit(v._id).map((m: any) => `${m.nameEn || ''} ${m.nameKh || ''}`).join(' ').toLowerCase()

      if (!dName.includes(q) && !complaint.includes(q) && !code.includes(q) && !diag.includes(q) && !meds.includes(q)) {
        return false
      }
    }

    return true
  })
})

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

function formatDateTime(dateStr: string | Date | undefined) {
  if (!dateStr) return 'N/A'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return String(dateStr)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function viewVisitDetail(v: any) {
  const dept = (v.dept || 'opd').toLowerCase()
  navigateTo(`/${dept}?visitId=${v._id}&patientId=${props.patientId}`)
}

function editVisit(v: any) {
  const dept = (v.dept || 'opd').toLowerCase()
  navigateTo(`/${dept}?visitId=${v._id}&patientId=${props.patientId}`)
}

function printVisit(v: any) {
  window.open(`/print/prescription/${v._id}?patientId=${props.patientId}`, '_blank')
}

function printFullHistory() {
  window.print()
}
</script>

<style scoped>
.font-khmer {
  font-family: 'Battambang', 'Noto Sans Khmer', serif;
}
</style>
