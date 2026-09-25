<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const toast = useToast()
const { clinicId } = useAuth()

const isLoading = ref(true)
const isRenewing = ref(false)
const showRenewModal = ref(false)
const renewalStep = ref<'select' | 'khqr'>('select')

const selectedPlan = ref<'starter' | 'pro' | 'enterprise'>('pro')
const selectedCycle = ref<'monthly' | 'yearly'>('monthly')
const khqrData = ref<any>(null)

// Fetch subscription & quota usage
const { data: subData, refresh: refreshSub } = await useAsyncData('tenant-subscription', async () => {
  try {
    const res = await $api<{ data: any }>('/saas/subscription')
    return res.data
  } catch (err: any) {
    console.error('Failed to load subscription:', err)
    return null
  } finally {
    isLoading.value = false
  }
}, { immediate: true })

const subscription = computed(() => subData.value?.subscription)
const plan = computed(() => subData.value?.plan)
const usage = computed(() => subData.value?.usage)

const daysRemaining = computed(() => {
  if (!subscription.value?.currentPeriodEnd) return 0
  const end = new Date(subscription.value.currentPeriodEnd).getTime()
  const now = new Date().getTime()
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : 0
})

const statusBadgeColor = computed(() => {
  switch (subscription.value?.status) {
    case 'active': return 'emerald'
    case 'trialing': return 'amber'
    case 'past_due': return 'rose'
    case 'suspended': return 'red'
    default: return 'gray'
  }
})

async function generateKHQR() {
  isRenewing.value = true
  try {
    const res = await $api<{ success: boolean; data: any }>('/saas/subscription/renew', {
      method: 'POST',
      body: {
        planCode: selectedPlan.value,
        billingCycle: selectedCycle.value,
        currency: 'USD'
      }
    })
    khqrData.value = res.data
    renewalStep.value = 'khqr'
  } catch (err: any) {
    toast.add({
      title: 'កំហុស (Error)',
      description: err.data?.message || err.message || 'មិនអាចបង្កើតកូដ KHQR បានទេ',
      color: 'rose'
    })
  } finally {
    isRenewing.value = false
  }
}

async function checkPaymentStatus() {
  await refreshSub()
  toast.add({
    title: 'បានធ្វើបច្ចុប្បន្នភាព',
    description: 'ស្ថានភាពកញ្ចប់សេវាត្រូវបានត្រួតពិនិត្យរួចរាល់',
    color: 'emerald'
  })
}

function openModal() {
  selectedPlan.value = plan.value?.code || 'pro'
  renewalStep.value = 'select'
  showRenewModal.value = true
}
</script>

