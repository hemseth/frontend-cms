<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

interface Patient {
  _id?: string
  pId?: number
  code?: string
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
  bloodGroup?: string
  allergies?: string[]
  coverageType?: string
  nssfMemberNumber?: string
  hefBeneficiaryNumber?: string
  idPoorNumber?: string
  insurerName?: string
  referralSourceFacility?: string
  referralNumber?: string
  referralDate?: string | Date
  referralReason?: string
  consentToCare?: boolean
  consentRecordedAt?: string | Date
}

const props = defineProps<{
  open?: boolean
  patient?: Patient | null
  hideButton?: boolean
}>()

interface LocationItem {
  proCode?: string
  disCode?: string
  comCode?: string
  vilCode?: string
  nameKh: string
  nameEn?: string
}

interface PatientFormState {
  nameKh: string
  nameEn: string
  dob: string
  gender: string
  phone: string
  email: string
  address: string
  proCode: string
  disCode: string
  comCode: string
  vilCode: string
  photo: string
  bloodGroup: string
  allergies: string[]
  coverageType: string
  nssfMemberNumber: string
  hefBeneficiaryNumber: string
  idPoorNumber: string
  insurerName: string
  referralSourceFacility: string
  referralNumber: string
  referralDate: string
  referralReason: string
  consentToCare: boolean
  consentRecordedAt: string
}

const emit = defineEmits<{
  'update:open': [value: boolean]
  'save': []
  'success': [patient: Record<string, unknown>]
  'print': [patient: Record<string, unknown>]
}>()

const toast = useToast()
const { t } = useI18n()

const isOpen = computed({
  get: () => props.open ?? false,
  set: (val) => {
    emit('update:open', val)
  }
})

const state = ref<PatientFormState>({
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
  // Unknown and empty until someone records them: a default here would be charted as clinical fact.
  bloodGroup: 'unknown',
  allergies: [],
  coverageType: 'self_pay',
  nssfMemberNumber: '',
  hefBeneficiaryNumber: '',
  idPoorNumber: '',
  insurerName: '',
  referralSourceFacility: '',
  referralNumber: '',
  referralDate: '',
  referralReason: '',
  consentToCare: false,
  consentRecordedAt: ''
})

const customAllergy = ref('')
const isSubmitting = ref(false)
const autoCode = ref('0893')

const bloodGroups = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-', 'unknown']

const coverageTypes = [
  { value: 'self_pay', labelKh: 'បង់ប្រាក់ផ្ទាល់ខ្លួន', labelEn: 'Self-pay' },
  { value: 'nssf', labelKh: 'ធានារ៉ាប់រងសង្គម (NSSF)', labelEn: 'NSSF' },
  { value: 'hef', labelKh: 'មូលនិធិសមធម៌សុខភាព (HEF)', labelEn: 'Health Equity Fund' },
  { value: 'idpoor', labelKh: 'អត្តសញ្ញាណប័ណ្ណក្រីក្រ (IDPoor)', labelEn: 'IDPoor' },
  { value: 'private_insurance', labelKh: 'ធានារ៉ាប់រងឯកជន', labelEn: 'Private Insurance' },
  { value: 'other', labelKh: 'ផ្សេងៗ', labelEn: 'Other' }
]

// Fires once, the first time consent is checked, so re-opening an already-consented
// patient for an unrelated edit doesn't keep bumping the recorded timestamp.
watch(() => state.value.consentToCare, (val, old) => {
  if (val && !old && !state.value.consentRecordedAt) {
    state.value.consentRecordedAt = new Date().toISOString()
  }
})

const currentYear = new Date().getFullYear()
const hnCode = computed(() => {
  if (props.patient?.pId) {
    return `HN-${currentYear}-${String(props.patient.pId).padStart(4, '0')}`
  }
  if (props.patient?.code) {
    return props.patient.code
  }
  return `HN-${currentYear}-${autoCode.value}`
})

// Location Data
const provinces = ref<LocationItem[]>([])
const districts = ref<LocationItem[]>([])
const communes = ref<LocationItem[]>([])
const villages = ref<LocationItem[]>([])

const fetchProvinces = async () => {
  try {
    const res = await $api<{ data?: LocationItem[] }>('/locations/provinces')
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
    const res = await $api<{ data?: LocationItem[] }>(`/locations/districts/byProCode/${proCode}`)
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
    const res = await $api<{ data?: LocationItem[] }>(`/locations/communes/byDisCode/${disCode}`)
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
    const res = await $api<{ data?: LocationItem[] }>(`/locations/villages/byComCode/${comCode}`)
    villages.value = res.data || []
  } catch (e) {
    console.error('Failed to fetch villages', e)
  }
}

// DOB <-> Age calculation
const age = computed(() => {
  if (!state.value.dob) return ''
  const dob = new Date(state.value.dob)
  const ageDifMs = Date.now() - dob.getTime()
  if (ageDifMs < 0) return 0
  const ageDate = new Date(ageDifMs)
  return Math.abs(ageDate.getUTCFullYear() - 1970)
})

