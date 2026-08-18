<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useAsyncData, navigateTo } from '#app'
import { $api } from '~/utils/api'
import OpdRoundHistoryTable from '~/components/opd/partials/OpdRoundHistoryTable.vue'

const { t } = useI18n()
const route = useRoute()
const id = route.params.id as string

interface Patient {
  _id?: string
  pId?: number
  name?: string
  nameKh?: string
  nameEn?: string
  gender: number | string
  dob: string
  phone: string
  email: string
  address: string
  villageName?: string
  communeName?: string
  districtName?: string
  provinceName?: string
  allergies?: string[] | string
  bloodGroup?: string
}

interface Payment {
  _id: string
  paidAt: string
  amount: number
  method: string
  status: string
  paymentId?: number
}

const { data: patientRes } = await useAsyncData(`patient-${id}`, () => $api<{ data: Patient }>(`/patients/${id}`))
const { data: paymentsRes } = await useAsyncData(`patient-payments-${id}`, () => $api<{ data: Payment[] }>(`/patients/${id}/payments`))
const { data: billingRes } = await useAsyncData(`patient-billing-${id}`, () => $api<{ data: any }>(`/patients/${id}/billing-report`))

const patient = computed(() => (patientRes.value as any)?.data)
const payments = computed<Payment[]>(() => (paymentsRes.value as any)?.data || [])
const billing = computed(() => (billingRes.value as any)?.data)

const tabItems = [
  { label: 'ប្រវត្តិចូលពេទ្យ & Round', value: 'history', icon: 'i-lucide-history', slot: 'history' },
  { label: t('payment.title') || 'ការទូទាត់ប្រាក់', value: 'payments', icon: 'i-lucide-credit-card', slot: 'payments' },
  { label: 'សង្ខេបវិក្កយបត្រ (Billing)', value: 'billing', icon: 'i-lucide-calculator', slot: 'billing' }
]

const selectedTab = ref('history')

const breadcrumbItems = computed(() => [
  { label: 'Home', to: '/' },
  { label: 'Patients', to: '/patients' },
  { label: patient.value?.nameKh || patient.value?.nameEn || patient.value?.name || 'Details', to: '#' }
])

const patientDisplayName = computed(() => {
  if (patient.value?.nameKh && patient.value?.nameEn) {
    return `${patient.value.nameKh} (${patient.value.nameEn})`
  }
  return patient.value?.nameKh || patient.value?.nameEn || patient.value?.name || 'Unknown Patient'
})

const allergyList = computed(() => {
  if (!patient.value?.allergies) return []
  if (Array.isArray(patient.value.allergies)) return patient.value.allergies
  return [patient.value.allergies]
})

function formatDate(date: string) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString()
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)
}

function printHistory() {
  window.print()
}

function createNewVisit() {
  navigateTo(`/opd?patientId=${id}`)
}
</script>

