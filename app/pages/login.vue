<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { ref, reactive, watch, onMounted } from 'vue'

const { isLoggedIn, accessToken, refreshToken, setUser, user, clinicId } = useAuth()
const route = useRoute()

const redirectAfterAuth = async (userObj?: any) => {
  const target = (route.query.redirect as string) || '/'
  const effectiveClinicId = userObj?.clinicId || clinicId.value
  const effectiveRole = userObj?.role || user.value?.role
  if (!effectiveClinicId && effectiveRole !== 'developer') {
    await navigateTo('/setup-clinic')
  } else {
    await navigateTo(target)
  }
}

definePageMeta({
  layout: false
})

// Google OAuth state & configuration
const googleLoading = ref(false)
const googleSdkLoaded = ref(false)
const config = useRuntimeConfig()
const googleClientId = (config.public.googleClientId as string) || '35029038689-imi2e24d90vjici54dibhjehahiv8fea.apps.googleusercontent.com'

// Pending OAuth & Clinic Creation state
const pendingGoogleCredential = ref('')
const pendingTelegramUser = ref<any>(null)
const pendingAuthType = ref<'google' | 'telegram'>('google')
const pendingAccountIdentifier = ref('')
const showCreateClinicModal = ref(false)
const clinicSubmitting = ref(false)

const newClinicForm = reactive({
  nameKh: '',
  name: '',
  slug: '',
  phone: '',
  email: '',
  address: '',
})

function slugify(text: string) {
  return (text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 35)
}

watch(() => newClinicForm.name, (newName) => {
  if (!newClinicForm.slug || newClinicForm.slug === slugify(newName.slice(0, -1))) {
    newClinicForm.slug = slugify(newName)
  }
})

// Telegram OAuth state
const showTelegramModal = ref(false)
const telegramLoading = ref(false)
const telegramForm = reactive({
  username: '',
  name: '',
  phone: '',
  email: '',
})

function promptTelegramSignIn() {
  showTelegramModal.value = true
}

