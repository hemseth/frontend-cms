<script setup lang="ts">
import { ref, watch, reactive, computed } from 'vue'

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
const state = reactive({
  _id: '',
  nameEn: '',
  nameKh: '',
  gender: 'Male',
  dob: '',
  phone: '',
  role: 'Doctor',
  specialization: '',
  active: 1
})

const genderOptions = ['Male', 'Female', 'Other']
const activeOptions = [
  { label: t('staff.active'), value: 1 },
  { label: t('staff.inactive'), value: 0 }
]

watch(() => props.staffMember, (newVal) => {
  if (newVal) {
    isEditMode.value = true
    Object.assign(state, { ...newVal, dob: newVal.dob ? new Date(newVal.dob).toISOString().split('T')[0] : '' })
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
    active: 1
  })
}

async function handleSave() {
  const payload: any = { ...state }

  // Extract ID and remove from body for both create and update
  const staffId = payload._id
  delete payload._id

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
  <UModal v-model:open="open" :title="isEditMode ? t('staff.edit') : t('staff.add')">
    <template #body>
      <div class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-1 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{{
              t('common.nameKh') }}</label>
            <UInput v-model="state.nameKh" class="w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{{
              t('common.nameEn') }} <span class="text-red-500">*</span></label>
            <UInput v-model="state.nameEn" class="w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{{
              t('staff.gender') }}</label>
            <USelect
              v-model="state.gender"
              :options="[
                { label: t('patient.male'), value: 'Male' },
                { label: t('patient.female'), value: 'Female' },
                { label: t('common.other'), value: 'Other' }
              ]"
              class="w-full"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{{
              t('staff.role') }}</label>
            <USelectMenu
              v-model="state.role"
              :items="roleOptions"
              value-key="value"
              label-key="label"
              placeholder="Select role"
              searchable
              class="w-full"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{{
              t('staff.specialization') }}</label>
            <USelectMenu
              v-model="state.specialization"
              :items="specializationOptions"
              value-key="value"
              label-key="label"
              placeholder="Select specialization"
              searchable
              class="w-full"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{{
              t('staff.phone') }}</label>
            <UInput v-model="state.phone" class="w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{{ t('staff.dob')
            }}</label>
            <UInput v-model="state.dob" type="date" class="w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{{
              t('staff.status') }}</label>
            <USelect v-model.number="state.active" :options="activeOptions" class="w-full" />
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            :label="t('common.cancel')"
            color="neutral"
            variant="ghost"
            @click="handleCancel"
          />
          <UButton :label="t('common.save')" color="primary" @click="handleSave" />
        </div>
      </div>
    </template>
  </UModal>
</template>
