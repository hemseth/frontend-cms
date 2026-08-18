<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Patient } from '~/types/models'
import { useI18n } from 'vue-i18n'

import OpdVitals from '~/components/opd/partials/OpdVitals.vue'
import OpdPrescriptionTable from '~/components/opd/partials/OpdPrescriptionTable.vue'
import OpdPrescriptionControls from '~/components/opd/partials/OpdPrescriptionControls.vue'
import OpdDiagnosisControls from '~/components/opd/partials/OpdDiagnosisControls.vue'

import { useOpdData } from '~/composables/useOpdData'
import { useOpdInvoice } from '~/composables/useOpdInvoice'
import { useDiagnosis } from '~/composables/useDiagnosis'

const { t } = useI18n()

const {
  medicines,
  allMedicineCategories,
  allDosageForms,
  refreshData,
  findMedicineById,
  getCategoryName,
  categoryMap,
  isLoading: isDataLoading
} = useOpdData()

const {
  rows,
  grandTotal,
  subtotal,
  discount,
  addRow,
  removeRow,
  addMedicine,
  saveOpdTransaction,
  vitals,
  isDeleteModalOpen,
  confirmRemoveRow
} = useOpdInvoice(getCategoryName, categoryMap)

const { diagnoses, fetchDiagnoses } = useDiagnosis()

const diagnosis = ref<any[]>([])

const diagnosisOptions = computed(() => {
  return diagnoses.value.map(d => ({
    nameEn: d.nameEn,
    nameKh: d.nameKh,
    code: d.code,
    label: d.nameEn + (d.nameKh ? ` / ${d.nameKh}` : '')
  }))
})

const paymentMethod = ref<string>('Cash')
const paymentMethods = [{ value: 'Cash', label: 'Cash' }, { value: 'ABA QR', label: 'ABA QR' }, { value: 'Wing', label: 'Wing' }]

const patientId = ref<string>('')
const internalPatientId = ref<string>('')
const patientName = ref<string>('')
const patientGender = ref<string>('Male')
const patientDob = ref<string>('')
const patientSearchOpen = ref(false)
const patientSearch = ref('')
const isPatientSearching = ref(false)
const searchResults = ref<any[]>([])
const genderOptions = [{ value: 'Male', label: t('patient.male') }, { value: 'Female', label: t('patient.female') }]

const prescriptionTable = ref<any>(null)

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

const breadcrumbItems = computed(() => [
  { label: t('nav.home'), to: '/' },
  { label: t('nav.pharmacy') || 'Pharmacy', to: '/pharmacy' }
])

const totalReceived = computed(() => grandTotal.value - discount.value)
const balance = computed(() => 0)

onMounted(async () => {
  await Promise.all([
    refreshData(),
    fetchDiagnoses('', false, 1, 5000)
  ])
})

async function searchPatients() {
  if (!patientSearch.value.trim()) {
    searchResults.value = []
    return
  }

  isPatientSearching.value = true
  try {
    const res = await $api<any>('/patients', {
      params: { search: patientSearch.value, limit: 50 }
    })

    if (res?.data?.data) {
      searchResults.value = res.data.data
    } else if (res?.data) {
      searchResults.value = Array.isArray(res.data) ? res.data : []
    } else {
      searchResults.value = []
    }
  } catch (e) {
    console.error('Search failed:', e)
    searchResults.value = []
  } finally {
    isPatientSearching.value = false
  }
}

function selectPatient(patient: any) {
  internalPatientId.value = patient._id || patient.id
  patientId.value = patient.pId?.toString() || patient.code || internalPatientId.value

  if (patient.nameEn && patient.nameKh) {
    patientName.value = `${patient.nameEn} / ${patient.nameKh}`
  } else {
    patientName.value = patient.nameEn || patient.nameKh || patient.name || ''
  }

  const g = patient.gender || patient.sex
  if (g == 1 || g === '1' || g === 'M' || g === 'Male') patientGender.value = t('patient.male')
  else if (g == 2 || g === '2' || g === 'F' || g === 'Female') patientGender.value = t('patient.female')
  else patientGender.value = String(g || t('patient.male'))

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

  patientSearchOpen.value = false
  patientSearch.value = ''
  searchResults.value = []
  rows.value = []
  diagnosis.value = []

  loadPatientVitals(patient._id || patient.id)
}

async function loadPatientVitals(patientId: string) {
  try {
    const res = await $api<any>(`/patients/${patientId}`)
    if (res?.data?.vitals) {
      vitals.value = { ...res.data.vitals }
    }
  } catch (e) {
    console.error('Failed to load vitals:', e)
  }
}