async function handleTelegramSubmit() {
  if (!telegramForm.username && !telegramForm.phone) {
    useToast().add({
      title: 'សូមបំពេញព័ត៌មាន',
      description: 'សូមបញ្ចូល Username Telegram ឬលេខទូរស័ព្ទរបស់អ្នក',
      color: 'warning'
    })
    return
  }

  telegramLoading.value = true
  try {
    const cleanUsername = telegramForm.username.replace(/^@/, '').trim()
    const syntheticId = 'tg_' + (cleanUsername || telegramForm.phone.replace(/[^0-9]/g, ''))
    const tgUser = {
      id: syntheticId,
      username: cleanUsername,
      first_name: telegramForm.name || cleanUsername,
      email: telegramForm.email || undefined,
      phone: telegramForm.phone || undefined,
    }

    const res = await $api<any>('/auth/telegram', {
      method: 'POST',
      body: {
        telegramUser: tgUser
      }
    })

    if (res?.requiresClinic || res?.data?.requiresClinic) {
      const clinicReq = res?.data?.requiresClinic ? res.data : res
      showTelegramModal.value = false
      pendingTelegramUser.value = tgUser
      pendingAuthType.value = 'telegram'
      pendingAccountIdentifier.value = `@${cleanUsername}` || telegramForm.email || 'Telegram Account'
      if (telegramForm.email) newClinicForm.email = telegramForm.email
      if (telegramForm.phone) newClinicForm.phone = telegramForm.phone
      showCreateClinicModal.value = true
      useToast().add({
        title: 'សូមបង្កើតឈ្មោះគ្លីនិកជាមុនសិន',
        description: 'គណនី Telegram នេះមិនទាន់មានក្នុងប្រព័ន្ធនៅឡើយទេ។ សូមបង្កើតឈ្មោះគ្លីនិកដើម្បីចាប់ផ្តើម!',
        color: 'amber'
      })
      return
    }

    if (res?.data?.require2FA) {
      tempToken.value = res.data.tempToken
      step.value = '2fa'
      showTelegramModal.value = false
      useToast().add({
        title: '2FA Required',
        description: 'គណនីមានសុវត្ថិភាព 2FA! សូមបញ្ចូលលេខកូដផ្ទៀងផ្ទាត់',
        color: 'info'
      })
      return
    }

    accessToken.value = res.data.access_token
    refreshToken.value = res.data.refresh_token
    if (res.data.user) {
      setUser(res.data.user)
    }

    showTelegramModal.value = false
    useToast().add({
      title: 'ជោគជ័យ',
      description: 'ចូលប្រើប្រព័ន្ធតាមរយៈ Telegram បានជោគជ័យ!',
      color: 'success'
    })

    await redirectAfterAuth(res.data?.user)
  } catch (err: any) {
    console.error('Telegram Sign-in error:', err)
    useToast().add({
      title: 'Telegram Sign-in Failed',
      description: err.data?.message || err.message || 'ការចូលប្រើតាម Telegram មិនបានសម្រេច',
      color: 'error'
    })
  } finally {
    telegramLoading.value = false
  }
}

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

    if (res?.requiresClinic || res?.data?.requiresClinic) {
      const clinicReq = res?.data?.requiresClinic ? res.data : res
      pendingGoogleCredential.value = response.credential
      pendingAuthType.value = 'google'
      pendingAccountIdentifier.value = clinicReq.email || clinicReq.data?.email || 'Google Account'
      if (clinicReq.email) {
        newClinicForm.email = clinicReq.email
      }
      showCreateClinicModal.value = true
      useToast().add({
        title: 'សូមបង្កើតឈ្មោះគ្លីនិកជាមុនសិន',
        description: 'អ៊ីមែលនេះមិនទាន់មានក្នុងប្រព័ន្ធនៅឡើយទេ។ សូមបង្កើតឈ្មោះគ្លីនិកដើម្បីចាប់ផ្តើម!',
        color: 'amber'
      })
      return
    }

    if (res.data?.require2FA) {
      tempToken.value = res.data.tempToken
      step.value = '2fa'
      useToast().add({
        title: '2FA Required',
        description: 'គណនីមានសុវត្ថិភាព 2FA! សូមបញ្ចូលលេខកូដពី Google Authenticator',
        color: 'info'
      })
      return
    }

    accessToken.value = res.data.access_token
    refreshToken.value = res.data.refresh_token
    if (res.data.user) {
      setUser(res.data.user)
    }

    useToast().add({
      title: 'ជោគជ័យ',
      description: res.data?.isNewUser
        ? 'ចុះឈ្មោះ និងចូលប្រើតាម Google បានជោគជ័យ!'
        : 'ចូលប្រើប្រព័ន្ធតាម Google បានជោគជ័យ!',
      color: 'success'
    })

    await redirectAfterAuth(res.data?.user)
  } catch (err: any) {
    console.error('Google Sign-in error:', err)
    useToast().add({
      title: 'Google Sign-in Failed',
      description: err.data?.message || err.message || 'ការចូលប្រើតាម Google មិនបានសម្រេច',
      color: 'error'
    })
  } finally {
    googleLoading.value = false
  }
}

