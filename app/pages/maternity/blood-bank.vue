<script setup lang="ts">
import { ref, onMounted } from 'vue'

const { t } = useI18n()
const toast = useToast()

const requests = ref<any[]>([])
const loading = ref(false)
const selectedFilter = ref('')

const isRequestModalOpen = ref(false)
const isCrossMatchModalOpen = ref(false)
const isTransfusionModalOpen = ref(false)
const isReactionModalOpen = ref(false)

const selectedRequest = ref<any>(null)

// Form: Blood Request
const requestForm = ref({
  patientId: '',
  urgency: 'URGENT',
  productType: 'PACKED_RED_BLOOD_CELLS',
  unitsRequested: 2,
  bloodGroup: 'O',
  rhFactor: 'POSITIVE',
  clinicalIndication: 'POSTPARTUM_HEMORRHAGE',
  notes: ''
})

// Form: Tech Cross-Match
const crossMatchForm = ref({
  unitBarcode: '',
  bloodGroup: 'O' as 'A' | 'B' | 'AB' | 'O',
  rhFactor: 'POSITIVE' as 'POSITIVE' | 'NEGATIVE',
  crossMatchResult: 'COMPATIBLE' as 'COMPATIBLE' | 'INCOMPATIBLE',
  expiresAt: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  notes: ''
})

// Form: Bedside Two-Nurse Verification
const transfusionForm = ref({
  scannedPatientCode: '',
  scannedUnitBarcode: '',
  nurse1Id: '',
  nurse2Id: '',
  preVitals: {
    bloodPressure: '110/70',
    pulseBpm: 84,
    temperatureC: 36.7,
    respiratoryRate: 18
  }
})

// Form: Adverse Reaction
const reactionForm = ref({
  symptoms: ['FEVER', 'CHILLS'],
  severity: 'MODERATE',
  actionTaken: 'Transfusion stopped immediately, physician alerted',
  notes: ''
})

const patientsList = ref<any[]>([])
const staffList = ref<any[]>([])

const fetchPatients = async () => {
  try {
    const res = await $api('/patients', { query: { limit: 100 } })
    patientsList.value = res.data || []
  } catch (err) {}
}

const fetchStaff = async () => {
  try {
    const res = await $api('/staff', { query: { limit: 100 } })
    staffList.value = res.data || []
  } catch (err) {}
}

const fetchRequests = async () => {
  loading.value = true
  try {
    const query: any = { limit: 50 }
    if (selectedFilter.value) query.status = selectedFilter.value
    const res = await $api('/blood-bank', { query })
    requests.value = res.data || []
  } catch (err: any) {
    toast.add({ title: 'បរាជ័យក្នុងការទាញទិន្នន័យ', description: err.message, color: 'error' })
  } finally {
    loading.value = false
  }
}

const handleCreateRequest = async () => {
  if (!requestForm.value.patientId) {
    toast.add({ title: 'សូមជ្រើសរើសអ្នកជំងឺ', color: 'warning' })
    return
  }

  try {
    await $api('/blood-bank', {
      method: 'POST',
      body: requestForm.value
    })
    toast.add({ title: 'បានបង្កើតសំណើឈាមជោគជ័យ', color: 'success' })
    isRequestModalOpen.value = false
    fetchRequests()
  } catch (err: any) {
    toast.add({ title: 'កំហុស', description: err.data?.message || err.message, color: 'error' })
  }
}

const openCrossMatch = (req: any) => {
  selectedRequest.value = req
  crossMatchForm.value.bloodGroup = req.bloodGroup || 'O'
  crossMatchForm.value.rhFactor = req.rhFactor || 'POSITIVE'
  crossMatchForm.value.unitBarcode = `BLD-${Date.now().toString().slice(-6)}`
  isCrossMatchModalOpen.value = true
}

const handleCompleteCrossMatch = async () => {
  try {
    await $api(`/blood-bank/${selectedRequest.value._id}/cross-match`, {
      method: 'POST',
      body: crossMatchForm.value
    })
    toast.add({ title: 'បានផ្ទៀងផ្ទាត់ Cross-Match ជោគជ័យ និងចេញប្លោកឈាម', color: 'success' })
    isCrossMatchModalOpen.value = false
    fetchRequests()
  } catch (err: any) {
    toast.add({ title: 'កំហុស Cross-Match', description: err.data?.message || err.message, color: 'error' })
  }
}