function clearPatient() {
  internalPatientId.value = ''
  patientId.value = ''
  patientName.value = ''
  patientGender.value = t('patient.male')
  patientDob.value = ''
  rows.value = []
  diagnosis.value = []
  vitals.value = { bp: '', heartRate: '', respRate: '', temp: '', weight: '', oxygen: '', height: '', bsl: '' }
}

function onPatientSelected(p: Patient) {
  selectPatient(p)
}

function focusPrescriptionTable() {
  if (rows.value.length > 0 && prescriptionTable.value) {
    const lastIndex = rows.value.length - 1
    prescriptionTable.value.focusRow(lastIndex)
  }
}

function handleAddMedicineWrapper(id: string, qty = 1, isWholesale = false) {
  const med = findMedicineById(id)
  if (!med) return
  addMedicine(med, qty, focusPrescriptionTable, isWholesale)
}

const lastVisitId = ref<string | null>(null)
const lastPaymentId = ref<string | null>(null)
const isSaving = ref(false)

async function saveInvoice() {
  if (!internalPatientId.value) {
    const toast = useToast()
    toast.add({ title: t('common.error') || 'Error', description: t('patient.selectFirst') || 'Please select a patient first', color: 'error' })
    return
  }

  isSaving.value = true
  try {
    const res: any = await saveOpdTransaction(internalPatientId.value, paymentMethod.value, lastVisitId.value, '', diagnosis.value, '')
    if (res && res.data) {
      lastPaymentId.value = res.data._id || res.data.paymentId
      lastVisitId.value = res.data.visit?._id || res.data.visitId
      const toast = useToast()
      toast.add({ title: t('common.success') || 'Success', description: t('common.saved') || 'Prescription saved successfully', color: 'success' })
    }
  } catch (e: any) {
    const toast = useToast()
    toast.add({ title: t('common.error') || 'Error', description: e.message || t('common.saveFailed') || 'Failed to save', color: 'error' })
  } finally {
    isSaving.value = false
  }
}

function handleConfirmDelete() {
  confirmRemoveRow()
  if (lastVisitId.value) {
    saveInvoice()
  }
}

function printPrescription() {
  if (lastVisitId.value && internalPatientId.value) {
    window.open(`/print/prescription/${lastVisitId.value}?patientId=${internalPatientId.value}`, '_blank')
  } else {
    const toast = useToast()
    toast.add({ title: t('common.info') || 'Info', description: t('visit.saveFirst') || 'Please save transaction first', color: 'info' })
  }
}

function clearForm() {
  clearPatient()
  lastVisitId.value = null
  lastPaymentId.value = null
}
</script>

