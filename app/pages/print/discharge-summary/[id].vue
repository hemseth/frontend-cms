<template>
  <div class="max-w-4xl mx-auto p-8 bg-white text-black font-khmer space-y-6 print:p-0 print:m-0">
    <!-- Action Bar (Hidden on print) -->
    <div class="flex items-center justify-between pb-4 border-b border-gray-200 print:hidden">
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-file-text" class="w-5 h-5 text-primary-500" />
        <span class="font-bold">លិខិតសង្ខេបការចេញពីមន្ទីរពេទ្យ (Official Discharge Summary)</span>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          label="ត្រឡប់ក្រោយ"
          color="neutral"
          variant="outline"
          size="sm"
          @click="$router.back()"
        />
        <UButton
          label="បោះពុម្ព (Print)"
          icon="i-lucide-printer"
          color="primary"
          size="sm"
          @click="printDoc"
        />
      </div>
    </div>

    <div v-if="isLoading" class="py-16 text-center text-gray-400 print:hidden">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto" />
    </div>
    <UAlert
      v-else-if="errorMsg"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="errorMsg"
    />

    <template v-else>
      <!-- Official Header -->
      <div class="text-center space-y-1">
        <h2 class="text-sm font-bold tracking-widest uppercase">
          ព្រះរាជាណាចក្រកម្ពុជា
        </h2>
        <h3 class="text-xs font-bold tracking-wider">
          ជាតិ សាសនា ព្រះមហាក្សត្រ
        </h3>
        <div class="pt-2">
          <h1 class="text-base font-bold text-gray-900 uppercase">
            លិខិតសង្ខេបការព្យាបាល និងអនុញ្ញាតចេញពីមន្ទីរពេទ្យ
          </h1>
          <p class="text-xs text-gray-600">
            DISCHARGE MEDICAL SUMMARY & CLEARANCE
          </p>
        </div>
      </div>

      <!-- Facility & Admission Info -->
      <div class="border border-gray-400 rounded p-4 text-xs space-y-3">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <span class="font-semibold text-gray-600">មន្ទីរពេទ្យ៖</span>
            <span class="font-bold ml-2">{{ profile.title }}<template v-if="profile.subtitle"> ({{ profile.subtitle }})</template></span>
          </div>
          <div>
            <span class="font-semibold text-gray-600">លេខកូដសម្រាក (Admission No):</span>
            <span class="font-bold ml-2 text-primary-700">{{ summary.admissionNo }}</span>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-4 pt-2 border-t border-gray-200">
          <div>
            <span class="font-semibold text-gray-600">ឈ្មោះអ្នកជំងឺ៖</span>
            <span class="font-bold ml-2">{{ summary.patientName }}</span>
          </div>
          <div>
            <span class="font-semibold text-gray-600">ភេទ / អាយុ៖</span>
            <span class="font-bold ml-2">{{ summary.gender || '-' }} / {{ summary.age ? `${summary.age} ឆ្នាំ` : '-' }}</span>
          </div>
          <div>
            <span class="font-semibold text-gray-600">លេខកូដអ្នកជំងឺ៖</span>
            <span class="font-bold ml-2">{{ summary.patientCode }}</span>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-4 pt-2 border-t border-gray-200">
          <div>
            <span class="font-semibold text-gray-600">ថ្ងៃចូលសម្រាក៖</span>
            <span class="font-bold ml-2">{{ formatDate(summary.admissionDate) }}</span>
          </div>
          <div>
            <span class="font-semibold text-gray-600">ថ្ងៃចេញពីពេទ្យ៖</span>
            <span class="font-bold ml-2">{{ formatDate(summary.dischargeDate) }}</span>
          </div>
          <div>
            <span class="font-semibold text-gray-600">ស្នាក់នៅសរុប៖</span>
            <span class="font-bold ml-2 text-rose-600">{{ summary.stayDays }} ថ្ងៃ</span>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200">
          <div>
            <span class="font-semibold text-gray-600">សាល និងគ្រែសម្រាក៖</span>
            <span class="font-bold ml-2">{{ summary.ward }} • គ្រែ {{ summary.bed }}</span>
          </div>
          <div>
            <span class="font-semibold text-gray-600">វេជ្ជបណ្ឌិតទទួលបន្ទុក៖</span>
            <span class="font-bold ml-2">{{ summary.doctorName }}</span>
          </div>
        </div>
      </div>

      <!-- Clinical Diagnoses -->
      <div class="border border-gray-400 rounded p-4 text-xs space-y-2">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <h4 class="font-bold text-gray-700 uppercase">
              ១. រោគវិនិច្ឆ័យពេលចូល (Admission Diagnosis):
            </h4>
            <p class="font-medium mt-1">
              {{ summary.admissionDiagnosis }}
            </p>
          </div>
          <div>
            <h4 class="font-bold text-gray-700 uppercase">
              ២. រោគវិនិច្ឆ័យពេលចេញ (Discharge Diagnosis):
            </h4>
            <p class="font-bold text-primary-700 mt-1">
              {{ summary.dischargeDiagnosis }}
            </p>
          </div>
        </div>
      </div>

      <!-- Summary of Clinical Course -->
      <div class="border border-gray-400 rounded p-4 text-xs space-y-2">
        <h4 class="font-bold text-gray-700 uppercase">
          ៣. សង្ខេបដំណើរវិវត្ត និងការព្យាបាល (Clinical Course & Treatment Summary):
        </h4>
        <p class="leading-relaxed whitespace-pre-line">
          {{ summary.treatmentSummary }}
        </p>
      </div>

      <!-- Discharge Medications -->
      <div class="border border-gray-400 rounded p-4 text-xs space-y-2">
        <h4 class="font-bold text-gray-700 uppercase">
          ៤. ថ្នាំត្រូវបន្តលេបនៅផ្ទះ (Discharge Medications):
        </h4>
        <p class="font-medium">
          {{ summary.medications }}
        </p>
      </div>

      <!-- Home Care Instructions & Follow-up -->
      <div class="border border-gray-400 rounded p-4 text-xs space-y-2">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <h4 class="font-bold text-gray-700 uppercase">
              ៥. ការណែនាំថែទាំសុខភាព (Instructions):
            </h4>
            <p class="mt-1">
              {{ summary.instructions }}
            </p>
          </div>
          <div>
            <h4 class="font-bold text-gray-700 uppercase">
              ៦. ថ្ងៃណាត់ជួបតាមដានបន្ត (Follow-up Date):
            </h4>
            <p class="font-bold text-rose-700 mt-1">
              📅 {{ formatDate(summary.followUpDate) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Signatures -->
      <div class="grid grid-cols-2 gap-16 pt-8 text-center text-xs">
        <div class="space-y-16">
          <span class="font-bold">អ្នកជំងឺ ឬសាច់ញាតិទទួលស្គាល់</span>
          <div class="border-t border-gray-400 pt-1 font-medium">
            {{ summary.patientName }}
          </div>
        </div>
        <div class="space-y-16">
          <span class="font-bold">វេជ្ជបណ្ឌិតព្យាបាលទទួលបន្ទុក</span>
          <div class="border-t border-gray-400 pt-1 font-medium">
            {{ summary.doctorName }}
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const route = useRoute()
const { profile, load: loadProfile } = useClinicProfile()
const admission = ref<any>(null)
const isLoading = ref(true)
const errorMsg = ref('')

function describeDiagnosis(dx: any) {
  if (!dx) return ''
  return [dx.code, dx.nameKh || dx.nameEn].filter(Boolean).join(' • ')
}

function describeMedication(med: any) {
  if (typeof med === 'string') return med
  return [med?.name || med?.medicineName, med?.dosage, med?.frequency, med?.duration].filter(Boolean).join(' ')
}

function ageFrom(dob: any) {
  if (!dob) return ''
  const birth = new Date(dob)
  if (Number.isNaN(birth.getTime())) return ''
  return String(Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)))
}

