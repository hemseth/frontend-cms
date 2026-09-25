<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

const { t } = useI18n()
const toast = useToast()

const consents = ref<any[]>([])
const loading = ref(false)
const selectedFilter = ref('')
const selectedStatus = ref('')

const isCreateModalOpen = ref(false)
const isSignModalOpen = ref(false)
const isRefuseModalOpen = ref(false)
const isViewModalOpen = ref(false)

const selectedConsent = ref<any>(null)
const patientsList = ref<any[]>([])

const createForm = ref({
  patientId: '',
  formType: 'CONS_A',
  clinicalProcedure: 'General Inpatient Admission & Routine Obstetric Care / ការចូលសម្រាកព្យាបាល និងថែទាំសម្ភព',
  risksDiscussed: 'Standard clinical risks, diagnostic risks, routine medication administration.',
  benefitsDiscussed: 'Maternal-fetal monitoring, safe delivery planning, emergency interventions.',
  alternativesDiscussed: 'Outpatient monitoring, transfer to tertiary care facility.',
  specialNotes: ''
})

const signForm = ref({
  signerType: 'PATIENT',
  signerName: '',
  signerIdCard: '',
  signerPhone: '',
  relationshipToPatient: 'Self / ខ្លួនឯង',
  doctorName: '',
  doctorLicenseNumber: '',
  acceptTerms: false,
  notes: ''
})

const refuseForm = ref({
  refusalReason: 'PERSONAL_CHOICE',
  witnessName: '',
  witnessRole: 'MIDWIFE',
  physicianAlerted: true,
  notes: ''
})

const formTypeTemplates: Record<string, { procedure: string; risks: string; benefits: string }> = {
  CONS_A: {
    procedure: 'General Inpatient Admission & Routine Obstetric Care / ការចូលសម្រាកព្យាបាល និងថែទាំសម្ភពទូទៅ',
    risks: 'Standard diagnostic and therapeutic risks, side effects of routine medications, hospital-acquired risks.',
    benefits: 'Comprehensive 24/7 maternal-fetal surveillance, rapid response to labor progression, emergency intervention ready.'
  },
  CONS_B: {
    procedure: 'Cesarean Section (C-Section) Surgical Delivery / ការវះកាត់សម្រាលកូន',
    risks: 'Hemorrhage requiring blood transfusion, infection, injury to surrounding organs (bladder/bowel), anesthesia risks, thromboembolism.',
    benefits: 'Immediate delivery of fetus in presence of fetal distress, obstructed labor, placenta previa, or maternal instability.'
  },
  CONS_C: {
    procedure: 'Blood and Blood Product Transfusion / ការបញ្ចូលឈាម និងផលិតផលឈាម',
    risks: 'Febrile non-hemolytic reaction, allergic urticaria, transfusion-related acute lung injury (TRALI), hemolytic reaction, fluid overload.',
    benefits: 'Restoration of oxygen-carrying capacity, correction of severe postpartum hemorrhage or coagulopathy, life-saving resuscitation.'
  },
  CONS_D: {
    procedure: 'Obstetric Anesthesia (Spinal / Epidural / General) / ការសណ្តំ និងចាក់ស្ពឹកឆ្អឹងខ្នង',
    risks: 'Hypotension, post-dural puncture headache, nerve irritation, total spinal block, allergic reaction to anesthetics.',
    benefits: 'Effective analgesia during active labor, profound surgical anesthesia for safe pain-free delivery.'
  }
}

const onFormTypeChange = (type: string) => {
  if (formTypeTemplates[type]) {
    createForm.value.clinicalProcedure = formTypeTemplates[type].procedure
    createForm.value.risksDiscussed = formTypeTemplates[type].risks
    createForm.value.benefitsDiscussed = formTypeTemplates[type].benefits
  }
}

