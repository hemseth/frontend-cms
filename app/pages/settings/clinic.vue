<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const { t } = useI18n()
const toast = useToast()
const { clinicId, user } = useAuth()

const isLoading = ref(true)
const isSaving = ref(false)

const schema = z.object({
  name: z.string().min(1, 'Clinic name is required'),
  nameKh: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  description: z.string().optional()
})

type Schema = z.output<typeof schema>

const state = reactive({
  name: '',
  nameKh: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  description: ''
})

// Fetch clinic data
const { data: clinicData, refresh } = await useAsyncData('clinic', async () => {
  if (!clinicId.value) return null
  try {
    const res = await $api<{ data: any }>(`/clinics/${clinicId.value}`)
    return res.data
  } catch {
    return null
  }
}, {
  watch: [clinicId],
  immediate: true
})

// Populate form when data loads
watch(clinicData, (val) => {
  if (val) {
    state.name = val.name || ''
    state.nameKh = val.nameKh || ''
    state.address = val.address || ''
    state.phone = val.phone || ''
    state.email = val.email || ''
    state.website = val.website || ''
    state.description = val.description || ''
  }
  isLoading.value = false
}, { immediate: true })

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!clinicId.value) {
    toast.add({ title: 'Error', description: 'No clinic found', color: 'error' })
    return
  }

  isSaving.value = true
  try {
    await $api(`/clinics/${clinicId.value}`, {
      method: 'PUT',
      body: event.data
    })
    toast.add({ title: 'Success', description: 'Clinic information updated', color: 'success' })
    refresh()
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.data?.message || 'Failed to update clinic',
      color: 'error'
    })
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <UBreadcrumb
        :items="[{ label: t('nav.home'), to: '/' }, { label: t('settings.title'), to: '/settings' }, { label: 'Clinic' }]"
      />
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center gap-3">
          <div class="p-2 bg-primary-100 dark:bg-primary-900 rounded-lg">
            <UIcon name="i-lucide-building-2" class="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h2 class="text-xl font-semibold">
              Clinic Information
            </h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Manage your clinic details
            </p>
          </div>
        </div>
      </template>

      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary-500" />
      </div>

      <UForm
        v-else
        :schema="schema"
        :state="state"
        class="space-y-6"
        @submit="onSubmit"
      >
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <UFormField label="Clinic Name (English)" name="name" required>
            <UInput v-model="state.name" placeholder="Enter clinic name" class="w-full" />
          </UFormField>

          <UFormField label="ឈ្មោះគ្លីនិក (Khmer)" name="nameKh">
            <UInput v-model="state.nameKh" placeholder="បញ្ចូលឈ្មោះគ្លីនិក" class="w-full" />
          </UFormField>
        </div>

        <UFormField label="Address" name="address">
          <UTextarea
            v-model="state.address"
            placeholder="Clinic address"
            class="w-full"
            :rows="2"
          />
        </UFormField>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <UFormField label="Phone" name="phone">
            <UInput
              v-model="state.phone"
              placeholder="Phone number"
              type="tel"
              class="w-full"
              icon="i-lucide-phone"
            />
          </UFormField>

          <UFormField label="Email" name="email">
            <UInput
              v-model="state.email"
              placeholder="clinic@example.com"
              type="email"
              class="w-full"
              icon="i-lucide-mail"
            />
          </UFormField>
        </div>

        <UFormField label="Website" name="website">
          <UInput
            v-model="state.website"
            placeholder="https://www.clinic.com"
            type="url"
            class="w-full"
            icon="i-lucide-globe"
          />
        </UFormField>

        <UFormField label="Description" name="description">
          <UTextarea
            v-model="state.description"
            placeholder="Brief description of your clinic"
            class="w-full"
            :rows="3"
          />
        </UFormField>

        <div class="flex justify-end pt-4 border-t">
          <UButton
            type="submit"
            label="Save Changes"
            color="primary"
            :loading="isSaving"
            icon="i-lucide-save"
            size="lg"
          />
        </div>
      </UForm>
    </UCard>

    <!-- Quick Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <UCard>
        <div class="flex items-center gap-4">
          <div class="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <UIcon name="i-lucide-git-branch" class="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p class="text-2xl font-bold">
              {{ clinicData?.branches?.length || '-' }}
            </p>
            <p class="text-sm text-gray-500">
              Branches
            </p>
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center gap-4">
          <div class="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
            <UIcon name="i-lucide-users" class="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p class="text-2xl font-bold">
              -
            </p>
            <p class="text-sm text-gray-500">
              Staff Members
            </p>
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center gap-4">
          <div class="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
            <UIcon name="i-lucide-calendar-check" class="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p class="text-2xl font-bold">
              {{ clinicData?.createdAt ? new
                Date(clinicData.createdAt).toLocaleDateString() : '-' }}
            </p>
            <p class="text-sm text-gray-500">
              Registered
            </p>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
