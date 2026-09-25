<template>
  <UModal
    v-model:open="isOpen"
    :title="appointment ? 'កែប្រែការណាត់ជួប (Edit Appointment)' : 'កត់ត្រាការណាត់ជួបថ្មី (New Appointment)'"
    :ui="{
      content: 'sm:max-w-xl'
    }"
  >
    <template #content>
      <div class="p-5 space-y-4 font-khmer bg-default rounded-xl">
        <!-- Modal Header -->
        <div class="flex items-center justify-between pb-3 border-b border-default">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-200 flex items-center justify-center font-bold">
              <UIcon name="i-lucide-calendar" class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-base font-bold text-highlighted">
                {{ appointment ? 'កែប្រែការណាត់ជួប' : 'ចុះឈ្មោះណាត់ជួបពិនិត្យជំងឺ' }}
              </h3>
              <p class="text-xs text-muted">
                ជ្រើសរើសអ្នកជំងឺពីបញ្ជី និងកំណត់កាលវិភាគណាត់ជួប
              </p>
            </div>
          </div>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="isOpen = false"
          />
        </div>

        <!-- Form Fields -->
        <div class="space-y-3.5 text-xs">
          <!-- Patient Selection -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block font-semibold text-default">
                ជ្រើសរើសអ្នកជំងឺ (Select Patient) *
              </label>
              <button
                type="button"
                class="text-primary-600 hover:text-primary-700 dark:text-primary-400 text-[11px] underline"
                @click="toggleManualEntry"
              >
                {{ isManualEntry ? '← ជ្រើសរើសពីបញ្ជី (Select from List)' : '+ បញ្ចូលឈ្មោះដោយដៃ (Manual Input)' }}
              </button>
            </div>

            <!-- Case 1: Patient Already Selected (Show Profile Card) -->
            <div
              v-if="selectedPatient && !isManualEntry"
              class="p-3 bg-primary-50/70 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800 rounded-lg flex items-center justify-between"
            >
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-200 flex items-center justify-center font-bold">
                  <UIcon name="i-lucide-user" class="w-5 h-5" />
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-sm text-highlighted">
                      {{ selectedPatient.nameKh || selectedPatient.nameEn || selectedPatient.name }}
                    </span>
                    <span v-if="selectedPatient.nameEn && selectedPatient.nameKh" class="text-xs text-muted">
                      ({{ selectedPatient.nameEn }})
                    </span>
                    <span class="px-1.5 py-0.5 text-[10px] rounded bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 font-mono font-bold">
                      {{ selectedPatient.patientCode || (selectedPatient.pId ? `P-${String(selectedPatient.pId).padStart(6, '0')}` : 'PATIENT') }}
                    </span>
                  </div>
                  <div class="text-[11px] text-muted flex items-center gap-3 mt-0.5">
                    <span v-if="selectedPatient.phone" class="flex items-center gap-1">
                      <UIcon name="i-lucide-phone" class="w-3 h-3 text-dimmed" />
                      {{ selectedPatient.phone }}
                    </span>
                    <span v-if="selectedPatient.gender">
                      ភេទ: {{ selectedPatient.gender === 'male' || selectedPatient.gender === 'M' ? 'ប្រុស' : selectedPatient.gender === 'female' || selectedPatient.gender === 'F' ? 'ស្រី' : selectedPatient.gender }}
                    </span>
                    <span v-if="selectedPatient.dob">
                      អាយុ: {{ calculateAge(selectedPatient.dob) }} ឆ្នាំ
                    </span>
                  </div>
                </div>
              </div>
              <UButton
                icon="i-lucide-refresh-cw"
                color="neutral"
                variant="soft"
                size="xs"
                label="ប្តូរ"
                @click="clearSelectedPatient"
              />
            </div>

            <!-- Case 2: Search Autocomplete Dropdown -->
            <div v-else-if="!isManualEntry" class="relative">
              <UInput
                v-model="patientSearchQuery"
                placeholder="វាយឈ្មោះ លេខទូរស័ព្ទ ឬកូដអ្នកជំងឺ (P-000...)"
                icon="i-lucide-search"
                size="sm"
                class="w-full"
                :loading="isSearchingPatients"
                @focus="showPatientDropdown = true"
                @input="handlePatientSearchInput"
              />

              <!-- Dropdown Results -->
              <div
                v-if="showPatientDropdown && (patientList.length > 0 || isSearchingPatients)"
                class="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto bg-default border border-default rounded-lg shadow-xl divide-y divide-default"
              >
                <div
                  v-for="p in patientList"
                  :key="p._id"
                  class="p-2.5 hover:bg-primary-50 dark:hover:bg-primary-950/50 cursor-pointer transition-colors flex items-center justify-between"
                  @mousedown.prevent="selectPatient(p)"
                >
                  <div>
                    <div class="font-bold text-highlighted text-xs flex items-center gap-2">
                      <span>{{ p.nameKh || p.nameEn || p.name }}</span>
                      <span v-if="p.nameEn && p.nameKh" class="text-dimmed font-normal">({{ p.nameEn }})</span>
                    </div>
                    <div class="text-[11px] text-muted flex items-center gap-2 mt-0.5">
                      <span class="font-mono text-primary font-semibold">
                        {{ p.patientCode || (p.pId ? `P-${String(p.pId).padStart(6, '0')}` : '') }}
                      </span>
                      <span v-if="p.phone">• {{ p.phone }}</span>
                      <span v-if="p.gender">• {{ p.gender === 'male' || p.gender === 'M' ? 'ប្រុស' : 'ស្រី' }}</span>
                    </div>
                  </div>
                  <UIcon name="i-lucide-check-circle" class="w-4 h-4 text-primary-500 opacity-60" />
                </div>
              </div>

              <!-- Empty state -->
              <div
                v-else-if="showPatientDropdown && patientSearchQuery && patientList.length === 0 && !isSearchingPatients"
                class="absolute z-50 mt-1 w-full p-3 bg-default border border-default rounded-lg shadow-xl text-center text-dimmed text-xs"
              >
                មិនមានអ្នកជំងឺឈ្មោះ "{{ patientSearchQuery }}" ទេ
              </div>
            </div>

            <!-- Case 3: Manual Input Fallback -->
            <div v-else class="space-y-1.5">
              <UInput
                v-model="form.patientName"
                placeholder="បញ្ចូលឈ្មោះអ្នកជំងឺដោយដៃ..."
                size="sm"
                class="w-full"
              />
            </div>
          </div>

          <!-- Phone Number -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="block font-semibold text-default">
                លេខទូរស័ព្ទ (Phone Number) *
              </label>
              <span v-if="selectedPatient && form.patientPhone === selectedPatient.phone" class="text-[10px] text-emerald-600 dark:text-emerald-400">
                ✓ ទាញយកពីទិន្នន័យអ្នកជំងឺ
              </span>
            </div>
            <UInput
              v-model="form.patientPhone"
              placeholder="012 345 678"
              icon="i-lucide-phone"
              size="sm"
              class="w-full"
            />
          </div>

          <!-- Doctor Selection -->
          <div>
            <label class="block font-semibold text-default mb-1">
              វេជ្ជបណ្ឌិតត្រូវជួប (Doctor) *
            </label>
            <USelectMenu
              v-model="selectedDoctor"
              :items="doctorOptions"
              label-key="label"
              placeholder="ជ្រើសរើសវេជ្ជបណ្ឌិត..."
              class="w-full"
              size="sm"
            />
          </div>

          <!-- Date and Time Slot -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-default mb-1">
                ថ្ងៃណាត់ជួប (Date) *
              </label>
              <UInput
                v-model="form.appointmentDate"
                type="date"
                size="sm"
                class="w-full"
              />
            </div>
            <div>
              <label class="block font-semibold text-default mb-1">
                ម៉ោងណាត់ (Time Slot) *
              </label>
              <UInput
                v-model="form.timeSlot"
                placeholder="09:00 AM"
                size="sm"
                class="w-full"
              />
            </div>
          </div>

          <!-- Status Selection -->
          <div>
            <label class="block font-semibold text-default mb-1">
              ស្ថានភាព (Status)
            </label>
            <select
              v-model="form.status"
              class="w-full p-2 border border-default rounded-lg bg-default text-xs"
            >
              <option value="scheduled">
                Scheduled (បានណាត់)
              </option>
              <option value="arrived">
                Arrived (បានមកដល់)
              </option>
              <option value="completed">
                Completed (បានពិនិត្យរួចរាល់)
              </option>
              <option value="cancelled">
                Cancelled (បានបោះបង់)
              </option>
            </select>
          </div>

          <!-- Reason / Notes -->
          <div>
            <label class="block font-semibold text-default mb-1">
              មូលហេតុណាត់ ឬកំណត់ចំណាំ (Reason / Notes)
            </label>
            <UTextarea
              v-model="form.reason"
              placeholder="ឧ. ពិនិត្យតាមដានសម្ពាធឈាម ឬមើលលទ្ធផលពិសោធន៍..."
              :rows="2"
              size="sm"
              class="w-full"
            />
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="flex items-center justify-end gap-2 pt-3 border-t border-default">
          <UButton
            label="បោះបង់"
            color="neutral"
            variant="outline"
            size="sm"
            @click="isOpen = false"
          />
          <UButton
            :label="appointment ? 'រក្សាទុកការកែប្រែ' : 'កត់ត្រាការណាត់ជួប'"
            icon="i-lucide-check"
            color="primary"
            size="sm"
            :loading="isSubmitting"
            @click="submitForm"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  open?: boolean
  appointment?: any
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'saved'): void
}>()

