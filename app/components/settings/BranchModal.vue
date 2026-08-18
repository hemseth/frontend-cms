<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const props = defineProps<{
  branch?: any
  clinicId?: string
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits(['success'])

const { t } = useI18n()
const toast = useToast()

const schema = z.object({
  name: z.string().min(1, 'Branch name is required'),
  nameKh: z.string().optional(),
  code: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  manager: z.string().optional(),
  isMain: z.boolean(),
  isActive: z.boolean()
})

type Schema = z.output<typeof schema>

const state = reactive({
  name: '',
  nameKh: '',
  code: '',
  address: '',
  phone: '',
  email: '',
  manager: '',
  isMain: false,
  isActive: true
})

watch(() => props.branch, (val) => {
  if (val) {
    state.name = val.name || ''
    state.nameKh = val.nameKh || ''
    state.code = val.code || ''
    state.address = val.address || ''
    state.phone = val.phone || ''
    state.email = val.email || ''
    state.manager = val.manager || ''
    state.isMain = val.isMain || false
    state.isActive = val.isActive !== false
  } else {
    resetState()
  }
}, { immediate: true })

function resetState() {
  state.name = ''
  state.nameKh = ''
  state.code = ''
  state.address = ''
  state.phone = ''
  state.email = ''
  state.manager = ''
  state.isMain = false
  state.isActive = true
}

const isSubmitting = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  isSubmitting.value = true
  try {
    const payload = {
      ...event.data,
      clinicId: props.clinicId
    }

    if (props.branch) {
      await $api(`/branches/${props.branch._id}`, {
        method: 'PUT',
        body: payload
      })
      toast.add({ title: 'Success', description: 'Branch updated', color: 'success' })
    } else {
      await $api('/branches', {
        method: 'POST',
        body: payload
      })
      toast.add({ title: 'Success', description: 'Branch created', color: 'success' })
    }
    emit('success')
    open.value = false
    resetState()
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.data?.message || 'Failed to save branch',
      color: 'error'
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="branch ? 'Edit Branch' : 'Add New Branch'">
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Branch Name (EN)" name="name" class="col-span-2 md:col-span-1">
            <UInput v-model="state.name" placeholder="Enter branch name" class="w-full" />
          </UFormField>

          <UFormField label="Branch Name (KH)" name="nameKh" class="col-span-2 md:col-span-1">
            <UInput v-model="state.nameKh" placeholder="ឈ្មោះសាខា" class="w-full" />
          </UFormField>
        </div>

        <UFormField label="Branch Code" name="code">
          <UInput v-model="state.code" placeholder="e.g., BR001 (auto-generated if empty)" class="w-full" />
        </UFormField>

        <UFormField label="Address" name="address">
          <UTextarea
            v-model="state.address"
            placeholder="Branch address"
            class="w-full"
            :rows="2"
          />
        </UFormField>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Phone" name="phone">
            <UInput
              v-model="state.phone"
              placeholder="Phone number"
              type="tel"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Email" name="email">
            <UInput
              v-model="state.email"
              placeholder="branch@clinic.com"
              type="email"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField label="Manager Name" name="manager">
          <UInput v-model="state.manager" placeholder="Branch manager name" class="w-full" />
        </UFormField>

        <div class="flex items-center gap-6 pt-2">
          <UFormField name="isMain" class="flex-none">
            <div class="flex items-center gap-2">
              <UCheckbox v-model="state.isMain" />
              <span class="text-sm">Main Branch (Headquarters)</span>
            </div>
          </UFormField>

          <UFormField name="isActive" class="flex-none">
            <div class="flex items-center gap-2">
              <UCheckbox v-model="state.isActive" />
              <span class="text-sm">Active</span>
            </div>
          </UFormField>
        </div>

        <div class="flex justify-end gap-2 pt-4 border-t">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            @click="open = false"
          />
          <UButton
            type="submit"
            label="Save Branch"
            color="primary"
            :loading="isSubmitting"
            icon="i-lucide-save"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