const fetchConsents = async () => {
  loading.value = true
  try {
    const query: any = { limit: 50 }
    if (selectedFilter.value) query.formType = selectedFilter.value
    if (selectedStatus.value) query.status = selectedStatus.value
    const res = await $api('/maternity/consents', { query })
    consents.value = res.data || []
  } catch (err: any) {
    toast.add({ title: 'Error loading consents', description: err.message, color: 'error' })
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

const openCreateModal = () => {
  onFormTypeChange(createForm.value.formType)
  isCreateModalOpen.value = true
}

const createConsent = async () => {
  if (!createForm.value.patientId) {
    toast.add({ title: 'Validation Error', description: 'Please select a patient / សូមជ្រើសរើសអ្នកជំងឺ', color: 'error' })
    return
  }
  try {
    await $api('/maternity/consents', {
      method: 'POST',
      body: createForm.value
    })
    toast.add({ title: 'Success', description: 'Clinical consent form created / បានបង្កើតទម្រង់យល់ព្រម', color: 'success' })
    isCreateModalOpen.value = false
    fetchConsents()
  } catch (err: any) {
    toast.add({ title: 'Error', description: err.message, color: 'error' })
  }
}

const openSignModal = (consent: any) => {
  selectedConsent.value = consent
  signForm.value.signerName = consent.patientId?.fullName || ''
  signForm.value.signerIdCard = consent.patientId?.nationalId || ''
  signForm.value.signerPhone = consent.patientId?.phone || ''
  signForm.value.signerType = 'PATIENT'
  signForm.value.relationshipToPatient = 'Self / ខ្លួនឯង'
  signForm.value.acceptTerms = false
  isSignModalOpen.value = true
}

const submitSignature = async () => {
  if (!signForm.value.acceptTerms) {
    toast.add({ title: 'Validation Error', description: 'Signature confirmation must be checked / ត្រូវតែបញ្ជាក់ការយល់ព្រម', color: 'error' })
    return
  }
  if (!signForm.value.doctorName) {
    toast.add({ title: 'Validation Error', description: 'Attending doctor name is required / ត្រូវបំពេញឈ្មោះវេជ្ជបណ្ឌិត', color: 'error' })
    return
  }
  try {
    await $api(`/maternity/consents/${selectedConsent.value._id}/sign`, {
      method: 'POST',
      body: {
        signerType: signForm.value.signerType,
        signerName: signForm.value.signerName,
        signerIdCard: signForm.value.signerIdCard,
        signerPhone: signForm.value.signerPhone,
        relationshipToPatient: signForm.value.relationshipToPatient,
        doctorName: signForm.value.doctorName,
        doctorLicenseNumber: signForm.value.doctorLicenseNumber,
        signatureData: `DIGITAL_VERIFIED_${Date.now()}_${signForm.value.signerName}`,
        notes: signForm.value.notes
      }
    })
    toast.add({ title: 'Signed & Immutable', description: 'Consent signed and locked against further edits / បានចុះហត្ថលេខា និងចាក់សោរ', color: 'success' })
    isSignModalOpen.value = false
    fetchConsents()
  } catch (err: any) {
    toast.add({ title: 'Signing Failed', description: err.message, color: 'error' })
  }
}

const openRefuseModal = (consent: any) => {
  selectedConsent.value = consent
  refuseForm.value.refusalReason = 'PERSONAL_CHOICE'
  refuseForm.value.physicianAlerted = true
  isRefuseModalOpen.value = true
}

const submitRefusal = async () => {
  if (!refuseForm.value.witnessName) {
    toast.add({ title: 'Validation Error', description: 'Clinical witness name required / ត្រូវបំពេញឈ្មោះសាក្សី', color: 'error' })
    return
  }
  try {
    await $api(`/maternity/consents/${selectedConsent.value._id}/refuse`, {
      method: 'POST',
      body: refuseForm.value
    })
    toast.add({ title: 'Refusal Recorded', description: 'Patient refusal recorded and attending notified / បានកត់ត្រាការបដិសេធ', color: 'warning' })
    isRefuseModalOpen.value = false
    fetchConsents()
  } catch (err: any) {
    toast.add({ title: 'Refusal Error', description: err.message, color: 'error' })
  }
}

const openViewModal = (consent: any) => {
  selectedConsent.value = consent
  isViewModalOpen.value = true
}

const printConsent = () => {
  window.print()
}

onMounted(() => {
  fetchConsents()
  fetchPatients()
})
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-default p-6 rounded-2xl shadow-sm border border-default">
      <div>
        <div class="flex items-center gap-3">
          <div class="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <UIcon name="i-lucide-file-signature" class="w-6 h-6" />
          </div>
          <div>
            <h1 class="text-2xl font-bold text-highlighted">Clinical Consents Management</h1>
            <p class="text-sm text-muted">ការគ្រប់គ្រងលិខិតយល់ព្រមផ្នែកវេជ្ជសាស្ត្រ និងសម្ភព (CONS-A/B/C/D)</p>
          </div>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <UButton
          icon="i-lucide-plus"
          color="primary"
          class="rounded-xl px-4 py-2 font-medium shadow-sm hover:shadow"
          @click="openCreateModal"
        >
          New Consent Form
        </UButton>
      </div>
    </div>

    <!-- Filters & Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="bg-default p-4 rounded-xl border border-default flex items-center gap-4">
        <div class="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-lg">
          <UIcon name="i-lucide-file-text" class="w-5 h-5" />
        </div>
        <div>
          <div class="text-xs text-muted font-medium">CONS-A: Admission</div>
          <div class="text-xl font-bold text-highlighted">General Care</div>
        </div>
      </div>
      <div class="bg-default p-4 rounded-xl border border-default flex items-center gap-4">
        <div class="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-lg">
          <UIcon name="i-lucide-scissors" class="w-5 h-5" />
        </div>
        <div>
          <div class="text-xs text-muted font-medium">CONS-B: Surgical</div>
          <div class="text-xl font-bold text-highlighted">C-Section</div>
        </div>
      </div>
      <div class="bg-default p-4 rounded-xl border border-default flex items-center gap-4">
        <div class="p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-600 rounded-lg">
          <UIcon name="i-lucide-droplet" class="w-5 h-5" />
        </div>
        <div>
          <div class="text-xs text-muted font-medium">CONS-C: Transfusion</div>
          <div class="text-xl font-bold text-highlighted">Blood Product</div>
        </div>
      </div>
      <div class="bg-default p-4 rounded-xl border border-default flex items-center gap-4">
        <div class="p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 rounded-lg">
          <UIcon name="i-lucide-activity" class="w-5 h-5" />
        </div>
        <div>
          <div class="text-xs text-muted font-medium">CONS-D: Anesthesia</div>
          <div class="text-xl font-bold text-highlighted">Spinal / General</div>
        </div>
      </div>
    </div>

    <!-- Filters Bar -->
    <div class="flex flex-wrap items-center justify-between gap-4 bg-default p-4 rounded-xl border border-default">
      <div class="flex flex-wrap items-center gap-3">
        <select
          v-model="selectedFilter"
          class="text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
          @change="fetchConsents"
        >
          <option value="">All Consent Types (ទាំងអស់)</option>
          <option value="CONS_A">CONS-A (Admission)</option>
          <option value="CONS_B">CONS-B (C-Section Surgical)</option>
          <option value="CONS_C">CONS-C (Blood Transfusion)</option>
          <option value="CONS_D">CONS-D (Anesthesia)</option>
        </select>

        <select
          v-model="selectedStatus"
          class="text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
          @change="fetchConsents"
        >
          <option value="">All Statuses (គ្រប់ស្ថានភាព)</option>
          <option value="PENDING">Pending (រង់ចាំចុះហត្ថលេខា)</option>
          <option value="SIGNED">Signed & Locked (បានចុះហត្ថលេខា)</option>
          <option value="REFUSED">Refused (បានបដិសេធ)</option>
        </select>
      </div>

      <UButton
        icon="i-lucide-refresh-cw"
        color="neutral"
        variant="ghost"
        size="sm"
        :loading="loading"
        @click="fetchConsents"
      >
        Refresh
      </UButton>
    </div>

    <!-- Table -->
    <div class="bg-default rounded-2xl shadow-sm border border-default overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-toned">
          <thead class="bg-muted text-xs uppercase font-semibold text-muted border-b border-default">
            <tr>
              <th class="px-6 py-4">Consent Code</th>
              <th class="px-6 py-4">Form Type</th>
              <th class="px-6 py-4">Patient</th>
              <th class="px-6 py-4">Status</th>
              <th class="px-6 py-4">Signer / Doctor</th>
              <th class="px-6 py-4">Signed Date</th>
              <th class="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr v-if="consents.length === 0" class="text-center py-8">
              <td colspan="7" class="py-8 text-dimmed">
                <UIcon name="i-lucide-file-x" class="w-8 h-8 mx-auto mb-2 opacity-50" />
                No clinical consent forms found.
              </td>
            </tr>
            <tr v-for="c in consents" :key="c._id" class="hover:bg-muted/50 transition">
              <td class="px-6 py-4 font-mono font-semibold text-highlighted">
                {{ c.consentCode || c._id.substring(0, 8).toUpperCase() }}
              </td>
              <td class="px-6 py-4">
                <UBadge
                  :color="c.formType === 'CONS_B' ? 'warning' : c.formType === 'CONS_C' ? 'error' : c.formType === 'CONS_D' ? 'primary' : 'info'"
                  variant="subtle"
                  class="font-semibold"
                >
                  {{ c.formType }}
                </UBadge>
                <div class="text-xs text-dimmed mt-0.5 truncate max-w-xs">{{ c.clinicalProcedure }}</div>
              </td>
              <td class="px-6 py-4">
                <div class="font-medium text-highlighted">{{ c.patientId?.fullName || 'N/A' }}</div>
                <div class="text-xs text-dimmed">{{ c.patientId?.patientCode }} | Tel: {{ c.patientId?.phone || 'N/A' }}</div>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-1.5">
                  <UBadge
                    :color="c.status === 'SIGNED' ? 'success' : c.status === 'REFUSED' ? 'error' : 'warning'"
                    class="font-semibold"
                  >
                    {{ c.status }}
                  </UBadge>
                  <UIcon v-if="c.isLocked" name="i-lucide-lock" class="w-4 h-4 text-emerald-600 dark:text-emerald-400" title="Immutable Record" />
                </div>
              </td>
              <td class="px-6 py-4">
                <div v-if="c.status === 'SIGNED'" class="text-xs space-y-0.5">
                  <div><span class="font-medium text-default">Signer:</span> {{ c.signerName }} ({{ c.signerType }})</div>
                  <div><span class="font-medium text-default">Doctor:</span> {{ c.doctorName }}</div>
                </div>
                <div v-else-if="c.status === 'REFUSED'" class="text-xs text-rose-600 dark:text-rose-400">
                  Refused: {{ c.refusalReason }}
                </div>
                <div v-else class="text-xs text-dimmed italic">
                  Awaiting signatures
                </div>
              </td>
              <td class="px-6 py-4 text-xs text-muted">
                {{ c.signedAt ? new Date(c.signedAt).toLocaleString() : 'N/A' }}
              </td>
              <td class="px-6 py-4 text-right space-x-2">
                <UButton
                  icon="i-lucide-eye"
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  @click="openViewModal(c)"
                >
                  View / Print
                </UButton>
                <UButton
                  v-if="c.status === 'PENDING'"
                  icon="i-lucide-check-circle"
                  size="xs"
                  color="success"
                  @click="openSignModal(c)"
                >
                  Sign
                </UButton>
                <UButton
                  v-if="c.status === 'PENDING'"
                  icon="i-lucide-x-circle"
                  size="xs"
                  color="error"
                  variant="soft"
                  @click="openRefuseModal(c)"
                >
                  Refuse
                </UButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create Consent Modal -->
    <UModal v-model:open="isCreateModalOpen">
      <template #content>
        <div class="p-6 space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-default">
            <h3 class="text-lg font-bold text-highlighted">Create Clinical Consent Form</h3>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="xs" @click="isCreateModalOpen = false" />
          </div>

          <div class="space-y-4">
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
              <label class="block text-xs font-semibold text-toned mb-1">Consent Form Type *</label>
              <select
                v-model="createForm.formType"
                class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                @change="onFormTypeChange(createForm.formType)"
              >
                <option value="CONS_A">CONS-A: General Inpatient Admission / ចូលសម្រាកព្យាបាលទូទៅ</option>
                <option value="CONS_B">CONS-B: C-Section Surgical Consent / វះកាត់សម្រាលកូន</option>
                <option value="CONS_C">CONS-C: Blood Transfusion Consent / បញ្ចូលឈាម</option>
                <option value="CONS_D">CONS-D: Obstetric Anesthesia Consent / សណ្តំ និងចាក់ស្ពឹក</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-toned mb-1">Clinical Procedure / ការព្យាបាល</label>
              <textarea
                v-model="createForm.clinicalProcedure"
                rows="2"
                class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
              ></textarea>
            </div>

            <div>
              <label class="block text-xs font-semibold text-toned mb-1">Risks Explained / ហានិភ័យ</label>
              <textarea
                v-model="createForm.risksDiscussed"
                rows="2"
                class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
              ></textarea>
            </div>

            <div>
              <label class="block text-xs font-semibold text-toned mb-1">Benefits / អត្ថប្រយោជន៍</label>
              <textarea
                v-model="createForm.benefitsDiscussed"
                rows="2"
                class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
              ></textarea>
            </div>

            <div>
              <label class="block text-xs font-semibold text-toned mb-1">Special Clinical Notes</label>
              <input
                v-model="createForm.specialNotes"
                type="text"
                placeholder="Optional notes or patient questions"
                class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
              />
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t border-default">
            <UButton color="neutral" variant="ghost" @click="isCreateModalOpen = false">Cancel</UButton>
            <UButton color="primary" @click="createConsent">Create Consent</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Sign Consent Modal -->
    <UModal v-model:open="isSignModalOpen">
      <template #content>
        <div class="p-6 space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-default">
            <div>
              <h3 class="text-lg font-bold text-highlighted">Execute Digital Consent Signature</h3>
              <p class="text-xs text-rose-500 font-semibold mt-0.5">WARNING: Once signed, this record becomes legally immutable.</p>
            </div>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="xs" @click="isSignModalOpen = false" />
          </div>

          <div class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">Signer Type *</label>
                <select
                  v-model="signForm.signerType"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                >
                  <option value="PATIENT">Patient (អ្នកជំងឺផ្ទាល់)</option>
                  <option value="GUARDIAN">Guardian / Spouse (អាណាព្យាបាល / ស្វាមី)</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">Relationship</label>
                <input
                  v-model="signForm.relationshipToPatient"
                  type="text"
                  placeholder="Self / Spouse / Mother / Father"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">Signer Full Name *</label>
                <input
                  v-model="signForm.signerName"
                  type="text"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">National ID / Passport</label>
                <input
                  v-model="signForm.signerIdCard"
                  type="text"
                  placeholder="ID Card Number"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">Attending Doctor Name *</label>
                <input
                  v-model="signForm.doctorName"
                  type="text"
                  placeholder="Dr. Full Name"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">Medical License / ID</label>
                <input
                  v-model="signForm.doctorLicenseNumber"
                  type="text"
                  placeholder="Lic. #12345"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                />
              </div>
            </div>

            <div class="p-3 bg-muted rounded-xl border border-default text-xs text-toned space-y-2">
              <div class="font-semibold text-highlighted">Declaration of Consent / សេចក្តីប្រកាសយល់ព្រម៖</div>
              <p>
                ខ្ញុំបានទទួលការពន្យល់យ៉ាងច្បាស់លាស់ពីគ្រូពេទ្យអំពីស្ថានភាពជំងឺ នីតិវិធីនៃការព្យាបាល ហានិភ័យ និងជម្រើសផ្សេងៗ។ ខ្ញុំយល់ព្រមទទួលការព្យាបាលនេះដោយស្ម័គ្រចិត្ត។
              </p>
              <label class="flex items-center gap-2 font-medium cursor-pointer pt-1 text-emerald-600 dark:text-emerald-400">
                <input v-model="signForm.acceptTerms" type="checkbox" class="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4" />
                I confirm patient/guardian consent has been given and witnessed.
              </label>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t border-default">
            <UButton color="neutral" variant="ghost" @click="isSignModalOpen = false">Cancel</UButton>
            <UButton color="success" icon="i-lucide-check-circle" @click="submitSignature">Sign & Lock Record</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Refusal Modal -->
    <UModal v-model:open="isRefuseModalOpen">
      <template #content>
        <div class="p-6 space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-default">
            <div>
              <h3 class="text-lg font-bold text-rose-600">Record Patient Refusal of Care</h3>
              <p class="text-xs text-muted">ការបដិសេធមិនទទួលការព្យាបាល ឬការវះកាត់</p>
            </div>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="xs" @click="isRefuseModalOpen = false" />
          </div>

          <div class="space-y-3">
            <div>
              <label class="block text-xs font-semibold text-toned mb-1">Primary Reason for Refusal *</label>
              <select
                v-model="refuseForm.refusalReason"
                class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
              >
                <option value="PERSONAL_CHOICE">Personal / Family Choice (ការសម្រេចចិត្តផ្ទាល់ខ្លួន)</option>
                <option value="RELIGIOUS_BELIEF">Religious / Cultural Belief (ជំនឿសាសនា)</option>
                <option value="FINANCIAL_CONCERN">Financial Constraints (បញ្ហាហិរញ្ញវត្ថុ)</option>
                <option value="TRANSFER_REQUEST">Requested Transfer to Another Facility (ស្នើសុំផ្ទេរទៅមន្ទីរពេទ្យផ្សេង)</option>
                <option value="OTHER">Other Reason (មូលហេតុផ្សេងទៀត)</option>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">Clinical Witness Name *</label>
                <input
                  v-model="refuseForm.witnessName"
                  type="text"
                  placeholder="Nurse / Midwife Name"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">Witness Role</label>
                <input
                  v-model="refuseForm.witnessRole"
                  type="text"
                  placeholder="Duty Midwife / Staff Nurse"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-toned mb-1">Notes & Risks Explained</label>
              <textarea
                v-model="refuseForm.notes"
                rows="2"
                placeholder="Details of conversation with patient explaining potential adverse outcomes including death or fetal compromise."
                class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
              ></textarea>
            </div>

            <label class="flex items-center gap-2 text-xs font-medium cursor-pointer text-amber-600">
              <input v-model="refuseForm.physicianAlerted" type="checkbox" class="rounded text-amber-600 focus:ring-amber-500 w-4 h-4" />
              Immediately alert attending obstetrician on duty
            </label>
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t border-default">
            <UButton color="neutral" variant="ghost" @click="isRefuseModalOpen = false">Cancel</UButton>
            <UButton color="error" icon="i-lucide-alert-triangle" @click="submitRefusal">Record Refusal</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- View & Print Modal -->
    <UModal v-model:open="isViewModalOpen" :ui="{ content: 'max-w-4xl' }">
      <template #content>
        <div v-if="selectedConsent" class="p-8 space-y-6 bg-white text-highlighted">
          <div class="flex justify-between items-start border-b-2 border-gray-900 pb-4">
            <div class="space-y-1">
              <div class="text-xs uppercase tracking-wider text-muted font-semibold">Kingdom of Cambodia / ព្រះរាជាណាចក្រកម្ពុជា</div>
              <div class="text-xs uppercase tracking-wider text-muted font-semibold">Ministry of Health / ក្រសួងសុខាភិបាល</div>
              <h2 class="text-xl font-black mt-2">CLINICAL CONSENT FORM / លិខិតយល់ព្រមព្យាបាល</h2>
              <div class="text-sm font-semibold text-indigo-700">Form Type: {{ selectedConsent.formType }}</div>
            </div>
            <div class="text-right">
              <div class="text-xs font-mono font-bold">Doc ID: {{ selectedConsent.consentCode || selectedConsent._id }}</div>
              <div class="text-xs text-muted">Facility ID: {{ selectedConsent.facilityId || 'FAC-MAIN-001' }}</div>
              <UBadge :color="selectedConsent.status === 'SIGNED' ? 'success' : 'warning'" class="mt-2 font-bold">
                {{ selectedConsent.status }}
              </UBadge>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4 text-sm bg-muted p-4 rounded-lg border border-default">
            <div><span class="font-bold">Patient Name:</span> {{ selectedConsent.patientId?.fullName || 'N/A' }}</div>
            <div><span class="font-bold">Patient Code:</span> {{ selectedConsent.patientId?.patientCode || 'N/A' }}</div>
            <div><span class="font-bold">Age / Gender:</span> {{ selectedConsent.patientId?.age || 'N/A' }} yrs / Female</div>
            <div><span class="font-bold">Phone Number:</span> {{ selectedConsent.patientId?.phone || 'N/A' }}</div>
          </div>

          <div class="space-y-3 text-sm">
            <div>
              <div class="font-bold text-highlighted">1. Planned Clinical Procedure / នីតិវិធីព្យាបាល៖</div>
              <div class="p-2.5 bg-muted rounded border border-default mt-1">{{ selectedConsent.clinicalProcedure }}</div>
            </div>
            <div>
              <div class="font-bold text-highlighted">2. Explained Clinical Risks / ហានិភ័យ៖</div>
              <div class="p-2.5 bg-muted rounded border border-default mt-1">{{ selectedConsent.risksDiscussed }}</div>
            </div>
            <div>
              <div class="font-bold text-highlighted">3. Anticipated Benefits / អត្ថប្រយោជន៍៖</div>
              <div class="p-2.5 bg-muted rounded border border-default mt-1">{{ selectedConsent.benefitsDiscussed }}</div>
            </div>
          </div>

          <div class="border-t pt-4 grid grid-cols-2 gap-8 text-sm">
            <div class="border p-4 rounded-lg bg-muted">
              <div class="font-bold mb-2">Patient / Guardian Signature</div>
              <div>Name: <span class="font-semibold">{{ selectedConsent.signerName || 'Pending' }}</span></div>
              <div>Signer Type: {{ selectedConsent.signerType }}</div>
              <div>National ID: {{ selectedConsent.signerIdCard || 'N/A' }}</div>
              <div class="mt-4 pt-2 border-t text-xs text-muted font-mono">Digital Sig: {{ selectedConsent.signatureData || 'Pending execution' }}</div>
            </div>
            <div class="border p-4 rounded-lg bg-muted">
              <div class="font-bold mb-2">Attending Obstetrician / Physician</div>
              <div>Doctor: <span class="font-semibold">{{ selectedConsent.doctorName || 'Pending' }}</span></div>
              <div>License #: {{ selectedConsent.doctorLicenseNumber || 'N/A' }}</div>
              <div>Date Signed: {{ selectedConsent.signedAt ? new Date(selectedConsent.signedAt).toLocaleString() : 'Pending' }}</div>
              <div class="mt-4 pt-2 border-t text-xs text-emerald-600 font-mono font-bold">
                Verification Hash: {{ selectedConsent.digitalSignatureHash ? selectedConsent.digitalSignatureHash.substring(0, 16) + '...' : 'PENDING' }}
              </div>
            </div>
          </div>

          <div class="flex justify-between items-center pt-4 border-t">
            <div class="text-xs text-dimmed font-mono">
              Immutable Electronic Health Record (FRD CONS-001)
            </div>
            <div class="space-x-3">
              <UButton color="neutral" variant="ghost" @click="isViewModalOpen = false">Close</UButton>
              <UButton icon="i-lucide-printer" color="primary" @click="printConsent">Print Form / ទាញយក</UButton>
            </div>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
