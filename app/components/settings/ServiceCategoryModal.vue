<script setup lang="ts">
import { ref, watch } from 'vue'
import { z } from 'zod'

const props = defineProps<{
  open: boolean
  category?: any
}>()

const emit = defineEmits(['update:open', 'success'])

const { t } = useI18n()
const toast = useToast()
const isLoading = ref(false)

const schema = z.object({
  nameEn: z.string().min(1, 'Name (EN) is required'),
  nameKh: z.string().min(1, 'Name (KH) is required'),
  group: z.enum(['laboratory', 'imaging', 'consultation', 'nursing', 'other']).default('laboratory'),
  type: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active')
})

const state = ref({
  nameEn: '',
  nameKh: '',
  group: 'laboratory' as 'laboratory' | 'imaging' | 'consultation' | 'nursing' | 'other',
  type: '',
  description: '',
  status: 'active' as 'active' | 'inactive'
})

watch(() => props.category, (newVal) => {
  if (newVal) {
    state.value = {
      nameEn: newVal.nameEn,
      nameKh: newVal.nameKh,
      group: newVal.group || 'laboratory',
      type: newVal.type || '',
      description: newVal.description || '',
      status: newVal.status || 'active'
    }
  } else {
    state.value = {
      nameEn: '',
      nameKh: '',
      group: 'laboratory',
      type: '',
      description: '',
      status: 'active'
    }
  }
}, { immediate: true })

async function onSubmit() {
  isLoading.value = true
  try {
    if (props.category?._id) {
      await $api(`/service-categories/${props.category._id}`, {
        method: 'PUT',
        body: state.value
      })
      toast.add({ title: 'Success', description: 'Category updated', color: 'success' })
    } else {
      await $api('/service-categories', {
        method: 'POST',
        body: state.value
      })
      toast.add({ title: 'Success', description: 'Category created', color: 'success' })
    }
    emit('success')
    emit('update:open', false)
  } catch (error: any) {
    toast.add({ title: 'Error', description: error.data?.message || 'Something went wrong', color: 'error' })
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <UModal
    :open="open"
    :title="category ? 'Edit Category' : 'Add Category'"
    @update:open="$emit('update:open', $event)"
  >
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Name (EN)" name="nameEn">
          <UInput v-model="state.nameEn" placeholder="e.g. Laboratory" class="w-full" />
        </UFormField>

        <UFormField label="Name (KH)" name="nameKh">
          <UInput v-model="state.nameKh" placeholder="e.g. ពិសោធន៍" class="w-full" />
        </UFormField>

        <UFormField label="Group" name="group">
          <USelect
            v-model="state.group"
            :items="['laboratory', 'imaging', 'consultation', 'nursing', 'other']"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Type" name="type">
          <UInput v-model="state.type" placeholder="e.g. hematology, chemistry" class="w-full" />
        </UFormField>

        <UFormField label="Description" name="description">
          <UTextarea v-model="state.description" placeholder="Optional details..." class="w-full" />
        </UFormField>

        <UFormField label="Status" name="status">
          <USelect v-model="state.status" :items="['active', 'inactive']" class="w-full" />
        </UFormField>

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            @click="$emit('update:open', false)"
          />
          <UButton type="submit" :label="category ? 'Update' : 'Create'" :loading="isLoading" />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