<template>
  <div class="space-y-6 max-w-5xl mx-auto pb-12">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-highlighted flex items-center gap-2">
          <span>💳</span>
          <span>កញ្ចប់សេវា និងការទូទាត់ (Subscription & Billing)</span>
        </h1>
        <p class="text-sm text-muted mt-1">
          គ្រប់គ្រងគម្រោងសេវាកម្ម SaaS, កម្រិតកំណត់ធនធាន (Quotas), និងការបន្តសុពលភាពតាម KHQR
        </p>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          icon="i-heroicons-arrow-path"
          color="neutral"
          variant="outline"
          :loading="isLoading"
          @click="refreshSub"
        >
          ផ្ទុកឡើងវិញ
        </UButton>
        <UButton
          icon="i-heroicons-sparkles"
          color="primary"
          @click="openModal"
        >
          បន្តសុពលភាព / ប្តូរកញ្ចប់ (Renew)
        </UButton>
      </div>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div v-for="i in 3" :key="i" class="h-44 rounded-xl bg-elevated animate-pulse" />
    </div>

    <!-- Main Overview Cards -->
    <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-5">
      <!-- Active Plan Card -->
      <UCard class="bg-gradient-to-br from-primary-500/10 to-transparent border-primary-200 dark:border-primary-800">
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase tracking-wider text-primary">
              កញ្ចប់សេវាបច្ចុប្បន្ន
            </span>
            <UBadge :color="statusBadgeColor" variant="subtle" size="sm" class="capitalize">
              {{ subscription?.status === 'trialing' ? 'សាកល្បងឥតគិតថ្លៃ (Trial)' : subscription?.status }}
            </UBadge>
          </div>
          <div class="text-2xl font-black text-highlighted">
            {{ plan?.nameKh || plan?.name || 'Pro Clinic' }}
          </div>
          <div class="text-sm text-toned">
            ${{ plan?.priceMonthlyUsd }} / ខែ ({{ subscription?.billingCycle === 'yearly' ? 'បង់ប្រចាំឆ្នាំ' : 'បង់ប្រចាំខែ' }})
          </div>
        </div>
      </UCard>

      <!-- Expiration Countdown -->
      <UCard>
        <div class="space-y-3">
          <span class="text-xs font-semibold uppercase tracking-wider text-muted">
            សុពលភាពដែលនៅសល់
          </span>
          <div class="flex items-baseline gap-2">
            <span class="text-3xl font-black text-primary">
              {{ daysRemaining }}
            </span>
            <span class="text-sm font-medium text-muted">ថ្ងៃ (Days Left)</span>
          </div>
          <div class="text-xs text-muted">
            ផុតកំណត់នៅ៖ {{ subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString('km-KH') : 'N/A' }}
          </div>
        </div>
      </UCard>

      <!-- Payment Method Card -->
      <UCard>
        <div class="space-y-3">
          <span class="text-xs font-semibold uppercase tracking-wider text-muted">
            វិធីសាស្ត្រទូទាត់ប្រាក់
          </span>
          <div class="flex items-center gap-2">
            <span class="text-xl">🇰🇭</span>
            <span class="font-bold text-highlighted">Bakong KHQR (Dynamic)</span>
          </div>
          <div class="text-xs text-muted">
            ទទួលស្គាល់ដោយធនាគារជាតិ គាំទ្ររាល់ App ធនាគារ (ABA, ACLEDA, Sathapana)
          </div>
        </div>
      </UCard>
    </div>

    <!-- Quotas & Limits Usage -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-base font-bold text-highlighted flex items-center gap-2">
            <span>📊</span>
            <span>កម្រិតកំណត់ធនធានប្រើប្រាស់ (Resource Quotas & Usage)</span>
          </h2>
          <span class="text-xs text-muted">ធ្វើបច្ចុប្បន្នភាពតាមពេលវេលាជាក់ស្តែង</span>
        </div>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <!-- Users Quota -->
        <div class="space-y-2 p-4 rounded-xl bg-muted border border-default">
          <div class="flex justify-between text-sm">
            <span class="font-medium text-default">បុគ្គលិក / គណនី (Users)</span>
            <span class="font-bold text-primary-600">{{ usage?.users?.current }} / {{ usage?.users?.max === -1 ? '∞' : usage?.users?.max }}</span>
          </div>
          <div class="w-full bg-accented rounded-full h-2.5 overflow-hidden">
            <div
              class="bg-primary-500 h-2.5 rounded-full transition-all duration-500"
              :style="{ width: `${usage?.users?.percentage || 0}%` }"
            />
          </div>
          <p class="text-xs text-muted">ចំនួនបុគ្គលិកដែលអាចបង្កើតបានក្នុងប្រព័ន្ធ</p>
        </div>

        <!-- Patients Quota -->
        <div class="space-y-2 p-4 rounded-xl bg-muted border border-default">
          <div class="flex justify-between text-sm">
            <span class="font-medium text-default">អ្នកជំងឺប្រចាំខែ (Patients)</span>
            <span class="font-bold text-emerald-600">{{ usage?.patients?.current }} / {{ usage?.patients?.max === -1 ? 'មិនកំណត់ (Unlimited)' : usage?.patients?.max }}</span>
          </div>
          <div class="w-full bg-accented rounded-full h-2.5 overflow-hidden">
            <div
              class="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
              :style="{ width: `${usage?.patients?.percentage || 0}%` }"
            />
          </div>
          <p class="text-xs text-muted">ចំនួនអ្នកជំងឺមកពិនិត្យព្យាបាលក្នុងខែនេះ</p>
        </div>

        <!-- Storage Quota -->
        <div class="space-y-2 p-4 rounded-xl bg-muted border border-default">
          <div class="flex justify-between text-sm">
            <span class="font-medium text-default">ទំហំផ្ទុកទិន្នន័យ (Storage)</span>
            <span class="font-bold text-purple-600">{{ (usage?.storageMb?.max / 1024).toFixed(0) }} GB Limit</span>
          </div>
          <div class="w-full bg-accented rounded-full h-2.5 overflow-hidden">
            <div
              class="bg-purple-500 h-2.5 rounded-full transition-all duration-500"
              :style="{ width: `${usage?.storageMb?.percentage || 2}%` }"
            />
          </div>
          <p class="text-xs text-muted">ទំហំផ្ទុកឯកសារ PDF, រូបភាព Lab, និងកំណត់ត្រា</p>
        </div>
      </div>
    </UCard>

    <!-- Included Features Matrix -->
    <UCard>
      <template #header>
        <h2 class="text-base font-bold text-highlighted flex items-center gap-2">
          <span>✨</span>
          <span>មុខងារដែលបានបើកដំណើរការក្នុងគ្លីនិក (Enabled Modules)</span>
        </h2>
      </template>

      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        <div
          v-for="feat in plan?.features || []"
          :key="feat"
          class="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted border border-default text-xs font-semibold text-highlighted capitalize"
        >
          <span class="text-emerald-500">✓</span>
          <span>{{ feat.replace('_', ' ') }}</span>
        </div>
      </div>
    </UCard>

    <!-- Renewal & KHQR Modal -->
    <UModal v-model="showRenewModal" :ui="{ width: 'sm:max-w-lg' }">
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold text-highlighted flex items-center gap-2">
              <span>🇰🇭</span>
              <span>បន្តសុពលភាពតាម KHQR (Renew Plan)</span>
            </h3>
            <UButton icon="i-heroicons-x-mark" color="neutral" variant="ghost" @click="showRenewModal = false" />
          </div>
        </template>

        <!-- Step 1: Select Plan & Cycle -->
        <div v-if="renewalStep === 'select'" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-default mb-2">
              ជ្រើសរើសកញ្ចប់សេវា (Select Plan)
            </label>
            <div class="grid grid-cols-3 gap-2">
              <button
                type="button"
                :class="[
                  'p-3 rounded-xl border text-left transition-all',
                  selectedPlan === 'starter'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30'
                    : 'border-default'
                ]"
                @click="selectedPlan = 'starter'"
              >
                <div class="font-bold text-sm">Starter</div>
                <div class="text-xs text-primary-600 font-bold">$29/ខែ</div>
              </button>

              <button
                type="button"
                :class="[
                  'p-3 rounded-xl border text-left transition-all',
                  selectedPlan === 'pro'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30'
                    : 'border-default'
                ]"
                @click="selectedPlan = 'pro'"
              >
                <div class="font-bold text-sm">Pro / Growth</div>
                <div class="text-xs text-primary-600 font-bold">$79/ខែ</div>
              </button>

              <button
                type="button"
                :class="[
                  'p-3 rounded-xl border text-left transition-all',
                  selectedPlan === 'enterprise'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30'
                    : 'border-default'
                ]"
                @click="selectedPlan = 'enterprise'"
              >
                <div class="font-bold text-sm">Enterprise</div>
                <div class="text-xs text-primary-600 font-bold">$199/ខែ</div>
              </button>
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-default mb-2">
              រយៈពេលបង់ប្រាក់ (Billing Cycle)
            </label>
            <div class="grid grid-cols-2 gap-3">
              <button
                type="button"
                :class="[
                  'p-3 rounded-xl border text-center transition-all',
                  selectedCycle === 'monthly'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30 font-bold text-primary-600'
                    : 'border-default text-toned'
                ]"
                @click="selectedCycle = 'monthly'"
              >
                ប្រចាំខែ (Monthly)
              </button>
              <button
                type="button"
                :class="[
                  'p-3 rounded-xl border text-center transition-all',
                  selectedCycle === 'yearly'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30 font-bold text-primary-600'
                    : 'border-default text-toned'
                ]"
                @click="selectedCycle = 'yearly'"
              >
                ប្រចាំឆ្នាំ (Yearly - សន្សំ ២ ខែ)
              </button>
            </div>
          </div>

          <div class="pt-2">
            <UButton
              block
              size="lg"
              color="primary"
              :loading="isRenewing"
              @click="generateKHQR"
            >
              បង្កើតកូដ KHQR ដើម្បីបង់ប្រាក់
            </UButton>
          </div>
        </div>

        <!-- Step 2: Display Dynamic KHQR Code -->
        <div v-else class="text-center space-y-4 py-2">
          <div class="inline-flex flex-col items-center p-4 rounded-2xl bg-white border-2 border-primary-500 shadow-xl">
            <div class="text-xs font-bold text-red-600 uppercase tracking-widest mb-2 flex items-center gap-1">
              <span>🇰🇭</span>
              <span>BAKONG KHQR</span>
            </div>
            <!-- Dynamic QR Display using reliable QR API -->
            <img
              :src="`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(khqrData?.khqrString || '')}`"
              alt="KHQR Code"
              class="w-52 h-52 object-contain rounded-lg"
            />
            <div class="mt-3 text-lg font-black text-highlighted">
              ${{ khqrData?.amount?.toFixed(2) }}
            </div>
            <div class="text-xs text-muted">
              វិក្កយបត្រ៖ {{ khqrData?.invoiceNumber }}
            </div>
          </div>

          <p class="text-xs text-muted">
            សូមបើកកម្មវិធីធនាគារណាមួយ (ABA, ACLEDA, Wing, Canadia, Sathapana) រួចស្កេនទូទាត់ប្រាក់ភ្លាមៗ។
          </p>

          <div class="flex items-center gap-2 pt-2">
            <UButton
              block
              color="primary"
              variant="solid"
              @click="checkPaymentStatus"
            >
              ខ្ញុំបានទូទាត់រួចរាល់ហើយ (Confirm)
            </UButton>
          </div>
        </div>
      </UCard>
    </UModal>
  </div>
</template>