async function submitClinicAndLogin() {
  if (!newClinicForm.nameKh?.trim()) {
    useToast().add({ title: 'សូមបំពេញព័ត៌មាន', description: 'សូមបញ្ចូលឈ្មោះគ្លីនិកជាភាសាខ្មែរ', color: 'warning' })
    return
  }
  if (!newClinicForm.name?.trim()) {
    useToast().add({ title: 'សូមបំពេញព័ត៌មាន', description: 'សូមបញ្ចូលឈ្មោះគ្លីនិកជាភាសាអង់គ្លេស', color: 'warning' })
    return
  }
  if (!newClinicForm.phone?.trim()) {
    useToast().add({ title: 'សូមបំពេញព័ត៌មាន', description: 'សូមបញ្ចូលលេខទូរស័ព្ទគ្លីនិក', color: 'warning' })
    return
  }

  clinicSubmitting.value = true
  try {
    let res: any
    const payloadClinic = {
      name: newClinicForm.name.trim(),
      nameKh: newClinicForm.nameKh.trim(),
      slug: newClinicForm.slug.trim() || slugify(newClinicForm.name),
      phone: newClinicForm.phone.trim(),
      email: newClinicForm.email.trim(),
      address: newClinicForm.address.trim(),
    }

    if (pendingAuthType.value === 'google') {
      res = await $api('/auth/google', {
        method: 'POST',
        body: {
          credential: pendingGoogleCredential.value,
          clinicData: payloadClinic
        }
      })
    } else if (pendingAuthType.value === 'telegram') {
      res = await $api('/auth/telegram', {
        method: 'POST',
        body: {
          telegramUser: pendingTelegramUser.value,
          clinicData: payloadClinic
        }
      })
    }

    if (res?.data?.access_token) {
      accessToken.value = res.data.access_token
      if (res.data.refresh_token) refreshToken.value = res.data.refresh_token
      if (res.data.user) setUser(res.data.user)

      showCreateClinicModal.value = false
      useToast().add({
        title: 'បង្កើតគ្លីនិកបានជោគជ័យ!',
        description: 'សូមស្វាគមន៍មកកាន់ប្រព័ន្ធគ្រប់គ្រងគ្លីនិកពេញលេញ (សាកល្បងឥតគិតថ្លៃ ១៤ ថ្ងៃ)',
        color: 'success'
      })
      await redirectAfterAuth(res?.data?.user)
    }
  } catch (err: any) {
    console.error('Failed to create clinic during login:', err)
    useToast().add({
      title: 'ការបង្កើតគ្លីនិកមិនបានសម្រេច',
      description: err.data?.message || err.message || 'សូមពិនិត្យព័ត៌មានម្តងទៀត',
      color: 'error'
    })
  } finally {
    clinicSubmitting.value = false
  }
}

function initGoogleSignIn() {
  if (typeof window === 'undefined') return
  const google = (window as any).google
  if (google?.accounts?.id) {
    try {
      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      })

      const parent = document.getElementById('googleSignInBtn')
      if (parent) {
        google.accounts.id.renderButton(parent, {
          theme: 'outline',
          size: 'large',
          width: 360,
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
        })
        googleSdkLoaded.value = true
      }
    } catch (e) {
      console.warn('Google accounts init error:', e)
    }
  }
}

function promptGoogleSignIn() {
  if (typeof window === 'undefined') return
  const google = (window as any).google
  if (google?.accounts?.id) {
    google.accounts.id.prompt()
  } else {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      initGoogleSignIn()
      const g = (window as any).google
      g?.accounts?.id?.prompt()
    }
    document.head.appendChild(script)
  }
}

onMounted(() => {
  if (accessToken.value || refreshToken.value) {
    redirectAfterAuth()
    return
  }

  if ((window as any).google?.accounts?.id) {
    initGoogleSignIn()
  } else {
    const timer = setInterval(() => {
      if ((window as any).google?.accounts?.id) {
        clearInterval(timer)
        initGoogleSignIn()
      }
    }, 300)
    setTimeout(() => clearInterval(timer), 5000)
  }
})

// Auth step management
const step = ref<'credentials' | '2fa'>('credentials')
const tempToken = ref('')
const otpCode = ref('')
const useRecoveryCode = ref(false)
const verifyLoading = ref(false)

async function onLogin(event: FormSubmitEvent<Schema>) {
  try {
    const data = await $api('/auth/login', {
      method: 'POST',
      body: event.data
    })

    // Check if user has 2FA enabled
    if (data.data?.require2FA) {
      tempToken.value = data.data.tempToken
      step.value = '2fa'
      useToast().add({
        title: '2FA Required',
        description: 'គណនីរបស់អ្នកមានសុវត្ថិភាព 2FA។ សូមបញ្ចូលលេខកូដផ្ទៀងផ្ទាត់',
        color: 'info'
      })
      return
    }

    accessToken.value = data.data.access_token
    refreshToken.value = data.data.refresh_token

    if (data.data.user) {
      setUser(data.data.user)
    }

    await redirectAfterAuth(data.data?.user)
  } catch (err: any) {
    console.error('Login error:', err)
    useToast().add({
      title: 'Error',
      description: err.data?.message || err.message || 'Login failed',
      color: 'error'
    })
  }
}