function onAgeChange(newAgeValue: string | number) {
  const newAge = Number(newAgeValue)
  if (isNaN(newAge) || newAge < 0) return

  const today = new Date()
  const birthDate = state.value.dob ? new Date(state.value.dob) : new Date(today)
  const thisYear = today.getFullYear()
  const newBirthYear = thisYear - newAge

  birthDate.setFullYear(newBirthYear)
  state.value.dob = birthDate.toISOString().split('T')[0] ?? ''
}

// Image Handling
const fileInput = ref<HTMLInputElement | null>(null)

function triggerUpload() {
  fileInput.value?.click()
}

function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    const file = target.files[0]
    if (file.size > 2 * 1024 * 1024) {
      toast.add({
        title: 'ទំហំរូបថតធំពេក',
        description: 'រូបថតត្រូវតែមានទំហំតូចជាង 2MB (JPG, PNG)',
        color: 'error'
      })
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      state.value.photo = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }
}

function removePhoto() {
  state.value.photo = ''
  if (fileInput.value) fileInput.value.value = ''
}

// Allergies management
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

function onAllergyKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    addCustomAllergy()
  }
}

// Watch Location changes
watch(() => state.value.proCode, (newVal, oldVal) => {
  if (newVal !== oldVal) {
    state.value.disCode = ''
    state.value.comCode = ''
    state.value.vilCode = ''
    if (newVal) fetchDistricts(newVal)
  }
})

watch(() => state.value.disCode, (newVal, oldVal) => {
  if (newVal !== oldVal) {
    state.value.comCode = ''
    state.value.vilCode = ''
    if (newVal) fetchCommunes(newVal)
  }
})

watch(() => state.value.comCode, (newVal, oldVal) => {
  if (newVal !== oldVal) {
    state.value.vilCode = ''
    if (newVal) fetchVillages(newVal)
  }
})

function resetForm() {
  state.value = {
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
    bloodGroup: 'unknown',
    allergies: [],
    coverageType: 'self_pay',
    nssfMemberNumber: '',
    hefBeneficiaryNumber: '',
    idPoorNumber: '',
    insurerName: '',
    referralSourceFacility: '',
    referralNumber: '',
    referralDate: '',
    referralReason: '',
    consentToCare: false,
    consentRecordedAt: ''
  }
  customAllergy.value = ''
}

// Watch Modal State
watch(isOpen, async (val) => {
  if (val) {
    await fetchProvinces()
    if (props.patient) {
      state.value = {
        ...props.patient,
        nameKh: props.patient.nameKh || '',
        nameEn: props.patient.nameEn || '',
        dob: props.patient.dob ? (new Date(props.patient.dob).toISOString().split('T')[0] ?? '') : '',
        gender: String(props.patient.gender || '1'),
        phone: props.patient.phone || '',
        email: props.patient.email || '',
        address: props.patient.address || '',
        proCode: props.patient.proCode || '',
        disCode: props.patient.disCode || '',
        comCode: props.patient.comCode || '',
        vilCode: props.patient.vilCode || '',
        photo: props.patient.photo || '',
        bloodGroup: props.patient.bloodGroup || 'unknown',
        allergies: Array.isArray(props.patient.allergies) ? [...props.patient.allergies] : [],
        coverageType: props.patient.coverageType || 'self_pay',
        nssfMemberNumber: props.patient.nssfMemberNumber || '',
        hefBeneficiaryNumber: props.patient.hefBeneficiaryNumber || '',
        idPoorNumber: props.patient.idPoorNumber || '',
        insurerName: props.patient.insurerName || '',
        referralSourceFacility: props.patient.referralSourceFacility || '',
        referralNumber: props.patient.referralNumber || '',
        referralDate: props.patient.referralDate ? (new Date(props.patient.referralDate).toISOString().split('T')[0] ?? '') : '',
        referralReason: props.patient.referralReason || '',
        consentToCare: props.patient.consentToCare || false,
        consentRecordedAt: props.patient.consentRecordedAt ? new Date(props.patient.consentRecordedAt).toISOString() : ''
      }
      if (state.value.proCode) await fetchDistricts(state.value.proCode)
      if (state.value.disCode) await fetchCommunes(state.value.disCode)
      if (state.value.comCode) await fetchVillages(state.value.comCode)
    } else {
      resetForm()
      try {
        const countRes = await $api<{ total?: number }>('/patients', { params: { limit: 1 } })
        if (typeof countRes?.total === 'number') {
          autoCode.value = String(countRes.total + 1).padStart(4, '0')
        }
      } catch {
        // fallback
      }
    }
  }
})

onMounted(() => {
  fetchProvinces()
})

