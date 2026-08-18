<script setup lang="ts">
import { reactive, watch } from 'vue'

const props = defineProps<{
  permission?: any
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits(['success'])

const { t } = useI18n()
const toast = useToast()

const state = reactive({
  permissionId: 0,
  nameEn: '',
  nameKh: '',
  permissionSlug: '',
  description: ''
})

watch(() => props.permission, (val) => {
  if (val) {
    Object.assign(state, {
      permissionId: val.permissionId || 0,
      nameEn: val.nameEn || '',
      nameKh: val.nameKh || '',
      permissionSlug: val.permissionSlug || '',
      description: val.description || ''
    })
  } else {
    resetState()
  }
}, { immediate: true })

function resetState() {
  Object.assign(state, {
    permissionId: 0,
    nameEn: '',
    nameKh: '',
    permissionSlug: '',
    description: ''
  })
}

async function handleSave() {
  try {
    if (props.permission?._id) {
      await $api(`/permissions/${props.permission._id}`, {
        method: 'PUT',
        body: state
      })
      toast.add({ title: t('common.success'), description: t('messages.updateSuccess'), color: 'success' })
    } else {
      await $api('/permissions', {
        method: 'POST',
        body: state
      })
      toast.add({ title: t('common.success'), description: t('messages.createSuccess'), color: 'success' })
    }
    emit('success')
    open.value = false
  } catch (error: any) {
    toast.add({ title: t('common.error'), description: error.data?.message || t('messages.errorOccurred'), color: 'error' })
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="permission ? 'Edit Permission' : 'Add Permission'">
    <template #body>
      <div class="space-y-4">
        <div class="grid grid-cols-1 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Permission ID
              *</label>
            <UInput
              v-model.number="state.permissionId"
              type="number"
              placeholder="1"
              class="w-full"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{{
              t('common.nameKh') }} *</label>
            <UInput v-model="state.nameKh" placeholder="មើលអ្នកជំងឺ" class="w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{{
              t('common.nameEn') }} *</label>
            <UInput v-model="state.nameEn" placeholder="View Patients" class="w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Slug *</label>
            <UInput v-model="state.permissionSlug" placeholder="view_patients" class="w-full" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{{
              t('common.description') }}</label>
            <UTextarea v-model="state.description" placeholder="Optional description..." class="w-full" />
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
