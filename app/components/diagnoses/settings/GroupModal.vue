<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { ClinicDiagnosisGroup } from '~/types/diagnosis'

const { t } = useI18n()

const props = defineProps<{
  group?: ClinicDiagnosisGroup | null
  loading?: boolean
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ (e: 'save', payload: Record<string, any>): void }>()

const isEditing = computed(() => !!props.group)

const form = ref<Record<string, any>>({
  code: '',
  nameKh: '',
  nameEn: '',
  description: '',
  sortOrder: 0
})

watch(() => props.group, (newVal) => {
  if (newVal) {
    form.value = {
      code: newVal.code,
      nameKh: newVal.nameKh || '',
      nameEn: newVal.nameEn || '',
      description: newVal.description || '',
      sortOrder: newVal.sortOrder ?? 0
    }
  } else {
    form.value = { code: '', nameKh: '', nameEn: '', description: '', sortOrder: 0 }
  }
}, { immediate: true })

function handleSubmit() {
  if (!form.value.code && !isEditing.value) return
  const payload: Record<string, any> = {
    ...form.value,
    sortOrder: Number(form.value.sortOrder) || 0,
    description: form.value.description || null
  }
  if (!payload.code) delete payload.code
  emit('save', payload)
}
</script>

<template>
  <UModal v-model:open="open" :title="isEditing ? t('diagnosisSettings.editGroup') : t('diagnosisSettings.createGroup')">
    <template #body>
      <div class="flex flex-col gap-4">
        <UFormField
          v-if="!isEditing"
          :label="t('diagnosisSettings.groupCode')"
          required
          class="w-full"
        >
          <UInput v-model="form.code" placeholder="e.g. OPD_COMMON" class="w-full" />
        </UFormField>
        <UFormField :label="t('diagnosisSettings.groupNameKh')" class="w-full">
          <UInput v-model="form.nameKh" class="w-full" />
        </UFormField>
        <UFormField :label="t('diagnosisSettings.groupNameEn')" class="w-full">
          <UInput v-model="form.nameEn" class="w-full" />
        </UFormField>
        <UFormField :label="t('diagnosisSettings.groupDescription')" class="w-full">
          <UTextarea v-model="form.description" class="w-full" />
        </UFormField>
        <UFormField :label="t('diagnosisSettings.sortOrder')" class="w-full">
          <UInput v-model="form.sortOrder" type="number" class="w-full" />
        </UFormField>
      </div>

      <div class="flex justify-end gap-2 mt-6">
        <UButton
          :label="t('diagnosisSettings.cancel')"
          color="neutral"
          variant="ghost"
          @click="open = false"
        />
        <UButton
          :label="isEditing ? t('common.update') : t('diagnosisSettings.save')"
          color="primary"
          :loading="loading"
          @click="handleSubmit"
        />
      </div>
    </template>
  </UModal>
</template>
