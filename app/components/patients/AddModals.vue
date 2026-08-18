<script setup lang="ts">
import { z } from 'zod'
import { ref, computed, watch } from 'vue'

// 1. Define a strict Interface for the Patient data
interface Patient {
  _id?: string
  pId?: number
  nameKh?: string
  nameEn?: string
  dob: string | Date
  gender?: string | number
  phone?: string
  email?: string
  address?: string
  proCode?: string
  disCode?: string
  comCode?: string
  vilCode?: string
  photo?: string
}

const props = defineProps<{
  open?: boolean
  patient?: Patient | null
  hideButton?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'save': []
  'success': [patient: any]
}>()

const { t } = useI18n()
const toast = useToast()

const isOpen = computed({
  get: () => props.open ?? false,
  set: (val) => {
    emit('update:open', val)
  }
})

// Validation Schema
const schema = z.object({
  nameKh: z.string().min(1, t('validation.required') || 'Required'),
  nameEn: z.string().optional(),
  dob: z.string().min(1, t('validation.required') || 'Required'),
  gender: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  proCode: z.string().optional(),
  disCode: z.string().optional(),
  comCode: z.string().optional(),
  vilCode: z.string().optional(),
  photo: z.string().optional(),
  bloodGroup: z.string().optional(),
  allergies: z.array(z.string()).optional()
})

type Schema = z.output<typeof schema>

const state = ref<any>({
  nameKh: '',
  nameEn: '',
  dob: '',
  gender: '1',
  phone: '',
  email: '',
  address: '',
  proCode: '',
  disCode: '',
  comCode: '',
  vilCode: '',
  photo: '',
  bloodGroup: '',
  allergies: []
})

const customAllergy = ref('')
const commonAllergies = [
  'Penicillin',
  'Amoxicillin',
  'Aspirin',
  'Ibuprofen',
  'Sulfa (Sulfonamides)',
  'Paracetamol',
  'Ceftriaxone',
  'Ciprofloxacin',
  'Seafood / គ្រឿងសមុទ្រ'
]

function toggleAllergy(allergy: string) {
  if (!state.value.allergies) state.value.allergies = []
  const idx = state.value.allergies.indexOf(allergy)
  if (idx > -1) {
    state.value.allergies.splice(idx, 1)
  } else {
    state.value.allergies.push(allergy)
  }
}

function addCustomAllergy() {
  const val = customAllergy.value.trim()
  if (val && !state.value.allergies.includes(val)) {
    state.value.allergies.push(val)
    customAllergy.value = ''
  }
}

function removeAllergy(index: number) {
  state.value.allergies.splice(index, 1)
}

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

// Location Data
const provinces = ref<any[]>([])
const districts = ref<any[]>([])
const communes = ref<any[]>([])
const villages = ref<any[]>([])

// Fetching Locations
const fetchProvinces = async () => {
  try {
    const res: any = await $api('/locations/provinces')
    provinces.value = res.data || []
  } catch (e) {
    console.error('Failed to fetch provinces', e)
  }
}

const fetchDistricts = async (proCode: string) => {
  if (!proCode) {
    districts.value = []
    return
  }
  try {
    const res: any = await $api(`/locations/districts/byProCode/${proCode}`)
    districts.value = res.data || []
  } catch (e) {
    console.error('Failed to fetch districts', e)
  }
}

const fetchCommunes = async (disCode: string) => {
  if (!disCode) {
    communes.value = []
    return
  }
  try {
    const res: any = await $api(`/locations/communes/byDisCode/${disCode}`)
    communes.value = res.data || []
  } catch (e) {
    console.error('Failed to fetch communes', e)
  }
}

const fetchVillages = async (comCode: string) => {
  if (!comCode) {
    villages.value = []
    return
  }
  try {
    const res: any = await $api(`/locations/villages/byComCode/${comCode}`)
    villages.value = res.data || []
  } catch (e) {
    console.error('Failed to fetch villages', e)
  }
}

