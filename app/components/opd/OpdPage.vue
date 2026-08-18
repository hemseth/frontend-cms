<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Patient } from '~/types/models'
import { useI18n } from 'vue-i18n'
// Partials
import OpdPatientInfo from './partials/OpdPatientInfo.vue'
import OpdVisitInfo from './partials/OpdVisitInfo.vue'
import OpdVitals from './partials/OpdVitals.vue'
import OpdPrescriptionTable from './partials/OpdPrescriptionTable.vue'
import OpdLabTable from './partials/OpdLabTable.vue'
import OpdEchoTable from './partials/OpdEchoTable.vue'
import OpdPrescriptionControls from './partials/OpdPrescriptionControls.vue'
import OpdLabControls from './partials/OpdLabControls.vue'
import OpdEchoControls from './partials/OpdEchoControls.vue'
import OpdPaymentControls from './partials/OpdPaymentControls.vue'
const { t } = useI18n()
import OpdPaymentTable from './partials/OpdPaymentTable.vue'
import OpdInvoiceFooter from './partials/OpdInvoiceFooter.vue'
import ResultEntryModal from './partials/ResultEntryModal.vue'
import ParameterSelectionModal from './partials/ParameterSelectionModal.vue'
import OpdDiagnosisControls from './partials/OpdDiagnosisControls.vue'
import OpdRoundHistoryTable from './partials/OpdRoundHistoryTable.vue'
import AddModal from '~/components/patients/AddModals.vue'

// Composables
import { useOpdData } from '~/composables/useOpdData'
import { useOpdInvoice } from '~/composables/useOpdInvoice'
import { useOpdServiceSelection } from '~/composables/useOpdServiceSelection'

const props = defineProps<{
  dept?: string
  patient?: { id?: string, name?: string } | null
}>()

// --- Data & State ---
const {
  medicines,
  labServices,
  echoServices,
  categoryMap,
  allMedicineCategories,
  allDosageForms,
  refreshData,
  findMedicineById,
  getCategoryName,
  isLoading: isDataLoading // Alias
} = useOpdData()

const {
  rows,
  grandTotal,
  subtotal,
  discount,
  isResultEntryModalOpen,
  selectedServiceForResults,
  addRow,
  removeRow,
  addMedicine,
  addServiceRow,
  saveResultEntry,
  saveLabResult,
  openResultEntryModal,
  saveOpdTransaction,
  vitals, // Extract Vitals
  isDeleteModalOpen,
  confirmRemoveRow,
  payDate,
  receivedDate,
  totalReceived,
  balance,
  admissionDate,
  dischargeDate
} = useOpdInvoice(getCategoryName, categoryMap)

// Wrapper to auto-open result modal after adding service with params

const {
  isParamModalOpen,
  selectedServiceForParams,
  selectedParamSet,
  handleAddService,
  confirmAddServiceWithParams
} = useOpdServiceSelection(addServiceRow)

const mainTabs = computed(() => [
  { label: t('common.prescription') || 'វេជ្ជបញ្ជា', slot: 'prescription', value: 0, icon: 'i-lucide-pill' },
  { label: t('common.lab') || 'ពិសោធន៍', slot: 'lab', value: 1, icon: 'i-lucide-flask-conical' },
  { label: t('common.echo') || 'អេកូ', slot: 'echo', value: 2, icon: 'i-lucide-activity' },
  { label: t('common.payment') || 'ទូទាត់ប្រាក់', slot: 'payment', value: 3, icon: 'i-lucide-credit-card' }
])

const activeTab = ref(props.dept === 'LAB' ? 1 : 0)
const paymentMethod = ref<string>('Cash')
const paymentMethods = [{ value: 'Cash', label: 'Cash' }, { value: 'ABA QR', label: 'ABA QR' }, { value: 'Wing', label: 'Wing' }]

// Patient State
const patientId = ref<string>('')
const internalPatientId = ref<string>(props.patient?.id ?? '')
const patientName = ref<string>(props.patient?.name ?? '')
const patientGender = ref<string>('Male')
const patientDob = ref<string>('')
const patientAllergies = ref<string[]>([])
const patientBloodGroup = ref<string>('')
const patientSearchOpen = ref(false)
const isAddPatientModalOpen = ref(false)
const genderOptions = [{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }]