const toast = useToast()

const isOpen = computed({
  get: () => props.open ?? false,
  set: val => emit('update:open', val)
})

const isSubmitting = ref(false)
const selectedDoctor = ref<any>(null)
const doctorOptions = ref<any[]>([])

// Patient selection state
const selectedPatient = ref<any>(null)
const patientList = ref<any[]>([])
const patientSearchQuery = ref('')
const isSearchingPatients = ref(false)
const showPatientDropdown = ref(false)
const isManualEntry = ref(false)

let searchDebounceTimer: any = null

const form = ref({
  patientId: null as string | null,
  patientName: '',
  patientPhone: '',
  appointmentDate: new Date().toISOString().split('T')[0],
  timeSlot: '09:00 AM',
  status: 'scheduled',
  reason: ''
})

function calculateAge(dob?: string) {
  if (!dob) return ''
  const birth = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--
  }
  return age > 0 ? age : 0
}

async function fetchPatients(query = '') {
  isSearchingPatients.value = true
  try {
    const res: any = await $api('/patients', {
      params: {
        search: query.trim() || undefined,
        limit: 100
      }
    })
    patientList.value = res?.data || []
  } catch (e) {
    console.error('Failed to fetch patients:', e)
    patientList.value = []
  } finally {
    isSearchingPatients.value = false
  }
}

