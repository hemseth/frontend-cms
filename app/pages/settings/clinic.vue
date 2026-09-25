<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const { t } = useI18n()
const toast = useToast()
const { clinicId, user, setUser, fetchUser } = useAuth()

const isLoading = ref(true)
const isSaving = ref(false)

const schema = z.object({
  name: z.string().min(1, 'Clinic name is required'),
  nameKh: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  description: z.string().optional(),
  logo: z.string().max(500).optional(),
  headerLines: z.array(z.string().max(100)).optional(),
  footerNote: z.string().max(200).optional(),
  pharmacyWorkflow: z.enum(['DIRECT', 'PHARMACY_COUNTER']).optional()
})

type Schema = z.output<typeof schema>

const state = reactive({
  name: '',
  nameKh: '',
  address: '',
  phone: '',
  email: '',
  website: '',
  description: '',
  logo: '',
  headerLines: ['', '', '', ''] as string[],
  footerNote: '',
  // How medicine leaves stock; see docs/PHARMACY.md in the backend repository.
  pharmacyWorkflow: 'DIRECT' as 'DIRECT' | 'PHARMACY_COUNTER'
})

const pharmacyWorkflowOptions = computed(() => [
  { label: t('pharmacy.workflow.DIRECT'), value: 'DIRECT' },
  { label: t('pharmacy.workflow.PHARMACY_COUNTER'), value: 'PHARMACY_COUNTER' }
])

const config = useRuntimeConfig()
const logoUrl = computed(() => resolveAssetUrl(state.logo, String(config.public.apiBase)))
const isUploadingLogo = ref(false)

async function onLogoSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  isUploadingLogo.value = true
  try {
    const body = new FormData()
    body.append('file', file)
    const res = await $api<{ data: { url: string } }>('/uploads', { method: 'POST', body })
    state.logo = res.data.url
  } catch (error) {
    toast.add({ title: 'Error', description: getApiErrorMessage(error, 'Failed to upload logo'), color: 'error' })
  } finally {
    isUploadingLogo.value = false
    input.value = ''
  }
}

