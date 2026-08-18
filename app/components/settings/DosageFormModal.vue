<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const props = defineProps<{
  dosageForm?: any
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits(['success'])

const { t } = useI18n()
const toast = useToast()

const schema = z.object({
  key: z.string().min(1, 'Key is required'),
  nameEn: z.string().min(1, 'English name is required'),
  nameKh: z.string().min(1, 'Khmer name is required'),
  status: z.string()
})

type Schema = z.output<typeof schema>

const state = reactive({
  key: '',
  nameEn: '',
  nameKh: '',
  status: 'active'
})

watch(() => props.dosageForm, (val) => {
  if (val) {
    state.key = val.key || ''
    state.nameEn = val.nameEn || ''
    state.nameKh = val.nameKh || ''
    state.status = val.status || 'active'
  } else {
    resetState()
  }
}, { immediate: true })

function resetState() {
  state.key = ''
  state.nameEn = ''
  state.nameKh = ''
  state.status = 'active'
}

const isSubmitting = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  isSubmitting.value = true
  try {
    if (props.dosageForm) {
      await $api(`/dosage-forms/${props.dosageForm._id}`, {
        method: 'PUT',
        body: event.data
      })
      toast.add({ title: 'Success', description: 'Dosage Form updated', color: 'success' })
    } else {
      await $api('/dosage-forms', {
        method: 'POST',
        body: event.data
      })
      toast.add({ title: 'Success', description: 'Dosage Form created', color: 'success' })
    }
    emit('success')
    open.value = false
    resetState()
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.data?.message || 'Failed to save dosage form',
      color: 'error'
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="dosageForm ? 'Edit Dosage Form' : 'Add New Dosage Form'">
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Key" name="key" required>
          <UInput v-model="state.key" class="w-full" placeholder="e.g. tablet" />
        </UFormField>

        <UFormField label="Name (EN)" name="nameEn" required>
          <UInput v-model="state.nameEn" class="w-full" placeholder="e.g. Tablet" />
        </UFormField>

        <UFormField label="Name (KH)" name="nameKh" required>
          <UInput v-model="state.nameKh" class="w-full" placeholder="e.g. ថ្នាំគ្រាប់" />
        </UFormField>

        <UFormField label="Status" name="status">
          <USelectMenu
            v-model="state.status"
            :items="[
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' }
            ]"
            value-key="value"
            label-key="label"
            class="w-full"
          />
        </UFormField>

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            @click="open = false"
          />
          <UButton
            type="submit"
            label="Save"
            color="primary"
            :loading="isSubmitting"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