// Update DOB when Age is changed
const age = computed(() => {
  if (!state.value.dob) return ''
  const dob = new Date(state.value.dob)
  const ageDifMs = Date.now() - dob.getTime()
  if (ageDifMs < 0) return 0
  const ageDate = new Date(ageDifMs)
  return Math.abs(ageDate.getUTCFullYear() - 1970)
})

function onAgeChange(newAgeValue: any) {
  const newAge = Number(newAgeValue)
  if (isNaN(newAge)) return

  const today = new Date()
  const birthDate = state.value.dob ? new Date(state.value.dob) : new Date(today)

  // Calculate new birth year based on current age
  // If today's birthday has passed: Year = TodayYear - Age
  // If today's birthday hasn't passed: Year = TodayYear - Age - 1
  // However, usually "Age" in clinics is treated as (CurrentYear - BirthYear).
  // Let's use a standard: BirthYear = CurrentYear - Age
  const currentYear = today.getFullYear()
  const newBirthYear = currentYear - newAge

  // Set birthdate to same month/day but new year
  birthDate.setFullYear(newBirthYear)

  // Update state.dob (formatted as YYYY-MM-DD for the input type="date")
  state.value.dob = birthDate.toISOString().split('T')[0]
}

// Image Handling
const fileInput = ref<HTMLInputElement | null>(null)
function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    const reader = new FileReader()
    reader.onload = (e) => {
      state.value.photo = e.target?.result as string
    }
    reader.readAsDataURL(target.files[0])
  }
}

// Watch Modal State
watch(isOpen, (val) => {
  if (val) {
    fetchProvinces()
    if (props.patient) {
      state.value = {
        ...props.patient,
        dob: props.patient.dob ? new Date(props.patient.dob).toISOString().split('T')[0] : '',
        gender: String(props.patient.gender || '1'),
        photo: props.patient.photo || '',
        bloodGroup: props.patient.bloodGroup || '',
        allergies: Array.isArray(props.patient.allergies) ? [...props.patient.allergies] : []
      }
      if (state.value.proCode) fetchDistricts(state.value.proCode)
      if (state.value.disCode) fetchCommunes(state.value.disCode)
      if (state.value.comCode) fetchVillages(state.value.comCode)
    } else {
      resetForm()
    }
  }
})

// Watch Location changes
watch(() => state.value.proCode, (newVal, oldVal) => {
  if (newVal !== oldVal && newVal) {
    state.value.disCode = ''
    state.value.comCode = ''
    state.value.vilCode = ''
    fetchDistricts(newVal)
  }
})
watch(() => state.value.disCode, (newVal, oldVal) => {
  if (newVal !== oldVal && newVal) {
    state.value.comCode = ''
    state.value.vilCode = ''
    fetchCommunes(newVal)
  }
})
watch(() => state.value.comCode, (newVal, oldVal) => {
  if (newVal !== oldVal && newVal) {
    state.value.vilCode = ''
    fetchVillages(newVal)
  }
})

function resetForm() {
  state.value = {
    nameKh: '', nameEn: '', dob: '', gender: '1',
    phone: '', email: '', address: '',
    proCode: '', disCode: '', comCode: '', vilCode: '', photo: '',
    bloodGroup: '', allergies: []
  }
  customAllergy.value = ''
}

