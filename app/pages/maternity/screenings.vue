<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

const { t } = useI18n()
const toast = useToast()

const activeTab = ref<'epds' | 'newborn'>('epds')
const loading = ref(false)

// EPDS state
const epdsList = ref<any[]>([])
const isEpdsModalOpen = ref(false)
const selectedEpdsPatientId = ref('')
const selectedScreeningPeriod = ref('PNC_6_WEEKS')

// 10 Validated EPDS Questions with Khmer & English
const epdsQuestions = [
  {
    index: 0,
    textEn: '1. I have been able to laugh and see the funny side of things',
    textKm: '១. ខ្ញុំអាចសើចសប្បាយ និងមើលឃើញចំណុចកំប្លុកកំប្លែងនៃរឿងរ៉ាវនានា',
    options: [
      { textEn: 'As much as I always could', textKm: 'ដូចដែលខ្ញុំធ្លាប់មានពីមុន', score: 0 },
      { textEn: 'Not quite so much now', textKm: 'មិនសូវច្រើនដូចមុនទេ', score: 1 },
      { textEn: 'Definitely not so much now', textKm: 'ពិតជាមិនសូវដូចមុនច្រើនណាស់', score: 2 },
      { textEn: 'Not at all', textKm: 'មិនអាចទាល់តែសោះ', score: 3 }
    ]
  },
  {
    index: 1,
    textEn: '2. I have looked forward with enjoyment to things',
    textKm: '២. ខ្ញុំទន្ទឹងរង់ចាំរឿងរ៉ាវនានាដោយក្តីរីករាយ',
    options: [
      { textEn: 'As much as I ever did', textKm: 'ដូចដែលខ្ញុំធ្លាប់រង់ចាំ', score: 0 },
      { textEn: 'Rather less than I used to', textKm: 'តិចជាងមុនបន្តិច', score: 1 },
      { textEn: 'Definitely less than I used to', textKm: 'តិចជាងមុនច្រើន', score: 2 },
      { textEn: 'Hardly at all', textKm: 'ស្ទើរតែមិនមានសោះ', score: 3 }
    ]
  },
  {
    index: 2,
    textEn: '3. I have blamed myself unnecessarily when things went wrong',
    textKm: '៣. ខ្ញុំបន្ទោសខ្លួនឯងដោយគ្មានហេតុផលពេលមានបញ្ហាកើតឡើង',
    options: [
      { textEn: 'Yes, most of the time', textKm: 'បាទ/ចាស ស្ទើរតែគ្រប់ពេល', score: 3 },
      { textEn: 'Yes, some of the time', textKm: 'បាទ/ចាស ពេលខ្លះ', score: 2 },
      { textEn: 'Not very often', textKm: 'មិនញឹកញាប់ទេ', score: 1 },
      { textEn: 'No, never', textKm: 'ទេ មិនដែលសោះ', score: 0 }
    ]
  },
  {
    index: 3,
    textEn: '4. I have been anxious or worried for no good reason',
    textKm: '៤. ខ្ញុំមានអារម្មណ៍ថប់បារម្ភ ឬព្រួយបារម្ភដោយគ្មានមូលហេតុត្រឹមត្រូវ',
    options: [
      { textEn: 'No, not at all', textKm: 'ទេ មិនដែលមានសោះ', score: 0 },
      { textEn: 'Hardly ever', textKm: 'កម្រណាស់', score: 1 },
      { textEn: 'Yes, sometimes', textKm: 'បាទ/ចាស ជួនកាល', score: 2 },
      { textEn: 'Yes, very often', textKm: 'បាទ/ចាស ញឹកញាប់ណាស់', score: 3 }
    ]
  },
  {
    index: 4,
    textEn: '5. I have felt scared or panicky for no very good reason',
    textKm: '៥. ខ្ញុំមានអារម្មណ៍ភ័យខ្លាច ឬស្លន់ស្លោដោយគ្មានមូលហេតុច្បាស់លាស់',
    options: [
      { textEn: 'Yes, quite a lot', textKm: 'បាទ/ចាស ច្រើនណាស់', score: 3 },
      { textEn: 'Yes, sometimes', textKm: 'បាទ/ចាស ពេលខ្លះ', score: 2 },
      { textEn: 'No, not much', textKm: 'ទេ មិនសូវមានទេ', score: 1 },
      { textEn: 'No, not at all', textKm: 'ទេ មិនដែលមានទាល់តែសោះ', score: 0 }
    ]
  },
  {
    index: 5,
    textEn: '6. Things have been getting on top of me (overwhelmed)',
    textKm: '៦. រឿងរ៉ាវនានាបានដាក់បន្ទុកលើខ្ញុំខ្លាំងពេក (ខ្ញុំមិនអាចដោះស្រាយបាន)',
    options: [
      { textEn: 'Yes, most of the time I have been unable to cope', textKm: 'បាទ/ចាស ស្ទើរតែគ្រប់ពេលខ្ញុំមិនអាចទប់ទល់បាន', score: 3 },
      { textEn: 'Yes, sometimes I have not been coping as well as usual', textKm: 'បាទ/ចាស ជួនកាលខ្ញុំមិនអាចដោះស្រាយបានដូចធម្មតា', score: 2 },
      { textEn: 'No, most of the time I have coped quite well', textKm: 'ទេ ភាគច្រើនខ្ញុំអាចទប់ទល់បានល្អគួរសម', score: 1 },
      { textEn: 'No, I have been coping as well as ever', textKm: 'ទេ ខ្ញុំអាចដោះស្រាយបានល្អដូចធម្មតា', score: 0 }
    ]
  },
  {
    index: 6,
    textEn: '7. I have been so unhappy that I have had difficulty sleeping',
    textKm: '៧. ខ្ញុំពិបាកចិត្តខ្លាំងរហូតដល់ពិបាកគេងលក់',
    options: [
      { textEn: 'Yes, most of the time', textKm: 'បាទ/ចាស ស្ទើរតែរាល់យប់', score: 3 },
      { textEn: 'Yes, sometimes', textKm: 'បាទ/ចាស យប់ខ្លះ', score: 2 },
      { textEn: 'Not very often', textKm: 'មិនញឹកញាប់ទេ', score: 1 },
      { textEn: 'No, not at all', textKm: 'ទេ គេងលក់ស្រួលធម្មតា', score: 0 }
    ]
  },
  {
    index: 7,
    textEn: '8. I have felt sad or miserable',
    textKm: '៨. ខ្ញុំមានអារម្មណ៍ក្រៀមក្រំ ឬវេទនាចិត្ត',
    options: [
      { textEn: 'Yes, most of the time', textKm: 'បាទ/ចាស ស្ទើរតែគ្រប់ពេល', score: 3 },
      { textEn: 'Yes, quite often', textKm: 'បាទ/ចាស ញឹកញាប់គួរសម', score: 2 },
      { textEn: 'Not very often', textKm: 'មិនញឹកញាប់ទេ', score: 1 },
      { textEn: 'No, not at all', textKm: 'ទេ មិនមានសោះ', score: 0 }
    ]
  },
  {
    index: 8,
    textEn: '9. I have been so unhappy that I have been crying',
    textKm: '៩. ខ្ញុំមិនសប្បាយចិត្តខ្លាំងរហូតដល់យំ',
    options: [
      { textEn: 'Yes, most of the time', textKm: 'បាទ/ចាស ស្ទើរតែគ្រប់ពេល', score: 3 },
      { textEn: 'Yes, quite often', textKm: 'បាទ/ចាស ញឹកញាប់', score: 2 },
      { textEn: 'Only occasionally', textKm: 'ម្តងម្កាលប៉ុណ្ណោះ', score: 1 },
      { textEn: 'No, never', textKm: 'ទេ មិនដែលយំទេ', score: 0 }
    ]
  },
  {
    index: 9,
    textEn: '10. The thought of harming myself has occurred to me (CRITICAL)',
    textKm: '១០. គំនិតចង់ធ្វើបាបខ្លួនឯងបានកើតឡើងចំពោះខ្ញុំ (ហានិភ័យខ្ពស់)',
    options: [
      { textEn: 'Yes, quite often', textKm: 'បាទ/ចាស ញឹកញាប់ណាស់', score: 3 },
      { textEn: 'Sometimes', textKm: 'ជួនកាល', score: 2 },
      { textEn: 'Hardly ever', textKm: 'កម្រខ្លាំងណាស់', score: 1 },
      { textEn: 'Never', textKm: 'មិនដែលមានទាល់តែសោះ', score: 0 }
    ]
  }
]

