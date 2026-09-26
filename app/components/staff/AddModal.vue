<script setup lang="ts">
import { ref, watch, reactive, computed } from 'vue'
import {
  COUNTRIES, QUALIFICATION_LEVELS,
  type StaffExperience, type StaffPosition, type StaffQualification
} from '~/utils/staffProfile'

const { t, locale } = useI18n()
const toast = useToast()

// Define props and model first
const props = defineProps<{
  staffMember?: any
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits(['save'])

const isSubmitting = ref(false)
const activeTab = ref('personal')

// Fetch data at top-level (Nuxt top-level await)
const { data: specsResult } = await useAsyncData('staff-modal-specs', () => $api<{ data: any[] }>('/specializations'))
const { data: positionsResult } = await useAsyncData('staff-modal-positions', () => $api<{ data: any[] }>('/positions'))

// Use refs for options instead of computed to ensure reactivity
const specializationOptions = ref<Array<{ label: string, value: string }>>([])
const roleOptions = ref<Array<{ label: string, value: string }>>([])

// Function to update options
function updateOptions() {
  const specsList = (specsResult.value as any)?.data || []
  specializationOptions.value = specsList.map((s: any) => ({
    label: locale.value === 'km' ? (s.nameKh || s.nameEn) : s.nameEn,
    value: s.nameEn
  }))

  const posList = (positionsResult.value as any)?.data || []
  roleOptions.value = posList.map((p: any) => ({
    label: locale.value === 'km' ? (p.nameKh || p.nameEn) : p.nameEn,
    value: p.nameEn
  }))
}

// Update options immediately and when locale changes
updateOptions()
watch(locale, updateOptions)

const isEditMode = ref(false)
const state = reactive({
  _id: '',
  nameEn: '',
  nameKh: '',
  gender: 'Male',
  dob: '',
  phone: '',
  role: 'Doctor',
  specialization: '',
  active: 1,
  hireDate: '',
  skills: [] as string[],
  qualifications: [] as StaffQualification[],
  experience: [] as StaffExperience[],
  positionHistory: [] as StaffPosition[]
})
// The server keeps the position history when the position changes; it is sent only when
// someone edited it on its tab.
const historyEdited = ref(false)

const genderOptions = computed(() => [
  { label: t('patient.male'), value: 'Male' },
  { label: t('patient.female'), value: 'Female' },
  { label: t('common.other'), value: 'Other' }
])
const activeOptions = computed(() => [
  { label: t('staff.active'), value: 1 },
  { label: t('staff.inactive'), value: 0 }
])
const levelOptions = computed(() => QUALIFICATION_LEVELS.map(value => ({ label: t(`staff.level.${value}`), value })))
/** The country list plus any name typed in earlier, so it shows in the picker. */
const countryOptions = computed(() => {
  const known = COUNTRIES.map(c => ({ label: locale.value === 'km' ? c.km : c.en, value: c.value }))
  const typed = [...state.qualifications, ...state.experience]
    .map(r => r.country)
    .filter((c): c is string => !!c && !COUNTRIES.some(k => k.value === c))
  return [...known, ...[...new Set(typed)].map(c => ({ label: c, value: c }))]
})
const tabs = computed(() => [
  { label: t('staff.tabs.personal'), value: 'personal', slot: 'personal' as const, icon: 'i-lucide-user' },
  { label: t('staff.tabs.education'), value: 'education', slot: 'education' as const, icon: 'i-lucide-graduation-cap' },
  { label: t('staff.tabs.experience'), value: 'experience', slot: 'experience' as const, icon: 'i-lucide-briefcase' },
  { label: t('staff.tabs.history'), value: 'history', slot: 'history' as const, icon: 'i-lucide-history' }
])

function clone<T>(rows: unknown): T[] {
  return Array.isArray(rows) ? rows.map(r => ({ ...(r as object) })) as T[] : []
}

watch(() => props.staffMember, (newVal) => {
  activeTab.value = 'personal'
  historyEdited.value = false
  if (newVal) {
    isEditMode.value = true
    resetState()
    Object.assign(state, {
      ...newVal,
      dob: newVal.dob ? new Date(newVal.dob).toISOString().split('T')[0] : '',
      hireDate: newVal.hireDate || '',
      skills: Array.isArray(newVal.skills) ? [...newVal.skills] : [],
      qualifications: clone<StaffQualification>(newVal.qualifications),
      experience: clone<StaffExperience>(newVal.experience),
      positionHistory: clone<StaffPosition>(newVal.positionHistory)
    })
  } else {
    isEditMode.value = false
    resetState()
  }
}, { immediate: true })

function resetState() {
  Object.assign(state, {
    _id: '',
    nameEn: '',
    nameKh: '',
    gender: 'Male',
    dob: '',
    phone: '',
    role: 'Doctor',
    specialization: '',
    active: 1,
    hireDate: '',
    skills: [],
    qualifications: [],
    experience: [],
    positionHistory: []
  })
}

function addQualification() {
  state.qualifications.push({ level: 'bachelor', title: '', country: 'KH' })
}
function addExperience() {
  state.experience.push({ position: '', organization: '', country: 'KH' })
}
function addPosition() {
  historyEdited.value = true
  state.positionHistory.push({ position: '' })
}
function removeRow(list: unknown[], index: number) {
  list.splice(index, 1)
}

/** Empty strings and blank numbers are left out; a row with nothing filled in is dropped. */
function clean<T extends object>(rows: T[]): Partial<T>[] {
  return rows
    .map((row) => {
      const out: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(row)) {
        if (value === '' || value === null || value === undefined) continue
        if (typeof value === 'string') out[key] = value.trim()
        else out[key] = value
      }
      return out as Partial<T>
    })
    .filter(row => Object.entries(row).some(([key, value]) => !['level', 'country', 'current'].includes(key) && value !== ''))
}

