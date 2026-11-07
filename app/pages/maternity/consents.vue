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
    toast.add({ title: t('maternity.consents.loadError'), description: err.message, color: 'error' })
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
    toast.add({ title: t('maternity.common.validationError'), description: t('maternity.common.selectPatientToast'), color: 'error' })
    return
  }
  try {
    await $api('/maternity/consents', {
      method: 'POST',
      body: createForm.value
    })
    toast.add({ title: t('maternity.consents.success'), description: t('maternity.consents.created'), color: 'success' })
    isCreateModalOpen.value = false
    fetchConsents()
  } catch (err: any) {
    toast.add({ title: t('maternity.common.error'), description: err.message, color: 'error' })
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
    toast.add({ title: t('maternity.common.validationError'), description: t('maternity.consents.confirmRequired'), color: 'error' })
    return
  }
  if (!signForm.value.doctorName) {
    toast.add({ title: t('maternity.common.validationError'), description: t('maternity.consents.doctorRequired'), color: 'error' })
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
    toast.add({ title: t('maternity.consents.signedTitle'), description: t('maternity.consents.signed'), color: 'success' })
    isSignModalOpen.value = false
    fetchConsents()
  } catch (err: any) {
    toast.add({ title: t('maternity.consents.signingFailed'), description: err.message, color: 'error' })
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
    toast.add({ title: t('maternity.common.validationError'), description: t('maternity.consents.witnessRequired'), color: 'error' })
    return
  }
  try {
    await $api(`/maternity/consents/${selectedConsent.value._id}/refuse`, {
      method: 'POST',
      body: refuseForm.value
    })
    toast.add({ title: t('maternity.consents.refusalRecordedTitle'), description: t('maternity.consents.refusalRecorded'), color: 'warning' })
    isRefuseModalOpen.value = false
    fetchConsents()
  } catch (err: any) {
    toast.add({ title: t('maternity.consents.refusalError'), description: err.message, color: 'error' })
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
            <h1 class="text-2xl font-bold text-highlighted">{{ t('maternity.consents.title') }}</h1>
            <p class="text-sm text-muted">{{ t('maternity.consents.subtitle') }}</p>
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
          {{ t('maternity.consents.newConsent') }}
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
          <div class="text-xs text-muted font-medium">{{ t('maternity.consents.cardAdmission') }}</div>
          <div class="text-xl font-bold text-highlighted">{{ t('maternity.consents.cardGeneralCare') }}</div>
        </div>
      </div>
      <div class="bg-default p-4 rounded-xl border border-default flex items-center gap-4">
        <div class="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-lg">
          <UIcon name="i-lucide-scissors" class="w-5 h-5" />
        </div>
        <div>
          <div class="text-xs text-muted font-medium">{{ t('maternity.consents.cardSurgical') }}</div>
          <div class="text-xl font-bold text-highlighted">{{ t('maternity.consents.cardCSection') }}</div>
        </div>
      </div>
      <div class="bg-default p-4 rounded-xl border border-default flex items-center gap-4">
        <div class="p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-600 rounded-lg">
          <UIcon name="i-lucide-droplet" class="w-5 h-5" />
        </div>
        <div>
          <div class="text-xs text-muted font-medium">{{ t('maternity.consents.cardTransfusion') }}</div>
          <div class="text-xl font-bold text-highlighted">{{ t('maternity.consents.cardBloodProduct') }}</div>
        </div>
      </div>
      <div class="bg-default p-4 rounded-xl border border-default flex items-center gap-4">
        <div class="p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 rounded-lg">
          <UIcon name="i-lucide-activity" class="w-5 h-5" />
        </div>
        <div>
          <div class="text-xs text-muted font-medium">{{ t('maternity.consents.cardAnesthesia') }}</div>
          <div class="text-xl font-bold text-highlighted">{{ t('maternity.consents.cardSpinalGeneral') }}</div>
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
          <option value="">{{ t('maternity.consents.allTypes') }}</option>
          <option value="CONS_A">{{ t('maternity.consents.filterConsA') }}</option>
          <option value="CONS_B">{{ t('maternity.consents.filterConsB') }}</option>
          <option value="CONS_C">{{ t('maternity.consents.filterConsC') }}</option>
          <option value="CONS_D">{{ t('maternity.consents.filterConsD') }}</option>
        </select>

        <select
          v-model="selectedStatus"
          class="text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
          @change="fetchConsents"
        >
          <option value="">{{ t('maternity.common.allStatuses') }}</option>
          <option value="PENDING">{{ t('maternity.consents.statusPending') }}</option>
          <option value="SIGNED">{{ t('maternity.consents.statusSigned') }}</option>
          <option value="REFUSED">{{ t('maternity.consents.statusRefused') }}</option>
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
        {{ t('maternity.common.refresh') }}
      </UButton>
    </div>

    <!-- Table -->
    <div class="bg-default rounded-2xl shadow-sm border border-default overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-toned">
          <thead class="bg-muted text-xs uppercase font-semibold text-muted border-b border-default">
            <tr>
              <th class="px-6 py-4">{{ t('maternity.consents.colConsentCode') }}</th>
              <th class="px-6 py-4">{{ t('maternity.consents.colFormType') }}</th>
              <th class="px-6 py-4">{{ t('maternity.common.patient') }}</th>
              <th class="px-6 py-4">{{ t('maternity.common.status') }}</th>
              <th class="px-6 py-4">{{ t('maternity.consents.colSignerDoctor') }}</th>
              <th class="px-6 py-4">{{ t('maternity.consents.colSignedDate') }}</th>
              <th class="px-6 py-4 text-right">{{ t('maternity.common.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr v-if="consents.length === 0" class="text-center py-8">
              <td colspan="7" class="py-8 text-dimmed">
                <UIcon name="i-lucide-file-x" class="w-8 h-8 mx-auto mb-2 opacity-50" />
                {{ t('maternity.consents.empty') }}
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
                <div class="text-xs text-dimmed">{{ c.patientId?.patientCode }} | {{ t('maternity.consents.tel', { phone: c.patientId?.phone || 'N/A' }) }}</div>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-1.5">
                  <UBadge
                    :color="c.status === 'SIGNED' ? 'success' : c.status === 'REFUSED' ? 'error' : 'warning'"
                    class="font-semibold"
                  >
                    {{ c.status }}
                  </UBadge>
                  <UIcon v-if="c.isLocked" name="i-lucide-lock" class="w-4 h-4 text-emerald-600 dark:text-emerald-400" :title="t('maternity.consents.immutableRecord')" />
                </div>
              </td>
              <td class="px-6 py-4">
                <div v-if="c.status === 'SIGNED'" class="text-xs space-y-0.5">
                  <div><span class="font-medium text-default">{{ t('maternity.consents.signerLabel') }}</span> {{ c.signerName }} ({{ c.signerType }})</div>
                  <div><span class="font-medium text-default">{{ t('maternity.consents.doctorLabel') }}</span> {{ c.doctorName }}</div>
                </div>
                <div v-else-if="c.status === 'REFUSED'" class="text-xs text-rose-600 dark:text-rose-400">
                  {{ t('maternity.consents.refusedValue', { reason: c.refusalReason }) }}
                </div>
                <div v-else class="text-xs text-dimmed italic">
                  {{ t('maternity.consents.awaitingSignatures') }}
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
                  {{ t('maternity.consents.viewPrint') }}
                </UButton>
                <UButton
                  v-if="c.status === 'PENDING'"
                  icon="i-lucide-check-circle"
                  size="xs"
                  color="success"
                  @click="openSignModal(c)"
                >
                  {{ t('maternity.consents.sign') }}
                </UButton>
                <UButton
                  v-if="c.status === 'PENDING'"
                  icon="i-lucide-x-circle"
                  size="xs"
                  color="error"
                  variant="soft"
                  @click="openRefuseModal(c)"
                >
                  {{ t('maternity.consents.refuse') }}
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
            <h3 class="text-lg font-bold text-highlighted">{{ t('maternity.consents.createTitle') }}</h3>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="xs" @click="isCreateModalOpen = false" />
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-toned mb-1">{{ t('maternity.common.selectPatientRequired') }}</label>
              <select
                v-model="createForm.patientId"
                class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
              >
                <option value="" disabled>{{ t('maternity.common.choosePatientOption') }}</option>
                <option v-for="p in patientsList" :key="p._id" :value="p._id">
                  {{ p.fullName }} ({{ p.patientCode }})
                </option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-toned mb-1">{{ t('maternity.consents.formTypeLabel') }}</label>
              <select
                v-model="createForm.formType"
                class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                @change="onFormTypeChange(createForm.formType)"
              >
                <option value="CONS_A">{{ t('maternity.consents.typeConsA') }}</option>
                <option value="CONS_B">{{ t('maternity.consents.typeConsB') }}</option>
                <option value="CONS_C">{{ t('maternity.consents.typeConsC') }}</option>
                <option value="CONS_D">{{ t('maternity.consents.typeConsD') }}</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-toned mb-1">{{ t('maternity.consents.procedureLabel') }}</label>
              <textarea
                v-model="createForm.clinicalProcedure"
                rows="2"
                class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
              ></textarea>
            </div>

            <div>
              <label class="block text-xs font-semibold text-toned mb-1">{{ t('maternity.consents.risksLabel') }}</label>
              <textarea
                v-model="createForm.risksDiscussed"
                rows="2"
                class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
              ></textarea>
            </div>

            <div>
              <label class="block text-xs font-semibold text-toned mb-1">{{ t('maternity.consents.benefitsLabel') }}</label>
              <textarea
                v-model="createForm.benefitsDiscussed"
                rows="2"
                class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
              ></textarea>
            </div>

            <div>
              <label class="block text-xs font-semibold text-toned mb-1">{{ t('maternity.consents.specialNotes') }}</label>
              <input
                v-model="createForm.specialNotes"
                type="text"
                :placeholder="t('maternity.consents.specialNotesPlaceholder')"
                class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
              />
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t border-default">
            <UButton color="neutral" variant="ghost" @click="isCreateModalOpen = false">{{ t('maternity.common.cancel') }}</UButton>
            <UButton color="primary" @click="createConsent">{{ t('maternity.consents.createSubmit') }}</UButton>
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
              <h3 class="text-lg font-bold text-highlighted">{{ t('maternity.consents.signTitle') }}</h3>
              <p class="text-xs text-rose-500 font-semibold mt-0.5">{{ t('maternity.consents.signWarning') }}</p>
            </div>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="xs" @click="isSignModalOpen = false" />
          </div>

          <div class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">{{ t('maternity.consents.signerType') }}</label>
                <select
                  v-model="signForm.signerType"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                >
                  <option value="PATIENT">{{ t('maternity.consents.signerPatient') }}</option>
                  <option value="GUARDIAN">{{ t('maternity.consents.signerGuardian') }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">{{ t('maternity.consents.relationship') }}</label>
                <input
                  v-model="signForm.relationshipToPatient"
                  type="text"
                  :placeholder="t('maternity.consents.relationshipPlaceholder')"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">{{ t('maternity.consents.signerFullName') }}</label>
                <input
                  v-model="signForm.signerName"
                  type="text"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">{{ t('maternity.consents.nationalIdPassport') }}</label>
                <input
                  v-model="signForm.signerIdCard"
                  type="text"
                  :placeholder="t('maternity.consents.idCardPlaceholder')"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">{{ t('maternity.consents.doctorName') }}</label>
                <input
                  v-model="signForm.doctorName"
                  type="text"
                  :placeholder="t('maternity.consents.doctorNamePlaceholder')"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">{{ t('maternity.consents.license') }}</label>
                <input
                  v-model="signForm.doctorLicenseNumber"
                  type="text"
                  :placeholder="t('maternity.consents.licensePlaceholder')"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                />
              </div>
            </div>

            <div class="p-3 bg-muted rounded-xl border border-default text-xs text-toned space-y-2">
              <div class="font-semibold text-highlighted">{{ t('maternity.consents.declarationTitle') }}</div>
              <p>
                {{ t('maternity.consents.declarationText') }}
              </p>
              <label class="flex items-center gap-2 font-medium cursor-pointer pt-1 text-emerald-600 dark:text-emerald-400">
                <input v-model="signForm.acceptTerms" type="checkbox" class="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4" />
                {{ t('maternity.consents.confirmConsent') }}
              </label>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t border-default">
            <UButton color="neutral" variant="ghost" @click="isSignModalOpen = false">{{ t('maternity.common.cancel') }}</UButton>
            <UButton color="success" icon="i-lucide-check-circle" @click="submitSignature">{{ t('maternity.consents.signSubmit') }}</UButton>
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
              <h3 class="text-lg font-bold text-rose-600">{{ t('maternity.consents.refuseTitle') }}</h3>
              <p class="text-xs text-muted">{{ t('maternity.consents.refuseSubtitle') }}</p>
            </div>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="xs" @click="isRefuseModalOpen = false" />
          </div>

          <div class="space-y-3">
            <div>
              <label class="block text-xs font-semibold text-toned mb-1">{{ t('maternity.consents.refusalReason') }}</label>
              <select
                v-model="refuseForm.refusalReason"
                class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
              >
                <option value="PERSONAL_CHOICE">{{ t('maternity.consents.reasonPersonal') }}</option>
                <option value="RELIGIOUS_BELIEF">{{ t('maternity.consents.reasonReligious') }}</option>
                <option value="FINANCIAL_CONCERN">{{ t('maternity.consents.reasonFinancial') }}</option>
                <option value="TRANSFER_REQUEST">{{ t('maternity.consents.reasonTransfer') }}</option>
                <option value="OTHER">{{ t('maternity.consents.reasonOther') }}</option>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">{{ t('maternity.consents.witnessName') }}</label>
                <input
                  v-model="refuseForm.witnessName"
                  type="text"
                  :placeholder="t('maternity.consents.witnessNamePlaceholder')"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">{{ t('maternity.consents.witnessRole') }}</label>
                <input
                  v-model="refuseForm.witnessRole"
                  type="text"
                  :placeholder="t('maternity.consents.witnessRolePlaceholder')"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-toned mb-1">{{ t('maternity.consents.refusalNotes') }}</label>
              <textarea
                v-model="refuseForm.notes"
                rows="2"
                :placeholder="t('maternity.consents.refusalNotesPlaceholder')"
                class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
              ></textarea>
            </div>

            <label class="flex items-center gap-2 text-xs font-medium cursor-pointer text-amber-600">
              <input v-model="refuseForm.physicianAlerted" type="checkbox" class="rounded text-amber-600 focus:ring-amber-500 w-4 h-4" />
              {{ t('maternity.consents.alertObstetrician') }}
            </label>
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t border-default">
            <UButton color="neutral" variant="ghost" @click="isRefuseModalOpen = false">{{ t('maternity.common.cancel') }}</UButton>
            <UButton color="error" icon="i-lucide-alert-triangle" @click="submitRefusal">{{ t('maternity.consents.refuseSubmit') }}</UButton>
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
              <div class="text-xs uppercase tracking-wider text-muted font-semibold">{{ t('maternity.common.kingdomOfCambodia') }}</div>
              <div class="text-xs uppercase tracking-wider text-muted font-semibold">{{ t('maternity.common.ministryOfHealth') }}</div>
              <h2 class="text-xl font-black mt-2">{{ t('maternity.consents.printHeading') }}</h2>
              <div class="text-sm font-semibold text-indigo-700">{{ t('maternity.consents.formTypeValue', { type: selectedConsent.formType }) }}</div>
            </div>
            <div class="text-right">
              <div class="text-xs font-mono font-bold">{{ t('maternity.consents.docId', { id: selectedConsent.consentCode || selectedConsent._id }) }}</div>
              <div class="text-xs text-muted">{{ t('maternity.consents.facilityId', { id: selectedConsent.facilityId || 'FAC-MAIN-001' }) }}</div>
              <UBadge :color="selectedConsent.status === 'SIGNED' ? 'success' : 'warning'" class="mt-2 font-bold">
                {{ selectedConsent.status }}
              </UBadge>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4 text-sm bg-muted p-4 rounded-lg border border-default">
            <div><span class="font-bold">{{ t('maternity.common.patientNameLabel') }}</span> {{ selectedConsent.patientId?.fullName || 'N/A' }}</div>
            <div><span class="font-bold">{{ t('maternity.common.patientCodeLabel') }}</span> {{ selectedConsent.patientId?.patientCode || 'N/A' }}</div>
            <div><span class="font-bold">{{ t('maternity.consents.ageGenderLabel') }}</span> {{ t('maternity.consents.ageFemaleValue', { age: selectedConsent.patientId?.age || 'N/A' }) }}</div>
            <div><span class="font-bold">{{ t('maternity.consents.phoneLabel') }}</span> {{ selectedConsent.patientId?.phone || 'N/A' }}</div>
          </div>

          <div class="space-y-3 text-sm">
            <div>
              <div class="font-bold text-highlighted">{{ t('maternity.consents.plannedProcedure') }}</div>
              <div class="p-2.5 bg-muted rounded border border-default mt-1">{{ selectedConsent.clinicalProcedure }}</div>
            </div>
            <div>
              <div class="font-bold text-highlighted">{{ t('maternity.consents.explainedRisks') }}</div>
              <div class="p-2.5 bg-muted rounded border border-default mt-1">{{ selectedConsent.risksDiscussed }}</div>
            </div>
            <div>
              <div class="font-bold text-highlighted">{{ t('maternity.consents.anticipatedBenefits') }}</div>
              <div class="p-2.5 bg-muted rounded border border-default mt-1">{{ selectedConsent.benefitsDiscussed }}</div>
            </div>
          </div>

          <div class="border-t pt-4 grid grid-cols-2 gap-8 text-sm">
            <div class="border p-4 rounded-lg bg-muted">
              <div class="font-bold mb-2">{{ t('maternity.consents.patientSignature') }}</div>
              <div>{{ t('maternity.consents.nameLabel') }} <span class="font-semibold">{{ selectedConsent.signerName || t('maternity.consents.pending') }}</span></div>
              <div>{{ t('maternity.consents.signerTypeValue', { type: selectedConsent.signerType }) }}</div>
              <div>{{ t('maternity.consents.nationalIdValue', { id: selectedConsent.signerIdCard || 'N/A' }) }}</div>
              <div class="mt-4 pt-2 border-t text-xs text-muted font-mono">{{ t('maternity.consents.digitalSigValue', { sig: selectedConsent.signatureData || t('maternity.consents.pendingExecution') }) }}</div>
            </div>
            <div class="border p-4 rounded-lg bg-muted">
              <div class="font-bold mb-2">{{ t('maternity.consents.attendingPhysician') }}</div>
              <div>{{ t('maternity.consents.doctorLabel') }} <span class="font-semibold">{{ selectedConsent.doctorName || t('maternity.consents.pending') }}</span></div>
              <div>{{ t('maternity.consents.licenseValue', { license: selectedConsent.doctorLicenseNumber || 'N/A' }) }}</div>
              <div>{{ t('maternity.consents.dateSignedValue', { date: selectedConsent.signedAt ? new Date(selectedConsent.signedAt).toLocaleString() : t('maternity.consents.pending') }) }}</div>
              <div class="mt-4 pt-2 border-t text-xs text-emerald-600 font-mono font-bold">
                {{ t('maternity.consents.verificationHashValue', { hash: selectedConsent.digitalSignatureHash ? selectedConsent.digitalSignatureHash.substring(0, 16) + '...' : t('maternity.consents.pendingCaps') }) }}
              </div>
            </div>
          </div>

          <div class="flex justify-between items-center pt-4 border-t">
            <div class="text-xs text-dimmed font-mono">
              {{ t('maternity.consents.ehrFooter') }}
            </div>
            <div class="space-x-3">
              <UButton color="neutral" variant="ghost" @click="isViewModalOpen = false">{{ t('maternity.common.close') }}</UButton>
              <UButton icon="i-lucide-printer" color="primary" @click="printConsent">{{ t('maternity.consents.printForm') }}</UButton>
            </div>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
