<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '~/composables/auth/useAuth'
import { $api } from '~/utils/api'

definePageMeta({
  layout: false
})

const router = useRouter()
const toast = useToast()
const { user, clinicId, setUser, accessToken, refreshToken, logout } = useAuth()

// If user already has a clinic, redirect to dashboard immediately
onMounted(() => {
  if (clinicId.value) {
    router.replace('/')
  }
})

const isSubmitting = ref(false)

const form = reactive({
  nameKh: '',
  name: '',
  slug: '',
  phone: '',
  email: user.value?.email || '',
  address: '',
  description: ''
})

// Auto-generate slug when English name changes
watch(() => form.name, (newName) => {
  if (!form.slug || form.slug === slugify(newName.slice(0, -1))) {
    form.slug = slugify(newName)
  }
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

function onSlugInput() {
  form.slug = slugify(form.slug)
}

async function handleCreateClinic() {
  if (!form.nameKh?.trim()) {
    toast.add({ title: 'សូមបំពេញព័ត៌មាន', description: 'សូមបញ្ចូលឈ្មោះគ្លីនិកជាភាសាខ្មែរ', color: 'warning' })
    return
  }
  if (!form.name?.trim()) {
    toast.add({ title: 'សូមបំពេញព័ត៌មាន', description: 'សូមបញ្ចូលឈ្មោះគ្លីនិកជាភាសាអង់គ្លេស', color: 'warning' })
    return
  }
  if (!form.phone?.trim()) {
    toast.add({ title: 'សូមបំពេញព័ត៌មាន', description: 'សូមបញ្ចូលលេខទូរស័ព្ទគ្លីនិក', color: 'warning' })
    return
  }
  if (!form.address?.trim()) {
    toast.add({ title: 'សូមបំពេញព័ត៌មាន', description: 'សូមបញ្ចូលអាសយដ្ឋានគ្លីនិក', color: 'warning' })
    return
  }

  isSubmitting.value = true
  try {
    const res = await $api<{ message: string; data: any; access_token?: string; refresh_token?: string; user?: any }>('/clinics', {
      method: 'POST',
      body: {
        name: form.name.trim(),
        nameKh: form.nameKh.trim(),
        slug: form.slug.trim() || slugify(form.name),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        description: form.description.trim()
      }
    })

    // Update session tokens with clinicId & branchId
    if (res.access_token) {
      accessToken.value = res.access_token
    }
    if (res.refresh_token) {
      refreshToken.value = res.refresh_token
    }
    if (res.user) {
      setUser(res.user)
    } else if (res.data?._id) {
      setUser({
        ...user.value,
        clinicId: res.data._id
      })
    }

    toast.add({
      title: 'ជោគជ័យ!',
      description: 'គ្លីនិកត្រូវបានបង្កើតដោយជោគជ័យ! ប្រព័ន្ធបានបើកដំណើរការសម្រាប់អ្នក។',
      color: 'success'
    })

    // Redirect to home dashboard
    await router.replace('/')
  } catch (err: any) {
    console.error('Failed to create clinic:', err)
    toast.add({
      title: 'ការបង្កើតគ្លីនិកមិនបានសម្រេច',
      description: err.data?.message || err.message || 'សូមពិនិត្យព័ត៌មានម្តងទៀត',
      color: 'error'
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 text-white relative">
    <!-- Top Bar with User Info & Logout -->
    <div class="absolute top-6 right-6 flex items-center gap-4">
      <div class="flex items-center gap-2 text-sm text-dimmed bg-white/10 backdrop-blur px-3 py-1.5 rounded-full">
        <UIcon name="i-lucide-user" class="w-4 h-4 text-emerald-400" />
        <span>{{ user?.username || user?.email }}</span>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 text-xs text-rose-300 hover:text-rose-200 bg-rose-500/20 hover:bg-rose-500/30 px-3 py-1.5 rounded-full transition"
        @click="logout"
      >
        <UIcon name="i-lucide-log-out" class="w-3.5 h-3.5" />
        <span>ចាកចេញ (Log Out)</span>
      </button>
    </div>

    <div class="sm:mx-auto sm:w-full sm:max-w-2xl text-center space-y-3">
      <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
        <span>🏥</span>
        <span>ជំហានដំបូង៖ បង្កើតគ្លីនិក (Initial Clinic Setup)</span>
      </div>

      <h1 class="text-3xl font-black tracking-tight sm:text-4xl text-white">
        រៀបចំបង្កើតគ្លីនិករបស់អ្នក
      </h1>
      <p class="text-sm text-dimmed max-w-lg mx-auto">
        សូមបញ្ចូលព័ត៌មានគ្លីនិករបស់អ្នកជាមុនសិន ដើម្បីចាប់ផ្តើមប្រើប្រាស់ប្រព័ន្ធគ្រប់គ្រងគ្លីនិកពេញលេញ
      </p>

      <!-- Free Trial Banner -->
      <div class="p-3 bg-indigo-500/20 border border-indigo-400/30 rounded-xl inline-flex items-center gap-3 text-xs text-indigo-200 max-w-lg mx-auto text-left">
        <UIcon name="i-lucide-gift" class="w-5 h-5 text-amber-400 shrink-0" />
        <div>
          <span class="font-bold text-white">កញ្ចប់សាកល្បងឥតគិតថ្លៃ ១៤ ថ្ងៃ (14-Day Free Pro Trial):</span>
          <span> បន្ទាប់ពីបង្កើតរួច អ្នកនឹងទទួលបានគណនី Admin, សាខាមេ (Main Branch), និងមុខងារវេជ្ជសាស្ត្រទាំងអស់ដោយស្វ័យប្រវត្តិ។</span>
        </div>
      </div>
    </div>

    <!-- Setup Form Card -->
    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
      <div class="bg-slate-800/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        <form class="space-y-5" @submit.prevent="handleCreateClinic">
          <!-- Clinic Names (Khmer & English) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label class="block text-xs font-semibold text-slate-200 mb-1.5">
                ឈ្មោះគ្លីនិក (ភាសាខ្មែរ) <span class="text-rose-400">*</span>
              </label>
              <input
                v-model="form.nameKh"
                type="text"
                required
                placeholder="ឧ. គ្លីនិក សុខភាពល្អ"
                class="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-200 mb-1.5">
                Clinic Name (English) <span class="text-rose-400">*</span>
              </label>
              <input
                v-model="form.name"
                type="text"
                required
                placeholder="e.g. Sokhapheap Clinic"
                class="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>
          </div>

          <!-- Subdomain / Slug -->
          <div>
            <label class="block text-xs font-semibold text-slate-200 mb-1.5">
              គេហទំព័រ / Subdomain (Slug) <span class="text-rose-400">*</span>
            </label>
            <div class="flex rounded-lg overflow-hidden border border-slate-700 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent bg-slate-900/80">
              <span class="inline-flex items-center px-3 text-xs text-dimmed bg-slate-800/80 border-r border-slate-700">
                https://
              </span>
              <input
                v-model="form.slug"
                type="text"
                required
                placeholder="my-clinic"
                class="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none"
                @input="onSlugInput"
              />
              <span class="inline-flex items-center px-3 text-xs text-dimmed bg-slate-800/80 border-l border-slate-700">
                .clinic.com
              </span>
            </div>
            <p class="text-[11px] text-dimmed mt-1">
              អាសយដ្ឋានតំណភ្ជាប់ផ្ទាល់ខ្លួនសម្រាប់គ្លីនិករបស់អ្នក (អក្សរតូច និងសញ្ញាដក -)
            </p>
          </div>

          <!-- Contact Details (Phone & Email) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label class="block text-xs font-semibold text-slate-200 mb-1.5">
                លេខទូរស័ព្ទគ្លីនិក <span class="text-rose-400">*</span>
              </label>
              <input
                v-model="form.phone"
                type="tel"
                required
                placeholder="012 345 678"
                class="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-200 mb-1.5">
                អ៊ីមែលទំនាក់ទំនងគ្លីនិក
              </label>
              <input
                v-model="form.email"
                type="email"
                placeholder="clinic@example.com"
                class="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>
          </div>

          <!-- Address -->
          <div>
            <label class="block text-xs font-semibold text-slate-200 mb-1.5">
              អាសយដ្ឋានគ្លីនិក <span class="text-rose-400">*</span>
            </label>
            <textarea
              v-model="form.address"
              rows="2"
              required
              placeholder="លេខផ្ទះ ផ្លូវ សង្កាត់ ខណ្ឌ រាជធានី/ខេត្ត"
              class="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
            />
          </div>

          <!-- Description (Optional) -->
          <div>
            <label class="block text-xs font-semibold text-slate-200 mb-1.5">
              ការពិពណ៌នាសង្ខេបពីគ្លីនិក (Optional)
            </label>
            <input
              v-model="form.description"
              type="text"
              placeholder="ឧ. ព្យាបាលជំងឺទូទៅ និងកុមារ បើកបម្រើ ២៤/៧"
              class="w-full bg-slate-900/80 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
            />
          </div>

          <!-- Submit Button -->
          <div class="pt-2">
            <button
              type="submit"
              :disabled="isSubmitting"
              class="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition transform active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              <UIcon
                v-if="isSubmitting"
                name="i-lucide-loader-2"
                class="w-5 h-5 animate-spin"
              />
              <UIcon
                v-else
                name="i-lucide-check-circle-2"
                class="w-5 h-5"
              />
              <span>{{ isSubmitting ? 'កំពុងបង្កើតគ្លីនិក...' : 'បង្កើតគ្លីនិក & ចាប់ផ្តើមប្រើប្រាស់ (Create Clinic & Launch)' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