/** First problem in the lists, shown before anything is sent. */
function listProblem(qualifications: Partial<StaffQualification>[], experience: Partial<StaffExperience>[], history: Partial<StaffPosition>[]): { tab: string, message: string } | null {
  const q = qualifications.findIndex(r => !r.title)
  if (q >= 0) return { tab: 'education', message: t('staff.profile.titleRequired', { n: q + 1 }) }
  const badYears = qualifications.findIndex(r => r.startYear && r.endYear && r.endYear < r.startYear)
  if (badYears >= 0) return { tab: 'education', message: t('staff.profile.yearsOrder', { n: badYears + 1 }) }
  const e = experience.findIndex(r => !r.position || !r.organization)
  if (e >= 0) return { tab: 'experience', message: t('staff.profile.jobRequired', { n: e + 1 }) }
  const h = history.findIndex(r => !r.position)
  if (h >= 0) return { tab: 'history', message: t('staff.profile.positionRequired', { n: h + 1 }) }
  return null
}

async function handleSave() {
  const payload: any = { ...state }

  // Extract ID and remove from body for both create and update
  const staffId = payload._id
  delete payload._id
  delete payload.clinicId
  delete payload.branchId
  delete payload.createdAt
  delete payload.__v

  // Extract value from USelectMenu objects
  if (payload.role && typeof payload.role === 'object') {
    payload.role = payload.role.value
  }
  if (payload.specialization && typeof payload.specialization === 'object') {
    payload.specialization = payload.specialization.value
  }

  // Remove empty optional fields
  if (!payload.nameKh) delete payload.nameKh
  if (!payload.phone) delete payload.phone
  if (!payload.specialization) delete payload.specialization
  if (!payload.dob) delete payload.dob
  if (!payload.hireDate) delete payload.hireDate

  payload.skills = state.skills.map(s => s.trim()).filter(Boolean)
  payload.qualifications = clean(state.qualifications).map(r => ({
    ...r,
    ...(r.startYear ? { startYear: Number(r.startYear) } : {}),
    ...(r.endYear ? { endYear: Number(r.endYear) } : {})
  }))
  payload.experience = clean(state.experience).map(r => (r.current ? { ...r, endDate: undefined } : r))
  const history = clean(state.positionHistory)
  if (historyEdited.value) payload.positionHistory = history
  else delete payload.positionHistory

  const problem = listProblem(payload.qualifications, payload.experience, historyEdited.value ? history : [])
  if (problem) {
    activeTab.value = problem.tab
    toast.add({ title: problem.message, color: 'warning' })
    return
  }

  isSubmitting.value = true
  try {
    if (isEditMode.value) {
      await $api(`/staff/${staffId}`, {
        method: 'PUT',
        body: payload
      })
      toast.add({ title: t('common.success'), description: t('messages.updateSuccess'), color: 'success' })
    } else {
      await $api('/staff', {
        method: 'POST',
        body: payload
      })
      toast.add({ title: t('common.success'), description: t('messages.createSuccess'), color: 'success' })
    }
    emit('save')
    open.value = false
  } catch (error: any) {
    toast.add({
      title: t('common.error'),
      description: getApiErrorMessage(error, t('messages.errorOccurred')),
      color: 'error'
    })
  } finally {
    isSubmitting.value = false
  }
}