async function onSubmit(printAfter = false) {
  if (!state.value.nameKh?.trim()) {
    toast.add({
      title: 'សូមបញ្ចូលឈ្មោះខ្មែរ',
      description: 'ឈ្មោះ (ខ្មែរ) ត្រូវបានទាមទារ (Khmer Name is required)',
      color: 'error'
    })
    return
  }

  if (!state.value.dob) {
    toast.add({
      title: 'សូមបញ្ចូលថ្ងៃខែឆ្នាំកំណើត',
      description: 'ថ្ងៃខែឆ្នាំកំណើត ត្រូវបានទាមទារ (Date of Birth is required)',
      color: 'error'
    })
    return
  }

  // A new patient with the same phone, or the same name and birth date, may already exist.
  if (!props.patient?._id) {
    try {
      const dup = await $api<{ data?: Array<{ pId?: number, nameKh?: string, nameEn?: string, phone?: string }> }>('/patients/duplicates', {
        params: { nameKh: state.value.nameKh, nameEn: state.value.nameEn, dob: state.value.dob, phone: state.value.phone }
      })
      const matches = dup?.data ?? []
      if (matches.length) {
        const list = matches.map((p: { pId?: number, nameKh?: string, nameEn?: string, phone?: string }) => `• ${p.pId ? `P-${String(p.pId).padStart(6, '0')} ` : ''}${p.nameKh || p.nameEn || ''} ${p.phone || ''}`.trim()).join('\n')
        if (!window.confirm(`${t('patient.possibleDuplicates')}\n\n${list}\n\n${t('patient.registerAnyway')}`)) return
      }
    } catch {
      // The warning is a convenience; registration still works without it.
    }
  }

  isSubmitting.value = true
  try {
    const method = props.patient?._id ? 'PUT' : 'POST'
    const url = props.patient?._id ? `/patients/${props.patient._id}` : '/patients'

    const submitData = {
      ...state.value,
      gender: Number(state.value.gender)
    }

    const res = await $api<{ data?: Record<string, unknown> }>(url, { method, body: submitData })
    const savedPatient = res.data || (submitData as unknown as Record<string, unknown>)

    toast.add({
      title: 'ជោគជ័យ (Success)',
      description: props.patient?._id ? 'បានកែប្រែព័ត៌មានអ្នកជំងឺជោគជ័យ' : 'បានបន្ថែមអ្នកជំងឺថ្មីជោគជ័យ',
      color: 'success'
    })

    emit('save')
    emit('success', savedPatient)

    if (printAfter) {
      emit('print', savedPatient)
      setTimeout(() => {
        window.print()
      }, 500)
    }

    isOpen.value = false
    resetForm()
  } catch (err: unknown) {
    const error = err as { data?: { message?: string } }
    toast.add({
      title: 'បរាជ័យ (Error)',
      description: error.data?.message || 'មិនអាចរក្សាទុកទិន្នន័យបានទេ',
      color: 'error'
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :dismissible="false"
    :ui="{
      content: 'sm:max-w-4xl p-0 overflow-hidden bg-transparent border-0 shadow-none'
    }"
  >
    <template v-if="!hideButton">
      <slot name="trigger">
        <UButton icon="i-lucide-plus" @click="isOpen = true" />
      </slot>
    </template>

    <template #content>
      <div class="font-khmer bg-[#0c1322] border border-slate-800 text-slate-100 rounded-2xl shadow-2xl p-6 sm:p-7 space-y-5 max-h-[92vh] overflow-y-auto custom-scrollbar">
        <!-- Modal Header -->
        <div class="flex items-center justify-between pb-1 border-b border-slate-800/80">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-xl bg-emerald-950/70 border border-emerald-800/60 flex items-center justify-center shadow-inner">
              <UIcon name="i-lucide-user-plus" class="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 class="text-base sm:text-lg font-bold text-white tracking-wide flex items-center gap-2">
                {{ patient ? 'កែប្រែព័ត៌មានអ្នកជំងឺ (Edit Patient Admission)' : 'បន្ថែមអ្នកជំងឺថ្មី (New Patient Admission)' }}
              </h2>
              <p class="text-xs font-medium text-emerald-400 mt-0.5">
                លេខកូដស្វ័យប្រវត្ត: {{ hnCode }}
              </p>
            </div>
          </div>

          <button
            type="button"
            class="w-8 h-8 rounded-lg flex items-center justify-center text-dimmed hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
            @click="isOpen = false"
          >
            <UIcon name="i-lucide-x" class="w-5 h-5" />
          </button>
        </div>

        <!-- Top Two-Column Area -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <!-- Left Main Form Area (approx ~73%) -->
          <div class="lg:col-span-8 space-y-3.5">
            <!-- Row 1: Name Kh -->
            <div>
              <label class="block text-xs font-medium text-dimmed mb-1.5">
                ឈ្មោះ (ខ្មែរ) <span class="text-rose-500">*</span>
              </label>
              <div class="bg-[#131b2e] border border-slate-700/70 hover:border-slate-600 focus-within:border-emerald-500 rounded-lg px-3 py-2.5 flex items-center gap-2.5 transition-all">
                <UIcon name="i-lucide-user" class="w-4 h-4 text-dimmed flex-shrink-0" />
                <input
                  v-model="state.nameKh"
                  type="text"
                  placeholder="សុខ ចាន់ថន"
                  required
                  class="w-full bg-transparent text-white text-sm outline-none placeholder:text-muted font-khmer"
                >
              </div>
            </div>

            <!-- Row 2: Name En -->
            <div>
              <label class="block text-xs font-medium text-dimmed mb-1.5">
                ឈ្មោះ (អង់គ្លេស / English)
              </label>
              <div class="bg-[#131b2e] border border-slate-700/70 hover:border-slate-600 focus-within:border-emerald-500 rounded-lg px-3 py-2.5 flex items-center transition-all">
                <input
                  v-model="state.nameEn"
                  type="text"
                  placeholder="SOK CHANTHORN"
                  class="w-full bg-transparent text-white text-sm outline-none placeholder:text-muted font-medium uppercase tracking-wide"
                >
              </div>
            </div>

            <!-- Row 3: Gender, DOB, Age (3 columns) -->
            <div class="grid grid-cols-12 gap-3 items-end">
              <!-- Gender -->
              <div class="col-span-12 sm:col-span-4">
                <label class="block text-xs font-medium text-dimmed mb-1.5">
                  ភេទ <span class="text-rose-500">*</span>
                </label>
                <div class="flex items-center gap-4 h-[42px]">
                  <!-- Male -->
                  <label class="flex items-center gap-2 cursor-pointer select-none">
                    <span
                      class="w-4 h-4 rounded-full border flex items-center justify-center transition-all"
                      :class="state.gender === '1' ? 'border-emerald-500 bg-emerald-500/20 shadow-sm' : 'border-slate-500 bg-transparent'"
                    >
                      <span v-if="state.gender === '1'" class="w-2 h-2 rounded-full bg-emerald-500" />
                    </span>
                    <span class="text-sm text-white font-khmer">ប្រុស</span>
                    <input
                      v-model="state.gender"
                      type="radio"
                      value="1"
                      class="sr-only"
                    >
                  </label>

                  <!-- Female -->
                  <label class="flex items-center gap-2 cursor-pointer select-none">
                    <span
                      class="w-4 h-4 rounded-full border flex items-center justify-center transition-all"
                      :class="state.gender === '2' ? 'border-emerald-500 bg-emerald-500/20 shadow-sm' : 'border-slate-500 bg-transparent'"
                    >
                      <span v-if="state.gender === '2'" class="w-2 h-2 rounded-full bg-emerald-500" />
                    </span>
                    <span class="text-sm text-white font-khmer">ស្រី</span>
                    <input
                      v-model="state.gender"
                      type="radio"
                      value="2"
                      class="sr-only"
                    >
                  </label>
                </div>
              </div>

              <!-- Date of Birth -->
              <div class="col-span-12 sm:col-span-5">
                <label class="block text-xs font-medium text-dimmed mb-1.5">
                  ថ្ងៃខែឆ្នាំកំណើត <span class="text-rose-500">*</span>
                </label>
                <div class="bg-[#131b2e] border border-slate-700/70 hover:border-slate-600 focus-within:border-emerald-500 rounded-lg px-3 py-2 flex items-center justify-between h-[42px] transition-all">
                  <input
                    v-model="state.dob"
                    type="date"
                    required
                    class="w-full bg-transparent text-white text-sm outline-none [color-scheme:dark]"
                  >
                  <UIcon name="i-lucide-calendar" class="w-4 h-4 text-dimmed pointer-events-none flex-shrink-0 ml-1" />
                </div>
              </div>

              <!-- Age -->
              <div class="col-span-12 sm:col-span-3">
                <label class="block text-xs font-medium text-dimmed mb-1.5">
                  អាយុ
                </label>
                <div class="bg-[#131b2e] border border-slate-700/70 hover:border-slate-600 focus-within:border-emerald-500 rounded-lg px-3 py-2 flex items-center justify-between h-[42px] transition-all">
                  <input
                    :value="age === '' ? '' : age"
                    type="number"
                    min="0"
                    max="140"
                    placeholder="25"
                    class="w-full bg-transparent text-white text-sm outline-none placeholder:text-muted text-center sm:text-left"
                    @input="onAgeChange(($event.target as HTMLInputElement).value)"
                  >
                  <span class="text-xs text-dimmed select-none ml-1 flex-shrink-0 font-khmer">ឆ្នាំ</span>
                </div>
              </div>
            </div>

            <!-- Row 4: Phone & Email (2 columns) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <!-- Phone -->
              <div>
                <label class="block text-xs font-medium text-dimmed mb-1.5">
                  លេខទូរស័ព្ទ <span class="text-rose-500">*</span>
                </label>
                <div class="bg-[#131b2e] border border-slate-700/70 hover:border-slate-600 focus-within:border-emerald-500 rounded-lg px-3 py-2.5 flex items-center gap-2.5 transition-all">
                  <UIcon name="i-lucide-phone" class="w-4 h-4 text-dimmed flex-shrink-0" />
                  <input
                    v-model="state.phone"
                    type="tel"
                    placeholder="012 345 678"
                    class="w-full bg-transparent text-white text-sm outline-none placeholder:text-muted"
                  >
                </div>
              </div>

              <!-- Email -->
              <div>
                <label class="block text-xs font-medium text-dimmed mb-1.5">
                  អ៊ីមែល (Email)
                </label>
                <div class="bg-[#131b2e] border border-slate-700/70 hover:border-slate-600 focus-within:border-emerald-500 rounded-lg px-3 py-2.5 flex items-center gap-2.5 transition-all">
                  <UIcon name="i-lucide-mail" class="w-4 h-4 text-dimmed flex-shrink-0" />
                  <input
                    v-model="state.email"
                    type="email"
                    placeholder="patient@example.com"
                    class="w-full bg-transparent text-white text-sm outline-none placeholder:text-muted"
                  >
                </div>
              </div>
            </div>

            <!-- Row 5: Address (4 columns) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <!-- Province -->
              <div>
                <label class="block text-xs font-medium text-dimmed mb-1.5">
                  រាជធានី/ខេត្ត
                </label>
                <div class="relative flex items-center">
                  <select
                    v-model="state.proCode"
                    class="w-full bg-[#131b2e] border border-slate-700/70 hover:border-slate-600 focus:border-emerald-500 rounded-lg px-2.5 py-2.5 text-white text-xs sm:text-sm appearance-none outline-none pr-7 cursor-pointer transition-colors truncate font-khmer"
                  >
                    <option value="">
                      ភ្នំពេញ (Phnom Penh)
                    </option>
                    <option v-for="p in provinces" :key="p.proCode" :value="p.proCode">
                      {{ p.nameKh }} ({{ p.nameEn }})
                    </option>
                  </select>
                  <UIcon name="i-lucide-chevron-down" class="w-4 h-4 text-dimmed absolute right-2 pointer-events-none" />
                </div>
              </div>

              <!-- District -->
              <div>
                <label class="block text-xs font-medium text-dimmed mb-1.5">
                  ក្រុង/ស្រុក/ខណ្ឌ
                </label>
                <div class="relative flex items-center">
                  <select
                    v-model="state.disCode"
                    :disabled="!state.proCode && provinces.length > 0"
                    class="w-full bg-[#131b2e] border border-slate-700/70 hover:border-slate-600 focus:border-emerald-500 rounded-lg px-2.5 py-2.5 text-white text-xs sm:text-sm appearance-none outline-none pr-7 cursor-pointer transition-colors truncate disabled:opacity-50 font-khmer"
                  >
                    <option value="">
                      ខណ្ឌចំការមន
                    </option>
                    <option v-for="d in districts" :key="d.disCode" :value="d.disCode">
                      {{ d.nameKh }}
                    </option>
                  </select>
                  <UIcon name="i-lucide-chevron-down" class="w-4 h-4 text-dimmed absolute right-2 pointer-events-none" />
                </div>
              </div>

              <!-- Commune -->
              <div>
                <label class="block text-xs font-medium text-dimmed mb-1.5">
                  ឃុំ/សង្កាត់
                </label>
                <div class="relative flex items-center">
                  <select
                    v-model="state.comCode"
                    :disabled="!state.disCode && districts.length > 0"
                    class="w-full bg-[#131b2e] border border-slate-700/70 hover:border-slate-600 focus:border-emerald-500 rounded-lg px-2.5 py-2.5 text-white text-xs sm:text-sm appearance-none outline-none pr-7 cursor-pointer transition-colors truncate disabled:opacity-50 font-khmer"
                  >
                    <option value="">
                      សង្កាត់ទួលទំពូង
                    </option>
                    <option v-for="c in communes" :key="c.comCode" :value="c.comCode">
                      {{ c.nameKh }}
                    </option>
                  </select>
                  <UIcon name="i-lucide-chevron-down" class="w-4 h-4 text-dimmed absolute right-2 pointer-events-none" />
                </div>
              </div>

              <!-- Village / Street No -->
              <div>
                <label class="block text-xs font-medium text-dimmed mb-1.5">
                  ភូមិ / ផ្លូវលេខ
                </label>
                <div class="bg-[#131b2e] border border-slate-700/70 hover:border-slate-600 focus-within:border-emerald-500 rounded-lg px-2.5 py-2.5 flex items-center transition-all">
                  <input
                    v-model="state.address"
                    type="text"
                    placeholder="ផ្ទះលេខ 42B, ផ្លូវ 432"
                    class="w-full bg-transparent text-white text-xs sm:text-sm outline-none placeholder:text-muted font-khmer"
                  >
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column: Photo Upload Card (approx ~27%) -->
          <div class="lg:col-span-4 h-full flex flex-col">
            <div class="bg-[#101726]/70 border border-slate-800/90 rounded-2xl p-4 flex flex-col justify-between h-full min-h-[280px]">
              <!-- Dashed Upload Zone -->
              <div
                class="border border-dashed border-slate-700/80 hover:border-slate-500 rounded-xl p-4 flex flex-col items-center justify-center flex-1 cursor-pointer transition-all group relative overflow-hidden bg-[#0c1322]/40"
                @click="triggerUpload"
              >
                <!-- When no photo -->
                <template v-if="!state.photo">
                  <div class="w-16 h-16 rounded-full bg-[#1b2539] flex items-center justify-center text-dimmed mb-3 border border-slate-700/60 shadow-inner group-hover:scale-105 transition-transform">
                    <UIcon name="i-lucide-user" class="w-8 h-8 text-dimmed" />
                  </div>
                  <span class="text-white text-sm font-semibold tracking-wide font-khmer">
                    បញ្ចូលរូបថត
                  </span>
                  <span class="text-[11px] text-dimmed mt-1 font-normal font-khmer">
                    JPG, PNG (អតិបរមា 2MB)
                  </span>
                </template>

                <!-- When photo uploaded -->
                <template v-else>
                  <img
                    :src="state.photo"
                    alt="Patient Photo"
                    class="w-full h-full object-cover rounded-lg max-h-[160px]"
                  >
                  <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity rounded-xl">
                    <button
                      type="button"
                      class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs flex items-center gap-1 font-khmer cursor-pointer"
                      @click.stop="triggerUpload"
                    >
                      <UIcon name="i-lucide-refresh-cw" class="w-3.5 h-3.5" />
                      ប្តូរ
                    </button>
                    <button
                      type="button"
                      class="px-2.5 py-1 bg-rose-900/80 hover:bg-rose-800 text-white rounded text-xs flex items-center gap-1 font-khmer cursor-pointer"
                      @click.stop="removePhoto"
                    >
                      <UIcon name="i-lucide-trash-2" class="w-3.5 h-3.5" />
                      លុប
                    </button>
                  </div>
                </template>
              </div>

              <!-- Upload Button -->
              <button
                type="button"
                class="w-full mt-3 bg-[#1e293b] hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/80 py-2.5 px-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm font-khmer"
                @click="triggerUpload"
              >
                <UIcon name="i-lucide-upload" class="w-4 h-4" />
                <span>ផ្ទុកឡើងរូបថត</span>
              </button>

              <input
                ref="fileInput"
                type="file"
                class="hidden"
                accept="image/png, image/jpeg, image/webp"
                @change="handleFileUpload"
              >
            </div>
          </div>
        </div>

        <!-- Full-Width Clinical Safety & Drug Allergies Section -->
        <div class="bg-[#140a0e] border border-rose-950/80 rounded-2xl p-4 sm:p-5 space-y-3">
          <!-- Card Header -->
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2 text-rose-300">
              <UIcon name="i-lucide-triangle-alert" class="w-5 h-5 text-rose-400 flex-shrink-0" />
              <span class="font-bold text-sm text-rose-200 tracking-wide font-khmer">
                ព័ត៌មានសុវត្ថិភាព និងប្រតិកម្មថ្នាំ (Drug Allergies)
              </span>
            </div>

            <!-- Blood Group Badge / Dropdown -->
            <div class="relative flex items-center">
              <select
                v-model="state.bloodGroup"
                class="appearance-none bg-[#2c0e15] hover:bg-[#38121c] border border-rose-900/70 text-rose-200 hover:text-white px-3 py-1 pr-7 rounded-lg text-xs font-semibold cursor-pointer outline-none transition-colors font-khmer"
              >
                <option v-for="bg in bloodGroups" :key="bg" :value="bg">
                  ក្រុមឈាម (Blood: {{ bg }})
                </option>
              </select>
              <UIcon name="i-lucide-chevron-down" class="w-3.5 h-3.5 text-rose-300 absolute right-2 pointer-events-none" />
            </div>
          </div>

          <!-- Allergy Tags & Inline Input Box -->
          <div class="bg-[#1d0c12] border border-rose-950/70 focus-within:border-rose-900/90 rounded-xl px-3 py-2 flex flex-wrap items-center gap-2 min-h-[46px] transition-colors">
            <!-- Pill Badges -->
            <span
              v-for="(alg, idx) in state.allergies"
              :key="idx"
              class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#3d0f15] border border-rose-900/80 text-rose-200 shadow-sm transition-transform"
            >
              <UIcon name="i-lucide-pill" class="w-3.5 h-3.5 text-rose-300 flex-shrink-0" />
              <span>{{ alg }}</span>
              <button
                type="button"
                class="hover:text-white text-rose-400 p-0.5 rounded transition-colors ml-0.5 cursor-pointer"
                @click="removeAllergy(Number(idx))"
              >
                <UIcon name="i-lucide-x" class="w-3 h-3" />
              </button>
            </span>

            <input
              v-model="customAllergy"
              type="text"
              placeholder="វាយបញ្ចូលឈ្មោះថ្នាំប្រតិកម្ម (ចុច Enter)..."
              class="bg-transparent border-none text-white placeholder:text-muted text-xs focus:outline-none flex-1 min-w-[220px] py-1 font-khmer"
              @keydown="onAllergyKeydown"
            >
          </div>

          <!-- Bottom Warning Notice -->
          <div class="flex items-center gap-2 text-amber-400 text-xs pt-0.5">
            <UIcon name="i-lucide-triangle-alert" class="w-4 h-4 flex-shrink-0 text-amber-400" />
            <span class="font-khmer text-[11.5px] sm:text-xs">
              ព័ត៌មាននេះនឹងបង្ហាញលើប័ណ្ណវេជ្ជបញ្ជា និងផ្ទាំងព្រមានពេទ្យដោយស្វ័យប្រវត្តិ។
            </span>
          </div>
        </div>

        <!-- Insurance / Referral Section -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <!-- Insurance / Coverage Card -->
          <div class="bg-[#0a1420] border border-sky-950/80 rounded-2xl p-4 sm:p-5 space-y-3">
            <div class="flex items-center gap-2 text-sky-300">
              <UIcon name="i-lucide-shield-check" class="w-5 h-5 text-sky-400 flex-shrink-0" />
              <span class="font-bold text-sm text-sky-200 tracking-wide font-khmer">
                ការធានារ៉ាប់រង (Insurance / Coverage)
              </span>
            </div>

            <div>
              <label class="block text-xs font-medium text-dimmed mb-1.5">
                ប្រភេទការធានារ៉ាប់រង (Coverage Type)
              </label>
              <div class="relative flex items-center">
                <select
                  v-model="state.coverageType"
                  class="w-full bg-[#131b2e] border border-slate-700/70 hover:border-slate-600 focus:border-sky-500 rounded-lg px-2.5 py-2.5 text-white text-sm appearance-none outline-none pr-7 cursor-pointer transition-colors font-khmer"
                >
                  <option v-for="ct in coverageTypes" :key="ct.value" :value="ct.value">
                    {{ ct.labelKh }} ({{ ct.labelEn }})
                  </option>
                </select>
                <UIcon name="i-lucide-chevron-down" class="w-4 h-4 text-dimmed absolute right-2 pointer-events-none" />
              </div>
            </div>

            <div v-if="state.coverageType === 'nssf'">
              <label class="block text-xs font-medium text-dimmed mb-1.5">
                លេខសមាជិក NSSF (NSSF Member No.)
              </label>
              <div class="bg-[#131b2e] border border-slate-700/70 hover:border-slate-600 focus-within:border-sky-500 rounded-lg px-3 py-2.5 flex items-center transition-all">
                <input
                  v-model="state.nssfMemberNumber"
                  type="text"
                  placeholder="1234567890"
                  class="w-full bg-transparent text-white text-sm outline-none placeholder:text-muted"
                >
              </div>
            </div>

            <div v-else-if="state.coverageType === 'hef'">
              <label class="block text-xs font-medium text-dimmed mb-1.5">
                លេខអត្តសញ្ញាណប័ណ្ណ HEF (HEF Beneficiary No.)
              </label>
              <div class="bg-[#131b2e] border border-slate-700/70 hover:border-slate-600 focus-within:border-sky-500 rounded-lg px-3 py-2.5 flex items-center transition-all">
                <input
                  v-model="state.hefBeneficiaryNumber"
                  type="text"
                  placeholder="HEF-0001234"
                  class="w-full bg-transparent text-white text-sm outline-none placeholder:text-muted"
                >
              </div>
            </div>

            <div v-else-if="state.coverageType === 'idpoor'">
              <label class="block text-xs font-medium text-dimmed mb-1.5">
                លេខអត្តសញ្ញាណប័ណ្ណក្រីក្រ (IDPoor No.)
              </label>
              <div class="bg-[#131b2e] border border-slate-700/70 hover:border-slate-600 focus-within:border-sky-500 rounded-lg px-3 py-2.5 flex items-center transition-all">
                <input
                  v-model="state.idPoorNumber"
                  type="text"
                  placeholder="ID-0001234"
                  class="w-full bg-transparent text-white text-sm outline-none placeholder:text-muted"
                >
              </div>
            </div>

            <div v-else-if="state.coverageType === 'private_insurance'">
              <label class="block text-xs font-medium text-dimmed mb-1.5">
                ក្រុមហ៊ុនធានារ៉ាប់រង (Insurer Name)
              </label>
              <div class="bg-[#131b2e] border border-slate-700/70 hover:border-slate-600 focus-within:border-sky-500 rounded-lg px-3 py-2.5 flex items-center transition-all">
                <input
                  v-model="state.insurerName"
                  type="text"
                  placeholder="Forte Insurance"
                  class="w-full bg-transparent text-white text-sm outline-none placeholder:text-muted"
                >
              </div>
            </div>
          </div>

          <!-- Referral Card -->
          <div class="bg-[#0d1420] border border-amber-950/60 rounded-2xl p-4 sm:p-5 space-y-3">
            <div class="flex items-center gap-2 text-amber-300">
              <UIcon name="i-lucide-share-2" class="w-5 h-5 text-amber-400 flex-shrink-0" />
              <span class="font-bold text-sm text-amber-200 tracking-wide font-khmer">
                ការបញ្ជូនអ្នកជំងឺ (Referral)
              </span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label class="block text-xs font-medium text-dimmed mb-1.5">
                  មណ្ឌលបញ្ជូន (Source Facility)
                </label>
                <div class="bg-[#131b2e] border border-slate-700/70 hover:border-slate-600 focus-within:border-amber-500 rounded-lg px-3 py-2.5 flex items-center transition-all">
                  <input
                    v-model="state.referralSourceFacility"
                    type="text"
                    placeholder="មណ្ឌលសុខភាព..."
                    class="w-full bg-transparent text-white text-sm outline-none placeholder:text-muted font-khmer"
                  >
                </div>
              </div>

              <div>
                <label class="block text-xs font-medium text-dimmed mb-1.5">
                  លេខសំបុត្របញ្ជូន (Referral No.)
                </label>
                <div class="bg-[#131b2e] border border-slate-700/70 hover:border-slate-600 focus-within:border-amber-500 rounded-lg px-3 py-2.5 flex items-center transition-all">
                  <input
                    v-model="state.referralNumber"
                    type="text"
                    placeholder="REF-0001"
                    class="w-full bg-transparent text-white text-sm outline-none placeholder:text-muted"
                  >
                </div>
              </div>
            </div>

            <div>
              <label class="block text-xs font-medium text-dimmed mb-1.5">
                កាលបរិច្ឆេទបញ្ជូន (Referral Date)
              </label>
              <div class="bg-[#131b2e] border border-slate-700/70 hover:border-slate-600 focus-within:border-amber-500 rounded-lg px-3 py-2 flex items-center h-[42px] transition-all">
                <input
                  v-model="state.referralDate"
                  type="date"
                  class="w-full bg-transparent text-white text-sm outline-none [color-scheme:dark]"
                >
              </div>
            </div>

            <div>
              <label class="block text-xs font-medium text-dimmed mb-1.5">
                មូលហេតុបញ្ជូន (Referral Reason)
              </label>
              <div class="bg-[#131b2e] border border-slate-700/70 hover:border-slate-600 focus-within:border-amber-500 rounded-lg px-3 py-2.5 flex items-center transition-all">
                <input
                  v-model="state.referralReason"
                  type="text"
                  placeholder="ត្រូវការជំនាញឯកទេស..."
                  class="w-full bg-transparent text-white text-sm outline-none placeholder:text-muted font-khmer"
                >
              </div>
            </div>
          </div>
        </div>

        <!-- Consent Section -->
        <div class="bg-[#0a140f] border border-emerald-950/70 rounded-2xl px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <label class="flex items-center gap-3 cursor-pointer select-none">
            <span
              class="w-5 h-5 rounded-md border flex items-center justify-center transition-all flex-shrink-0"
              :class="state.consentToCare ? 'border-emerald-500 bg-emerald-500/20' : 'border-slate-500 bg-transparent'"
            >
              <UIcon v-if="state.consentToCare" name="i-lucide-check" class="w-3.5 h-3.5 text-emerald-400" />
            </span>
            <input v-model="state.consentToCare" type="checkbox" class="sr-only">
            <span class="text-sm text-emerald-200 font-medium font-khmer">
              អ្នកជំងឺបានយល់ព្រមទទួលការព្យាបាល (Patient consents to care)
            </span>
          </label>
          <span v-if="state.consentToCare && state.consentRecordedAt" class="text-xs text-emerald-400/80 font-khmer">
            កត់ត្រាកាលបរិច្ឆេទ: {{ new Date(state.consentRecordedAt).toLocaleString() }}
          </span>
        </div>

        <!-- Modal Footer Actions -->
        <div class="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
          <!-- Left: Cancel Button -->
          <button
            type="button"
            class="w-full sm:w-auto bg-[#1a2333]/90 hover:bg-slate-800 border border-slate-700/80 text-dimmed hover:text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer font-khmer"
            @click="isOpen = false"
          >
            បោះបង់ (Cancel)
          </button>

          <!-- Right: Save & Print + Save -->
          <div class="w-full sm:w-auto flex items-center justify-end gap-3">
            <button
              type="button"
              :disabled="isSubmitting"
              class="flex-1 sm:flex-none bg-[#1e293b] hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white px-4 sm:px-5 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 font-khmer"
              @click="onSubmit(true)"
            >
              <UIcon name="i-lucide-printer" class="w-4 h-4" />
              <span>រក្សាទុក & បោះពុម្ពប័ណ្ណ</span>
            </button>

            <button
              type="button"
              :disabled="isSubmitting"
              class="flex-1 sm:flex-none bg-[#059669] hover:bg-[#047857] text-white px-5 sm:px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer disabled:opacity-50 font-khmer"
              @click="onSubmit(false)"
            >
              <UIcon v-if="!isSubmitting" name="i-lucide-save" class="w-4 h-4" />
              <UIcon v-else name="i-lucide-loader-2" class="w-4 h-4 animate-spin" />
              <span>រក្សាទុកទិន្នន័យ (Save)</span>
            </button>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #0c1322;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #1e293b;
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #334155;
}
</style>