const epdsAnswers = ref<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
const epdsActionPlan = ref('')
const epdsNotes = ref('')

const epdsTotalScore = computed(() => {
  return epdsAnswers.value.reduce((sum, val) => sum + (val || 0), 0)
})

const isQ10Positive = computed(() => {
  return epdsAnswers.value[9] > 0
})

// Newborn Screenings state
const newbornScreeningsList = ref<any[]>([])
const isNewbornModalOpen = ref(false)
const newbornForm = ref({
  patientId: '',
  screeningType: 'PULSE_OXIMETRY_CCHD',
  hoursAfterBirth: 24,
  hearingDetails: {
    earSide: 'BOTH',
    method: 'OAE',
    result: 'PASS',
    followUpRecommended: false,
    followUpDate: ''
  },
  pulseOximetryDetails: {
    rightHandSpo2: 98,
    footSpo2: 98,
    differenceSpo2: 0,
    interpretation: 'PASS'
  },
  screenedByName: 'Duty Pediatric Nurse',
  notes: ''
})

const patientsList = ref<any[]>([])

const calculatePulseOx = () => {
  const hand = newbornForm.value.pulseOximetryDetails.rightHandSpo2 || 0
  const foot = newbornForm.value.pulseOximetryDetails.footSpo2 || 0
  const diff = Math.abs(hand - foot)
  newbornForm.value.pulseOximetryDetails.differenceSpo2 = diff

  if (hand < 90 || foot < 90) {
    newbornForm.value.pulseOximetryDetails.interpretation = 'FAIL_IMMEDIATE'
  } else if (hand < 95 || foot < 95 || diff > 3) {
    newbornForm.value.pulseOximetryDetails.interpretation = 'REPEAT_1_HOUR'
  } else {
    newbornForm.value.pulseOximetryDetails.interpretation = 'PASS'
  }
}