function handleCancel() {
  open.value = false
}
</script>

<template>
  <UModal v-model:open="open" :title="isEditMode ? t('staff.edit') : t('staff.add')" :ui="{ content: 'sm:max-w-4xl' }">
    <template #body>
      <UTabs v-model="activeTab" :items="tabs" class="w-full">
        <!-- Personal -->
        <template #personal>
          <div class="grid grid-cols-1 gap-4 pt-4 md:grid-cols-2">
            <UFormField :label="t('common.nameKh')">
              <UInput v-model="state.nameKh" class="w-full" />
            </UFormField>
            <UFormField :label="t('common.nameEn')" required>
              <UInput v-model="state.nameEn" class="w-full" />
            </UFormField>
            <UFormField :label="t('staff.gender')">
              <USelect v-model="state.gender" :items="genderOptions" class="w-full" />
            </UFormField>
            <UFormField :label="t('staff.dob')">
              <UInput v-model="state.dob" type="date" class="w-full" />
            </UFormField>
            <UFormField :label="t('staff.role')" :help="isEditMode ? t('staff.profile.roleHelp') : undefined">
              <USelectMenu
                v-model="state.role"
                :items="roleOptions"
                value-key="value"
                label-key="label"
                :placeholder="t('staff.role')"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="t('staff.specialization')">
              <USelectMenu
                v-model="state.specialization"
                :items="specializationOptions"
                value-key="value"
                label-key="label"
                :placeholder="t('staff.specialization')"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="t('staff.phone')">
              <UInput v-model="state.phone" class="w-full" />
            </UFormField>
            <UFormField :label="t('staff.profile.hireDate')">
              <UInput v-model="state.hireDate" type="month" class="w-full" />
            </UFormField>
            <UFormField :label="t('staff.status')">
              <USelect v-model="state.active" :items="activeOptions" class="w-full" />
            </UFormField>
            <UFormField :label="t('staff.profile.skills')" :help="t('staff.profile.skillsHelp')" class="md:col-span-2">
              <UInputTags v-model="state.skills" :placeholder="t('staff.profile.skillsPlaceholder')" class="w-full" />
            </UFormField>
          </div>
        </template>

        <!-- Education and training -->
        <template #education>
          <div class="space-y-3 pt-4">
            <p class="text-sm text-muted">
              {{ t('staff.profile.educationHelp') }}
            </p>
            <div
              v-for="(row, i) in state.qualifications"
              :key="i"
              class="grid grid-cols-1 gap-3 rounded-lg border border-default p-3 md:grid-cols-6"
            >
              <UFormField :label="t('staff.profile.level')" class="md:col-span-2">
                <USelect v-model="row.level" :items="levelOptions" class="w-full" />
              </UFormField>
              <UFormField :label="t('staff.profile.qualificationTitle')" required class="md:col-span-4">
                <UInput v-model="row.title" :placeholder="t('staff.profile.qualificationTitlePlaceholder')" class="w-full" />
              </UFormField>
              <UFormField :label="t('staff.profile.field')" class="md:col-span-3">
                <UInput v-model="row.field" :placeholder="t('staff.profile.fieldPlaceholder')" class="w-full" />
              </UFormField>
              <UFormField :label="t('staff.profile.institution')" class="md:col-span-3">
                <UInput v-model="row.institution" :placeholder="t('staff.profile.institutionPlaceholder')" class="w-full" />
              </UFormField>
              <UFormField :label="t('staff.profile.country')" class="md:col-span-2">
                <USelectMenu
                  v-model="row.country"
                  :items="countryOptions"
                  value-key="value"
                  create-item
                  class="w-full"
                  @create="(name: string) => { row.country = name.trim() }"
                />
              </UFormField>
              <UFormField :label="t('staff.profile.startYear')" class="md:col-span-1">
                <UInput
                  v-model.number="row.startYear"
                  type="number"
                  min="1950"
                  max="2100"
                  class="w-full"
                />
              </UFormField>
              <UFormField :label="t('staff.profile.endYear')" class="md:col-span-1">
                <UInput
                  v-model.number="row.endYear"
                  type="number"
                  min="1950"
                  max="2100"
                  class="w-full"
                />
              </UFormField>
              <div class="flex items-end justify-end md:col-span-2">
                <UButton
                  icon="i-lucide-trash-2"
                  color="error"
                  variant="ghost"
                  :label="t('common.delete')"
                  @click="removeRow(state.qualifications, i)"
                />
              </div>
            </div>
            <UButton
              icon="i-lucide-plus"
              variant="soft"
              :label="t('staff.profile.addQualification')"
              @click="addQualification"
            />
          </div>
        </template>

        <!-- Work experience (other workplaces) -->
        <template #experience>
          <div class="space-y-3 pt-4">
            <p class="text-sm text-muted">
              {{ t('staff.profile.experienceHelp') }}
            </p>
            <div
              v-for="(row, i) in state.experience"
              :key="i"
              class="grid grid-cols-1 gap-3 rounded-lg border border-default p-3 md:grid-cols-6"
            >
              <UFormField :label="t('staff.profile.position')" required class="md:col-span-3">
                <UInput v-model="row.position" :placeholder="t('staff.profile.positionPlaceholder')" class="w-full" />
              </UFormField>
              <UFormField :label="t('staff.profile.organization')" required class="md:col-span-3">
                <UInput v-model="row.organization" :placeholder="t('staff.profile.organizationPlaceholder')" class="w-full" />
              </UFormField>
              <UFormField :label="t('staff.profile.country')" class="md:col-span-2">
                <USelectMenu
                  v-model="row.country"
                  :items="countryOptions"
                  value-key="value"
                  create-item
                  class="w-full"
                  @create="(name: string) => { row.country = name.trim() }"
                />
              </UFormField>
              <UFormField :label="t('staff.profile.from')" class="md:col-span-2">
                <UInput v-model="row.startDate" type="month" class="w-full" />
              </UFormField>
              <UFormField :label="t('staff.profile.to')" class="md:col-span-2">
                <UInput
                  v-model="row.endDate"
                  type="month"
                  :disabled="row.current"
                  class="w-full"
                />
                <UCheckbox v-model="row.current" :label="t('staff.profile.current')" class="mt-2" />
              </UFormField>
              <UFormField :label="t('staff.profile.duties')" class="md:col-span-6">
                <UTextarea
                  v-model="row.duties"
                  :rows="2"
                  autoresize
                  :placeholder="t('staff.profile.dutiesPlaceholder')"
                  class="w-full"
                />
              </UFormField>
              <div class="flex justify-end md:col-span-6">
                <UButton
                  icon="i-lucide-trash-2"
                  color="error"
                  variant="ghost"
                  :label="t('common.delete')"
                  @click="removeRow(state.experience, i)"
                />
              </div>
            </div>
            <UButton
              icon="i-lucide-plus"
              variant="soft"
              :label="t('staff.profile.addExperience')"
              @click="addExperience"
            />
          </div>
        </template>

        <!-- Positions held at this clinic -->
        <template #history>
          <div class="space-y-3 pt-4">
            <p class="text-sm text-muted">
              {{ t('staff.profile.historyHelp') }}
            </p>
            <div
              v-for="(row, i) in state.positionHistory"
              :key="i"
              class="grid grid-cols-1 gap-3 rounded-lg border border-default p-3 md:grid-cols-6"
              @input="historyEdited = true"
            >
              <UFormField :label="t('staff.profile.position')" required class="md:col-span-3">
                <UInput v-model="row.position" class="w-full" />
              </UFormField>
              <UFormField :label="t('staff.profile.department')" class="md:col-span-3">
                <UInput v-model="row.department" class="w-full" />
              </UFormField>
              <UFormField :label="t('staff.profile.from')" class="md:col-span-2">
                <UInput v-model="row.startDate" type="month" class="w-full" />
              </UFormField>
              <UFormField :label="t('staff.profile.to')" :help="row.endDate ? undefined : t('staff.profile.currentPosition')" class="md:col-span-2">
                <UInput v-model="row.endDate" type="month" class="w-full" />
              </UFormField>
              <UFormField :label="t('staff.profile.note')" class="md:col-span-2">
                <UInput v-model="row.note" class="w-full" />
              </UFormField>
              <div class="flex justify-end md:col-span-6">
                <UButton
                  icon="i-lucide-trash-2"
                  color="error"
                  variant="ghost"
                  :label="t('common.delete')"
                  @click="historyEdited = true; removeRow(state.positionHistory, i)"
                />
              </div>
            </div>
            <UButton
              icon="i-lucide-plus"
              variant="soft"
              :label="t('staff.profile.addPosition')"
              @click="addPosition"
            />
          </div>
        </template>
      </UTabs>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          :label="t('common.cancel')"
          color="neutral"
          variant="ghost"
          @click="handleCancel"
        />
        <UButton
          :label="t('common.save')"
          color="primary"
          :loading="isSubmitting"
          @click="handleSave"
        />
      </div>
    </template>
  </UModal>
</template>