// Drug Allergy Safety Warning State
const isAllergyModalOpen = ref(false)
const pendingAllergicMed = ref<any>(null)
const allergyConflictReason = ref('')

function checkDrugAllergy(medName: string, allergies: string[]): string | null {
  if (!allergies || allergies.length === 0 || !medName) return null
  const m = medName.toLowerCase().trim()
  for (const allergy of allergies) {
    const a = allergy.toLowerCase().trim()
    if (!a) continue

    // Direct match
    if (m.includes(a) || a.includes(m)) return allergy

    // Penicillin family
    if (a.includes('penicillin') || a.includes('amox') || a.includes('ampic')) {
      if (
        m.includes('penicillin') || m.includes('amox') || m.includes('ampic')
        || m.includes('augmentin') || m.includes('cloxacillin') || m.includes('piperacillin')
      ) {
        return `${allergy} (ក្រុមប៉េនីស៊ីលីន / Penicillin Family)`
      }
    }

    // Cephalosporins
    if (a.includes('cef') || a.includes('ceph')) {
      if (m.includes('cef') || m.includes('ceph')) {
        return `${allergy} (ក្រុមសេហ្វាឡូស្ប៉ូរីន / Cephalosporin Family)`
      }
    }

    // NSAIDs
    if (a.includes('aspirin') || a.includes('ibuprofen') || a.includes('nsaid')) {
      if (
        m.includes('aspirin') || m.includes('ibuprofen') || m.includes('diclofenac')
        || m.includes('naproxen') || m.includes('ketoprofen') || m.includes('meloxicam')
        || m.includes('mefenamic')
      ) {
        return `${allergy} (ក្រុមបំបាត់ការឈឺចាប់ NSAID)`
      }
    }

    // Sulfa
    if (a.includes('sulfa')) {
      if (m.includes('sulfa') || m.includes('bactrim') || m.includes('cotrimoxazole') || m.includes('septra')) {
        return `${allergy} (ក្រុមស៊ុលហ្វា / Sulfonamide Family)`
      }
    }

    // Quinolones
    if (a.includes('cipro') || a.includes('quinolone')) {
      if (m.includes('cipro') || m.includes('levofloxacin') || m.includes('ofloxacin') || m.includes('norfloxacin')) {
        return `${allergy} (ក្រុម Fluoroquinolone)`
      }
    }

    // Paracetamol
    if (a.includes('paracetamol') || a.includes('acetaminophen')) {
      if (m.includes('paracetamol') || m.includes('acetaminophen') || m.includes('panadol') || m.includes('tylenol')) {
        return `${allergy} (ប៉ារ៉ាសេតាមុល / Paracetamol)`
      }
    }
  }
  return null
}

const patientAge = computed(() => {
  if (!patientDob.value) return ''
  const birthDate = new Date(patientDob.value)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age.toString()
})

// Doctor State
const doctorId = ref<string>('')

// Diagnosis State
const diagnosis = ref<any[]>([])
const prescriptionTable = ref<any>(null)

// --- Computed ---
const breadcrumbItems = computed(() => [
  { label: 'Home', to: '/' },
  { label: props.dept ?? 'OPD', to: `/${(props.dept ?? 'OPD').toLowerCase()}` }
])

const currentTabIndex = computed(() => {
  if (typeof activeTab.value === 'number') return activeTab.value
  const idx = mainTabs.findIndex(t => t.value === activeTab.value)
  return idx !== -1 ? idx : 0
})

// --- Lifecycle ---
onMounted(async () => {
  // Already set in ref for LAB mode, but good to be explicit
  if (props.dept === 'LAB') activeTab.value = 1
  else if (props.dept === 'ECHO') activeTab.value = 2
  else activeTab.value = 0
  await Promise.all([
    refreshData()
  ])

  // Check for visitId in route to load existing data
  const route = useRoute()
  if (route.query.visitId) {
    loadVisitData(route.query.visitId as string)
  } else if (route.query.patientId) {
    // If no visitId but patientId provided, load patient only
    const pId = route.query.patientId as string
    try {
      const res = await $api<{ data: any }>(`/patients/${pId}`)
      if (res.data) onPatientSelected(res.data)
    } catch (e) { console.error(e) }
  }
})