const fetchEpds = async () => {
  loading.value = true
  try {
    const res = await $api('/maternity/screenings/epds', { query: { limit: 50 } })
    epdsList.value = res.data || []
  } catch (err: any) {
    toast.add({ title: 'Error fetching EPDS', description: err.message, color: 'error' })
  } finally {
    loading.value = false
  }
}

const fetchNewbornScreenings = async () => {
  loading.value = true
  try {
    const res = await $api('/maternity/screenings/newborn', { query: { limit: 50 } })
    newbornScreeningsList.value = res.data || []
  } catch (err: any) {
    toast.add({ title: 'Error fetching newborn screenings', description: err.message, color: 'error' })
  } finally {
    loading.value = false
  }
}

const fetchPatients = async () => {
  try {
    const res = await $api('/patients', { query: { limit: 100 } })
    patientsList.value = res.data || []
  } catch (err) {}
}

const openEpdsModal = () => {
  epdsAnswers.value = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  epdsActionPlan.value = ''
  epdsNotes.value = ''
  isEpdsModalOpen.value = true
}

const submitEpds = async () => {
  if (!selectedEpdsPatientId.value) {
    toast.add({ title: 'Validation Error', description: 'Select patient for EPDS screening / សូមជ្រើសរើសអ្នកជំងឺ', color: 'error' })
    return
  }
  try {
    await $api('/maternity/screenings/epds', {
      method: 'POST',
      body: {
        patientId: selectedEpdsPatientId.value,
        screeningPeriod: selectedScreeningPeriod.value,
        responses: epdsAnswers.value,
        actionPlan: epdsActionPlan.value || (isQ10Positive.value ? 'Urgent Mental Health & Attending MD Evaluation' : 'Routine Postnatal Care'),
        notes: epdsNotes.value,
        screenedByName: 'Duty Midwife / Clinician'
      }
    })
    toast.add({ title: 'EPDS Saved', description: 'Depression screening scored and recorded / បានកត់ត្រាការវាយតម្លៃ EPDS', color: 'success' })
    isEpdsModalOpen.value = false
    fetchEpds()
  } catch (err: any) {
    toast.add({ title: 'Error', description: err.message, color: 'error' })
  }
}

