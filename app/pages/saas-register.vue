<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'

definePageMeta({
  layout: false
})

const { t } = useI18n()
const router = useRouter()
const toast = useToast()
const config = useRuntimeConfig()
const apiBase = config.public.apiBase as string
const googleClientId = (config.public.googleClientId as string) || '35029038689-imi2e24d90vjici54dibhjehahiv8fea.apps.googleusercontent.com'
const { accessToken, refreshToken, setUser } = useAuth()

const isSubmitting = ref(false)
const selectedPlan = ref<'starter' | 'pro' | 'enterprise'>('pro')

const form = reactive({
  clinicName: '',
  clinicNameKh: '',
  slug: '',
  email: '',
  phone: '',
  address: '',
  adminUsername: '',
  adminPassword: '',
  billingCycle: 'monthly' as 'monthly' | 'yearly',
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

watch(() => form.clinicName, (newName) => {
  if (!form.slug || form.slug === slugify(newName.slice(0, -1))) {
    form.slug = slugify(newName)
  }
})

function onSlugInput() {
  form.slug = slugify(form.slug)
}

function checkClinicNameProvided(): boolean {
  if (!form.clinicName?.trim()) {
    toast.add({
      title: 'ត្រូវបង្កើតឈ្មោះគ្លីនិកជាមុនសិន',
      description: 'សូមបញ្ចូលឈ្មោះគ្លីនិក (អង់គ្លេស ឬ ខ្មែរ) ជាមុនសិន មុនពេលចុចចុះឈ្មោះជាមួយ Gmail ឬ Telegram!',
      color: 'amber',
    })
    const el = document.getElementById('clinicNameInput')
    el?.focus()
    return false
  }
  return true
}

// Google OAuth for SaaS
async function handleGoogleOAuthForSaaS(credential: string) {
  isSubmitting.value = true
  try {
    const res = await $fetch<any>(`${apiBase}/auth/google`, {
      method: 'POST',
      body: {
        credential,
        clinicData: {
          name: form.clinicName.trim() || form.clinicNameKh.trim(),
          nameKh: form.clinicNameKh.trim() || form.clinicName.trim(),
          slug: form.slug.trim() || slugify(form.clinicName),
          phone: form.phone.trim(),
          email: form.email.trim(),
          address: form.address.trim(),
        }
      }
    })

    if (res.data?.access_token) {
      accessToken.value = res.data.access_token
      if (res.data.refresh_token) refreshToken.value = res.data.refresh_token
      if (res.data.user) setUser(res.data.user)
    }

    toast.add({
      title: 'ចុះឈ្មោះជោគជ័យ!',
      description: 'គ្លីនិកត្រូវបានបង្កើតដោយជោគជ័យ ជាមួយគណនី Google (សាកល្បងឥតគិតថ្លៃ ១៤ ថ្ងៃ)',
      color: 'emerald',
    })
    await router.push('/')
  } catch (err: any) {
    console.error('Google registration error:', err)
    toast.add({
      title: 'ការចុះឈ្មោះមិនបានសម្រេច',
      description: err.data?.message || err.message || 'សូមពិនិត្យមើលព័ត៌មានម្តងទៀត',
      color: 'rose',
    })
  } finally {
    isSubmitting.value = false
  }
}

function promptGoogleRegister() {
  if (!checkClinicNameProvided()) return
  const google = (window as any).google
  if (google?.accounts?.id) {
    google.accounts.id.initialize({
      client_id: googleClientId,
      callback: (resp: any) => {
        if (resp?.credential) handleGoogleOAuthForSaaS(resp.credential)
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    })
    google.accounts.id.prompt()
  } else {
    toast.add({
      title: 'Google Service',
      description: 'កំពុងរៀបចំ Google Service... សូមសាកល្បងម្តងទៀត',
      color: 'info'
    })
  }
}

// Telegram OAuth for SaaS
const showTelegramModal = ref(false)
const telegramLoading = ref(false)
const telegramForm = reactive({
  username: '',
  name: '',
  phone: '',
  email: '',
})

function promptTelegramRegister() {
  if (!checkClinicNameProvided()) return
  showTelegramModal.value = true
}

async function handleTelegramRegisterSubmit() {
  if (!telegramForm.username && !telegramForm.phone) {
    toast.add({
      title: 'សូមបំពេញព័ត៌មាន',
      description: 'សូមបញ្ចូល Username Telegram ឬលេខទូរស័ព្ទ',
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

    const res = await $fetch<any>(`${apiBase}/auth/telegram`, {
      method: 'POST',
      body: {
        telegramUser: tgUser,
        clinicData: {
          name: form.clinicName.trim() || form.clinicNameKh.trim(),
          nameKh: form.clinicNameKh.trim() || form.clinicName.trim(),
          slug: form.slug.trim() || slugify(form.clinicName),
          phone: form.phone.trim() || telegramForm.phone,
          email: form.email.trim() || telegramForm.email,
          address: form.address.trim(),
        }
      }
    })

    if (res.data?.access_token) {
      accessToken.value = res.data.access_token
      if (res.data.refresh_token) refreshToken.value = res.data.refresh_token
      if (res.data.user) setUser(res.data.user)
    }

    showTelegramModal.value = false
    toast.add({
      title: 'ចុះឈ្មោះជោគជ័យ!',
      description: 'គ្លីនិកត្រូវបានបង្កើតដោយជោគជ័យ ជាមួយគណនី Telegram (សាកល្បងឥតគិតថ្លៃ ១៤ ថ្ងៃ)',
      color: 'emerald',
    })
    await router.push('/')
  } catch (err: any) {
    console.error('Telegram registration error:', err)
    toast.add({
      title: 'ការចុះឈ្មោះមិនបានសម្រេច',
      description: err.data?.message || err.message || 'សូមពិនិត្យមើលព័ត៌មានម្តងទៀត',
      color: 'rose',
    })
  } finally {
    telegramLoading.value = false
  }
}

async function handleRegister() {
  if (!form.clinicName || !form.slug || !form.email || !form.adminUsername || !form.adminPassword) {
    toast.add({
      title: 'សូមបំពេញព័ត៌មាន',
      description: 'សូមបំពេញរាល់ព័ត៌មានដែលចាំបាច់ (Required Fields)',
      color: 'amber',
    })
    return
  }

  isSubmitting.value = true
  try {
    const res = await $fetch<any>(`${apiBase}/saas/register`, {
      method: 'POST',
      body: {
        ...form,
        planCode: selectedPlan.value,
      },
    })

    if (res.data?.token || res.data?.access_token) {
      accessToken.value = res.data.access_token || res.data.token
      if (res.data.refresh_token) {
        refreshToken.value = res.data.refresh_token
      }
      if (res.data.user) {
        setUser(res.data.user)
      }
    }

    toast.add({
      title: 'ចុះឈ្មោះជោគជ័យ!',
      description: 'គ្លីនិករបស់អ្នកត្រូវបានបង្កើតដោយជោគជ័យ ជាមួយការសាកល្បងឥតគិតថ្លៃ ១៤ ថ្ងៃ។',
      color: 'emerald',
    })

    await router.push('/')
  } catch (err: any) {
    console.error('Registration error:', err)
    toast.add({
      title: 'ការចុះឈ្មោះមិនបានសម្រេច',
      description: err.data?.message || err.message || 'សូមពិនិត្យមើលព័ត៌មានម្តងទៀត',
      color: 'rose',
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-white">
    <div class="sm:mx-auto sm:w-full sm:max-w-2xl text-center space-y-2">
      <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-500/20 border border-primary-500/30 text-primary-300 text-xs font-semibold mb-2">
        <span>🚀</span>
        <span>Cambodia Healthcare SaaS Cloud Platform</span>
      </div>
      <h1 class="text-3xl font-black tracking-tight sm:text-4xl text-white">
        បង្កើតគណនីគ្លីនិកថ្មី (Register Clinic)
      </h1>
      <p class="text-sm text-dimmed">
        ចាប់ផ្តើមសាកល្បងប្រើប្រាស់ប្រព័ន្ធគ្រប់គ្រងគ្លីនិកពេញលេញដោយ <span class="text-emerald-400 font-bold">ឥតគិតថ្លៃ ១៤ ថ្ងៃ</span>
      </p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl px-4 sm:px-0">
      <div class="bg-slate-800/90 backdrop-blur-xl border border-slate-700/80 shadow-2xl rounded-2xl p-6 sm:p-8 space-y-6">
        <!-- Plan Selection Row -->
        <div>
          <label class="block text-xs font-semibold uppercase tracking-wider text-dimmed mb-3">
            ជ្រើសរើសកញ្ចប់សេវា (Choose Subscription Tier)
          </label>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div
              :class="[
                'p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between',
                selectedPlan === 'starter'
                  ? 'border-primary-500 bg-primary-500/15 ring-2 ring-primary-500'
                  : 'border-slate-700 bg-slate-800/60 hover:border-slate-600'
              ]"
              @click="selectedPlan = 'starter'"
            >
              <div>
                <div class="font-bold text-sm text-white">Starter</div>
                <div class="text-xs text-dimmed mt-0.5">គ្លីនិកឯកជនទោល</div>
              </div>
              <div class="mt-3">
                <span class="text-lg font-black text-white">$29</span>
                <span class="text-xs text-dimmed">/ខែ</span>
              </div>
            </div>

            <div
              :class="[
                'p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between relative overflow-hidden',
                selectedPlan === 'pro'
                  ? 'border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500'
                  : 'border-slate-700 bg-slate-800/60 hover:border-slate-600'
              ]"
              @click="selectedPlan = 'pro'"
            >
              <div class="absolute top-0 right-0 bg-emerald-500 text-[10px] font-bold px-2 py-0.5 rounded-bl text-white">
                ពេញនិយម
              </div>
              <div>
                <div class="font-bold text-sm text-white">Pro / Growth</div>
                <div class="text-xs text-dimmed mt-0.5">ស្តុកឱសថ & Lab</div>
              </div>
              <div class="mt-3">
                <span class="text-lg font-black text-white">$79</span>
                <span class="text-xs text-dimmed">/ខែ</span>
              </div>
            </div>

            <div
              :class="[
                'p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between',
                selectedPlan === 'enterprise'
                  ? 'border-primary-500 bg-primary-500/15 ring-2 ring-primary-500'
                  : 'border-slate-700 bg-slate-800/60 hover:border-slate-600'
              ]"
              @click="selectedPlan = 'enterprise'"
            >
              <div>
                <div class="font-bold text-sm text-white">Enterprise</div>
                <div class="text-xs text-dimmed mt-0.5">IPD & HMIS</div>
              </div>
              <div class="mt-3">
                <span class="text-lg font-black text-white">$199</span>
                <span class="text-xs text-dimmed">/ខែ</span>
              </div>
            </div>
          </div>
        </div>

        <form class="space-y-4" @submit.prevent="handleRegister">
          <!-- Clinic Info Section -->
          <div class="border-t border-slate-700/80 pt-4">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-dimmed mb-3">
              ព័ត៌មានគ្លីនិក (Clinic Details)
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-dimmed mb-1">ឈ្មោះគ្លីនិក (អង់គ្លេស) *</label>
                <input
                  id="clinicNameInput"
                  v-model="form.clinicName"
                  type="text"
                  required
                  placeholder="e.g. Hope Polyclinic"
                  class="w-full px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label class="block text-xs font-medium text-dimmed mb-1">ឈ្មោះគ្លីនិក (ខ្មែរ)</label>
                <input
                  v-model="form.clinicNameKh"
                  type="text"
                  placeholder="ឧ. មន្ទីរសម្រាកព្យាបាល ក្តីសង្ឃឹម"
                  class="w-full px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div class="sm:col-span-2">
                <label class="block text-xs font-medium text-dimmed mb-1">អាសយដ្ឋានគេហទំព័រ (Subdomain Slug) *</label>
                <div class="flex items-center">
                  <input
                    v-model="form.slug"
                    type="text"
                    required
                    placeholder="hope-clinic"
                    class="w-full px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-l-lg text-sm text-white focus:outline-none focus:border-primary-500"
                    @input="onSlugInput"
                  />
                  <span class="px-3 py-2 bg-slate-800 border border-l-0 border-slate-700 rounded-r-lg text-xs text-dimmed">
                    .clinic-hms.com
                  </span>
                </div>
                <p class="text-[11px] text-dimmed mt-1">
                  តំណភ្ជាប់សម្រាប់បុគ្គលិកចូលប្រើប្រាស់៖ https://{{ form.slug || 'your-clinic' }}.clinic-hms.com
                </p>
              </div>

              <div>
                <label class="block text-xs font-medium text-dimmed mb-1">លេខទូរស័ព្ទទំនាក់ទំនង</label>
                <input
                  v-model="form.phone"
                  type="text"
                  placeholder="012 345 678"
                  class="w-full px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label class="block text-xs font-medium text-dimmed mb-1">អ៊ីមែលគ្លីនិក *</label>
                <input
                  v-model="form.email"
                  type="email"
                  required
                  placeholder="info@hope-clinic.com"
                  class="w-full px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          <!-- Fast OAuth Action Section -->
          <div class="border-t border-slate-700/80 pt-4">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-xs font-semibold uppercase tracking-wider text-dimmed">
                ឬ ចុះឈ្មោះរហ័សជាមួយគណនី (Fast Sign up)
              </h3>
              <span class="text-[11px] text-amber-400 font-medium">
                * តម្រូវឱ្យបញ្ចូលឈ្មោះគ្លីនិកជាមុនសិន
              </span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                :disabled="isSubmitting"
                class="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white hover:bg-elevated text-highlighted font-semibold text-xs transition shadow cursor-pointer disabled:opacity-50"
                @click="promptGoogleRegister"
              >
                <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>ចុះឈ្មោះរហ័សជាមួយ Gmail</span>
              </button>

              <button
                type="button"
                :disabled="isSubmitting"
                class="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#24A1DE] hover:bg-[#208fC7] text-white font-semibold text-xs transition shadow cursor-pointer disabled:opacity-50"
                @click="promptTelegramRegister"
              >
                <svg class="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18.895-.972 4.417-1.373 6.305-.169.799-.487 1.066-.796 1.092-.67.06-1.18-.44-1.83-.87-.018-.012-.036-.024-.055-.035-1.018-.673-1.608-1.092-2.597-1.745-.37-.245-.128-.38.08-.598.055-.057.994-.912 1.83-1.68.046-.042.09-.085.132-.128.38-.355.19-.553-.255-.255l-3.328 2.253c-.47.319-.9.475-1.288.466-.43-.01-.84-.23-1.144-.33-.62-.204-1.11-.314-1.07-.66.02-.18.27-.37.74-.56 2.91-1.27 4.86-2.11 5.84-2.52 2.78-1.16 3.36-1.36 3.74-1.37.08 0 .27.02.39.12.1.08.13.2.14.28-.01.07-.01.18-.03.28z"/>
                </svg>
                <span>ចុះឈ្មោះរហ័សជាមួយ Telegram</span>
              </button>
            </div>

            <div class="relative my-4">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-slate-700/80" />
              </div>
              <div class="relative flex justify-center text-[10px] uppercase">
                <span class="bg-slate-800 px-2 text-dimmed">ឬ បង្កើតគណនី Admin ដោយប្រើ Password ធម្មតា</span>
              </div>
            </div>
          </div>

          <!-- Admin Account Section -->
          <div class="pt-1">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-dimmed mb-3">
              គណនីអ្នកគ្រប់គ្រងដំបូង (Admin Credentials)
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-dimmed mb-1">ឈ្មោះគណនី (Username) *</label>
                <input
                  v-model="form.adminUsername"
                  type="text"
                  placeholder="admin"
                  class="w-full px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label class="block text-xs font-medium text-dimmed mb-1">ពាក្យសម្ងាត់ (Password) *</label>
                <input
                  v-model="form.adminPassword"
                  type="password"
                  placeholder="••••••••"
                  class="w-full px-3 py-2 bg-slate-900/80 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          <!-- Submit Button -->
          <div class="pt-4">
            <button
              type="submit"
              :disabled="isSubmitting"
              class="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-primary-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <span v-if="isSubmitting" class="animate-spin text-lg">↻</span>
              <span>បង្កើតគ្លីនិក និងចាប់ផ្តើមសាកល្បង ១៤ ថ្ងៃ</span>
            </button>
          </div>
        </form>

        <div class="text-center pt-2">
          <p class="text-xs text-dimmed">
            មានគណនីរួចហើយ?
            <NuxtLink to="/login" class="text-primary-400 hover:underline font-semibold">
              ចូលប្រើប្រាស់នៅទីនេះ (Login)
            </NuxtLink>
          </p>
        </div>
      </div>
    </div>

    <!-- Telegram SaaS Registration Modal -->
    <div
      v-if="showTelegramModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div class="bg-slate-900 border border-slate-700 text-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-[#24A1DE] text-white flex items-center justify-center">
              <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18.895-.972 4.417-1.373 6.305-.169.799-.487 1.066-.796 1.092-.67.06-1.18-.44-1.83-.87-.018-.012-.036-.024-.055-.035-1.018-.673-1.608-1.092-2.597-1.745-.37-.245-.128-.38.08-.598.055-.057.994-.912 1.83-1.68.046-.042.09-.085.132-.128.38-.355.19-.553-.255-.255l-3.328 2.253c-.47.319-.9.475-1.288.466-.43-.01-.84-.23-1.144-.33-.62-.204-1.11-.314-1.07-.66.02-.18.27-.37.74-.56 2.91-1.27 4.86-2.11 5.84-2.52 2.78-1.16 3.36-1.36 3.74-1.37.08 0 .27.02.39.12.1.08.13.2.14.28-.01.07-.01.18-.03.28z"/>
              </svg>
            </div>
            <h3 class="font-bold text-base text-white">
              ចុះឈ្មោះតាមរយៈ Telegram (Telegram Auth)
            </h3>
          </div>
          <button
            type="button"
            class="text-dimmed hover:text-white text-lg font-bold cursor-pointer"
            @click="showTelegramModal = false"
          >
            ✕
          </button>
        </div>

        <p class="text-xs text-dimmed">
          គ្លីនិក <span class="text-emerald-400 font-semibold">{{ form.clinicName || form.clinicNameKh }}</span> នឹងត្រូវបានបង្កើតឡើង និងភ្ជាប់ជាមួយគណនី Telegram របស់អ្នក៖
        </p>

        <form class="space-y-3" @submit.prevent="handleTelegramRegisterSubmit">
          <div>
            <label class="block text-xs font-semibold text-dimmed mb-1">
              Telegram Username (ឧ. @username) <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="telegramForm.username"
              type="text"
              placeholder="@your_telegram_username"
              class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#24A1DE]"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-dimmed mb-1">
              ឈ្មោះពេញ (Full Name)
            </label>
            <input
              v-model="telegramForm.name"
              type="text"
              placeholder="ឧ. Sokha Hem"
              class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#24A1DE]"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-dimmed mb-1">
              លេខទូរស័ព្ទ
            </label>
            <input
              v-model="telegramForm.phone"
              type="tel"
              placeholder="012 345 678"
              class="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#24A1DE]"
            />
          </div>

          <div class="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              class="px-4 py-2 text-xs text-dimmed hover:bg-slate-800 rounded-lg transition cursor-pointer"
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
              <span>បង្កើតគ្លីនិក & ចុះឈ្មោះ</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
