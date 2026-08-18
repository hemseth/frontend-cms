<template>
  <UModal v-model:open="open" :title="isEditing ? t('diagnosis.edit') : t('diagnosis.add')">
    <template #body>
      <div class="flex flex-col gap-4">
        <UFormField :label="t('diagnosis.nameEn')" required class="w-full">
          <UInput v-model="form.nameEn" :placeholder="t('diagnosis.nameEnPlaceholder')" class="w-full" />
        </UFormField>

        <UFormField :label="t('diagnosis.nameKh')" class="w-full">
          <UInput v-model="form.nameKh" :placeholder="t('diagnosis.nameKhPlaceholder')" class="w-full" />
        </UFormField>

        <UFormField :label="t('diagnosis.code')" class="w-full">
          <UInput v-model="form.code" :placeholder="t('diagnosis.codePlaceholder')" class="w-full" />
        </UFormField>

        <UFormField :label="t('diagnosis.description')" class="w-full">
          <UTextarea v-model="form.description" class="w-full" />
        </UFormField>

        <div class="flex items-center gap-2 mt-2">
          <UCheckbox v-model="isActiveBool" :label="t('diagnosis.active')" />
        </div>
      </div>

      <div class="flex justify-end gap-2 mt-6">
        <UButton
          :label="t('common.cancel')"
          color="neutral"
          variant="ghost"
          @click="open = false"
        />
        <UButton
          :label="isEditing ? t('common.update') : t('common.save')"
          color="primary"
          :loading="loading"
          @click="handleSubmit"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { Diagnosis } from '~/composables/useDiagnosis'

const { t } = useI18n()

const props = defineProps<{
  diagnosis?: Diagnosis | null
  loading?: boolean
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits(['save'])

const isEditing = computed(() => !!props.diagnosis)

const form = ref<Diagnosis>({
  nameEn: '',
  nameKh: '',
  code: '',
  description: '',
  active: 1
})

const isActiveBool = computed({
  get: () => form.value.active === 1,
  set: (val: boolean) => { form.value.active = val ? 1 : 0 }
})

watch(() => props.diagnosis, (newVal) => {
  if (newVal) {
    form.value = { ...newVal }
    if (typeof form.value.active === 'undefined') form.value.active = 1
  } else {
    form.value = {
      nameEn: '',
      nameKh: '',
      code: '',
      description: '',
      active: 1
    }
  }
}, { immediate: true })

watch(open, (val) => {
  console.log('AddModal open changed:', val)
})

function handleSubmit() {
  if (!form.value.nameEn) return
  emit('save', form.value)
}
</script>
