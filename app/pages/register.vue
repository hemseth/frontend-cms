<script setup lang="ts">
import { ref } from 'vue'

import type { FormSubmitEvent } from '@nuxt/ui'

import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

definePageMeta({
  layout: false
})

const { t } = useI18n()
const router = useRouter()
const config = useRuntimeConfig()
const apiBase = config.public.apiBase as string
const loading = ref(false)
const activeTab = ref(0)

// Form state
const state = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  clinicName: '',
  clinicNameKh: '',
  clinicAddress: '',
  clinicPhone: '',
  clinicEmail: ''
})

const tabs = [
  { label: 'User Info', icon: 'i-lucide-user', slot: 'user' },
  { label: 'Clinic Info', icon: 'i-lucide-building-2', slot: 'clinic' }
]

async function onSubmit() {
  loading.value = true
  try {
    // Validate user tab
    if (!state.username || state.username.length < 3) {
      useToast().add({ title: 'Error', description: 'Username must be at least 3 characters', color: 'error' })
      activeTab.value = 0
      return
    }
    if (!state.password || state.password.length < 6) {
      useToast().add({ title: 'Error', description: 'Password must be at least 6 characters', color: 'error' })
      activeTab.value = 0
      return
    }
    if (state.password !== state.confirmPassword) {
      useToast().add({ title: 'Error', description: t('auth.passwordMismatch'), color: 'error' })
      activeTab.value = 0
      return
    }

    // Validate email format if provided
    if (state.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) {
      useToast().add({ title: 'Error', description: 'Invalid email format', color: 'error' })
      activeTab.value = 0
      return
    }

    // Validate clinic tab
    if (!state.clinicName) {
      useToast().add({ title: 'Error', description: 'Clinic name is required', color: 'error' })
      activeTab.value = 1
      return
    }

    await $fetch(`${apiBase}/auth/register`, {
      method: 'POST',
      body: {
        username: state.username,
        password: state.password,
        email: state.email || undefined,
        clinicName: state.clinicName,
        clinicNameKh: state.clinicNameKh || undefined,
        clinicAddress: state.clinicAddress || undefined,
        clinicPhone: state.clinicPhone || undefined,
        clinicEmail: state.clinicEmail || undefined
      }
    })
    useToast().add({ title: t('auth.register'), description: t('auth.registerSuccess'), color: 'success' })
    await router.push('/login')
  } catch (err: unknown) {
    const e = err as Record<string, unknown>
    const data = e['data'] as Record<string, unknown> | undefined
    const msg = (data && data['message']) || e['message'] || t('auth.registerFailed')
    useToast().add({ title: 'Error', description: String(msg), color: 'error' })
  } finally {
    loading.value = false
  }
}

function nextTab() {
  // Validate before moving to next tab
  if (activeTab.value === 0) {
    if (!state.username || state.username.length < 3) {
      useToast().add({ title: 'Validation', description: 'Username must be at least 3 characters', color: 'warning' })
      return
    }
    if (!state.password || state.password.length < 6) {
      useToast().add({ title: 'Validation', description: 'Password must be at least 6 characters', color: 'warning' })
      return
    }
    if (state.password !== state.confirmPassword) {
      useToast().add({ title: 'Validation', description: 'Passwords do not match', color: 'warning' })
      return
    }
  }
  activeTab.value = 1
}

function prevTab() {
  activeTab.value = 0
}

function selectTab(index: number) {
  if (index === 1 && !isUserTabComplete.value) {
    useToast().add({ title: 'Validation', description: 'Please complete User Info first', color: 'warning' })
    return
  }
  activeTab.value = index
}

// Check if user tab is complete
const isUserTabComplete = computed(() => {
  return state.username.length >= 3
    && state.password.length >= 6
    && state.password === state.confirmPassword
})

