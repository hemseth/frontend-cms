<script setup lang="ts">
import { ref, onMounted } from 'vue'

const { t } = useI18n()
const toast = useToast()

const referrals = ref<any[]>([])
const loading = ref(false)
const selectedStatus = ref('')
const selectedType = ref('')

const isCreateModalOpen = ref(false)
const isOutcomeModalOpen = ref(false)
const isViewModalOpen = ref(false)

const selectedReferral = ref<any>(null)
const patientsList = ref<any[]>([])

const createForm = ref({
  patientId: '',
  referralType: 'EMERGENCY',
  urgency: 'HIGH',
  destinationType: 'NATIONAL_HOSPITAL',
  destinationFacilityName: 'National Maternal and Child Health Center (NMCHC)',
  destinationContactPhone: '023 224 810',
  diagnosisCode: 'O72.1',
  diagnosisDescription: 'Other immediate postpartum hemorrhage / ការធ្លាក់ឈាមក្រោយសម្រាលភ្លាមៗ',
  gestationalAgeWeeks: 38,
  gpal: {
    g: 2,
    p: 1,
    a: 0,
    l: 1
  },
  clinicalSummary: 'Postpartum hemorrhage unresponsive to routine oxytocin, estimated blood loss > 1000ml.',
  reasonForReferral: 'Tertiary embolization or intensive care resuscitation required.',
  treatmentGivenBeforeReferral: 'Oxytocin 20 IU IV infusion, Misoprostol 800mcg rectal, Tranexamic acid 1g IV push, 2 large bore IV lines secured.',
  medicationsGiven: 'Oxytocin, Misoprostol, Tranexamic Acid, Normal Saline 1000mL',
  vitalsAtReferral: {
    bloodPressure: '85/55',
    heartRate: 118,
    respiratoryRate: 24,
    spo2: 96,
    temperatureC: 36.4
  },
  accompanyingStaffName: 'Midwife Sokha',
  transportMode: 'AMBULANCE',
  referringDoctorName: 'Dr. Chanthy'
})

const outcomeForm = ref({
  status: 'ACCEPTED',
  receivingDoctorName: '',
  patientOutcome: 'ADMITTED',
  feedbackNotes: '',
  admissionDate: new Date().toISOString().split('T')[0]
})