// Every field comes from the stored admission; anything not recorded prints as blank, never invented.
const summary = computed(() => {
  const adm = admission.value
  const discharge = adm?.discharge || {}
  const patient = adm?.patient || {}
  return {
    admissionNo: adm?.admissionNumber || '',
    patientName: patient.nameKh || patient.nameEn || patient.name || '',
    patientCode: patient.pId ? `P-${String(patient.pId).padStart(6, '0')}` : '',
    gender: patient.gender == 2 ? 'ស្រី' : patient.gender == 1 ? 'ប្រុស' : '',
    age: ageFrom(patient.dob),
    admissionDate: adm?.admissionDate || adm?.admittedAt,
    dischargeDate: discharge.dischargeDate,
    stayDays: adm?.lengthOfStayDays ?? '',
    ward: adm?.location?.wardNameKh || adm?.location?.wardNameEn || '',
    bed: adm?.location?.bedCode || '',
    doctorName: adm?.attendingDoctor?.name || '',
    admissionDiagnosis: (adm?.admissionDiagnosis || []).map(describeDiagnosis).filter(Boolean).join(', ') || adm?.admissionReason || '',
    dischargeDiagnosis: describeDiagnosis(adm?.primaryDiagnosis) || discharge.reason || '',
    treatmentSummary: discharge.treatmentSummaryKh || discharge.treatmentSummaryEn || discharge.summary || '',
    medications: (discharge.medications || []).map(describeMedication).filter(Boolean).join('; '),
    instructions: discharge.instructions || '',
    followUpDate: discharge.followUpDate
  }
})

onMounted(async () => {
  await loadProfile()
  try {
    const res: any = await $api(`/inpatient/admissions/${route.params.id}`)
    admission.value = res?.data || null
    if (!admission.value?.discharge) errorMsg.value = 'អ្នកជំងឺនេះមិនទាន់ចេញពីពេទ្យនៅឡើយទេ (This patient has not been discharged yet)'
  } catch (err: any) {
    errorMsg.value = getApiErrorMessage(err, 'រកមិនឃើញការសម្រាកព្យាបាលនេះទេ (Admission not found)')
  } finally {
    isLoading.value = false
  }
})

function formatDate(d: any) {
  if (!d) return '-'
  const date = new Date(d)
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
}

function printDoc() {
  window.print()
}
</script>

<style scoped>
.font-khmer {
  font-family: 'Battambang', 'Noto Sans Khmer', serif;
}
@media print {
  @page {
    size: A4;
    margin: 1.5cm;
  }
}
</style>
