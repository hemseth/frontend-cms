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
const { accessToken, refreshToken, setUser } = useAuth()
const googleClientId = (config.public.googleClientId as string) || '35029038689-imi2e24d90vjici54dibhjehahiv8fea.apps.googleusercontent.com'
const googleLoading = ref(false)
const loading = ref(false)
const activeTab = ref(0)

async function handleGoogleCredentialResponse(response: any) {
  if (!response?.credential) return
  googleLoading.value = true
  try {
    const res = await $api<any>('/auth/google', {
      method: 'POST',
      body: {
        credential: response.credential
      }
    })

    accessToken.value = res.data.access_token
    refreshToken.value = res.data.refresh_token
    if (res.data.user) {
      setUser(res.data.user)
    }

    useToast().add({
      title: 'ជោគជ័យ',
      description: 'ចុះឈ្មោះ និងចូលប្រើតាម Google បានជោគជ័យ!',
      color: 'success'
    })

    if (!res.data.user?.clinicId && res.data.user?.role !== 'developer') {
      await router.push('/setup-clinic')
    } else {
      await router.push('/')
    }
  } catch (err: any) {
    console.error('Google registration error:', err)
    useToast().add({
      title: 'Google Registration Failed',
      description: err.data?.message || err.message || 'ការចុះឈ្មោះតាម Google មិនបានសម្រេច',
      color: 'error'
    })
  } finally {
    googleLoading.value = false
  }
}

function promptGoogleSignUp() {
  if (typeof window === 'undefined') return
  const google = (window as any).google
  if (google?.accounts?.id) {
    google.accounts.id.initialize({
      client_id: googleClientId,
      callback: handleGoogleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: true,
    })
    google.accounts.id.prompt()
  } else {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      const g = (window as any).google
      g?.accounts?.id?.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredentialResponse,
        auto_select: false,
      })
      g?.accounts?.id?.prompt()
    }
    document.head.appendChild(script)
  }
}

// Form state
const state = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  hp_website: '', // Bot honeypot field
  clinicName: '',
  clinicNameKh: '',
  clinicAddress: '',
  clinicPhone: '',
  clinicEmail: ''
})

const showPassword = ref(false)
const showConfirmPassword = ref(false)

// OWASP-compliant username whitelist: letters, numbers, underscores, dashes, dots
const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{3,30}$/

// Password strength calculation (entropy score from 0 to 5)
const passwordScore = computed(() => {
  const p = state.password || ''
  if (!p) return 0
  let score = 0
  if (p.length >= 8) score++
  if (p.length >= 12) score++
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++
  if (/\d/.test(p)) score++
  if (/[^A-Za-z0-9]/.test(p)) score++
  return score
})

const passwordStrength = computed(() => {
  if (!state.password) return null
  const s = passwordScore.value
  if (s <= 1) return { label: 'Very Weak', color: 'text-red-500', barColor: 'bg-red-500', percent: 20 }
  if (s === 2) return { label: 'Weak', color: 'text-orange-500', barColor: 'bg-orange-500', percent: 40 }
  if (s === 3) return { label: 'Medium', color: 'text-amber-500', barColor: 'bg-amber-500', percent: 60 }
  if (s === 4) return { label: 'Strong', color: 'text-blue-500', barColor: 'bg-blue-500', percent: 80 }
  return { label: 'Very Strong', color: 'text-emerald-500', barColor: 'bg-emerald-500', percent: 100 }
})

const tabs = [
  { label: 'User Info', icon: 'i-lucide-user', slot: 'user' },
  { label: 'Clinic Info', icon: 'i-lucide-building-2', slot: 'clinic' }
]

