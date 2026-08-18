<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const props = defineProps<{
  unit?: any
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits(['success'])

const { t } = useI18n()
const toast = useToast()

const schema = z.object({
  nameEn: z.string().min(1, 'English name is required'),
  nameKh: z.string().min(1, 'Khmer name is required'),
  description: z.string().optional(),
  status: z.string()
})

type Schema = z.output<typeof schema>

const state = reactive({
  nameEn: '',
  nameKh: '',
  description: '',
  status: 'active'
})

watch(() => props.unit, (val) => {
  if (val) {
    state.nameEn = val.nameEn || ''
    state.nameKh = val.nameKh || ''
    state.description = val.description || ''
    state.status = val.status || 'active'
  } else {
    resetState()
  }
}, { immediate: true })

function resetState() {
  state.nameEn = ''
  state.nameKh = ''
  state.description = ''
  state.status = 'active'
}

const isSubmitting = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  isSubmitting.value = true
  try {
    if (props.unit) {
      await $api(`/units/${props.unit._id}`, {
        method: 'PUT',
        body: event.data
      })
      toast.add({ title: 'Success', description: 'Unit updated', color: 'success' })
    } else {
      await $api('/units', {
        method: 'POST',
        body: event.data
      })
      toast.add({ title: 'Success', description: 'Unit created', color: 'success' })
    }
    emit('success')
    open.value = false
    resetState()
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.data?.message || 'Failed to save unit',
      color: 'error'
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="unit ? 'Edit Unit' : 'Add New Unit'">
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Name (EN)" name="nameEn">
          <UInput v-model="state.nameEn" class="w-full" />
        </UFormField>

        <UFormField label="Name (KH)" name="nameKh">
          <UInput v-model="state.nameKh" class="w-full" />
        </UFormField>

        <UFormField label="Description" name="description">
          <UTextarea v-model="state.description" class="w-full" />
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