const fetchReferrals = async () => {
  loading.value = true
  try {
    const query: any = { limit: 50 }
    if (selectedStatus.value) query.status = selectedStatus.value
    if (selectedType.value) query.referralType = selectedType.value
    const res = await $api('/maternity/referrals', { query })
    referrals.value = res.data || []
  } catch (err: any) {
    toast.add({ title: 'Error fetching referrals', description: err.message, color: 'error' })
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

const isOverdue48h = (createdAt: string, status: string) => {
  if (status !== 'PENDING') return false
  const diffHours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60)
  return diffHours > 48
}

const openCreateModal = () => {
  isCreateModalOpen.value = true
}

const submitReferral = async () => {
  if (!createForm.value.patientId || !createForm.value.destinationFacilityName) {
    toast.add({ title: 'Validation Error', description: 'Patient and Destination Facility required / សូមបំពេញព័ត៌មានចាំបាច់', color: 'error' })
    return
  }
  try {
    await $api('/maternity/referrals', {
      method: 'POST',
      body: createForm.value
    })
    toast.add({ title: 'Referral Created', description: 'Outgoing clinical referral issued with auto-populated GPAL / បានបង្កើតលិខិតបញ្ជូន', color: 'success' })
    isCreateModalOpen.value = false
    fetchReferrals()
  } catch (err: any) {
    toast.add({ title: 'Error', description: err.message, color: 'error' })
  }
}

const openOutcomeModal = (refItem: any) => {
  selectedReferral.value = refItem
  outcomeForm.value.status = 'COMPLETED'
  outcomeForm.value.patientOutcome = 'ADMITTED'
  outcomeForm.value.receivingDoctorName = ''
  outcomeForm.value.feedbackNotes = ''
  isOutcomeModalOpen.value = true
}

const submitOutcome = async () => {
  try {
    await $api(`/maternity/referrals/${selectedReferral.value._id}/outcome`, {
      method: 'PUT',
      body: outcomeForm.value
    })
    toast.add({ title: 'Feedback Recorded', description: 'Referral outcome updated / បានកត់ត្រាលទ្ធផលបញ្ជូន', color: 'success' })
    isOutcomeModalOpen.value = false
    fetchReferrals()
  } catch (err: any) {
    toast.add({ title: 'Error', description: err.message, color: 'error' })
  }
}

const openViewModal = (refItem: any) => {
  selectedReferral.value = refItem
  isViewModalOpen.value = true
}

const printReferral = () => {
  window.print()
}

onMounted(() => {
  fetchReferrals()
  fetchPatients()
})
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-default p-6 rounded-2xl shadow-sm border border-default">
      <div class="flex items-center gap-3">
        <div class="p-2.5 bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded-xl">
          <UIcon name="i-lucide-send" class="w-6 h-6" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-highlighted">Obstetric Referral & Transfer Network</h1>
          <p class="text-sm text-muted">ប្រព័ន្ធបញ្ជូនស្ត្រីមានផ្ទៃពោះ និងតាមដានមតិកែលម្អ (48-Hour Head Nurse Alert)</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <UButton
          icon="i-lucide-plus"
          color="primary"
          class="rounded-xl px-4 py-2 font-medium"
          @click="openCreateModal"
        >
          New Outgoing Referral
        </UButton>
      </div>
    </div>

    <!-- Alert Banner for 48h Overdue -->
    <div class="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-amber-500 text-white rounded-lg">
          <UIcon name="i-lucide-clock" class="w-5 h-5" />
        </div>
        <div>
          <div class="text-sm font-bold text-amber-900 dark:text-amber-200">48-Hour Referral Feedback Surveillance</div>
          <div class="text-xs text-amber-700 dark:text-amber-300">
            Emergency transfers pending feedback for more than 48 hours trigger an automated high-priority alert to the Head Nurse.
          </div>
        </div>
      </div>
      <UBadge color="warning" variant="subtle" class="font-bold">Protocol Active</UBadge>
    </div>

    <!-- Filters Bar -->
    <div class="flex flex-wrap items-center justify-between gap-4 bg-default p-4 rounded-xl border border-default">
      <div class="flex flex-wrap items-center gap-3">
        <select
          v-model="selectedStatus"
          class="text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
          @change="fetchReferrals"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending (រង់ចាំការឆ្លើយតប)</option>
          <option value="ACCEPTED">Accepted (បានទទួល)</option>
          <option value="COMPLETED">Completed (បានបញ្ចប់)</option>
          <option value="REJECTED">Refused / Rejected (បដិសេធ)</option>
        </select>

        <select
          v-model="selectedType"
          class="text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
          @change="fetchReferrals"
        >
          <option value="">All Referral Types</option>
          <option value="EMERGENCY">Emergency Transfer (បន្ទាន់)</option>
          <option value="ELECTIVE">Elective / Scheduled (តាមការគ្រោងទុក)</option>
          <option value="RETURN">Return Referral (បញ្ជូនត្រឡប់មកវិញ)</option>
        </select>
      </div>

      <UButton icon="i-lucide-refresh-cw" color="neutral" variant="ghost" size="sm" :loading="loading" @click="fetchReferrals">
        Refresh
      </UButton>
    </div>

    <!-- Table -->
    <div class="bg-default rounded-2xl shadow-sm border border-default overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-toned">
          <thead class="bg-muted text-xs uppercase font-semibold text-muted border-b border-default">
            <tr>
              <th class="px-6 py-4">Ref Code</th>
              <th class="px-6 py-4">Patient & GPAL</th>
              <th class="px-6 py-4">Destination Facility</th>
              <th class="px-6 py-4">Diagnosis & Reason</th>
              <th class="px-6 py-4">Status & Feedback</th>
              <th class="px-6 py-4">Transport</th>
              <th class="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr v-if="referrals.length === 0" class="text-center py-8">
              <td colspan="7" class="py-8 text-dimmed">
                <UIcon name="i-lucide-inbox" class="w-8 h-8 mx-auto mb-2 opacity-50" />
                No outgoing referral records found.
              </td>
            </tr>
            <tr v-for="r in referrals" :key="r._id" class="hover:bg-muted/50 transition">
              <td class="px-6 py-4">
                <div class="font-mono font-bold text-highlighted">{{ r.referralCode || r._id.substring(0, 8).toUpperCase() }}</div>
                <UBadge :color="r.referralType === 'EMERGENCY' ? 'error' : 'info'" variant="subtle" class="text-xs mt-1">
                  {{ r.referralType }}
                </UBadge>
              </td>
              <td class="px-6 py-4">
                <div class="font-semibold text-highlighted">{{ r.patientId?.fullName || 'N/A' }}</div>
                <div class="text-xs text-dimmed">{{ r.patientId?.patientCode }} | GA: {{ r.gestationalAgeWeeks }} wks</div>
                <div class="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                  GPAL: G{{ r.gpal?.g || 0 }} P{{ r.gpal?.p || 0 }} A{{ r.gpal?.a || 0 }} L{{ r.gpal?.l || 0 }}
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="font-medium text-highlighted">{{ r.destinationFacilityName }}</div>
                <div class="text-xs text-dimmed">{{ r.destinationType }} | Tel: {{ r.destinationContactPhone || 'N/A' }}</div>
              </td>
              <td class="px-6 py-4">
                <div class="text-xs font-semibold text-rose-600 dark:text-rose-400">{{ r.diagnosisCode }}: {{ r.diagnosisDescription }}</div>
                <div class="text-xs text-muted max-w-xs truncate mt-0.5">{{ r.reasonForReferral }}</div>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-1.5">
                  <UBadge :color="r.status === 'COMPLETED' ? 'success' : r.status === 'ACCEPTED' ? 'primary' : 'warning'">
                    {{ r.status }}
                  </UBadge>
                  <UBadge v-if="isOverdue48h(r.createdAt, r.status)" color="error" class="animate-pulse">
                    > 48h Overdue
                  </UBadge>
                </div>
                <div v-if="r.patientOutcome" class="text-xs font-medium text-default mt-1">
                  Outcome: {{ r.patientOutcome }}
                </div>
              </td>
              <td class="px-6 py-4 text-xs text-muted">
                <div>Mode: {{ r.transportMode }}</div>
                <div>Staff: {{ r.accompanyingStaffName }}</div>
              </td>
              <td class="px-6 py-4 text-right space-x-2">
                <UButton icon="i-lucide-file-text" size="xs" color="neutral" variant="ghost" @click="openViewModal(r)">
                  Letter
                </UButton>
                <UButton
                  v-if="r.status !== 'COMPLETED'"
                  icon="i-lucide-check-square"
                  size="xs"
                  color="primary"
                  @click="openOutcomeModal(r)"
                >
                  Feedback
                </UButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create Referral Modal -->
    <UModal v-model:open="isCreateModalOpen" :ui="{ content: 'max-w-3xl' }">
      <template #content>
        <div class="p-6 space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-default">
            <h3 class="text-lg font-bold text-highlighted">Create Outgoing Obstetric Referral Letter</h3>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="xs" @click="isCreateModalOpen = false" />
          </div>

          <div class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">Select Patient *</label>
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
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">Referral Urgency</label>
                <select
                  v-model="createForm.referralType"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                >
                  <option value="EMERGENCY">Emergency (បន្ទាន់ - ភ្លាមៗ)</option>
                  <option value="ELECTIVE">Elective / Routine (ធម្មតា)</option>
                  <option value="RETURN">Return Referral (បញ្ជូនត្រឡប់)</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">Destination Facility Type</label>
                <select
                  v-model="createForm.destinationType"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                >
                  <option value="NATIONAL_HOSPITAL">National Hospital (មន្ទីរពេទ្យជាតិ)</option>
                  <option value="REFERRAL_HOSPITAL">Provincial / District Referral Hospital (មន្ទីរពេទ្យបង្អែក)</option>
                  <option value="HEALTH_CENTER">Health Center (មណ្ឌលសុខភាព)</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">Destination Facility Name *</label>
                <input
                  v-model="createForm.destinationFacilityName"
                  type="text"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                />
              </div>
            </div>

            <!-- Clinical GPAL Snapshot -->
            <div class="p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl space-y-2">
              <div class="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase">
                Obstetric Profile Snapshot (Auto-populated GPAL)
              </div>
              <div class="grid grid-cols-5 gap-2 text-xs">
                <div>
                  <label class="text-muted font-semibold">GA (Weeks)</label>
                  <input v-model.number="createForm.gestationalAgeWeeks" type="number" class="w-full text-xs p-1.5 rounded border border-accented" />
                </div>
                <div>
                  <label class="text-muted font-semibold">Gravida (G)</label>
                  <input v-model.number="createForm.gpal.g" type="number" class="w-full text-xs p-1.5 rounded border border-accented" />
                </div>
                <div>
                  <label class="text-muted font-semibold">Para (P)</label>
                  <input v-model.number="createForm.gpal.p" type="number" class="w-full text-xs p-1.5 rounded border border-accented" />
                </div>
                <div>
                  <label class="text-muted font-semibold">Abortions (A)</label>
                  <input v-model.number="createForm.gpal.a" type="number" class="w-full text-xs p-1.5 rounded border border-accented" />
                </div>
                <div>
                  <label class="text-muted font-semibold">Living (L)</label>
                  <input v-model.number="createForm.gpal.l" type="number" class="w-full text-xs p-1.5 rounded border border-accented" />
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">ICD-10 Code</label>
                <input
                  v-model="createForm.diagnosisCode"
                  type="text"
                  placeholder="e.g. O72.1"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">Diagnosis Description</label>
                <input
                  v-model="createForm.diagnosisDescription"
                  type="text"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-toned mb-1">Reason for Referral & Indication</label>
              <textarea
                v-model="createForm.reasonForReferral"
                rows="2"
                class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
              ></textarea>
            </div>

            <div>
              <label class="block text-xs font-semibold text-toned mb-1">Treatment & Medications Given Before Departure</label>
              <textarea
                v-model="createForm.treatmentGivenBeforeReferral"
                rows="2"
                placeholder="e.g. Loading dose Magnesium Sulfate 4g IV, Oxytocin 10 IU IM, IV fluids..."
                class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
              ></textarea>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">Accompanying Midwife / Nurse</label>
                <input
                  v-model="createForm.accompanyingStaffName"
                  type="text"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">Transport Mode</label>
                <select
                  v-model="createForm.transportMode"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                >
                  <option value="AMBULANCE">Hospital Ambulance (រថយន្តសង្គ្រោះបន្ទាន់)</option>
                  <option value="TAXI">Taxi / Private Vehicle</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t border-default">
            <UButton color="neutral" variant="ghost" @click="isCreateModalOpen = false">Cancel</UButton>
            <UButton color="primary" @click="submitReferral">Issue Referral</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Feedback Outcome Modal -->
    <UModal v-model:open="isOutcomeModalOpen">
      <template #content>
        <div class="p-6 space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-default">
            <h3 class="text-lg font-bold text-highlighted">Record Receiving Facility Outcome Feedback</h3>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="xs" @click="isOutcomeModalOpen = false" />
          </div>

          <div class="space-y-3">
            <div>
              <label class="block text-xs font-semibold text-toned mb-1">Referral Status *</label>
              <select
                v-model="outcomeForm.status"
                class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
              >
                <option value="ACCEPTED">Accepted at Receiving Hospital</option>
                <option value="COMPLETED">Completed Treatment & Feedback Closed</option>
                <option value="REJECTED">Rejected / Refused Admission</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-toned mb-1">Patient Clinical Outcome</label>
              <select
                v-model="outcomeForm.patientOutcome"
                class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
              >
                <option value="ADMITTED">Admitted to ICU / Maternity Ward</option>
                <option value="TREATED_AND_DISCHARGED">Treated and Discharged Home</option>
                <option value="DECEASED">Deceased (Maternal / Fetal Death)</option>
                <option value="REFUSED">Refused Admission by Patient Family</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-toned mb-1">Receiving Doctor Name</label>
              <input
                v-model="outcomeForm.receivingDoctorName"
                type="text"
                placeholder="Dr. Name at Referral Hospital"
                class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-toned mb-1">Feedback Clinical Notes</label>
              <textarea
                v-model="outcomeForm.feedbackNotes"
                rows="2"
                placeholder="Interventions performed at tertiary hospital, blood units transfused, surgical outcomes..."
                class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
              ></textarea>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t border-default">
            <UButton color="neutral" variant="ghost" @click="isOutcomeModalOpen = false">Cancel</UButton>
            <UButton color="success" @click="submitOutcome">Save Feedback</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- View & Print Referral Letter Modal -->
    <UModal v-model:open="isViewModalOpen" :ui="{ content: 'max-w-4xl' }">
      <template #content>
        <div v-if="selectedReferral" class="p-8 space-y-6 bg-white text-highlighted">
          <div class="flex justify-between items-start border-b-2 border-gray-900 pb-4">
            <div class="space-y-1">
              <div class="text-xs uppercase tracking-wider text-muted font-bold">Kingdom of Cambodia / ព្រះរាជាណាចក្រកម្ពុជា</div>
              <div class="text-xs uppercase tracking-wider text-muted font-bold">Ministry of Health / ក្រសួងសុខាភិបាល</div>
              <h2 class="text-xl font-black mt-2">OFFICIAL OBSTETRIC REFERRAL LETTER / លិខិតបញ្ជូនអ្នកជំងឺ</h2>
              <div class="text-xs font-semibold text-sky-700">Ref Code: {{ selectedReferral.referralCode || selectedReferral._id }}</div>
            </div>
            <div class="text-right">
              <UBadge :color="selectedReferral.referralType === 'EMERGENCY' ? 'error' : 'info'" class="font-bold text-sm">
                {{ selectedReferral.referralType }} TRANSFER
              </UBadge>
              <div class="text-xs text-muted mt-1">Date: {{ new Date(selectedReferral.createdAt).toLocaleString() }}</div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4 text-sm bg-muted p-4 rounded-lg border border-default">
            <div><span class="font-bold">Patient Name:</span> {{ selectedReferral.patientId?.fullName }}</div>
            <div><span class="font-bold">Patient Code:</span> {{ selectedReferral.patientId?.patientCode }}</div>
            <div><span class="font-bold">Destination Facility:</span> {{ selectedReferral.destinationFacilityName }}</div>
            <div><span class="font-bold">Obstetric Profile:</span> G{{ selectedReferral.gpal?.g }} P{{ selectedReferral.gpal?.p }} A{{ selectedReferral.gpal?.a }} L{{ selectedReferral.gpal?.l }} (GA: {{ selectedReferral.gestationalAgeWeeks }} wks)</div>
          </div>

          <div class="space-y-3 text-sm">
            <div>
              <div class="font-bold text-highlighted">Provisional Diagnosis (ICD-10):</div>
              <div class="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-800 font-semibold mt-1">
                {{ selectedReferral.diagnosisCode }} - {{ selectedReferral.diagnosisDescription }}
              </div>
            </div>
            <div>
              <div class="font-bold text-highlighted">Reason for Transfer & Clinical Summary:</div>
              <div class="p-2.5 bg-muted border border-default rounded mt-1">{{ selectedReferral.reasonForReferral }}</div>
            </div>
            <div>
              <div class="font-bold text-highlighted">Pre-Transfer Resuscitation & Medications Administered:</div>
              <div class="p-2.5 bg-muted border border-default rounded mt-1">{{ selectedReferral.treatmentGivenBeforeReferral }}</div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4 border-t pt-4 text-sm">
            <div>
              <div class="font-bold">Referring Clinician:</div>
              <div>Dr. {{ selectedReferral.referringDoctorName || 'Duty Obstetrician' }}</div>
              <div class="text-xs text-muted">Accompanying Staff: {{ selectedReferral.accompanyingStaffName }} ({{ selectedReferral.transportMode }})</div>
            </div>
            <div class="text-right">
              <div class="font-bold">Receiving Hospital Feedback:</div>
              <div>Status: <span class="font-semibold">{{ selectedReferral.status }}</span></div>
              <div class="text-xs text-muted">Outcome: {{ selectedReferral.patientOutcome || 'Pending 48h loop' }}</div>
            </div>
          </div>

          <div class="flex justify-between items-center pt-4 border-t">
            <div class="text-xs text-dimmed font-mono">
              National Health Information System (FRD REF-001)
            </div>
            <div class="space-x-3">
              <UButton color="neutral" variant="ghost" @click="isViewModalOpen = false">Close</UButton>
              <UButton icon="i-lucide-printer" color="primary" @click="printReferral">Print Referral Letter</UButton>
            </div>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