async function onSubmit() {
  loading.value = true
  try {
    // Bot Honeypot: silently drop if filled
    if (state.hp_website && state.hp_website.trim().length > 0) {
      loading.value = false
      return
    }

    const trimmedUsername = state.username.trim()
    const trimmedEmail = state.email.trim()

    // Validate user tab
    if (!trimmedUsername || trimmedUsername.length < 3) {
      useToast().add({ title: 'Error', description: 'Username must be at least 3 characters', color: 'error' })
      activeTab.value = 0
      return
    }
    if (!USERNAME_REGEX.test(trimmedUsername)) {
      useToast().add({
        title: 'Validation Error',
        description: 'Username may only contain letters, numbers, underscores, dashes, and periods',
        color: 'error'
      })
      activeTab.value = 0
      return
    }
    if (!state.password || state.password.length < 8) {
      useToast().add({
        title: 'Weak Password',
        description: 'Password must be at least 8 characters long for security compliance',
        color: 'error'
      })
      activeTab.value = 0
      return
    }
    if (state.password !== state.confirmPassword) {
      useToast().add({ title: 'Error', description: t('auth.passwordMismatch'), color: 'error' })
      activeTab.value = 0
      return
    }

    // Validate email format if provided
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      useToast().add({ title: 'Error', description: 'Invalid email format', color: 'error' })
      activeTab.value = 0
      return
    }

    // Validate clinic tab
    const trimmedClinicName = state.clinicName.trim()
    if (!trimmedClinicName) {
      useToast().add({ title: 'Error', description: 'Clinic name is required', color: 'error' })
      activeTab.value = 1
      return
    }

    await $api('/auth/register', {
      method: 'POST',
      body: {
        username: trimmedUsername,
        password: state.password,
        email: trimmedEmail || undefined,
        hp_website: state.hp_website || undefined,
        clinicName: trimmedClinicName,
        clinicNameKh: state.clinicNameKh.trim() || undefined,
        clinicAddress: state.clinicAddress.trim() || undefined,
        clinicPhone: state.clinicPhone.trim() || undefined,
        clinicEmail: state.clinicEmail.trim() || undefined
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
    const trimmedUsername = state.username.trim()
    if (!trimmedUsername || trimmedUsername.length < 3) {
      useToast().add({ title: 'Validation', description: 'Username must be at least 3 characters', color: 'warning' })
      return
    }
    if (!USERNAME_REGEX.test(trimmedUsername)) {
      useToast().add({
        title: 'Validation',
        description: 'Username may only contain letters, numbers, underscores, dashes, and periods',
        color: 'warning'
      })
      return
    }
    if (!state.password || state.password.length < 8) {
      useToast().add({
        title: 'Validation',
        description: 'Password must be at least 8 characters (OWASP security standard)',
        color: 'warning'
      })
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

// Check if user tab is complete with 8+ char password & valid username
const isUserTabComplete = computed(() => {
  const trimmedUsername = state.username.trim()
  return trimmedUsername.length >= 3
    && USERNAME_REGEX.test(trimmedUsername)
    && state.password.length >= 8
    && state.password === state.confirmPassword
})

// Check if clinic tab is complete
const isClinicTabComplete = computed(() => {
  return state.clinicName.trim().length > 0
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
            <h1 class="text-2xl font-bold text-highlighted">
              {{ t('auth.register') }}
            </h1>
            <p class="text-sm text-muted mt-1">
              Create your account and clinic
            </p>
          </div>
        </template>

        <!-- Quick Google Sign Up -->
        <div class="mb-6">
          <button
            type="button"
            class="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-accented rounded-lg bg-default hover:bg-muted text-default text-sm font-medium transition shadow-sm cursor-pointer disabled:opacity-50"
            :disabled="googleLoading"
            @click="promptGoogleSignUp"
          >
            <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>{{ googleLoading ? 'កំពុងភ្ជាប់ Google...' : 'ចុះឈ្មោះភ្លាមៗតាម Google (Sign up with Google)' }}</span>
          </button>

          <div class="relative my-5">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-default" />
            </div>
            <div class="relative flex justify-center text-xs uppercase">
              <span class="bg-default px-2 text-muted font-medium">ឬ បង្កើតគណនីដោយដៃ (Or register manually)</span>
            </div>
          </div>
        </div>

        <!-- Tab Navigation -->
        <div class="mb-6">
          <div class="flex border-b border-default">
            <button
              v-for="(tab, index) in tabs"
              :key="tab.slot"
              :disabled="index === 1 && !isUserTabComplete"
              :class="[
                'flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2',
                activeTab === index
                  ? 'border-primary-500 text-primary'
                  : 'border-transparent text-muted hover:text-default',
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

        <!-- Anti-Bot Honeypot (hidden from human users) -->
        <div class="hidden" aria-hidden="true">
          <input
            v-model="state.hp_website"
            type="text"
            tabindex="-1"
            autocomplete="off"
            name="hp_website"
          />
        </div>

        <!-- User Info Tab -->
        <div v-show="activeTab === 0" class="space-y-4">
          <UFormField label="Username" name="username" required>
            <UInput
              v-model="state.username"
              placeholder="Username (letters, numbers, underscores)"
              icon="i-lucide-user"
              class="w-full"
              autocomplete="username"
            />
          </UFormField>

          <UFormField label="Email" name="email">
            <UInput
              v-model="state.email"
              type="email"
              placeholder="your@email.com"
              icon="i-lucide-mail"
              class="w-full"
              autocomplete="email"
            />
          </UFormField>

          <UFormField label="Password" name="password" required>
            <UInput
              v-model="state.password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="Min 8 characters"
              icon="i-lucide-lock"
              class="w-full"
              autocomplete="new-password"
            >
              <template #trailing>
                <UButton
                  color="neutral"
                  variant="link"
                  size="xs"
                  :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  aria-label="Toggle password visibility"
                  class="cursor-pointer text-dimmed hover:text-toned"
                  @click="showPassword = !showPassword"
                />
              </template>
            </UInput>
            <!-- Real-time Password Strength Meter -->
            <div v-if="passwordStrength" class="mt-2 space-y-1">
              <div class="flex justify-between items-center text-xs">
                <span class="text-muted">Password Strength:</span>
                <span :class="['font-semibold', passwordStrength.color]">{{ passwordStrength.label }}</span>
              </div>
              <div class="h-1.5 w-full bg-accented rounded-full overflow-hidden">
                <div
                  :class="['h-full transition-all duration-300', passwordStrength.barColor]"
                  :style="{ width: `${passwordStrength.percent}%` }"
                />
              </div>
              <p class="text-[11px] text-muted">
                Minimum 8 characters. Mix uppercase, lowercase, numbers & symbols for best security.
              </p>
            </div>
          </UFormField>

          <UFormField label="Confirm Password" name="confirmPassword" required>
            <UInput
              v-model="state.confirmPassword"
              :type="showConfirmPassword ? 'text' : 'password'"
              placeholder="Confirm password"
              icon="i-lucide-lock"
              class="w-full"
              autocomplete="new-password"
            >
              <template #trailing>
                <UButton
                  color="neutral"
                  variant="link"
                  size="xs"
                  :icon="showConfirmPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  aria-label="Toggle confirm password visibility"
                  class="cursor-pointer text-dimmed hover:text-toned"
                  @click="showConfirmPassword = !showConfirmPassword"
                />
              </template>
            </UInput>
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
            <span class="text-sm text-muted">Already have an account?</span>
            <NuxtLink to="/login" class="text-sm text-primary-600 hover:text-primary-500 ml-1 font-medium">{{
              t('auth.login') }}</NuxtLink>
          </div>
        </template>
      </UCard>
    </div>
  </div>
</template>