async function loadVisitData(vId: string) {
  const toast = useToast()
  try {
    const res = await $api<{ data: any }>(`/visits/${vId}`)
    const v = res.data
    if (!v) return

    lastVisitId.value = v._id
    lastVisitNo.value = v.visitId || v._id
    diagnosis.value = v.diagnosis || []
    doctorId.value = v.doctorId || ''

    // Load Patient
    if (v.patient) {
      onPatientSelected(v.patient)
    } else if (v.patientId) {
      const pRes = await $api<{ data: any }>(`/patients/${v.patientId}`)
      if (pRes.data) onPatientSelected(pRes.data)
    }

    // Load Vitals
    if (v.vitals) {
      vitals.value = { ...v.vitals }
    }

    // Load Medications and Lab Requests into Rows
    const newRows: any[] = []

    // Medications
    if (v.medications && Array.isArray(v.medications)) {
      v.medications.forEach((m: any) => {
        newRows.push({
          _id: m._id,
          medicineId: m.medicineId,
          name: m.medication,
          price: m.unitPrice || 0,
          qmor: m.morning || 0,
          qaft: m.afternoon || 0,
          qeve: m.evening || 0,
          qngt: m.night || 0,
          days: m.days || (m.quantity && ((m.morning || 0) + (m.afternoon || 0) + (m.evening || 0) + (m.night || 0) > 0) ? Math.round(m.quantity / ((m.morning || 0) + (m.afternoon || 0) + (m.evening || 0) + (m.night || 0))) : 1),
          qty: m.quantity || 1,
          unit: m.unit || '',
          isWholesale: m.isWholesale ?? false,
          type: 'MEDICINE'
        })
      })
    }

    // Lab Requests
    if (v.labRequests && Array.isArray(v.labRequests)) {
      v.labRequests.forEach((l: any) => {
        newRows.push({
          _id: l._id,
          name: l.serviceName,
          nameKh: l.serviceNameKh,
          price: l.price || 0,
          qmor: 1,
          qaft: 0,
          qeve: 0,
          qngt: 0,
          type: l.category === 'imaging' ? 'ECHO' : 'LAB',
          result: l.result || '',
          parameters: l.parameters || []
        })
      })
    }

    rows.value = newRows

    // Load Payment info if exists
    if (v.payment) {
      discount.value = v.payment.discount || 0
      totalReceived.value = v.payment.totalReceived || v.payment.amount || 0
      lastPaymentId.value = v.payment._id
    }

    toast.add({ title: 'Success', description: 'Visit data loaded', color: 'success' })
  } catch (e: any) {
    toast.add({ title: 'Error', description: 'Failed to load visit data', color: 'error' })
  }
}

// --- Functions ---
function onPatientSelected(p: Patient) {
  const patient = p as any // Type assertion to handle potential extra fields

  // Internal MongoDB ID for backend calls
  internalPatientId.value = patient._id || patient.id

  // Prefer numeric ID (pId) if available for display, otherwise fallback to internal ID
  patientId.value = patient.pId?.toString() || patient.code || internalPatientId.value

  // Format name: "Name En / Name Kh" if both exist
  if (patient.nameEn && patient.nameKh) {
    patientName.value = `${patient.nameEn} / ${patient.nameKh}`
  } else {
    patientName.value = patient.nameEn || patient.nameKh || patient.name || ''
  }

  const g = patient.gender || patient.sex
  if (g == 1 || g === '1' || g === 'M' || g === 'Male') patientGender.value = 'Male'
  else if (g == 2 || g === '2' || g === 'F' || g === 'Female') patientGender.value = 'Female'
  else patientGender.value = String(g || 'Male')

  if (patient.dob) {
    const d = new Date(patient.dob)
    if (!isNaN(d.getTime())) {
      patientDob.value = d.toISOString().substring(0, 10)
    } else {
      patientDob.value = patient.dob
    }
  } else {
    patientDob.value = ''
  }

  patientAllergies.value = Array.isArray(patient.allergies) ? [...patient.allergies] : []
  patientBloodGroup.value = patient.bloodGroup || ''

  patientSearchOpen.value = false

  // Reset form data
  diagnosis.value = []
  rows.value = [] // Clear service/medicine rows
  lastVisitId.value = null
  lastPaymentId.value = null
}