function handlePatientSearchInput() {
  showPatientDropdown.value = true
  clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    fetchPatients(patientSearchQuery.value)
  }, 250)
}

function selectPatient(p: any) {
  selectedPatient.value = p
  form.value.patientId = p._id
  form.value.patientName = p.nameKh || p.nameEn || p.name
  form.value.patientPhone = p.phone || ''
  showPatientDropdown.value = false
  patientSearchQuery.value = ''
}

function clearSelectedPatient() {
  selectedPatient.value = null
  form.value.patientId = null
  form.value.patientName = ''
  form.value.patientPhone = ''
  patientSearchQuery.value = ''
  fetchPatients()
}

function toggleManualEntry() {
  isManualEntry.value = !isManualEntry.value
  if (isManualEntry.value) {
    selectedPatient.value = null
    form.value.patientId = null
  } else {
    fetchPatients()
  }
}

async function fetchDoctors() {
  try {
    const res: any = await $api('/staff?role=doctor')
    const docs = res?.data || res || []
    doctorOptions.value = docs.map((d: any) => ({
      label: `Dr. ${d.nameKh || d.nameEn || d.name}`,
      value: d._id
    }))
  } catch (err: any) {
    // Invented doctors here would be saved as bogus doctorIds on real appointments.
    doctorOptions.value = []
    toast.add({ title: 'Error', description: getApiErrorMessage(err, 'មិនអាចទាញយកបញ្ជីគ្រូពេទ្យបានទេ (Could not load doctors)'), color: 'error' })
  }
}

