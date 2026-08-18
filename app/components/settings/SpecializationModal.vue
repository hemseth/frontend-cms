<script setup lang="ts">
import { reactive, watch } from 'vue'

type SpecializationStatus = 'active' | 'inactive'

interface SpecializationModalData {
  _id?: string
  nameEn?: string
  nameKh?: string
  description?: string
  status?: string
}

const props = defineProps<{
  specialization?: SpecializationModalData | null
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits(['success'])

const { t } = useI18n()
const toast = useToast()

const state = reactive({
  nameEn: '',
  nameKh: '',
  description: '',
  status: 'active' as SpecializationStatus
})

watch(() => props.specialization, (val) => {
  if (val) {
    Object.assign(state, {
      nameEn: val.nameEn || '',
      nameKh: val.nameKh || '',
      description: val.description || '',
      status: (val.status === 'inactive' ? 'inactive' : 'active')
    })
  } else {
    resetState()
  }
}, { immediate: true })

function resetState() {
  Object.assign(state, {
    nameEn: '',
    nameKh: '',
    description: '',
    status: 'active' as SpecializationStatus
  })
}

async function handleSave() {
  try {
    if (props.specialization?._id) {
      await $api(`/specializations/${props.specialization._id}`, {
        method: 'PUT',
        body: state
      })
      toast.add({ title: t('common.success'), description: t('messages.updateSuccess'), color: 'success' })
    } else {
      await $api('/specializations', {
        method: 'POST',
        body: state
      })
      toast.add({ title: t('common.success'), description: t('messages.createSuccess'), color: 'success' })
    }
    emit('success')
    open.value = false
  } catch (error: unknown) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(error, t('messages.errorOccurred')), color: 'error' })
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="specialization ? t('specialization.edit') : t('specialization.add')">
    <template #body>
      <div class="space-y-4">
        <div class="grid grid-cols-1 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{{
              t('specialization.nameKh') }} *</label>
            <UInput v-model="state.nameKh" :placeholder="t('diagnosis.nameKhPlaceholder')" class="w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{{
              t('specialization.nameEn') }} *</label>
            <UInput v-model="state.nameEn" :placeholder="t('diagnosis.nameEnPlaceholder')" class="w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{{
              t('specialization.description') }}</label>
            <UTextarea v-model="state.description" :placeholder="t('common.optional')" class="w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{{
              t('specialization.status') }}</label>
            <USelect v-model="state.status" :options="['active', 'inactive']" class="w-full" />
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            :label="t('common.cancel')"
            color="neutral"
            variant="ghost"
            @click="open = false"
          />
          <UButton :label="t('common.save')" color="primary" @click="handleSave" />
        </div>
      </div>
    </template>
  </UModal>
</template>