<template>
  <div v-if="patient" class="space-y-6 font-khmer">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <UBreadcrumb :items="breadcrumbItems" class="mb-2" />
        <h1 class="text-2xl font-bold flex items-center gap-2">
          {{ patientDisplayName }}
          <UBadge :color="patient.gender == 2 ? 'error' : 'primary'" variant="subtle">
            {{ patient.gender == 2 ? t('patient.female') || 'ស្រី' : t('patient.male') || 'ប្រុស' }}
          </UBadge>
          <span class="text-sm font-normal text-gray-500">
            ID: P-{{ String(patient.pId || '').padStart(6, '0') }}
          </span>
        </h1>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          :label="t('common.print') || 'បោះពុម្ព'"
          icon="i-lucide-printer"
          color="neutral"
          variant="outline"
          @click="printHistory"
        />
        <UButton
          :label="t('visit.new') || 'ពិនិត្យជំងឺថ្មី (New OPD)'"
          icon="i-lucide-plus"
          color="primary"
          @click="createNewVisit"
        />
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left Column: Patient Profile -->
      <div class="space-y-6">
        <UCard>
          <template #header>
            <h3 class="font-semibold flex items-center gap-2">
              <UIcon name="i-lucide-user" class="text-primary-500" />
              {{ t('common.details') || 'ព័ត៌មានលម្អិតអ្នកជំងឺ' }}
            </h3>
          </template>
          <div class="space-y-3.5 text-sm">
            <div class="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
              <span class="text-gray-500">{{ t('patient.dob') || 'ថ្ងៃខែឆ្នាំកំណើត' }}</span>
              <span class="font-medium">{{ formatDate(patient.dob) }}</span>
            </div>
            <div class="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
              <span class="text-gray-500">{{ t('patient.phone') || 'លេខទូរស័ព្ទ' }}</span>
              <span class="font-medium">{{ patient.phone || '-' }}</span>
            </div>
            <div class="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
              <span class="text-gray-500">ក្រុមឈាម (Blood Group)</span>
              <span class="font-bold text-primary-600">{{ patient.bloodGroup || 'មិនបានកត់ត្រា' }}</span>
            </div>
            <div class="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
              <span class="text-gray-500">{{ t('patient.email') || 'អ៊ីមែល' }}</span>
              <span class="font-medium">{{ patient.email || '-' }}</span>
            </div>
            <div class="space-y-1 pt-1">
              <span class="text-gray-500 text-xs">{{ t('patient.address') || 'អាសយដ្ឋានបច្ចុប្បន្ន' }}</span>
              <p class="text-xs font-medium leading-relaxed">
                {{ [patient.villageName, patient.communeName, patient.districtName, patient.provinceName].filter(Boolean).join(', ') || patient.address || '-' }}
              </p>
            </div>
          </div>
        </UCard>

        <!-- Allergies Card -->
        <UCard v-if="allergyList.length > 0" class="border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-shield-alert" class="text-rose-500 w-5 h-5" />
              <h3 class="font-bold text-rose-600 dark:text-rose-400">
                {{ t('patient.allergies') || 'ប្រវត្តិប្រតិកម្មថ្នាំ (Allergies)' }}
              </h3>
            </div>
          </template>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="(alg, idx) in allergyList"
              :key="idx"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-500 text-white shadow-xs"
            >
              <UIcon name="i-lucide-alert-triangle" class="w-3.5 h-3.5" />
              {{ alg }}
            </span>
          </div>
        </UCard>
      </div>

      <!-- Right Column: Medical History & Billing Tabs -->
      <div class="lg:col-span-2 space-y-4">
        <UTabs v-model="selectedTab" :items="tabItems" class="w-full">
          <template #history>
            <div class="pt-3 h-[650px]">
              <OpdRoundHistoryTable :patient-id="id" />
            </div>
          </template>

          <template #payments>
            <div class="pt-4 space-y-4">
              <UTable
                :data="payments"
                :columns="[
                  { accessorKey: 'paymentId', header: 'ID' },
                  { accessorKey: 'paidAt', header: t('payment.date') || 'កាលបរិច្ឆេទ' },
                  { accessorKey: 'amount', header: t('payment.amount') || 'ចំនួនទឹកប្រាក់' },
                  { accessorKey: 'method', header: t('payment.method') || 'វិធីសាស្រ្ត' },
                  { accessorKey: 'status', header: t('payment.status') || 'ស្ថានភាព' }
                ]"
              >
                <template #paidAt-cell="{ row }">
                  {{ formatDate(row.original.paidAt) }}
                </template>
                <template #amount-cell="{ row }">
                  {{ formatCurrency(row.original.amount) }}
                </template>
                <template #status-cell="{ row }">
                  <UBadge
                    :color="row.original.status === 'paid' ? 'success' : 'warning'"
                    variant="subtle"
                  >
                    {{ row.original.status }}
                  </UBadge>
                </template>
              </UTable>
            </div>
          </template>

          <template #billing>
            <div class="pt-4 space-y-6">
              <UCard v-if="billing">
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <span class="text-xs text-gray-500">សរុបបានទូទាត់ (Total Paid)</span>
                    <p class="text-xl font-bold text-emerald-600">{{ formatCurrency(billing.totalPaid) }}</p>
                  </div>
                  <div>
                    <span class="text-xs text-gray-500">ប្រាក់នៅសល់ (Balance Due)</span>
                    <p class="text-xl font-bold text-rose-600">{{ formatCurrency(billing.balanceDue) }}</p>
                  </div>
                </div>
              </UCard>
            </div>
          </template>
        </UTabs>
      </div>
    </div>
  </div>
</template>

<style scoped>
.font-khmer {
  font-family: 'Battambang', 'Noto Sans Khmer', serif;
}
</style>