async function onVerify2FA() {
  const clean = otpCode.value.trim()
  if (!clean || clean.length < 6) {
    useToast().add({
      title: 'Invalid Code',
      description: 'សូមបញ្ចូលលេខកូដផ្ទៀងផ្ទាត់ឱ្យបានត្រឹមត្រូវ',
      color: 'warning'
    })
    return
  }

  verifyLoading.value = true
  try {
    const res = await $api('/auth/2fa/verify', {
      method: 'POST',
      body: {
        tempToken: tempToken.value,
        code: clean
      }
    })

    accessToken.value = res.data.access_token
    refreshToken.value = res.data.refresh_token

    if (res.data.user) {
      setUser(res.data.user)
    }

    useToast().add({
      title: 'ជោគជ័យ',
      description: 'ការផ្ទៀងផ្ទាត់បានជោគជ័យ! សូមស្វាគមន៍',
      color: 'success'
    })

    await redirectAfterAuth(res.data?.user)
  } catch (err: any) {
    console.error('2FA verification error:', err)
    useToast().add({
      title: 'ការផ្ទៀងផ្ទាត់មិនត្រឹមត្រូវ',
      description: err.data?.message || err.message || 'លេខកូដ 2FA ឬលេខកូដសង្គ្រោះមិនត្រឹមត្រូវ',
      color: 'error'
    })
  } finally {
    verifyLoading.value = false
  }
}

function resetToCredentials() {
  step.value = 'credentials'
  tempToken.value = ''
  otpCode.value = ''
  useRecoveryCode.value = false
}

const schema = z.object({
  username: z.string().min(3, 'Invalid username'),
  password: z.string().min(6, 'Password must be at least 6 characters')
})

type Schema = z.output<typeof schema>

const state = reactive({
  username: '',
  password: ''
})