function focusPrescriptionTable() {
  if (rows.value.length > 0 && prescriptionTable.value) {
    const lastIndex = rows.value.length - 1
    prescriptionTable.value.focusRow(lastIndex)
  }
}

// Wrapper for addMedicine to find object, check drug allergies, and handle focus
function handleAddMedicineWrapper(id: string, qty = 1, isWholesale = false) {
  const med = findMedicineById(id)
  if (!med) return

  const medSearchStr = `${med.nameEn || ''} ${med.nameKh || ''} ${med.genericName || ''}`
  const conflict = checkDrugAllergy(medSearchStr, patientAllergies.value)
  if (conflict) {
    pendingAllergicMed.value = { med, qty, isWholesale }
    allergyConflictReason.value = conflict
    isAllergyModalOpen.value = true
    return
  }

  addMedicine(med, qty, focusPrescriptionTable, isWholesale)
}

function confirmAddAllergicMedicine() {
  if (pendingAllergicMed.value) {
    const { med, qty, isWholesale } = pendingAllergicMed.value
    addMedicine(med, qty, focusPrescriptionTable, isWholesale)
    pendingAllergicMed.value = null
  }
  isAllergyModalOpen.value = false
}

// Print State
const lastPaymentId = ref<string | null>(null)
const lastVisitId = ref<string | null>(null)
const lastVisitNo = ref<string>('')

async function saveInvoiceWrapper() {
  const res: any = await saveOpdTransaction(internalPatientId.value, paymentMethod.value, lastVisitId.value, '', diagnosis.value, doctorId.value)
  if (res && res.data) {
    lastPaymentId.value = res.data._id || res.data.paymentId
    lastVisitId.value = res.data.visit?._id || res.data.visitId
    lastVisitNo.value = res.data.visit?.visitId || res.data.visitId
  }
}

function printInvoice() {
  if (lastPaymentId.value) {
    window.open(`/print/invoice/${lastPaymentId.value}`, '_blank')
  } else {
    const toast = useToast()
    toast.add({ title: 'Info', description: 'Please save transaction first', color: 'info' })
  }
}

function printPrescription() {
  if (lastVisitId.value && internalPatientId.value) {
    window.open(`/print/prescription/${lastVisitId.value}?patientId=${internalPatientId.value}`, '_blank')
  } else {
    const toast = useToast()
    toast.add({ title: 'Info', description: 'Please save transaction first', color: 'info' })
  }
}

function printLab() {
  if (lastVisitId.value && internalPatientId.value) {
    window.open(`/print/lab/${lastVisitId.value}?patientId=${internalPatientId.value}`, '_blank')
  } else {
    const toast = useToast()
    toast.add({ title: 'Info', description: 'Please save transaction first', color: 'info' })
  }
}

function printEcho() {
  // Echo uses same logic as Labs typically in this model
  printLab()
}

function handleConfirmDelete() {
  confirmRemoveRow()
  // Auto-save to reflect deletion in DB immediately
  if (lastVisitId.value) {
    saveInvoiceWrapper()
  }
}

function handleCopyPastMedications(meds: any[]) {
  if (!meds || meds.length === 0) return

  let count = 0
  meds.forEach((m: any) => {
    const med = findMedicineById(m.medicineId || m._id || m.id)
    const rowMed = med || {
      _id: m.medicineId || m._id || m.id,
      nameEn: m.nameEn || m.name || '',
      nameKh: m.nameKh || '',
      price: m.unitPrice || m.price || 0,
      dosageForm: m.dosageForm || '',
      category: m.category || ''
    }

    addMedicine(rowMed, m.quantity || m.qty || 1, undefined, m.isWholesale || false)

    // Set dosage fields on newly added row (last row)
    if (rows.value.length > 0) {
      const lastRow = rows.value[rows.value.length - 1]
      lastRow.morning = m.morningDose ?? m.morning ?? m.qmor ?? 0
      lastRow.afternoon = m.afternoonDose ?? m.afternoon ?? m.qaft ?? 0
      lastRow.evening = m.eveningDose ?? m.evening ?? m.qeve ?? 0
      lastRow.night = m.nightDose ?? m.night ?? m.qngt ?? 0
      lastRow.days = m.days || m.duration || 1
      lastRow.qty = m.quantity || m.qty || 1
      lastRow.instructions = m.usage || m.instructions || ''
    }
    count++
  })

  // Switch to prescription tab
  activeTab.value = 0
  toast.add({
    title: 'ជោគជ័យ',
    description: `បានចម្លងមុខថ្នាំចំនួន ${count} មុខពីប្រវត្តិពិនិត្យមុនចូលវេជ្ជបញ្ជា`,
    color: 'success'
  })
}
</script>