const openTransfusion = (req: any) => {
  selectedRequest.value = req
  transfusionForm.value.scannedPatientCode = req.patientId?.patientCode || ''
  transfusionForm.value.scannedUnitBarcode = req.unitBarcode || ''
  isTransfusionModalOpen.value = true
}

const handleStartTransfusion = async () => {
  try {
    await $api(`/blood-bank/${selectedRequest.value._id}/transfuse`, {
      method: 'POST',
      body: transfusionForm.value
    })
    toast.add({ title: 'បានផ្ទៀងផ្ទាត់គិលានុបដ្ឋាក ២ នាក់ និងចាប់ផ្តើមបញ្ចូលឈាមជោគជ័យ', color: 'success' })
    isTransfusionModalOpen.value = false
    fetchRequests()
  } catch (err: any) {
    toast.add({ title: 'ការបញ្ចូលឈាមត្រូវបានរារាំង!', description: err.data?.message || err.message, color: 'error' })
  }
}

const openReaction = (req: any) => {
  selectedRequest.value = req
  isReactionModalOpen.value = true
}

const handleReportReaction = async () => {
  try {
    await $api(`/blood-bank/${selectedRequest.value._id}/reaction`, {
      method: 'POST',
      body: reactionForm.value
    })
    toast.add({ title: 'បានរាយការណ៍ប្រតិកម្ម និងជូនដំណឹងគ្រូពេទ្យជាបន្ទាន់', color: 'error' })
    isReactionModalOpen.value = false
    fetchRequests()
  } catch (err: any) {
    toast.add({ title: 'កំហុស', description: err.data?.message || err.message, color: 'error' })
  }
}

const handleCompleteTransfusion = async (req: any) => {
  try {
    await $api(`/blood-bank/${req._id}/complete`, {
      method: 'POST',
      body: { volumeTransfusedMl: 450 }
    })
    toast.add({ title: 'បានបញ្ចប់ការបញ្ចូលឈាមជោគជ័យ', color: 'success' })
    fetchRequests()
  } catch (err: any) {
    toast.add({ title: 'កំហុស', description: err.data?.message || err.message, color: 'error' })
  }
}