const loading = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    await onLogin(event)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-gray-50 to-primary-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 py-8 px-4"
  >
    <UCard class="w-full max-w-md shadow-2xl border border-default backdrop-blur-sm">
      <template #header>
        <div class="flex justify-center mb-3">
          <Logo />
        </div>

        <template v-if="step === 'credentials'">
          <h2 class="text-2xl font-bold text-center text-highlighted">
            Welcome Back
          </h2>
          <p class="text-center text-sm text-muted mt-1">
            ចូលប្រើប្រព័ន្ធគ្រប់គ្រងគ្លីនិក (CMS System)
          </p>
        </template>

        <template v-else>
          <div class="flex flex-col items-center">
            <div class="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-950/60 text-primary flex items-center justify-center mb-2">
              <UIcon name="i-lucide-shield-check" class="w-7 h-7" />
            </div>
            <h2 class="text-xl font-bold text-center text-highlighted">
              ការផ្ទៀងផ្ទាត់ពីរកត្តា (2FA)
            </h2>
            <p class="text-center text-xs text-muted mt-1">
              {{ useRecoveryCode ? 'សូមបញ្ចូលលេខកូដសង្គ្រោះ 8 ខ្ទង់ (Backup Recovery Code)' : 'សូមបញ្ចូលលេខកូដ 6 ខ្ទង់ពី Google / Microsoft Authenticator' }}
            </p>
          </div>
        </template>
      </template>

      <!-- Step 1: Username & Password -->
      <UForm
        v-if="step === 'credentials'"
        class="space-y-4"
        :schema="schema"
        :state="state"
        @submit="onSubmit"
      >
        <UFormField label="ឈ្មោះគណនី ឬ អ៊ីមែល (Username / Email)" name="username" required>
          <UInput
            v-model="state.username"
            type="text"
            placeholder="បញ្ចូល username ឬ email"
            icon="i-lucide-user"
            class="w-full"
            autocomplete="username"
          />
        </UFormField>

        <UFormField label="ពាក្យសម្ងាត់ (Password)" name="password" required>
          <UInput
            v-model="state.password"
            type="password"
            placeholder="••••••••"
            icon="i-lucide-lock"
            class="w-full"
            autocomplete="current-password"
          />
        </UFormField>

        <UButton
          type="submit"
          color="primary"
          size="lg"
          block
          :loading="loading"
          :disabled="loading"
        >
          ចូលប្រើប្រព័ន្ធ (Sign In)
        </UButton>

        <!-- Google OAuth Sign In Divider & Button -->
        <div class="relative my-3">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-default" />
          </div>
          <div class="relative flex justify-center text-xs uppercase">
            <span class="bg-default px-2 text-muted font-medium">ឬ (Or continue with)</span>
          </div>
        </div>

        <div class="space-y-3">
          <div id="googleSignInBtn" class="flex justify-center w-full min-h-[44px]"></div>
          
          <button
            v-if="!googleSdkLoaded"
            type="button"
            class="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-accented rounded-lg bg-default hover:bg-muted text-default text-sm font-medium transition shadow-sm cursor-pointer disabled:opacity-50"
            :disabled="googleLoading"
            @click="promptGoogleSignIn"
          >
            <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>{{ googleLoading ? 'កំពុងភ្ជាប់ Google...' : 'ចូលតាមរយៈ Google' }}</span>
          </button>

          <button
            type="button"
            class="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-lg bg-[#24A1DE] hover:bg-[#208fC7] text-white text-sm font-medium transition shadow-sm cursor-pointer disabled:opacity-50"
            :disabled="telegramLoading"
            @click="promptTelegramSignIn"
          >
            <svg class="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18.895-.972 4.417-1.373 6.305-.169.799-.487 1.066-.796 1.092-.67.06-1.18-.44-1.83-.87-.018-.012-.036-.024-.055-.035-1.018-.673-1.608-1.092-2.597-1.745-.37-.245-.128-.38.08-.598.055-.057.994-.912 1.83-1.68.046-.042.09-.085.132-.128.38-.355.19-.553-.255-.255l-3.328 2.253c-.47.319-.9.475-1.288.466-.43-.01-.84-.23-1.144-.33-.62-.204-1.11-.314-1.07-.66.02-.18.27-.37.74-.56 2.91-1.27 4.86-2.11 5.84-2.52 2.78-1.16 3.36-1.36 3.74-1.37.08 0 .27.02.39.12.1.08.13.2.14.28-.01.07-.01.18-.03.28z"/>
            </svg>
            <span>{{ telegramLoading ? 'កំពុងភ្ជាប់ Telegram...' : 'ចូលតាមរយៈ Telegram' }}</span>
          </button>
        </div>
      </UForm>

      <!-- Step 2: Two-Factor Authentication OTP / Recovery Code -->
      <div v-else class="space-y-5">
        <div class="p-3 bg-primary-50/60 dark:bg-primary-950/40 rounded-lg border border-primary-100 dark:border-primary-900/50 text-xs text-primary-800 dark:text-primary-300 flex items-center gap-2">
          <UIcon name="i-lucide-lock-keyhole" class="w-4 h-4 shrink-0 text-primary" />
          <span>គណនីនេះត្រូវបានការពារដោយប្រព័ន្ធសុវត្ថិភាព 2FA SOC Guard។</span>
        </div>

        <div>
          <label class="block text-xs font-semibold text-default mb-2">
            {{ useRecoveryCode ? 'លេខកូដសង្គ្រោះ (Backup Code)' : 'លេខកូដសម្ងាត់ 6 ខ្ទង់ (TOTP Code)' }}
          </label>
          <UInput
            v-model="otpCode"
            :type="useRecoveryCode ? 'text' : 'text'"
            :maxlength="useRecoveryCode ? 12 : 6"
            :placeholder="useRecoveryCode ? 'XXXX-XXXX' : '000000'"
            class="w-full text-center text-xl font-mono tracking-widest uppercase"
            autofocus
            @keyup.enter="onVerify2FA"
          />
        </div>

        <div class="flex items-center justify-between text-xs">
          <button
            type="button"
            class="text-primary-600 hover:text-primary-700 dark:text-primary-400 underline cursor-pointer"
            @click="useRecoveryCode = !useRecoveryCode; otpCode = ''"
          >
            {{ useRecoveryCode ? '← ប្រើលេខកូដពី Authenticator App' : 'ប្រើលេខកូដសង្គ្រោះ (Backup Code) ?' }}
          </button>
        </div>

        <UButton
          color="primary"
          size="lg"
          block
          icon="i-lucide-shield-check"
          :loading="verifyLoading"
          :disabled="verifyLoading || !otpCode"
          @click="onVerify2FA"
        >
          ផ្ទៀងផ្ទាត់ និងចូលប្រព័ន្ធ
        </UButton>

        <UButton
          variant="ghost"
          color="neutral"
          size="sm"
          block
          icon="i-lucide-arrow-left"
          @click="resetToCredentials"
        >
          ត្រឡប់ទៅផ្ទាំងចូលគណនីវិញ
        </UButton>
      </div>

      <template #footer>
        <div class="flex flex-col items-center gap-3 text-sm">
          <div v-if="step === 'credentials'" class="flex flex-col items-center gap-1.5">
            <div class="flex items-center gap-1">
              <span class="text-muted">មិនទាន់មានគណនី?</span>
              <UButton variant="link" to="/register" :padded="false">
                ចុះឈ្មោះបុគ្គលិក (Staff Sign up)
              </UButton>
            </div>
            <div class="flex items-center gap-1 text-xs">
              <span class="text-primary font-semibold">🏥 បើកគ្លីនិកថ្មី?</span>
              <UButton variant="link" to="/saas-register" :padded="false" class="font-bold text-primary">
                ចុះឈ្មោះគ្លីនិកថ្មី (SaaS Clinic Registration)
              </UButton>
            </div>
          </div>
          <USeparator />
          <UButton
            variant="ghost"
            to="/public/medicines"
            icon="i-lucide-search"
            color="neutral"
            size="sm"
          >
            Browse Public Medicine Catalog
          </UButton>
        </div>
      </template>
    </UCard>

    <!-- Telegram Login Modal -->
    <div
      v-if="showTelegramModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div class="bg-default border border-default rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
        <div class="flex items-center justify-between border-b border-default pb-3">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-[#24A1DE] text-white flex items-center justify-center">
              <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18.895-.972 4.417-1.373 6.305-.169.799-.487 1.066-.796 1.092-.67.06-1.18-.44-1.83-.87-.018-.012-.036-.024-.055-.035-1.018-.673-1.608-1.092-2.597-1.745-.37-.245-.128-.38.08-.598.055-.057.994-.912 1.83-1.68.046-.042.09-.085.132-.128.38-.355.19-.553-.255-.255l-3.328 2.253c-.47.319-.9.475-1.288.466-.43-.01-.84-.23-1.144-.33-.62-.204-1.11-.314-1.07-.66.02-.18.27-.37.74-.56 2.91-1.27 4.86-2.11 5.84-2.52 2.78-1.16 3.36-1.36 3.74-1.37.08 0 .27.02.39.12.1.08.13.2.14.28-.01.07-.01.18-.03.28z"/>
              </svg>
            </div>
            <h3 class="font-bold text-base text-highlighted">
              ចូលតាមរយៈ Telegram (Telegram Auth)
            </h3>
          </div>
          <button
            type="button"
            class="text-dimmed hover:text-toned text-lg font-bold cursor-pointer"
            @click="showTelegramModal = false"
          >
            ✕
          </button>
        </div>

        <p class="text-xs text-muted">
          បញ្ចូលឈ្មោះគណនី Telegram ឬលេខទូរស័ព្ទរបស់អ្នក ដើម្បីចូលប្រើប្រព័ន្ធ៖
        </p>

        <form class="space-y-3" @submit.prevent="handleTelegramSubmit">
          <div>
            <label class="block text-xs font-semibold text-default mb-1">
              Telegram Username (ឧ. @username) <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="telegramForm.username"
              type="text"
              placeholder="@your_telegram_username"
              class="w-full px-3 py-2 bg-muted border border-accented rounded-lg text-sm text-highlighted focus:outline-none focus:ring-2 focus:ring-[#24A1DE]"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-default mb-1">
              ឈ្មោះពេញ (Full Name)
            </label>
            <input
              v-model="telegramForm.name"
              type="text"
              placeholder="ឧ. Sokha Hem"
              class="w-full px-3 py-2 bg-muted border border-accented rounded-lg text-sm text-highlighted focus:outline-none focus:ring-2 focus:ring-[#24A1DE]"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-default mb-1">
              លេខទូរស័ព្ទ
            </label>
            <input
              v-model="telegramForm.phone"
              type="tel"
              placeholder="012 345 678"
              class="w-full px-3 py-2 bg-muted border border-accented rounded-lg text-sm text-highlighted focus:outline-none focus:ring-2 focus:ring-[#24A1DE]"
            />
          </div>

          <div class="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              class="px-4 py-2 text-xs text-toned hover:bg-elevated rounded-lg transition cursor-pointer"
              @click="showTelegramModal = false"
            >
              បោះបង់
            </button>
            <button
              type="submit"
              :disabled="telegramLoading"
              class="px-4 py-2 text-xs font-bold text-white bg-[#24A1DE] hover:bg-[#208fC7] rounded-lg transition shadow disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              <span v-if="telegramLoading" class="animate-spin">↻</span>
              <span>បន្តចូលប្រើ (Continue)</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Create Clinic First Modal ("ត្រូវ បង្កើតឈ្មោះគ្លីនិក ជាមុនសិន") -->
    <div
      v-if="showCreateClinicModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
    >
      <div class="bg-slate-900 border border-slate-700 text-white rounded-2xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div class="text-center space-y-2">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold">
            <span>🏥</span>
            <span>គណនីថ្មី៖ ត្រូវបង្កើតឈ្មោះគ្លីនិកជាមុនសិន</span>
          </div>
          <h2 class="text-xl sm:text-2xl font-black text-white">
            បង្កើតគ្លីនិករបស់អ្នក (Create Clinic)
          </h2>
          <p class="text-xs text-dimmed">
            គណនី <span class="text-primary-400 font-semibold">{{ pendingAccountIdentifier }}</span> មិនទាន់មានក្នុងប្រព័ន្ធនៅឡើយទេ។ សូមបញ្ចូលឈ្មោះគ្លីនិកដើម្បីចាប់ផ្តើមប្រើប្រាស់ប្រព័ន្ធ (សាកល្បងឥតគិតថ្លៃ ១៤ ថ្ងៃ)៖
          </p>
        </div>

        <form class="space-y-4" @submit.prevent="submitClinicAndLogin">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-dimmed mb-1">
                ឈ្មោះគ្លីនិក (ភាសាខ្មែរ) <span class="text-rose-400">*</span>
              </label>
              <input
                v-model="newClinicForm.nameKh"
                type="text"
                required
                placeholder="ឧ. គ្លីនិក សុខភាពល្អ"
                class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-dimmed mb-1">
                Clinic Name (English) <span class="text-rose-400">*</span>
              </label>
              <input
                v-model="newClinicForm.name"
                type="text"
                required
                placeholder="e.g. Hope Clinic"
                class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium text-dimmed mb-1">
              គេហទំព័រ Subdomain (Slug) <span class="text-rose-400">*</span>
            </label>
            <div class="flex items-center">
              <input
                v-model="newClinicForm.slug"
                type="text"
                required
                placeholder="my-clinic"
                class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-l-lg text-sm text-white focus:outline-none focus:border-primary-500"
              />
              <span class="px-3 py-2 bg-slate-700 border border-l-0 border-slate-700 rounded-r-lg text-xs text-dimmed">
                .clinic-hms.com
              </span>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-dimmed mb-1">
                លេខទូរស័ព្ទគ្លីនិក <span class="text-rose-400">*</span>
              </label>
              <input
                v-model="newClinicForm.phone"
                type="tel"
                required
                placeholder="012 345 678"
                class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
              />
            </div>

            <div>
              <label class="block text-xs font-medium text-dimmed mb-1">
                អាសយដ្ឋាន
              </label>
              <input
                v-model="newClinicForm.address"
                type="text"
                placeholder="រាជធានីភ្នំពេញ..."
                class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <div class="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              class="px-4 py-2 text-xs font-medium text-dimmed hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              @click="showCreateClinicModal = false"
            >
              បោះបង់ (Cancel)
            </button>
            <button
              type="submit"
              :disabled="clinicSubmitting"
              class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-primary-600/30 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <span v-if="clinicSubmitting" class="animate-spin text-sm">↻</span>
              <span>បង្កើតគ្លីនិក និងចូលប្រើប្រាស់ (Create & Start)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
