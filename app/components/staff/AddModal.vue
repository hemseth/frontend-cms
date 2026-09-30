<script setup lang="ts">
import { ref, watch, reactive, computed } from 'vue'
import type { Ref } from 'vue'

const { t, locale } = useI18n()
const toast = useToast()

// Define props and model first
const props = defineProps<{
  staffMember?: any
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits(['save'])

const isSubmitting = ref(false)

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

const emptyState = () => ({
  _id: '',
  nameEn: '',
  nameKh: '',
  gender: '1',
  dob: '',
  phone: '',
  email: '',
  telegram: '',
  whatApp: '',
  proBirth: '',
  disBirth: '',
  comBirth: '',
  vilBirth: '',
  proCode: '',
  disCode: '',
  comCode: '',
  vilCode: '',
  houseNum: '',
  groupNum: '',
  streetNum: '',
  role: 'Doctor',
  specialization: '',
  active: 1
})

const state = reactive<Record<string, any>>(emptyState())

const genderOptions = [
  { label: t('patient.male'), value: '1' },
  { label: t('patient.female'), value: '2' }
]
const activeOptions = [
  { label: t('staff.active'), value: 1 },
  { label: t('staff.inactive'), value: 0 }
]

// ---- steps ----------------------------------------------------------------
const step = ref(0)
const steps = computed(() => [
  { title: t('staff.stepPersonal'), icon: 'i-lucide-user' },
  { title: t('staff.stepContact'), icon: 'i-lucide-phone' },
  { title: t('staff.stepBirthPlace'), icon: 'i-lucide-map-pin' },
  { title: t('staff.stepAddress'), icon: 'i-lucide-home' },
  { title: t('staff.stepEmployment'), icon: 'i-lucide-briefcase' }
])
const isFirstStep = computed(() => step.value === 0)
const isLastStep = computed(() => step.value === steps.value.length - 1)

// ---- location lookups -----------------------------------------------------
// Two independent cascades share the province list: one for place of birth,
// one for the current address. Selecting a level clears the levels below it so
// a stale district can never be submitted against a new province.
const provinces = ref<any[]>([])

async function fetchInto(target: Ref<any[]>, path: string, code?: string) {
  if (!code) {
    target.value = []
    return
  }
  try {
    const res: any = await $api(`${path}${code}`)
    target.value = res.data || []
  } catch {
    target.value = []
  }
}

function makeCascade(proKey: string, disKey: string, comKey: string, vilKey: string) {
  const districts = ref<any[]>([])
  const communes = ref<any[]>([])
  const villages = ref<any[]>([])

  return {
    districts,
    communes,
    villages,
    async onProvince(code?: string) {
      state[disKey] = ''
      state[comKey] = ''
      state[vilKey] = ''
      communes.value = []
      villages.value = []
      await fetchInto(districts, '/locations/districts/byProCode/', code ?? state[proKey])
    },
    async onDistrict(code?: string) {
      state[comKey] = ''
      state[vilKey] = ''
      villages.value = []
      await fetchInto(communes, '/locations/communes/byDisCode/', code ?? state[disKey])
    },
    async onCommune(code?: string) {
      state[vilKey] = ''
      await fetchInto(villages, '/locations/villages/byComCode/', code ?? state[comKey])
    },
    // Edit mode: refill the lower levels without wiping the stored selection.
    async hydrate() {
      await Promise.all([
        fetchInto(districts, '/locations/districts/byProCode/', state[proKey]),
        fetchInto(communes, '/locations/communes/byDisCode/', state[disKey]),
        fetchInto(villages, '/locations/villages/byComCode/', state[comKey])
      ])
    }
  }
}

const birth = makeCascade('proBirth', 'disBirth', 'comBirth', 'vilBirth')
const addr = makeCascade('proCode', 'disCode', 'comCode', 'vilCode')

async function fetchProvinces() {
  try {
    const res: any = await $api('/locations/provinces')
    provinces.value = res.data || []
  } catch {
    provinces.value = []
  }
}

// Province/district/commune/village rows carry both names, so the picker
// follows the active language instead of always showing Khmer.
const locationLabelKey = computed(() => (locale.value === 'km' ? 'nameKh' : 'nameEn'))

watch(() => props.staffMember, (newVal) => {
  if (newVal) {
    isEditMode.value = true
    Object.assign(state, emptyState(), {
      ...newVal,
      dob: newVal.dob ? new Date(newVal.dob).toISOString().split('T')[0] : ''
    })
  } else {
    isEditMode.value = false
    resetState()
  }
}, { immediate: true })

watch(open, async (isOpen) => {
  if (!isOpen) return
  step.value = 0
  if (!provinces.value.length) await fetchProvinces()
  if (isEditMode.value) await Promise.all([birth.hydrate(), addr.hydrate()])
})

function resetState() {
  Object.assign(state, emptyState())
  birth.districts.value = []
  birth.communes.value = []
  birth.villages.value = []
  addr.districts.value = []
  addr.communes.value = []
  addr.villages.value = []
}

async function handleSave() {
  if (!state.nameEn) {
    toast.add({ title: t('common.error'), description: t('staff.nameRequired'), color: 'error' })
    step.value = 0
    return
  }

  const staffId = state._id

  // Built by picking rather than deleting: _id is never sent, and a blank
  // optional field is left out instead of posted as an empty string. Values of
  // 0 must survive, so only '' / null / undefined are skipped.
  const payload: Record<string, any> = {}
  for (const [key, value] of Object.entries(state)) {
    if (key === '_id' || value === '' || value === null || value === undefined) continue
    payload[key] = value
  }

  // Extract value from USelectMenu objects
  if (payload.role && typeof payload.role === 'object') {
    payload.role = payload.role.value
  }
  if (payload.specialization && typeof payload.specialization === 'object') {
    payload.specialization = payload.specialization.value
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
      description: error.data?.message || t('messages.errorOccurred'),
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
  <UModal v-model:open="open" :title="isEditMode ? t('staff.edit') : t('staff.add')" :ui="{ content: 'sm:max-w-2xl' }">
    <template #body>
      <div class="space-y-6">
        <!-- Min width plus horizontal scroll: squeezed into a narrow modal the
             five step titles otherwise run into each other. -->
        <div class="overflow-x-auto pb-1">
          <UStepper
            v-model="step"
            :items="steps"
            class="min-w-lg"
            disabled
          />
        </div>

        <!-- 1. Personal -->
        <div v-if="step === 0" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField :label="t('common.nameKh')">
            <UInput v-model="state.nameKh" class="w-full" />
          </UFormField>
          <UFormField :label="t('common.nameEn')" required>
            <UInput v-model="state.nameEn" class="w-full" />
          </UFormField>
          <UFormField :label="t('staff.gender')">
            <USelect
              v-model="state.gender"
              :items="genderOptions"
              value-key="value"
              label-key="label"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('staff.dob')">
            <UInput v-model="state.dob" type="date" class="w-full" />
          </UFormField>
        </div>

        <!-- 2. Contact -->
        <div v-else-if="step === 1" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField :label="t('staff.phone')">
            <UInput v-model="state.phone" class="w-full" />
          </UFormField>
          <UFormField :label="t('staff.email')">
            <UInput v-model="state.email" type="email" class="w-full" />
          </UFormField>
          <UFormField :label="t('staff.telegram')">
            <UInput v-model="state.telegram" class="w-full" />
          </UFormField>
          <UFormField :label="t('staff.whatApp')">
            <UInput v-model="state.whatApp" class="w-full" />
          </UFormField>
        </div>

        <!-- 3. Place of birth -->
        <div v-else-if="step === 2" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField :label="t('patient.province')">
            <USelectMenu
              v-model="state.proBirth"
              :items="provinces"
              value-key="proCode"
              :label-key="locationLabelKey"
              class="w-full"
              :placeholder="t('common.select')"
              @update:model-value="birth.onProvince()"
            />
          </UFormField>
          <UFormField :label="t('patient.district')">
            <USelectMenu
              v-model="state.disBirth"
              :items="birth.districts.value"
              value-key="disCode"
              :label-key="locationLabelKey"
              class="w-full"
              :placeholder="t('common.select')"
              :disabled="!birth.districts.value.length"
              @update:model-value="birth.onDistrict()"
            />
          </UFormField>
          <UFormField :label="t('patient.commune')">
            <USelectMenu
              v-model="state.comBirth"
              :items="birth.communes.value"
              value-key="comCode"
              :label-key="locationLabelKey"
              class="w-full"
              :placeholder="t('common.select')"
              :disabled="!birth.communes.value.length"
              @update:model-value="birth.onCommune()"
            />
          </UFormField>
          <UFormField :label="t('patient.village')">
            <USelectMenu
              v-model="state.vilBirth"
              :items="birth.villages.value"
              value-key="vilCode"
              :label-key="locationLabelKey"
              class="w-full"
              :placeholder="t('common.select')"
              :disabled="!birth.villages.value.length"
            />
          </UFormField>
        </div>

        <!-- 4. Current address -->
        <div v-else-if="step === 3" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UFormField :label="t('patient.province')">
              <USelectMenu
                v-model="state.proCode"
                :items="provinces"
                value-key="proCode"
                :label-key="locationLabelKey"
                class="w-full"
                :placeholder="t('common.select')"
                @update:model-value="addr.onProvince()"
              />
            </UFormField>
            <UFormField :label="t('patient.district')">
              <USelectMenu
                v-model="state.disCode"
                :items="addr.districts.value"
                value-key="disCode"
                :label-key="locationLabelKey"
                class="w-full"
                :placeholder="t('common.select')"
                :disabled="!addr.districts.value.length"
                @update:model-value="addr.onDistrict()"
              />
            </UFormField>
            <UFormField :label="t('patient.commune')">
              <USelectMenu
                v-model="state.comCode"
                :items="addr.communes.value"
                value-key="comCode"
                :label-key="locationLabelKey"
                class="w-full"
                :placeholder="t('common.select')"
                :disabled="!addr.communes.value.length"
                @update:model-value="addr.onCommune()"
              />
            </UFormField>
            <UFormField :label="t('patient.village')">
              <USelectMenu
                v-model="state.vilCode"
                :items="addr.villages.value"
                value-key="vilCode"
                :label-key="locationLabelKey"
                class="w-full"
                :placeholder="t('common.select')"
                :disabled="!addr.villages.value.length"
              />
            </UFormField>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <UFormField :label="t('staff.houseNum')">
              <UInput v-model="state.houseNum" class="w-full" />
            </UFormField>
            <UFormField :label="t('staff.groupNum')">
              <UInput v-model="state.groupNum" class="w-full" />
            </UFormField>
            <UFormField :label="t('staff.streetNum')">
              <UInput v-model="state.streetNum" class="w-full" />
            </UFormField>
          </div>
        </div>

        <!-- 5. Employment -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UFormField :label="t('staff.role')">
            <USelectMenu
              v-model="state.role"
              :items="roleOptions"
              value-key="value"
              label-key="label"
              :placeholder="t('common.select')"
              searchable
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('staff.specialization')">
            <USelectMenu
              v-model="state.specialization"
              :items="specializationOptions"
              value-key="value"
              label-key="label"
              :placeholder="t('common.select')"
              searchable
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('staff.status')">
            <USelect
              v-model.number="state.active"
              :items="activeOptions"
              value-key="value"
              label-key="label"
              class="w-full"
            />
          </UFormField>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-between w-full gap-2">
        <UButton
          :label="t('common.cancel')"
          color="neutral"
          variant="ghost"
          @click="handleCancel"
        />
        <div class="flex items-center gap-2">
          <!-- Arrows only: the step strip above already names where you are,
               so the labels were repeating it. aria-label keeps them readable
               to a screen reader. -->
          <UButton
            v-if="!isFirstStep"
            icon="i-lucide-chevron-left"
            color="neutral"
            variant="subtle"
            :aria-label="t('common.back')"
            :title="t('common.back')"
            @click="step--"
          />
          <UButton
            v-if="!isLastStep"
            icon="i-lucide-chevron-right"
            color="primary"
            :aria-label="t('common.next')"
            :title="t('common.next')"
            @click="step++"
          />
          <UButton
            v-else
            :label="t('common.save')"
            color="primary"
            :loading="isSubmitting"
            @click="handleSave"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>