<template>
  <div class="h-full flex flex-col pt-2 px-2 pb-0">
    <UBreadcrumb :items="breadcrumbItems" class="mb-4" />

    <!-- Top Info Section - Patient + Vitals -->
    <div class="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch mb-4">
      <!-- Simple Patient Search Card -->
      <UCard class="col-span-1 md:col-span-4 h-full">
        <template #header>
          <div class="font-semibold flex items-center">
            <UIcon name="i-lucide-user" class="text-primary-500" />
            <span>{{ t('patient.info') }}</span>
          </div>
        </template>

        <div v-if="!internalPatientId">
          <!-- Search Mode -->
          <div class="space-y-3">
            <div class="flex gap-2">
              <UInput
                v-model="patientSearch"
                :placeholder="t('patient.search') || 'Search patient...'"
                icon="i-lucide-search"
                class="flex-1"
                @keyup.enter="searchPatients"
              />
              <UButton
                icon="i-lucide-search"
                color="primary"
                :loading="isPatientSearching"
                @click="searchPatients"
              />
            </div>

            <!-- Search Results -->
            <div v-if="searchResults.length > 0" class="border rounded-lg max-h-60 overflow-y-auto">
              <div
                v-for="p in searchResults"
                :key="p._id || p.id"
                class="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-b last:border-b-0"
                @click="selectPatient(p)"
              >
                <div class="font-medium">
                  {{ p.nameEn || p.nameKh }}
                </div>
                <div class="text-xs text-gray-500">
                  {{ p.phone || '-' }} | {{ p.pId || p.id }}
                </div>
              </div>
            </div>
            <div v-else-if="patientSearch && !isPatientSearching" class="text-center text-gray-500 text-sm py-4">
              {{ t('patient.notFound') || 'No patients found' }}
            </div>
          </div>
        </div>

        <div v-else>
          <!-- Selected Patient Mode -->
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-sm text-gray-500">
                  {{ t('patient.id') }}
                </div>
                <div class="font-mono font-medium">
                  {{ patientId }}
                </div>
              </div>
              <UButton
                icon="i-lucide-x"
                color="error"
                variant="soft"
                size="xs"
                @click="clearPatient"
              />
            </div>

            <div>
              <div class="text-sm text-gray-500">
                {{ t('patient.name') }}
              </div>
              <div class="font-medium">
                {{ patientName }}
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <div class="text-sm text-gray-500">
                  {{ t('patient.gender') }}
                </div>
                <div>{{ patientGender }}</div>
              </div>
              <div>
                <div class="text-sm text-gray-500">
                  {{ t('patient.dob') }}
                </div>
                <div>{{ patientDob || '-' }}</div>
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Vitals Card -->
      <OpdVitals :vitals="vitals" />

      <!-- Visit Info Card -->
      <UCard class="col-span-1 md:col-span-4">
        <template #header>
          <h3 class="text-sm font-semibold">
            {{ t('visit.info') || 'Visit Info' }}
          </h3>
        </template>
        <div class="space-y-3">
          <div>
            <label class="text-xs text-gray-500">{{ t('visit.date') || 'Date' }}</label>
            <p class="font-medium">
              {{ new Date().toLocaleDateString() }}
            </p>
          </div>
          <div>
            <label class="text-xs text-gray-500">{{ t('payment.method') || 'Payment Method' }}</label>
            <USelectMenu
              v-model="paymentMethod"
              :items="paymentMethods"
              value-key="value"
              class="w-full"
            />
          </div>
        </div>
      </UCard>
    </div>

    <!-- Main Content -->
    <div class="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1 items-start md:overflow-hidden pb-4">
      <!-- Left: Prescription Table -->
      <div
        class="col-span-1 md:col-span-9 flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden"
      >
        <!-- Diagnosis Control -->
        <OpdDiagnosisControls v-model="diagnosis" :options="diagnosisOptions" />

        <div class="p-4 border-b border-gray-200 dark:border-gray-800">
          <h3 class="text-lg font-semibold">
            {{ t('nav.prescriptions') || 'Prescriptions' }}
          </h3>
        </div>
        <div class="flex-1 overflow-hidden">
          <OpdPrescriptionTable
            ref="prescriptionTable"
            :rows="rows"
            @remove-row="removeRow"
            @add-row="addRow"
          />
        </div>
      </div>

      <!-- Right: Controls -->
      <div class="col-span-1 md:col-span-3 h-auto md:h-full md:max-h-[calc(100vh-250px)]">
        <div class="h-full flex flex-col overflow-hidden">
          <OpdPrescriptionControls
            :medicines="medicines"
            :categories="allMedicineCategories"
            :dosage-forms="allDosageForms"
            :loading="isDataLoading"
            @add="handleAddMedicineWrapper"
            @focus-table="focusPrescriptionTable"
          />
        </div>
      </div>
    </div>

    <!-- Fixed Bottom Footer -->
    <div class="sticky bottom-0 z-50 -mx-2 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4">
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <div class="text-sm">
            <span class="text-gray-500">{{ t('common.total') || 'Total' }}:</span>
            <span class="text-2xl font-bold ml-2">${{ grandTotal.toFixed(2) }}</span>
          </div>
          <div class="text-sm">
            <UInputNumber
              v-model="discount"
              :min="0"
              :step="0.01"
              class="w-32"
            />
            <span class="text-gray-500 ml-2">{{ t('common.discount') || 'Discount' }}</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <UButton
            icon="i-lucide-printer"
            color="neutral"
            variant="outline"
            :disabled="!lastVisitId"
            @click="printPrescription"
          >
            {{ t('common.print') || 'Print' }}
          </UButton>
          <UButton
            icon="i-lucide-eraser"
            color="warning"
            variant="outline"
            @click="clearForm"
          >
            {{ t('common.clear') || 'Clear' }}
          </UButton>
          <UButton
            icon="i-lucide-save"
            color="primary"
            :loading="isSaving"
            @click="saveInvoice"
          >
            {{ t('common.save') || 'Save' }}
          </UButton>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="isDeleteModalOpen" :title="t('common.remove') || 'Remove Item?'" :ui="{ title: 'text-red-500' }">
      <template #body>
        <p class="text-gray-600 dark:text-gray-300">
          {{ t('patient.deleteConfirm') || 'This item has been saved. Removing it will flag it for deletion on next save.' }}
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            :label="t('common.cancel')"
            color="neutral"
            variant="ghost"
            @click="isDeleteModalOpen = false"
          />
          <UButton :label="t('common.remove')" color="error" @click="handleConfirmDelete" />
        </div>
      </template>
    </UModal>
  </div>
</template>