async function onSubmit() {
  try {
    const method = props.patient?._id ? 'PUT' : 'POST'
    const url = props.patient?._id ? `/patients/${props.patient._id}` : '/patients'

    const submitData = {
      ...state.value,
      gender: Number(state.value.gender)
    }
    await $api(url, { method, body: submitData })

    toast.add({ title: t('common.success') || 'Success', color: 'success' })
    emit('save')
    isOpen.value = false
  } catch (err: any) {
    toast.add({
      title: t('common.error') || 'Error',
      description: err.data?.message || 'Failed to save patient',
      color: 'error'
    })
  }
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :title="patient ? t('patient.edit') : 'បន្ថែមអ្នកជំងឺថ្មី'"
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <template v-if="!hideButton">
      <slot name="trigger">
        <UButton icon="i-lucide-plus" @click="isOpen = true" />
      </slot>
    </template>

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-6"
        @submit="onSubmit"
      >
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Form Area -->
          <div class="md:col-span-2 space-y-4">
            <UFormField :label="t('patient.nameKh') || 'ឈ្មោះខ្មែរ'" name="nameKh" required>
              <UInput v-model="state.nameKh" icon="i-lucide-user" class="w-full" />
            </UFormField>

            <UFormField :label="t('patient.nameEn') || 'ឈ្មោះអង់គ្លេស'" name="nameEn">
              <UInput v-model="state.nameEn" class="w-full" />
            </UFormField>

            <div class="grid grid-cols-3 gap-4">
              <UFormField :label="t('patient.gender') || 'ភេទ'" name="gender" required>
                <URadioGroup
                  v-model="state.gender"
                  value-key="value"
                  :items="[
                    { label: t('patient.female') || 'ស្រី', value: '2' },
                    { label: t('patient.male') || 'ប្រុស', value: '1' }
                  ]"
                  :ui="{ fieldset: 'flex gap-4' }"
                />
              </UFormField>

              <UFormField :label="t('patient.dob') || 'ថ្ងៃខែឆ្នាំកំណើត'" name="dob" required>
                <UInput v-model="state.dob" type="date" class="w-full" />
              </UFormField>

              <UFormField :label="t('patient.age') || 'អាយុ'">
                <UInput
                  :model-value="age"
                  type="number"
                  icon="i-lucide-calendar"
                  class="w-full"
                  @update:model-value="onAgeChange"
                />
              </UFormField>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <UFormField :label="t('patient.phone') || 'លេខទូរស័ព្ទ'" name="phone">
                <UInput v-model="state.phone" icon="i-lucide-phone" class="w-full" />
              </UFormField>

              <UFormField :label="t('patient.email') || 'អ៊ីមែល'" name="email">
                <UInput v-model="state.email" icon="i-lucide-mail" class="w-full" />
              </UFormField>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <UFormField :label="t('patient.province') || 'ខេត្ត/ក្រុង'" name="proCode">
                <USelectMenu
                  v-model="state.proCode"
                  :items="provinces"
                  value-key="proCode"
                  label-key="nameKh"
                  class="w-full"
                  :placeholder="t('common.select_province') || 'ជ្រើសរើសខេត្ត'"
                />
              </UFormField>

              <UFormField :label="t('patient.district') || 'ស្រុក/ខណ្ឌ'" name="disCode">
                <USelectMenu
                  v-model="state.disCode"
                  :items="districts"
                  value-key="disCode"
                  label-key="nameKh"
                  class="w-full"
                  :disabled="!state.proCode"
                  :placeholder="t('common.select_district') || 'ជ្រើសរើសស្រុក'"
                />
              </UFormField>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <UFormField :label="t('patient.commune') || 'ឃុំ/សង្កាត់'" name="comCode">
                <USelectMenu
                  v-model="state.comCode"
                  :items="communes"
                  value-key="comCode"
                  label-key="nameKh"
                  class="w-full"
                  :disabled="!state.disCode"
                  :placeholder="t('common.select_commune') || 'ជ្រើសរើសឃុំ'"
                />
              </UFormField>

              <UFormField :label="t('patient.village') || 'ភូមិ'" name="vilCode">
                <USelectMenu
                  v-model="state.vilCode"
                  :items="villages"
                  value-key="vilCode"
                  label-key="nameKh"
                  class="w-full"
                  :disabled="!state.comCode"
                  :placeholder="t('common.select_village') || 'ជ្រើសរើសភូមិ'"
                />
              </UFormField>
            </div>

            <!-- Clinical Safety & Allergies Section -->
            <div class="pt-3 border-t border-gray-200 dark:border-gray-800 space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <UIcon name="i-lucide-shield-alert" class="w-5 h-5 text-rose-500" />
                  <span class="font-bold text-sm text-gray-800 dark:text-gray-200">
                    ព័ត៌មានសុវត្ថិភាព និងប្រតិកម្មថ្នាំ (Drug Allergies)
                  </span>
                </div>
                <div class="w-32">
                  <USelectMenu
                    v-model="state.bloodGroup"
                    :items="bloodGroups"
                    class="w-full"
                    placeholder="ក្រុមឈាម (Blood)"
                  />
                </div>
              </div>

              <!-- Selected Allergies Badges -->
              <div class="flex flex-wrap gap-1.5 min-h-[32px] p-2 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-lg items-center">
                <span v-if="!state.allergies || state.allergies.length === 0" class="text-xs text-gray-400 italic">
                  គ្មានប្រវត្តិប្រតិកម្មថ្នាំ (No known allergies recorded)
                </span>
                <span
                  v-for="(alg, idx) in state.allergies"
                  :key="idx"
                  class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white shadow-sm"
                >
                  <UIcon name="i-lucide-alert-triangle" class="w-3 h-3" />
                  {{ alg }}
                  <button type="button" class="hover:text-rose-200 ml-0.5" @click="removeAllergy(idx)">
                    <UIcon name="i-lucide-x" class="w-3 h-3" />
                  </button>
                </span>
              </div>

              <!-- Quick Select Presets & Custom Input -->
              <div class="space-y-2">
                <div class="flex items-center gap-2">
                  <UInput
                    v-model="customAllergy"
                    placeholder="បញ្ចូលឈ្មោះប្រតិកម្មផ្សេងទៀត (Type allergy & press Enter)..."
                    size="sm"
                    class="flex-1"
                    icon="i-lucide-plus-circle"
                    @keydown.enter.prevent="addCustomAllergy"
                  />
                  <UButton
                    label="បន្ថែម"
                    size="xs"
                    color="error"
                    variant="soft"
                    icon="i-lucide-plus"
                    @click="addCustomAllergy"
                  />
                </div>

                <div class="flex flex-wrap items-center gap-1.5 pt-1">
                  <span class="text-[11px] text-gray-500 dark:text-gray-400 font-medium">ថ្នាំប្រតិកម្មញឹកញាប់:</span>
                  <button
                    v-for="item in commonAllergies"
                    :key="item"
                    type="button"
                    class="text-[11px] px-2 py-0.5 rounded border transition-all"
                    :class="state.allergies?.includes(item)
                      ? 'bg-rose-500 border-rose-500 text-white font-bold'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:border-rose-400'"
                    @click="toggleAllergy(item)"
                  >
                    {{ item }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Photo Side -->
          <div class="col-span-1 flex flex-col items-center gap-4">
            <div
              class="w-full aspect-[3/3] max-w-[150px] border-2 border-dashed border-gray-600 rounded-xl flex flex-col items-center justify-center text-gray-400 overflow-hidden relative bg-gray-900/50 cursor-pointer hover:border-primary transition-colors"
              @click="fileInput?.click()"
            >
              <template v-if="!state.photo">
                <UIcon name="i-lucide-user" class="w-16 h-16 mb-2" />
                <span class="text-sm">បញ្ចូលរូបថត</span>
              </template>
              <img v-else :src="state.photo" class="w-full h-full object-cover" />
            </div>
            <UButton
              icon="i-lucide-upload"
              color="neutral"
              variant="soft"
              label="ផ្ទុកឡើងរូបថត"
              class="w-full max-w-[180px]"
              @click="fileInput?.click()"
            />
            <input
              ref="fileInput"
              type="file"
              class="hidden"
              accept="image/*"
              @change="handleFileUpload"
            />
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-4 border-t">
          <UButton
            :label="t('common.cancel') || 'បោះបង់'"
            color="neutral"
            variant="outline"
            @click="isOpen = false"
          />
          <UButton
            :label="(patient ? t('common.update') : t('common.save')) || (patient ? 'កែប្រែ' : 'បង្កើត')"
            color="primary"
            variant="solid"
            type="submit"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