watch(isOpen, async (val) => {
  if (val) {
    fetchDoctors()
    await fetchPatients()

    if (props.appointment) {
      const pId = props.appointment.patientId?._id || props.appointment.patientId
      form.value = {
        patientId: pId || null,
        patientName: props.appointment.patientName || '',
        patientPhone: props.appointment.patientPhone || '',
        appointmentDate: props.appointment.appointmentDate ? new Date(props.appointment.appointmentDate).toISOString().split('T')[0] : '',
        timeSlot: props.appointment.timeSlot || '09:00 AM',
        status: props.appointment.status || 'scheduled',
        reason: props.appointment.reason || ''
      }

      // If patientId exists, match or fetch full patient details
      if (pId) {
        const found = patientList.value.find(p => p._id === pId)
        if (found) {
          selectedPatient.value = found
        } else if (typeof props.appointment.patientId === 'object' && props.appointment.patientId.nameKh) {
          selectedPatient.value = props.appointment.patientId
        } else {
          try {
            const patRes: any = await $api(`/patients/${pId}`)
            if (patRes?.data) selectedPatient.value = patRes.data
          } catch {
            selectedPatient.value = {
              _id: pId,
              nameKh: props.appointment.patientName,
              phone: props.appointment.patientPhone
            }
          }
        }
        isManualEntry.value = false
      } else if (props.appointment.patientName) {
        // Try to match by name
        const match = patientList.value.find(p => (p.nameKh || p.nameEn || p.name) === props.appointment.patientName)
        if (match) {
          selectedPatient.value = match
          form.value.patientId = match._id
          isManualEntry.value = false
        } else {
          isManualEntry.value = true
        }
      }

      // Pre-select doctor
      const dId = props.appointment.doctorId?._id || props.appointment.doctorId
      if (dId) {
        selectedDoctor.value = doctorOptions.value.find(d => d.value === dId) || dId
      }
    } else {
      selectedPatient.value = null
      isManualEntry.value = false
      patientSearchQuery.value = ''
      showPatientDropdown.value = false
      selectedDoctor.value = null
      form.value = {
        patientId: null,
        patientName: '',
        patientPhone: '',
        appointmentDate: new Date().toISOString().split('T')[0],
        timeSlot: '09:00 AM',
        status: 'scheduled',
        reason: ''
      }
    }
  }
})

async function submitForm() {
  if (!form.value.patientName) {
    toast.add({
      title: 'Error',
      description: isManualEntry.value ? 'សូមបញ្ចូលឈ្មោះអ្នកជំងឺ' : 'សូមជ្រើសរើសអ្នកជំងឺពីបញ្ជី',
      color: 'error'
    })
    return
  }

  if (!form.value.patientPhone) {
    toast.add({
      title: 'Error',
      description: 'សូមបញ្ចូលលេខទូរស័ព្ទអ្នកជំងឺ',
      color: 'error'
    })
    return
  }

  isSubmitting.value = true
  try {
    const docId = typeof selectedDoctor.value === 'object' ? selectedDoctor.value?.value : selectedDoctor.value
    const payload = {
      ...form.value,
      doctorId: docId || undefined,
      patientId: form.value.patientId || undefined
    }

    if (props.appointment?._id) {
      await $api(`/appointments/${props.appointment._id}`, {
        method: 'PUT',
        body: payload
      })
      toast.add({ title: 'Success', description: 'ការណាត់ជួបត្រូវបានកែប្រែដោយជោគជ័យ', color: 'success' })
    } else {
      await $api('/appointments', {
        method: 'POST',
        body: payload
      })
      toast.add({ title: 'Success', description: 'បានកត់ត្រាការណាត់ជួបថ្មីដោយជោគជ័យ', color: 'success' })
    }
    isOpen.value = false
    emit('saved')
  } catch (err: any) {
    console.error('Error saving appointment:', err)
    toast.add({
      title: 'Error',
      description: err?.data?.message || err?.message || 'មិនអាចរក្សាទុកការណាត់ជួបបានទេ',
      color: 'error'
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.font-khmer {
  font-family: 'Battambang', 'Noto Sans Khmer', serif;
}
</style>