onMounted(() => {
  fetchRequests()
  fetchPatients()
  fetchStaff()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-highlighted flex items-center gap-2">
          <UIcon name="i-lucide-droplets" class="w-7 h-7 text-red-500" />
          ធនាគារឈាម និងការបញ្ចូលឈាម (Blood Bank &amp; Transfusion)
        </h1>
        <p class="text-sm text-muted mt-1">
          ដំណើរការស្នើសុំ Cross-Match ផ្ទៀងផ្ទាត់ដោយគិលានុបដ្ឋាក ២ នាក់ (Two-Nurse Verification) និងរារាំងការបញ្ចូលឈាមខុស
        </p>
      </div>
      <div class="flex items-center gap-3">
        <UButton
          icon="i-lucide-plus"
          color="error"
          @click="isRequestModalOpen = true"
        >
          ស្នើសុំឈាមថ្មី (New Blood Request)
        </UButton>
      </div>
    </div>

    <!-- Requests Table -->
    <UCard>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-muted">
          <thead class="text-xs uppercase bg-muted text-default">
            <tr>
              <th class="px-4 py-3">លេខកូដសំណើ</th>
              <th class="px-4 py-3">អ្នកជំងឺ</th>
              <th class="px-4 py-3">កម្រិតបន្ទាន់</th>
              <th class="px-4 py-3">ផលិតផល &amp; បរិមាណ</th>
              <th class="px-4 py-3">ក្រុមឈាម / Rh</th>
              <th class="px-4 py-3">Cross-Match</th>
              <th class="px-4 py-3">ស្ថានភាព</th>
              <th class="px-4 py-3 text-right">សកម្មភាព</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr v-if="loading">
              <td colspan="8" class="text-center py-8">
                <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin mx-auto text-primary-500" />
              </td>
            </tr>
            <tr v-else-if="requests.length === 0">
              <td colspan="8" class="text-center py-8 text-dimmed">
                មិនមានសំណើឈាមឡើយ
              </td>
            </tr>
            <tr v-for="req in requests" :key="req._id" class="hover:bg-muted">
              <td class="px-4 py-3 font-semibold text-highlighted">
                {{ req.requestNumber }}
                <div class="text-[11px] text-dimmed">{{ new Date(req.createdAt).toLocaleString() }}</div>
              </td>
              <td class="px-4 py-3">
                <div class="font-medium text-highlighted">{{ req.patientId?.khmerName || req.patientId?.englishName || 'N/A' }}</div>
                <div class="text-xs text-dimmed">{{ req.patientId?.patientCode }}</div>
              </td>
              <td class="px-4 py-3 font-bold">
                <UBadge
                  :color="req.urgency === 'EMERGENCY' ? 'error' : req.urgency === 'URGENT' ? 'warning' : 'neutral'"
                  variant="subtle"
                  size="sm"
                >
                  {{ req.urgency }}
                </UBadge>
              </td>
              <td class="px-4 py-3 text-xs">
                <div class="font-medium text-highlighted">{{ req.productType }}</div>
                <div class="text-dimmed">{{ req.unitsRequested }} ប្លោក (Units)</div>
              </td>
              <td class="px-4 py-3 font-bold text-red-600">
                {{ req.bloodGroup }} {{ req.rhFactor === 'POSITIVE' ? '(Rh+)' : '(Rh-)' }}
              </td>
              <td class="px-4 py-3">
                <UBadge :color="req.crossMatchStatus === 'COMPATIBLE' ? 'success' : 'neutral'" variant="subtle" size="xs">
                  {{ req.crossMatchStatus }}
                </UBadge>
              </td>
              <td class="px-4 py-3">
                <UBadge
                  :color="req.status === 'TRANSFUSED' ? 'success' : req.status === 'IN_TRANSFUSION' ? 'warning' : req.status === 'REACTION_REPORTED' ? 'error' : 'primary'"
                  variant="subtle"
                  size="sm"
                >
                  {{ req.status }}
                </UBadge>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-1.5">
                  <UButton
                    v-if="req.status === 'REQUESTED' || req.status === 'CROSS_MATCHING'"
                    size="xs"
                    color="primary"
                    variant="soft"
                    @click="openCrossMatch(req)"
                  >
                    Cross-Match
                  </UButton>
                  <UButton
                    v-if="req.status === 'READY'"
                    size="xs"
                    color="error"
                    variant="solid"
                    icon="i-lucide-check-circle-2"
                    @click="openTransfusion(req)"
                  >
                    ផ្ទៀងផ្ទាត់ &amp; បញ្ចូលឈាម
                  </UButton>
                  <UButton
                    v-if="req.status === 'IN_TRANSFUSION'"
                    size="xs"
                    color="error"
                    variant="outline"
                    @click="openReaction(req)"
                  >
                    រាយការណ៍ប្រតិកម្ម
                  </UButton>
                  <UButton
                    v-if="req.status === 'IN_TRANSFUSION'"
                    size="xs"
                    color="success"
                    variant="soft"
                    @click="handleCompleteTransfusion(req)"
                  >
                    បញ្ចប់
                  </UButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <!-- Modal: New Blood Request -->
    <UModal v-model:open="isRequestModalOpen" title="បង្កើតសំណើឈាម (Blood Request)">
      <template #body>
        <form class="space-y-4" @submit.prevent="handleCreateRequest">
          <div>
            <label class="block text-xs font-semibold mb-1">ជ្រើសរើសអ្នកជំងឺ *</label>
            <select
              v-model="requestForm.patientId"
              class="w-full rounded-lg border border-accented bg-default px-3 py-2 text-sm text-highlighted"
            >
              <option value="" disabled>-- ជ្រើសរើសអ្នកជំងឺ --</option>
              <option v-for="p in patientsList" :key="p._id" :value="p._id">
                {{ p.khmerName || p.englishName }} ({{ p.patientCode }})
              </option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold mb-1">កម្រិតបន្ទាន់ (Urgency)</label>
              <select v-model="requestForm.urgency" class="w-full rounded border px-2 py-1.5 text-xs bg-default">
                <option value="ROUTINE">ធម្មតា (Routine)</option>
                <option value="URGENT">ប្រញាប់ (Urgent)</option>
                <option value="EMERGENCY">សង្គ្រោះបន្ទាន់ (Emergency)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold mb-1">ប្រភេទផលិតផលឈាម</label>
              <select v-model="requestForm.productType" class="w-full rounded border px-2 py-1.5 text-xs bg-default">
                <option value="PACKED_RED_BLOOD_CELLS">គោលិកាឈាមក្រហម (PRBC)</option>
                <option value="FRESH_FROZEN_PLASMA">ប្លាស្មាស្រស់កក (FFP)</option>
                <option value="PLATELETS">ប្លាកែត (Platelets)</option>
                <option value="WHOLE_BLOOD">ឈាមពេញលេញ (Whole Blood)</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-semibold mb-1">ចំនួនប្លោក (Units)</label>
              <UInput v-model.number="requestForm.unitsRequested" type="number" min="1" max="20" />
            </div>
            <div>
              <label class="block text-xs font-semibold mb-1">ក្រុមឈាម ABO</label>
              <select v-model="requestForm.bloodGroup" class="w-full rounded border px-2 py-1.5 text-xs bg-default">
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="AB">AB</option>
                <option value="O">O</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold mb-1">កត្តា Rh</label>
              <select v-model="requestForm.rhFactor" class="w-full rounded border px-2 py-1.5 text-xs bg-default">
                <option value="POSITIVE">វិជ្ជមាន Rh+</option>
                <option value="NEGATIVE">អវិជ្ជមាន Rh-</option>
              </select>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-4">
            <UButton variant="ghost" color="neutral" @click="isRequestModalOpen = false">បោះបង់</UButton>
            <UButton type="submit" color="error">ដាក់សំណើឈាម</UButton>
          </div>
        </form>
      </template>
    </UModal>

    <!-- Modal: Cross-Match (Tech) -->
    <UModal v-model:open="isCrossMatchModalOpen" title="ផ្ទៀងផ្ទាត់ Cross-Match &amp; ចេញប្លោកឈាម">
      <template #body>
        <form class="space-y-4" @submit.prevent="handleCompleteCrossMatch">
          <div class="p-2.5 bg-muted rounded-lg text-xs">
            <div class="font-bold">អ្នកជំងឺ: {{ selectedRequest?.patientId?.khmerName }}</div>
            <div class="text-dimmed">សំណើឈាម: {{ selectedRequest?.requestNumber }} ({{ selectedRequest?.unitsRequested }} units)</div>
          </div>

          <div>
            <label class="block text-xs font-semibold mb-1">បាកូដប្លោកឈាម (Blood Unit Barcode) *</label>
            <UInput v-model="crossMatchForm.unitBarcode" placeholder="BLD-XXXXXX" required />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold mb-1">ក្រុមឈាមប្លោកនេះ</label>
              <select v-model="crossMatchForm.bloodGroup" class="w-full rounded border px-2 py-1.5 text-xs bg-default">
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="AB">AB</option>
                <option value="O">O</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold mb-1">លទ្ធផល Cross-Match</label>
              <select v-model="crossMatchForm.crossMatchResult" class="w-full rounded border px-2 py-1.5 text-xs bg-default">
                <option value="COMPATIBLE">ត្រូវគ្នា (Compatible)</option>
                <option value="INCOMPATIBLE">មិនត្រូវគ្នា (Incompatible)</option>
              </select>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-4">
            <UButton variant="ghost" color="neutral" @click="isCrossMatchModalOpen = false">បោះបង់</UButton>
            <UButton type="submit" color="primary">បញ្ជាក់ការចេញប្លោកឈាម</UButton>
          </div>
        </form>
      </template>
    </UModal>

    <!-- Modal: Bedside Two-Nurse Verification -->
    <UModal v-model:open="isTransfusionModalOpen" title="ផ្ទៀងផ្ទាត់ដោយគិលានុបដ្ឋាក ២ នាក់ (Bedside Verification)" size="lg">
      <template #body>
        <form class="space-y-4" @submit.prevent="handleStartTransfusion">
          <div class="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl space-y-2 text-xs">
            <div class="font-bold text-red-700 dark:text-red-400 flex items-center gap-1.5">
              <UIcon name="i-lucide-shield-alert" class="w-5 h-5 text-red-500" />
              វិធានសុវត្ថិភាពខ្ពស់: ការបញ្ចូលឈាមតម្រូវឱ្យគិលានុបដ្ឋាក ២ នាក់ផ្ទៀងផ្ទាត់ដាច់ដោយឡែក
            </div>
            <div class="text-toned">
              ប្លោកឈាម: <span class="font-bold text-red-600">{{ selectedRequest?.unitBarcode }}</span>
              ({{ selectedRequest?.bloodGroup }} {{ selectedRequest?.rhFactor }})
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold mb-1">ស្កេនកងដៃអ្នកជំងឺ (Wristband Code) *</label>
              <UInput v-model="transfusionForm.scannedPatientCode" placeholder="Scan Wristband" required />
            </div>
            <div>
              <label class="block text-xs font-semibold mb-1">ស្កេនបាកូដប្លោកឈាម (Blood Barcode) *</label>
              <UInput v-model="transfusionForm.scannedUnitBarcode" placeholder="Scan Blood Unit" required />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3 p-3 bg-muted rounded-xl">
            <div>
              <label class="block text-xs font-bold text-default mb-1">គិលានុបដ្ឋាកទី ១ (Nurse 1) *</label>
              <select v-model="transfusionForm.nurse1Id" class="w-full rounded border px-2 py-1.5 text-xs bg-default" required>
                <option value="" disabled>-- ជ្រើសរើសគិលានុបដ្ឋាកទី ១ --</option>
                <option v-for="s in staffList" :key="s._id" :value="s._id">{{ s.nameKh || s.nameEn }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-default mb-1">គិលានុបដ្ឋាកទី ២ (Nurse 2) *</label>
              <select v-model="transfusionForm.nurse2Id" class="w-full rounded border px-2 py-1.5 text-xs bg-default" required>
                <option value="" disabled>-- ជ្រើសរើសគិលានុបដ្ឋាកទី ២ --</option>
                <option v-for="s in staffList" :key="s._id" :value="s._id">{{ s.nameKh || s.nameEn }}</option>
              </select>
            </div>
            <div v-if="transfusionForm.nurse1Id && transfusionForm.nurse2Id && transfusionForm.nurse1Id === transfusionForm.nurse2Id" class="col-span-2 text-xs text-red-600 font-bold">
              ⚠️ គិលានុបដ្ឋាកទី ១ និងទី ២ មិនអាចជាមនុស្សតែម្នាក់ឡើយ! (Two distinct nurses required)
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-4">
            <UButton variant="ghost" color="neutral" @click="isTransfusionModalOpen = false">បោះបង់</UButton>
            <UButton type="submit" color="error" :disabled="transfusionForm.nurse1Id === transfusionForm.nurse2Id">
              បញ្ជាក់ និងចាប់ផ្តើមបញ្ចូលឈាម
            </UButton>
          </div>
        </form>
      </template>
    </UModal>

    <!-- Modal: Adverse Reaction -->
    <UModal v-model:open="isReactionModalOpen" title="រាយការណ៍ប្រតិកម្មនៃការបញ្ចូលឈាម (Adverse Reaction)">
      <template #body>
        <form class="space-y-4" @submit.prevent="handleReportReaction">
          <div class="p-3 bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 rounded-lg text-xs font-bold">
            ⚠️ បញ្ឈប់ការបញ្ចូលឈាមភ្លាមៗ! បិទវ៉ានសេរ៉ូម និងរក្សាខ្សែសរសៃឈាមជាមួយ Normal Saline។
          </div>

          <div>
            <label class="block text-xs font-semibold mb-1">កម្រិតធ្ងន់ធ្ងរ (Severity)</label>
            <select v-model="reactionForm.severity" class="w-full rounded border px-2 py-1.5 text-xs bg-default">
              <option value="MILD">ស្រាល (Mild - Rash, Itching)</option>
              <option value="MODERATE">មធ្យម (Moderate - Fever, Rigors)</option>
              <option value="SEVERE">ធ្ងន់ធ្ងរ (Severe - Dyspnea, Hypotension)</option>
              <option value="FATAL">គំរាមកំហែងអាយុជីវិត (Life Threatening)</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold mb-1">ចំណាត់ការបានអនុវត្ត (Action Taken)</label>
            <UInput v-model="reactionForm.actionTaken" />
          </div>

          <div class="flex justify-end gap-2 pt-4">
            <UButton variant="ghost" color="neutral" @click="isReactionModalOpen = false">បោះបង់</UButton>
            <UButton type="submit" color="error">រាយការណ៍ និងជូនដំណឹងគ្រូពេទ្យ</UButton>
          </div>
        </form>
      </template>
    </UModal>
  </div>
</template>
