<script setup lang="ts">
import { ref, onMounted } from 'vue'

const { t } = useI18n()
const toast = useToast()

const deaths = ref<any[]>([])
const stats = ref<any>(null)
const loading = ref(false)
const selectedClassification = ref('')

const isCreateModalOpen = ref(false)
const isViewModalOpen = ref(false)
const selectedDeath = ref<any>(null)
const patientsList = ref<any[]>([])

const createForm = ref({
  patientId: '',
  classification: 'ANTEPARTUM_STILLBIRTH',
  dateOfDeath: new Date().toISOString().split('T')[0],
  timeOfDeath: '12:00',
  deathLocation: 'MATERNITY_WARD',
  gestationalAgeWeeks: 34,
  birthWeightGrams: 2100,
  primaryCauseIcd10: 'P95',
  primaryCauseDescription: 'Fetal death of unspecified cause / ការស្លាប់របស់គភ៌មិនបានបញ្ជាក់',
  underlyingMaternalCondition: 'Severe preeclampsia / បម្រុងក្រឡាភ្លើងកម្រិតធ្ងន់',
  deathCertificateNumber: `FDC-${Date.now().toString().slice(-6)}`,
  autopsyRequested: false,
  bereavementCare: {
    counselorAssigned: true,
    memoryBoxProvided: true,
    religiousRitesArranged: true,
    familyDebriefingCompleted: true,
    followUpScheduledDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  },
  certifiedByName: 'Dr. Sreymom (Obstetrician)'
})

const fetchDeaths = async () => {
  loading.value = true
  try {
    const query: any = { limit: 50 }
    if (selectedClassification.value) query.classification = selectedClassification.value
    const res = await $api('/maternity/deaths', { query })
    deaths.value = res.data || []
  } catch (err: any) {
    toast.add({ title: 'Error fetching records', description: err.message, color: 'error' })
  } finally {
    loading.value = false
  }
}

const fetchStats = async () => {
  try {
    const res = await $api('/maternity/deaths/statistics')
    stats.value = res.data || null
  } catch (err) {}
}

const fetchPatients = async () => {
  try {
    const res = await $api('/patients', { query: { limit: 100 } })
    patientsList.value = res.data || []
  } catch (err) {}
}

const openCreateModal = () => {
  createForm.value.deathCertificateNumber = `FDC-${Date.now().toString().slice(-6)}`
  isCreateModalOpen.value = true
}

const submitDeathRecord = async () => {
  if (!createForm.value.patientId || !createForm.value.primaryCauseIcd10) {
    toast.add({ title: 'Validation Error', description: 'Patient and primary cause ICD-10 are required / ត្រូវបំពេញព័ត៌មានចាំបាច់', color: 'error' })
    return
  }
  try {
    await $api('/maternity/deaths', {
      method: 'POST',
      body: createForm.value
    })
    toast.add({ title: 'Record Registered', description: 'Perinatal mortality registered in accordance with HMIS / បានកត់ត្រាមរណភាពគភ៌/ទារក', color: 'success' })
    isCreateModalOpen.value = false
    fetchDeaths()
    fetchStats()
  } catch (err: any) {
    toast.add({ title: 'Error', description: err.message, color: 'error' })
  }
}

const openViewModal = (record: any) => {
  selectedDeath.value = record
  isViewModalOpen.value = true
}

const printCertificate = () => {
  window.print()
}