const openNewbornModal = () => {
  newbornForm.value.hearingDetails.result = 'PASS'
  calculatePulseOx()
  isNewbornModalOpen.value = true
}

const submitNewbornScreening = async () => {
  if (!newbornForm.value.patientId) {
    toast.add({ title: 'Validation Error', description: 'Mother / Baby reference required / សូមជ្រើសរើសអ្នកជំងឺ', color: 'error' })
    return
  }
  try {
    await $api('/maternity/screenings/newborn', {
      method: 'POST',
      body: newbornForm.value
    })
    toast.add({ title: 'Screening Saved', description: 'Newborn clinical test recorded / បានកត់ត្រាការពិនិត្យទារកទើបនឹងកើត', color: 'success' })
    isNewbornModalOpen.value = false
    fetchNewbornScreenings()
  } catch (err: any) {
    toast.add({ title: 'Error', description: err.message, color: 'error' })
  }
}

onMounted(() => {
  fetchEpds()
  fetchNewbornScreenings()
  fetchPatients()
})
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-default p-6 rounded-2xl shadow-sm border border-default">
      <div class="flex items-center gap-3">
        <div class="p-2.5 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl">
          <UIcon name="i-lucide-clipboard-check" class="w-6 h-6" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-highlighted">Obstetric & Newborn Clinical Screenings</h1>
          <p class="text-sm text-muted">ការពិនិត្យសុខភាពផ្លូវចិត្តមាតា (EPDS) និងការពិនិត្យពិការភាពទារក (Hearing & CCHD Pulse Ox)</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <UButton
          v-if="activeTab === 'epds'"
          icon="i-lucide-plus"
          color="primary"
          class="rounded-xl px-4 py-2 font-medium"
          @click="openEpdsModal"
        >
          New EPDS Assessment
        </UButton>
        <UButton
          v-if="activeTab === 'newborn'"
          icon="i-lucide-plus"
          color="primary"
          class="rounded-xl px-4 py-2 font-medium"
          @click="openNewbornModal"
        >
          New Baby Screening
        </UButton>
      </div>
    </div>

    <!-- Tabs Header -->
    <div class="flex border-b border-default space-x-6">
      <button
        class="pb-3 text-sm font-bold border-b-2 transition flex items-center gap-2"
        :class="activeTab === 'epds' ? 'border-purple-600 text-purple-600 dark:text-purple-400' : 'border-transparent text-muted hover:text-default'"
        @click="activeTab = 'epds'; fetchEpds()"
      >
        <UIcon name="i-lucide-brain" class="w-4 h-4" />
        Edinburgh Postnatal Depression Scale (EPDS)
      </button>
      <button
        class="pb-3 text-sm font-bold border-b-2 transition flex items-center gap-2"
        :class="activeTab === 'newborn' ? 'border-purple-600 text-purple-600 dark:text-purple-400' : 'border-transparent text-muted hover:text-default'"
        @click="activeTab = 'newborn'; fetchNewbornScreenings()"
      >
        <UIcon name="i-lucide-baby" class="w-4 h-4" />
        Newborn Screenings (Hearing OAE & CCHD Pulse Oximetry)
      </button>
    </div>

    <!-- TAB 1: EPDS -->
    <div v-if="activeTab === 'epds'" class="space-y-4">
      <div class="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-4 text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
        <div class="font-bold text-sm">EPDS Clinical Scoring Protocol:</div>
        <div>&bull; Score 0 - 9: Low probability of depression (Routine care).</div>
        <div>&bull; Score 10 - 12: Possible mild depression (Repeat in 2 weeks, supportive counseling).</div>
        <div>&bull; Score &ge; 13: High depression alert (Formal clinical/psychiatric evaluation required).</div>
        <div class="text-rose-600 dark:text-rose-400 font-bold">&bull; Question 10 &gt; 0: Immediate Red Alert for suicidal ideation/self-harm.</div>
      </div>

      <div class="bg-default rounded-2xl shadow-sm border border-default overflow-hidden">
        <table class="w-full text-left text-sm text-toned">
          <thead class="bg-muted text-xs uppercase font-semibold text-muted border-b border-default">
            <tr>
              <th class="px-6 py-4">Screening Date</th>
              <th class="px-6 py-4">Patient</th>
              <th class="px-6 py-4">Period</th>
              <th class="px-6 py-4">Total Score (0-30)</th>
              <th class="px-6 py-4">Q10 Self-Harm Risk</th>
              <th class="px-6 py-4">Action Plan</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr v-if="epdsList.length === 0" class="text-center py-8">
              <td colspan="6" class="py-8 text-dimmed">
                <UIcon name="i-lucide-clipboard-x" class="w-8 h-8 mx-auto mb-2 opacity-50" />
                No EPDS screening assessments recorded.
              </td>
            </tr>
            <tr v-for="e in epdsList" :key="e._id" class="hover:bg-muted/50 transition">
              <td class="px-6 py-4 text-xs font-mono text-muted">
                {{ new Date(e.screenedAt || e.createdAt).toLocaleDateString() }}
              </td>
              <td class="px-6 py-4">
                <div class="font-medium text-highlighted">{{ e.patientId?.fullName || 'N/A' }}</div>
                <div class="text-xs text-dimmed">{{ e.patientId?.patientCode }}</div>
              </td>
              <td class="px-6 py-4 text-xs font-semibold">
                {{ e.screeningPeriod }}
              </td>
              <td class="px-6 py-4">
                <span
                  class="px-2.5 py-1 rounded-full text-xs font-bold"
                  :class="e.totalScore >= 13 ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300' : e.totalScore >= 10 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'"
                >
                  Score: {{ e.totalScore }} / 30
                </span>
              </td>
              <td class="px-6 py-4">
                <span v-if="e.responses && e.responses[9] > 0" class="px-2.5 py-1 bg-rose-600 text-white rounded-md text-xs font-bold animate-pulse flex items-center gap-1 w-fit">
                  <UIcon name="i-lucide-alert-triangle" class="w-3.5 h-3.5" /> High Self-Harm Alert
                </span>
                <span v-else class="text-xs text-emerald-600 font-semibold">Negative (0)</span>
              </td>
              <td class="px-6 py-4 text-xs text-toned max-w-xs truncate">
                {{ e.actionPlan || 'Routine PNC monitoring' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB 2: Newborn Screenings -->
    <div v-if="activeTab === 'newborn'" class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="p-4 bg-default rounded-xl border border-default flex items-start gap-3">
          <div class="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
            <UIcon name="i-lucide-headphones" class="w-5 h-5" />
          </div>
          <div>
            <div class="text-sm font-bold text-highlighted">Otoacoustic Emissions (OAE) Hearing Screening</div>
            <div class="text-xs text-muted mt-1">Universal newborn hearing test conducted before hospital discharge. "Refer" requires audiology diagnostic follow-up within 1 month.</div>
          </div>
        </div>
        <div class="p-4 bg-default rounded-xl border border-default flex items-start gap-3">
          <div class="p-2.5 bg-rose-50 text-rose-600 rounded-lg">
            <UIcon name="i-lucide-heart-pulse" class="w-5 h-5" />
          </div>
          <div>
            <div class="text-sm font-bold text-highlighted">Pulse Oximetry CCHD Screening (&ge; 24h of life)</div>
            <div class="text-xs text-muted mt-1">Evaluates pre-ductal (Right Hand) and post-ductal (Either Foot) oxygen saturation to detect Critical Congenital Heart Defects.</div>
          </div>
        </div>
      </div>

      <div class="bg-default rounded-2xl shadow-sm border border-default overflow-hidden">
        <table class="w-full text-left text-sm text-toned">
          <thead class="bg-muted text-xs uppercase font-semibold text-muted border-b border-default">
            <tr>
              <th class="px-6 py-4">Screening Date</th>
              <th class="px-6 py-4">Mother / Baby</th>
              <th class="px-6 py-4">Screening Type</th>
              <th class="px-6 py-4">Age (Hours)</th>
              <th class="px-6 py-4">Clinical Readings</th>
              <th class="px-6 py-4">Interpretation</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr v-if="newbornScreeningsList.length === 0" class="text-center py-8">
              <td colspan="6" class="py-8 text-dimmed">
                <UIcon name="i-lucide-baby" class="w-8 h-8 mx-auto mb-2 opacity-50" />
                No newborn screening records found.
              </td>
            </tr>
            <tr v-for="s in newbornScreeningsList" :key="s._id" class="hover:bg-muted/50 transition">
              <td class="px-6 py-4 text-xs font-mono text-muted">
                {{ new Date(s.createdAt).toLocaleDateString() }}
              </td>
              <td class="px-6 py-4">
                <div class="font-medium text-highlighted">{{ s.patientId?.fullName || 'N/A' }}</div>
                <div class="text-xs text-dimmed">{{ s.patientId?.patientCode }}</div>
              </td>
              <td class="px-6 py-4">
                <UBadge :color="s.screeningType.includes('PULSE') ? 'rose' : 'info'" variant="subtle" class="font-bold text-xs">
                  {{ s.screeningType }}
                </UBadge>
              </td>
              <td class="px-6 py-4 text-xs font-semibold">
                {{ s.hoursAfterBirth }} hrs
              </td>
              <td class="px-6 py-4 text-xs">
                <div v-if="s.pulseOximetryDetails">
                  Hand: {{ s.pulseOximetryDetails.rightHandSpo2 }}% | Foot: {{ s.pulseOximetryDetails.footSpo2 }}% (Diff: {{ s.pulseOximetryDetails.differenceSpo2 }}%)
                </div>
                <div v-else-if="s.hearingDetails">
                  Side: {{ s.hearingDetails.earSide }} ({{ s.hearingDetails.result }})
                </div>
              </td>
              <td class="px-6 py-4">
                <UBadge
                  :color="(s.pulseOximetryDetails?.interpretation === 'PASS' || s.hearingDetails?.result === 'PASS') ? 'success' : 'error'"
                  class="font-bold text-xs"
                >
                  {{ s.pulseOximetryDetails?.interpretation || s.hearingDetails?.result }}
                </UBadge>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- EPDS Modal -->
    <UModal v-model:open="isEpdsModalOpen" :ui="{ content: 'max-w-4xl' }">
      <template #content>
        <div class="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          <div class="flex items-center justify-between pb-3 border-b border-default sticky top-0 bg-default z-10">
            <div>
              <h3 class="text-lg font-bold text-highlighted">Edinburgh Postnatal Depression Scale (EPDS)</h3>
              <p class="text-xs text-muted">ការធ្វើតេស្តសុខភាពផ្លូវចិត្ត និងជំងឺបាក់ទឹកចិត្តក្រោយសម្រាល</p>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-sm font-bold px-3 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-lg">
                Score: {{ epdsTotalScore }} / 30
              </span>
              <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="xs" @click="isEpdsModalOpen = false" />
            </div>
          </div>

          <!-- Q10 Alert Banner -->
          <div v-if="isQ10Positive" class="p-3 bg-rose-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 animate-bounce">
            <UIcon name="i-lucide-alert-octagon" class="w-5 h-5" />
            CRITICAL SAFETY ALERT: Patient expressed suicidal/self-harm ideation (Question 10 positive). Immediate attending psychiatric evaluation required.
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-toned mb-1">Select Patient *</label>
              <select
                v-model="selectedEpdsPatientId"
                class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
              >
                <option value="" disabled>-- Choose Patient --</option>
                <option v-for="p in patientsList" :key="p._id" :value="p._id">
                  {{ p.fullName }} ({{ p.patientCode }})
                </option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-toned mb-1">Screening Timepoint</label>
              <select
                v-model="selectedScreeningPeriod"
                class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
              >
                <option value="ANC_THIRD_TRIMESTER">ANC 3rd Trimester</option>
                <option value="PNC_POSTPARTUM_WARD">Postpartum Ward (Day 1-3)</option>
                <option value="PNC_6_WEEKS">PNC 6-Week Checkup</option>
                <option value="ROUTINE">Routine Follow-up</option>
              </select>
            </div>
          </div>

          <!-- 10 Questions -->
          <div class="space-y-4 pt-2">
            <div
              v-for="q in epdsQuestions"
              :key="q.index"
              class="p-4 rounded-xl border transition"
              :class="q.index === 9 && epdsAnswers[9] > 0 ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-400' : 'bg-muted border-default'"
            >
              <div class="font-semibold text-sm text-highlighted">{{ q.textKm }}</div>
              <div class="text-xs text-muted mb-2">{{ q.textEn }}</div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label
                  v-for="opt in q.options"
                  :key="opt.score"
                  class="flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition hover:bg-default"
                  :class="epdsAnswers[q.index] === opt.score ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-400 text-purple-900 dark:text-purple-200 font-bold' : 'border-default'"
                >
                  <input
                    v-model="epdsAnswers[q.index]"
                    type="radio"
                    :name="'q_' + q.index"
                    :value="opt.score"
                    class="text-purple-600 focus:ring-purple-500"
                  />
                  <span>{{ opt.textKm }} <span class="text-dimmed">({{ opt.score }} pts)</span></span>
                </label>
              </div>
            </div>
          </div>

          <div class="space-y-2 pt-2">
            <label class="block text-xs font-semibold text-toned">Action Plan & Clinical Follow-up</label>
            <textarea
              v-model="epdsActionPlan"
              rows="2"
              placeholder="Referral to counseling, psychiatric consultation, close family support..."
              class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
            ></textarea>
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t border-default sticky bottom-0 bg-default">
            <UButton color="neutral" variant="ghost" @click="isEpdsModalOpen = false">Cancel</UButton>
            <UButton color="primary" @click="submitEpds">Save Assessment (Score: {{ epdsTotalScore }})</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Newborn Screening Modal -->
    <UModal v-model:open="isNewbornModalOpen" :ui="{ content: 'max-w-2xl' }">
      <template #content>
        <div class="p-6 space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-default">
            <h3 class="text-lg font-bold text-highlighted">Record Newborn Screening</h3>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="xs" @click="isNewbornModalOpen = false" />
          </div>

          <div class="space-y-3">
            <div>
              <label class="block text-xs font-semibold text-toned mb-1">Select Mother / Infant *</label>
              <select
                v-model="newbornForm.patientId"
                class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
              >
                <option value="" disabled>-- Choose Patient --</option>
                <option v-for="p in patientsList" :key="p._id" :value="p._id">
                  {{ p.fullName }} ({{ p.patientCode }})
                </option>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">Screening Test</label>
                <select
                  v-model="newbornForm.screeningType"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                >
                  <option value="PULSE_OXIMETRY_CCHD">Pulse Oximetry (Critical Congenital Heart Disease)</option>
                  <option value="HEARING_OAE">Hearing Screening (Otoacoustic Emissions - OAE)</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">Hours After Birth</label>
                <input
                  v-model.number="newbornForm.hoursAfterBirth"
                  type="number"
                  min="0"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                />
              </div>
            </div>

            <!-- Pulse Ox Fields -->
            <div v-if="newbornForm.screeningType === 'PULSE_OXIMETRY_CCHD'" class="p-4 bg-muted rounded-xl border border-default space-y-3">
              <div class="text-xs font-bold text-default uppercase">Pre- and Post-Ductal SpO2 Saturation</div>
              <div class="grid grid-cols-3 gap-3">
                <div>
                  <label class="block text-xs text-muted mb-1">Right Hand SpO2 (%)</label>
                  <input
                    v-model.number="newbornForm.pulseOximetryDetails.rightHandSpo2"
                    type="number"
                    min="50"
                    max="100"
                    class="w-full text-sm p-2 rounded border border-accented"
                    @input="calculatePulseOx"
                  />
                </div>
                <div>
                  <label class="block text-xs text-muted mb-1">Either Foot SpO2 (%)</label>
                  <input
                    v-model.number="newbornForm.pulseOximetryDetails.footSpo2"
                    type="number"
                    min="50"
                    max="100"
                    class="w-full text-sm p-2 rounded border border-accented"
                    @input="calculatePulseOx"
                  />
                </div>
                <div>
                  <label class="block text-xs text-muted mb-1">Difference (%)</label>
                  <input
                    :value="newbornForm.pulseOximetryDetails.differenceSpo2"
                    readonly
                    class="w-full text-sm p-2 rounded bg-elevated font-bold"
                  />
                </div>
              </div>
              <div class="flex items-center gap-2 pt-1">
                <span class="text-xs font-semibold">Interpretation:</span>
                <UBadge
                  :color="newbornForm.pulseOximetryDetails.interpretation === 'PASS' ? 'success' : 'error'"
                  class="font-bold"
                >
                  {{ newbornForm.pulseOximetryDetails.interpretation }}
                </UBadge>
              </div>
            </div>

            <!-- Hearing OAE Fields -->
            <div v-if="newbornForm.screeningType === 'HEARING_OAE'" class="p-4 bg-muted rounded-xl border border-default space-y-3">
              <div class="text-xs font-bold text-default uppercase">OAE Hearing Screening Results</div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs text-muted mb-1">Ear Tested</label>
                  <select v-model="newbornForm.hearingDetails.earSide" class="w-full text-sm p-2 rounded border border-accented">
                    <option value="BOTH">Both Ears (ត្រចៀកទាំងសងខាង)</option>
                    <option value="LEFT">Left Ear (ត្រចៀកឆ្វេង)</option>
                    <option value="RIGHT">Right Ear (ត្រចៀកស្តាំ)</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs text-muted mb-1">Result</label>
                  <select v-model="newbornForm.hearingDetails.result" class="w-full text-sm p-2 rounded border border-accented">
                    <option value="PASS">PASS (ឆ្លងកាត់)</option>
                    <option value="REFER">REFER / RE-TEST (ត្រូវពិនិត្យឡើងវិញ)</option>
                    <option value="INCONCLUSIVE">INCONCLUSIVE (មិនច្បាស់លាស់)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t border-default">
            <UButton color="neutral" variant="ghost" @click="isNewbornModalOpen = false">Cancel</UButton>
            <UButton color="primary" @click="submitNewbornScreening">Save Screening</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