// Check if clinic tab is complete
const isClinicTabComplete = computed(() => {
  return state.clinicName.length > 0
})
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4"
  >
    <div class="w-full max-w-lg">
      <UCard class="shadow-xl">
        <template #header>
          <div class="flex justify-center mb-3">
            <Logo />
          </div>
          <div class="text-center">
            <h1 class="text-2xl font-bold text-gray-800 dark:text-white">
              {{ t('auth.register') }}
            </h1>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Create your account and clinic
            </p>
          </div>
        </template>

        <!-- Tab Navigation -->
        <div class="mb-6">
          <div class="flex border-b border-gray-200 dark:border-gray-700">
            <button
              v-for="(tab, index) in tabs"
              :key="tab.slot"
              :disabled="index === 1 && !isUserTabComplete"
              :class="[
                'flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2',
                activeTab === index
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
                index === 1 && !isUserTabComplete ? 'opacity-50 cursor-not-allowed' : ''
              ]"
              @click="selectTab(index)"
            >
              <UIcon :name="tab.icon" class="w-4 h-4" />
              {{ tab.label }}
              <UIcon
                v-if="index === 0 && isUserTabComplete"
                name="i-lucide-check-circle"
                class="w-4 h-4 text-green-500"
              />
              <UIcon
                v-if="index === 1 && isClinicTabComplete"
                name="i-lucide-check-circle"
                class="w-4 h-4 text-green-500"
              />
            </button>
          </div>
        </div>

        <!-- User Info Tab -->
        <div v-show="activeTab === 0" class="space-y-4">
          <UFormField label="Username" name="username" required>
            <UInput
              v-model="state.username"
              placeholder="Enter username (min 3 chars)"
              icon="i-lucide-user"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Email" name="email">
            <UInput
              v-model="state.email"
              type="email"
              placeholder="your@email.com"
              icon="i-lucide-mail"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Password" name="password" required>
            <UInput
              v-model="state.password"
              type="password"
              placeholder="Min 6 characters"
              icon="i-lucide-lock"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Confirm Password" name="confirmPassword" required>
            <UInput
              v-model="state.confirmPassword"
              type="password"
              placeholder="Confirm password"
              icon="i-lucide-lock"
              class="w-full"
            />
          </UFormField>

          <div class="flex justify-end pt-4">
            <UButton
              color="primary"
              icon="i-lucide-arrow-right"
              trailing
              @click="nextTab"
            >
              Next: Clinic Info
            </UButton>
          </div>
        </div>

        <!-- Clinic Info Tab -->
        <div v-show="activeTab === 1" class="space-y-4">
          <UFormField label="Clinic Name" name="clinicName" required>
            <UInput
              v-model="state.clinicName"
              placeholder="Enter clinic name"
              icon="i-lucide-building-2"
              class="w-full"
            />
          </UFormField>

          <UFormField label="ឈ្មោះគ្លីនិក (Khmer)" name="clinicNameKh">
            <UInput v-model="state.clinicNameKh" placeholder="បញ្ចូលឈ្មោះគ្លីនិក" class="w-full" />
          </UFormField>

          <UFormField label="Address" name="clinicAddress">
            <UTextarea
              v-model="state.clinicAddress"
              placeholder="Clinic address"
              class="w-full"
              :rows="2"
            />
          </UFormField>

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Phone" name="clinicPhone">
              <UInput
                v-model="state.clinicPhone"
                type="tel"
                placeholder="Phone"
                icon="i-lucide-phone"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Email" name="clinicEmail">
              <UInput
                v-model="state.clinicEmail"
                type="email"
                placeholder="clinic@email.com"
                icon="i-lucide-mail"
                class="w-full"
              />
            </UFormField>
          </div>

          <div class="flex justify-between pt-4">
            <UButton
              color="neutral"
              variant="outline"
              icon="i-lucide-arrow-left"
              @click="prevTab"
            >
              Back
            </UButton>
            <UButton
              color="primary"
              :loading="loading"
              icon="i-lucide-check"
              @click="onSubmit"
            >
              {{ t('auth.register') }}
            </UButton>
          </div>
        </div>

        <template #footer>
          <div class="text-center">
            <span class="text-sm text-gray-500 dark:text-gray-400">Already have an account?</span>
            <NuxtLink to="/login" class="text-sm text-primary-600 hover:text-primary-500 ml-1 font-medium">{{
              t('auth.login') }}</NuxtLink>
          </div>
        </template>
      </UCard>
    </div>
  </div>
</template>