onMounted(() => {
  fetchDeaths()
  fetchStats()
  fetchPatients()
})
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-default p-6 rounded-2xl shadow-sm border border-default">
      <div class="flex items-center gap-3">
        <div class="p-2.5 bg-elevated text-default rounded-xl">
          <UIcon name="i-lucide-file-text" class="w-6 h-6" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-highlighted">Perinatal & Neonatal Death Surveillance</h1>
          <p class="text-sm text-muted">ប្រព័ន្ធតាមដានមរណភាពគភ៌ និងទារកទើបនឹងកើត (HMIS Perinatal Audit & Bereavement)</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <UButton
          icon="i-lucide-plus"
          color="neutral"
          class="rounded-xl px-4 py-2 font-medium"
          @click="openCreateModal"
        >
          Register Death Record
        </UButton>
      </div>
    </div>

    <!-- HMIS Stats Summary -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="p-4 bg-default rounded-xl border border-default">
        <div class="text-xs text-muted font-semibold uppercase">Antepartum Stillbirths</div>
        <div class="text-2xl font-black text-highlighted mt-1">
          {{ stats?.antepartumStillbirths || 0 }}
        </div>
        <div class="text-xs text-dimmed mt-1">Fetal death prior to labor</div>
      </div>
      <div class="p-4 bg-default rounded-xl border border-default">
        <div class="text-xs text-muted font-semibold uppercase">Intrapartum Stillbirths</div>
        <div class="text-2xl font-black text-rose-600 mt-1">
          {{ stats?.intrapartumStillbirths || 0 }}
        </div>
        <div class="text-xs text-dimmed mt-1">Fetal death during labor</div>
      </div>
      <div class="p-4 bg-default rounded-xl border border-default">
        <div class="text-xs text-muted font-semibold uppercase">Early Neonatal Deaths</div>
        <div class="text-2xl font-black text-amber-600 mt-1">
          {{ stats?.earlyNeonatalDeaths || 0 }}
        </div>
        <div class="text-xs text-dimmed mt-1">0 - 7 days of life</div>
      </div>
      <div class="p-4 bg-default rounded-xl border border-default">
        <div class="text-xs text-muted font-semibold uppercase">Late Neonatal Deaths</div>
        <div class="text-2xl font-black text-purple-600 mt-1">
          {{ stats?.lateNeonatalDeaths || 0 }}
        </div>
        <div class="text-xs text-dimmed mt-1">8 - 28 days of life</div>
      </div>
    </div>

    <!-- Filters Bar -->
    <div class="flex flex-wrap items-center justify-between gap-4 bg-default p-4 rounded-xl border border-default">
      <div class="flex items-center gap-3">
        <select
          v-model="selectedClassification"
          class="text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
          @change="fetchDeaths"
        >
          <option value="">All Mortality Categories</option>
          <option value="ANTEPARTUM_STILLBIRTH">Antepartum Stillbirth (គភ៌ស្លាប់មុនឈឺពោះ)</option>
          <option value="INTRAPARTUM_STILLBIRTH">Intrapartum Stillbirth (គភ៌ស្លាប់ពេលឈឺពោះ)</option>
          <option value="EARLY_NEONATAL_DEATH">Early Neonatal Death (ទារកស្លាប់អាយុ ០-៧ ថ្ងៃ)</option>
          <option value="LATE_NEONATAL_DEATH">Late Neonatal Death (ទារកស្លាប់អាយុ ៨-២៨ ថ្ងៃ)</option>
        </select>
      </div>

      <UButton icon="i-lucide-refresh-cw" color="neutral" variant="ghost" size="sm" :loading="loading" @click="fetchDeaths">
        Refresh
      </UButton>
    </div>

    <!-- Table -->
    <div class="bg-default rounded-2xl shadow-sm border border-default overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-toned">
          <thead class="bg-muted text-xs uppercase font-semibold text-muted border-b border-default">
            <tr>
              <th class="px-6 py-4">Certificate #</th>
              <th class="px-6 py-4">Classification</th>
              <th class="px-6 py-4">Mother / Patient</th>
              <th class="px-6 py-4">Date & Time</th>
              <th class="px-6 py-4">Primary Cause (ICD-10)</th>
              <th class="px-6 py-4">Bereavement Care</th>
              <th class="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr v-if="deaths.length === 0" class="text-center py-8">
              <td colspan="7" class="py-8 text-dimmed">
                <UIcon name="i-lucide-check-circle" class="w-8 h-8 mx-auto mb-2 opacity-50" />
                No perinatal or neonatal death records.
              </td>
            </tr>
            <tr v-for="d in deaths" :key="d._id" class="hover:bg-muted/50 transition">
              <td class="px-6 py-4 font-mono font-bold text-highlighted">
                {{ d.deathCertificateNumber || d._id.substring(0, 8).toUpperCase() }}
              </td>
              <td class="px-6 py-4">
                <UBadge
                  :color="d.classification.includes('STILLBIRTH') ? 'rose' : 'purple'"
                  variant="subtle"
                  class="font-bold text-xs"
                >
                  {{ d.classification }}
                </UBadge>
                <div class="text-xs text-dimmed mt-0.5">GA: {{ d.gestationalAgeWeeks }} wks | {{ d.birthWeightGrams }}g</div>
              </td>
              <td class="px-6 py-4">
                <div class="font-medium text-highlighted">{{ d.patientId?.fullName || 'N/A' }}</div>
                <div class="text-xs text-dimmed">{{ d.patientId?.patientCode }}</div>
              </td>
              <td class="px-6 py-4 text-xs">
                <div>{{ new Date(d.dateOfDeath).toLocaleDateString() }} {{ d.timeOfDeath }}</div>
                <div class="text-dimmed">{{ d.deathLocation }}</div>
              </td>
              <td class="px-6 py-4">
                <div class="text-xs font-bold text-rose-600 dark:text-rose-400">{{ d.primaryCauseIcd10 }}</div>
                <div class="text-xs text-muted max-w-xs truncate">{{ d.primaryCauseDescription }}</div>
              </td>
              <td class="px-6 py-4">
                <div v-if="d.bereavementCare?.counselorAssigned" class="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <UIcon name="i-lucide-heart-handshake" class="w-3.5 h-3.5" /> Support Provided
                </div>
                <div v-else class="text-xs text-dimmed italic">Standard care</div>
              </td>
              <td class="px-6 py-4 text-right">
                <UButton icon="i-lucide-printer" size="xs" color="neutral" variant="ghost" @click="openViewModal(d)">
                  Certificate
                </UButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Register Modal -->
    <UModal v-model:open="isCreateModalOpen" :ui="{ content: 'max-w-2xl' }">
      <template #content>
        <div class="p-6 space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-default">
            <h3 class="text-lg font-bold text-highlighted">Register Perinatal / Neonatal Death</h3>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="xs" @click="isCreateModalOpen = false" />
          </div>

          <div class="space-y-3">
            <div>
              <label class="block text-xs font-semibold text-toned mb-1">Select Mother / Patient *</label>
              <select
                v-model="createForm.patientId"
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
                <label class="block text-xs font-semibold text-toned mb-1">Clinical Classification *</label>
                <select
                  v-model="createForm.classification"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                >
                  <option value="ANTEPARTUM_STILLBIRTH">Antepartum Stillbirth (គភ៌ស្លាប់មុនឈឺពោះ)</option>
                  <option value="INTRAPARTUM_STILLBIRTH">Intrapartum Stillbirth (គភ៌ស្លាប់ពេលឈឺពោះ)</option>
                  <option value="EARLY_NEONATAL_DEATH">Early Neonatal Death (០-៧ ថ្ងៃ)</option>
                  <option value="LATE_NEONATAL_DEATH">Late Neonatal Death (៨-២៨ ថ្ងៃ)</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">Death Certificate Number</label>
                <input
                  v-model="createForm.deathCertificateNumber"
                  type="text"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted font-mono"
                />
              </div>
            </div>

            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">Date of Death</label>
                <input v-model="createForm.dateOfDeath" type="date" class="w-full text-sm p-2 rounded border border-accented" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">Time of Death</label>
                <input v-model="createForm.timeOfDeath" type="time" class="w-full text-sm p-2 rounded border border-accented" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">Weight (Grams)</label>
                <input v-model.number="createForm.birthWeightGrams" type="number" class="w-full text-sm p-2 rounded border border-accented" />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">Primary Cause (ICD-10) *</label>
                <input
                  v-model="createForm.primaryCauseIcd10"
                  type="text"
                  placeholder="e.g. P95, P07.0, P21"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">Cause Description</label>
                <input
                  v-model="createForm.primaryCauseDescription"
                  type="text"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-toned mb-1">Underlying Maternal Condition</label>
              <input
                v-model="createForm.underlyingMaternalCondition"
                type="text"
                placeholder="e.g. Preeclampsia, Gestational Diabetes, Abruptio Placentae"
                class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
              />
            </div>

            <!-- Bereavement Care Checklist -->
            <div class="p-3 bg-muted rounded-xl border border-default space-y-2">
              <div class="text-xs font-bold text-default uppercase">Bereavement Care Bundle</div>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input v-model="createForm.bereavementCare.counselorAssigned" type="checkbox" class="rounded text-primary-600" />
                  Grief counselor assigned
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input v-model="createForm.bereavementCare.memoryBoxProvided" type="checkbox" class="rounded text-primary-600" />
                  Memory box / footprint taken
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input v-model="createForm.bereavementCare.religiousRitesArranged" type="checkbox" class="rounded text-primary-600" />
                  Respectful religious rites
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input v-model="createForm.bereavementCare.familyDebriefingCompleted" type="checkbox" class="rounded text-primary-600" />
                  Clinical team debrief completed
                </label>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t border-default">
            <UButton color="neutral" variant="ghost" @click="isCreateModalOpen = false">Cancel</UButton>
            <UButton color="neutral" @click="submitDeathRecord">Submit Registration</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Certificate View & Print Modal -->
    <UModal v-model:open="isViewModalOpen" :ui="{ content: 'max-w-3xl' }">
      <template #content>
        <div v-if="selectedDeath" class="p-8 space-y-6 bg-white text-highlighted">
          <div class="flex justify-between items-start border-b-2 border-gray-900 pb-4">
            <div class="space-y-1">
              <div class="text-xs uppercase tracking-wider text-muted font-bold">Kingdom of Cambodia / ព្រះរាជាណាចក្រកម្ពុជា</div>
              <div class="text-xs uppercase tracking-wider text-muted font-bold">Ministry of Health / ក្រសួងសុខាភិបាល</div>
              <h2 class="text-xl font-black mt-2">PERINATAL DEATH CERTIFICATE / លិខិតបញ្ជាក់មរណភាពគភ៌</h2>
              <div class="text-xs font-bold text-toned">Cert #: {{ selectedDeath.deathCertificateNumber }}</div>
            </div>
            <div class="text-right">
              <UBadge color="neutral" class="font-mono text-xs">OFFICIAL HMIS RECORD</UBadge>
              <div class="text-xs text-muted mt-1">Date: {{ new Date(selectedDeath.dateOfDeath).toLocaleDateString() }}</div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4 text-sm bg-muted p-4 rounded-lg border border-default">
            <div><span class="font-bold">Mother's Name:</span> {{ selectedDeath.patientId?.fullName }}</div>
            <div><span class="font-bold">Patient Code:</span> {{ selectedDeath.patientId?.patientCode }}</div>
            <div><span class="font-bold">Classification:</span> {{ selectedDeath.classification }}</div>
            <div><span class="font-bold">Gestational Age / Weight:</span> {{ selectedDeath.gestationalAgeWeeks }} wks / {{ selectedDeath.birthWeightGrams }}g</div>
          </div>

          <div class="space-y-3 text-sm">
            <div>
              <div class="font-bold">Primary Cause of Death (ICD-10):</div>
              <div class="p-2.5 bg-muted rounded border border-default mt-1 font-semibold">
                {{ selectedDeath.primaryCauseIcd10 }} - {{ selectedDeath.primaryCauseDescription }}
              </div>
            </div>
            <div>
              <div class="font-bold">Maternal Underlying Condition:</div>
              <div class="p-2.5 bg-muted rounded border border-default mt-1">
                {{ selectedDeath.underlyingMaternalCondition || 'None reported' }}
              </div>
            </div>
          </div>

          <div class="flex justify-between items-center pt-4 border-t text-sm">
            <div>
              <div class="font-bold">Certifying Physician:</div>
              <div>{{ selectedDeath.certifiedByName }}</div>
            </div>
            <div class="space-x-3">
              <UButton color="neutral" variant="ghost" @click="isViewModalOpen = false">Close</UButton>
              <UButton icon="i-lucide-printer" color="primary" @click="printCertificate">Print Certificate</UButton>
            </div>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