// On mount, if clinicId is missing in cookie, attempt to sync latest user data from /auth/me
onMounted(async () => {
  if (!clinicId.value && fetchUser) {
    const updated = await fetchUser()
    if (updated?.clinicId) {
      await refresh()
    }
  }
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

// Populate form when data loads or pre-fill defaults for new clinic
watch(clinicData, (val) => {
  if (val) {
    state.name = val.name || ''
    state.nameKh = val.nameKh || ''
    state.address = val.address || ''
    state.phone = val.phone || ''
    state.email = val.email || ''
    state.website = val.website || ''
    state.description = val.description || ''
    state.logo = val.logo || ''
    state.headerLines = Array.from({ length: 4 }, (_, i) => val.headerLines?.[i] || '')
    state.footerNote = val.footerNote || ''
    state.pharmacyWorkflow = val.pharmacyWorkflow === 'PHARMACY_COUNTER' ? 'PHARMACY_COUNTER' : 'DIRECT'
  } else if (!clinicId.value) {
    if (!state.name && user.value?.username) {
      state.name = `${user.value.username}'s Clinic`
    }
    if (!state.email && user.value?.email) {
      state.email = user.value.email
    }
  }
  isLoading.value = false
}, { immediate: true })

async function onSubmit(event: FormSubmitEvent<Schema>) {
  isSaving.value = true
  try {
    const body = { ...event.data, headerLines: (event.data.headerLines ?? []).map(line => line.trim()).filter(Boolean) }
    if (!clinicId.value) {
      // Create new clinic (the pharmacy workflow is set once the clinic exists)
      const { pharmacyWorkflow: _workflow, ...createBody } = body
      const res = await $api<{ message: string; data: any; user?: any }>('/clinics', {
        method: 'POST',
        body: createBody
      })
      if (res.user) {
        setUser(res.user)
      } else if (res.data?._id) {
        setUser({
          ...user.value,
          clinicId: res.data._id
        })
      }
      toast.add({
        title: 'Success',
        description: 'Clinic created successfully! Setting up your workspace...',
        color: 'success'
      })
      setTimeout(() => {
        window.location.reload()
      }, 600)
      return
    }

    await $api(`/clinics/${clinicId.value}`, {
      method: 'PUT',
      body
    })
    toast.add({ title: 'Success', description: 'Clinic information updated', color: 'success' })
    refresh()
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: getApiErrorMessage(error, 'Failed to save clinic information'),
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

    <!-- Banner when clinic does not exist yet -->
    <div
      v-if="!clinicId && !isLoading"
      class="p-4 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/30 flex items-start gap-3"
    >
      <UIcon name="i-lucide-sparkles" class="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
      <div>
        <h3 class="text-sm font-semibold text-amber-800 dark:text-amber-300">
          Welcome! Complete your clinic setup
        </h3>
        <p class="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
          Please enter your clinic information below to create your clinic profile. A 14-day free trial on Pro tier and default branch will be created automatically.
        </p>
      </div>
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center gap-3">
          <div class="p-2 bg-primary-100 dark:bg-primary-900 rounded-lg">
            <UIcon name="i-lucide-building-2" class="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 class="text-xl font-semibold">
              {{ clinicId ? 'Clinic Information' : 'Create Your Clinic' }}
            </h2>
            <p class="text-sm text-muted">
              {{ clinicId ? 'Manage your clinic details' : 'Fill in the information below to set up your clinic profile' }}
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

        <div class="space-y-4 pt-4 border-t">
          <div>
            <h3 class="text-sm font-semibold">
              Printed documents
            </h3>
            <p class="text-xs text-muted">
              Shown in the header and footer of invoices, prescriptions, lab results and reports.
            </p>
          </div>

          <UFormField label="Logo" name="logo" help="PNG, JPG or WebP, up to 5 MB">
            <div class="flex items-center gap-4">
              <img
                v-if="logoUrl"
                :src="logoUrl"
                alt="Clinic logo"
                class="h-16 w-16 object-contain rounded border border-default"
              >
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                :disabled="isUploadingLogo"
                class="text-sm"
                @change="onLogoSelected"
              >
              <UButton
                v-if="state.logo"
                label="Remove"
                color="neutral"
                variant="outline"
                size="sm"
                @click="state.logo = ''"
              />
            </div>
          </UFormField>

          <UFormField
            label="Header lines"
            name="headerLines"
            help="Up to 4 short lines beside the clinic name, for example the doctor's name or the services offered"
          >
            <div class="space-y-2">
              <UInput
                v-for="i in 4"
                :key="i"
                v-model="state.headerLines[i - 1]"
                :placeholder="`Line ${i}`"
                maxlength="100"
                class="w-full"
              />
            </div>
          </UFormField>

          <UFormField label="Footer note" name="footerNote" help="Printed under the address and phone">
            <UInput v-model="state.footerNote" maxlength="200" class="w-full" />
          </UFormField>

          <UFormField
            v-if="clinicId"
            :label="t('pharmacy.workflow.label')"
            name="pharmacyWorkflow"
            :help="state.pharmacyWorkflow === 'PHARMACY_COUNTER' ? t('pharmacy.workflow.counterHelp') : t('pharmacy.workflow.directHelp')"
          >
            <USelect
              v-model="state.pharmacyWorkflow"
              :items="pharmacyWorkflowOptions"
              value-key="value"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="flex justify-end pt-4 border-t">
          <UButton
            type="submit"
            :label="clinicId ? 'Save Changes' : 'Create Clinic'"
            color="primary"
            :loading="isSaving"
            :icon="clinicId ? 'i-lucide-save' : 'i-lucide-plus'"
            size="lg"
          />
        </div>
      </UForm>
    </UCard>

    <!-- Quick Stats (only shown when clinic is created) -->
    <div v-if="clinicId" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <UCard>
        <div class="flex items-center gap-4">
          <div class="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <UIcon name="i-lucide-git-branch" class="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p class="text-2xl font-bold">
              {{ clinicData?.branches?.length || '-' }}
            </p>
            <p class="text-sm text-muted">
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
            <p class="text-sm text-muted">
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
            <p class="text-sm text-muted">
              Registered
            </p>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