<template>
  <div class="h-full flex flex-col pt-2 px-2 pb-0">
    <UBreadcrumb :items="breadcrumbItems" class="mb-4" />

    <!-- Top Info Section -->
    <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch mb-4">
      <OpdPatientInfo
        v-model:patient-id="patientId"
        v-model:patient-name="patientName"
        v-model:patient-gender="patientGender"
        v-model:patient-search-open="patientSearchOpen"
        v-model:patient-dob="patientDob"
        :patient-age="patientAge"
        :allergies="patientAllergies"
        :blood-group="patientBloodGroup"
        :gender-options="genderOptions"
        @patient-selected="onPatientSelected"
        @add-patient="isAddPatientModalOpen = true"
      />
      <OpdVitals :vitals="vitals" />
      <OpdVisitInfo
        v-model:doctor-id="doctorId"
        v-model:date-in="admissionDate"
        v-model:date-out="dischargeDate"
        :dept="dept"
        :visit-id="lastVisitNo"
      />
    </div>

    <!-- Main Content: Tabs & Controls -->
    <!-- Added pb-20 to allow scroll space above fixed footer -->
    <div class="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 items-start md:overflow-hidden pb-4">
      <!-- Left: Tabs -->
      <div
        class="col-span-1 md:col-span-9 flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden"
      >
        <!-- Diagnosis Control (Left Side) -->
        <OpdDiagnosisControls v-model="diagnosis" />

        <!-- Custom Rounded Tab Header -->
        <div class="flex items-center gap-1.5 p-2 bg-gray-50/80 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
          <button
            v-for="(tab, index) in mainTabs"
            :key="tab.value"
            class="px-4 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all outline-none focus:outline-none flex items-center gap-2 shrink-0"
            :class="activeTab === tab.value
              ? 'bg-primary-500 text-white shadow-sm font-bold'
              : 'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'"
            @click="activeTab = tab.value"
          >
            <UIcon :name="tab.icon" class="w-4 h-4" />
            {{ tab.label }}
          </button>
        </div>

        <!-- Tab Content using v-show (KeepAlive) -->
        <div class="flex-1 overflow-hidden relative">
          <div v-show="activeTab === 0" class="h-full flex flex-col">
            <OpdPrescriptionTable
              ref="prescriptionTable"
              :rows="rows"
              @remove-row="removeRow"
              @add-row="addRow"
            />
          </div>

          <div v-show="activeTab === 1" class="h-full flex flex-col">
            <OpdLabTable :rows="rows" @remove-row="removeRow" @save-lab="saveLabResult" />
          </div>

          <div v-show="activeTab === 2" class="h-full flex flex-col">
            <OpdEchoTable :rows="rows" @remove-row="removeRow" />
          </div>

          <div v-show="activeTab === 3" class="h-full flex flex-col">
            <OpdPaymentTable :rows="rows" @remove-row="removeRow" />
          </div>
        </div>
      </div>

      <!-- Right: Controls -->
      <div
        class="col-span-1 md:col-span-3 h-auto md:h-full md:max-h-[calc(100vh-250px)] flex flex-col md:overflow-hidden dark:bg-gray-900"
      >
        <div class="flex-1 overflow-hidden flex flex-col">
          <div v-show="activeTab === 0" class="h-full flex flex-col">
            <OpdPrescriptionControls
              :medicines="medicines"
              :categories="allMedicineCategories"
              :dosage-forms="allDosageForms"
              :loading="isDataLoading"
              @add="handleAddMedicineWrapper"
              @focus-table="focusPrescriptionTable"
            />
          </div>

          <div v-show="activeTab === 1" class="h-full flex flex-col">
            <OpdLabControls :lab-services="labServices" @add="handleAddService" />
          </div>

          <div v-show="activeTab === 2" class="h-full flex flex-col">
            <OpdEchoControls :echo-services="echoServices" @add="handleAddService" />
          </div>

          <div v-show="activeTab === 3" class="h-full flex flex-col">
            <OpdPaymentControls v-model:payment-method="paymentMethod" :payment-methods="paymentMethods" />
          </div>
        </div>
      </div>
    </div>

    <!-- Fixed Bottom Footer -->
    <div class="sticky bottom-0 z-50 -mx-2">
      <OpdInvoiceFooter
        v-model:discount="discount"
        v-model:total-received="totalReceived"
        :grand-total="grandTotal"
        :subtotal="subtotal"
        :balance="balance"
        @save="saveInvoiceWrapper"
        @print-invoice="printInvoice"
        @print-prescription="printPrescription"
        @print-lab="printLab"
        @print-echo="printEcho"
      />
    </div>

    <ParameterSelectionModal
      v-model="isParamModalOpen"
      :service="selectedServiceForParams"
      @confirm="confirmAddServiceWithParams"
    />

    <!-- Result Entry Modal Component -->
    <ResultEntryModal
      v-model:open="isResultEntryModalOpen"
      :service="selectedServiceForResults"
      @save="saveResultEntry"
    />

    <!-- Delete Confirmation Modal -->
    <UModal
      v-model:open="isDeleteModalOpen"
      title="Remove Saved Item?"
      :ui="{
        title: 'text-red-500'
      }"
    >
      <template #body>
        <p class="text-gray-600 dark:text-gray-300">
          This item has already been saved to the database. Removing it will flag it for deletion upon your next Save.
          <br><br>
          Are you sure you want to remove it?
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            @click="isDeleteModalOpen = false"
          />
          <UButton label="Remove" color="error" @click="handleConfirmDelete" />
        </div>
      </template>
    </UModal>

    <!-- High-Risk Drug Allergy Alert Modal -->
    <UModal
      v-model:open="isAllergyModalOpen"
      title="⚠️ ការព្រមានសុវត្ថិភាពប្រតិកម្មថ្នាំ (High-Risk Allergy Alert)"
      :ui="{
        title: 'text-rose-600 font-bold flex items-center gap-2'
      }"
    >
      <template #body>
        <div class="space-y-4 p-1">
          <div class="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-lg flex items-start gap-3">
            <UIcon name="i-lucide-shield-alert" class="w-8 h-8 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div class="text-sm space-y-1.5 text-gray-800 dark:text-gray-200">
              <div class="font-bold text-rose-600 dark:text-rose-400 text-base">
                អ្នកជំងឺមានប្រវត្តិប្រតិកម្មជាមួយ: {{ allergyConflictReason }}
              </div>
              <div>
                ថ្នាំដែលអ្នករៀបនឹងចេញ: <span class="font-bold text-gray-900 dark:text-white">{{ pendingAllergicMed?.med?.nameEn }} ({{ pendingAllergicMed?.med?.nameKh || 'N/A' }})</span>
              </div>
              <p class="text-xs text-rose-600 dark:text-rose-400 font-medium">
                ការចេញវេជ្ជបញ្ជាប៉ះចំថ្នាំដែលអ្នកជំងឺមានប្រតិកម្ម អាចបណ្តាលឱ្យមានគ្រោះថ្នាក់ធ្ងន់ធ្ងរ (Severe Allergic Reaction / Anaphylaxis)!
              </p>
            </div>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400">
            តើលោកអ្នកពិតជាចង់បន្តចេញវេជ្ជបញ្ជាថ្នាំនេះដោយមានការត្រួតពិនិត្យជាពិសេស (Clinical Override) មែនទេ?
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2.5">
          <UButton
            label="បោះបង់ (Cancel)"
            color="neutral"
            variant="outline"
            icon="i-lucide-x"
            @click="isAllergyModalOpen = false"
          />
          <UButton
            label="បន្តចេញវេជ្ជបញ្ជា (Clinical Override)"
            color="error"
            variant="solid"
            icon="i-lucide-alert-triangle"
            @click="confirmAddAllergicMedicine"
          />
        </div>
      </template>
    </UModal>

    <!-- Add Patient Modal -->
    <AddModal v-model:open="isAddPatientModalOpen" hide-button @success="onPatientSelected" />
  </div>
</template>

<style scoped>
/* Global OPD styles if needed */
</style>
