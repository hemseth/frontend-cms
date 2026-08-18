<script setup lang="ts">
import { ref, computed, h, resolveComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useAsyncData, navigateTo } from '#app'
import { $api } from '~/utils/api'

const { t } = useI18n()
const route = useRoute()
const id = route.params.id as string

interface Patient {
  name: string
  gender: number
  dob: string
  phone: string
  email: string
  address: string
  villageName?: string
  communeName?: string
  districtName?: string
  provinceName?: string
  allergies?: string
}

interface Visit {
  _id: string
  visit_date: string
  visit_type: string
  reason: string
  diagnosis?: string
  treatment?: string
  status?: string
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
const { data: visitsRes } = await useAsyncData(`patient-visits-${id}`, () => $api<{ data: Visit[] }>(`/patients/${id}/visits`))
const { data: paymentsRes } = await useAsyncData(`patient-payments-${id}`, () => $api<{ data: Payment[] }>(`/patients/${id}/payments`))
const { data: billingRes } = await useAsyncData(`patient-billing-${id}`, () => $api<{ data: any }>(`/patients/${id}/billing-report`))

const patient = computed(() => (patientRes.value as any)?.data)
const visits = computed<Visit[]>(() => (visitsRes.value as any)?.data || [])
const payments = computed<Payment[]>(() => (paymentsRes.value as any)?.data || [])
const billing = computed(() => (billingRes.value as any)?.data)

const tabItems = [
  { label: t('patient.history'), value: 'history', icon: 'i-lucide-history', slot: 'history' },
  { label: t('prescription.title'), value: 'prescriptions', icon: 'i-lucide-file-text', slot: 'prescriptions' },
  { label: t('payment.title'), value: 'payments', icon: 'i-lucide-credit-card', slot: 'payments' },
  { label: 'Billing Summary', value: 'billing', icon: 'i-lucide-calculator', slot: 'billing' }
]

const selectedTab = ref('history')

const breadcrumbItems = computed(() => [
  { label: 'Home', to: '/' },
  { label: 'Patients', to: '/patients' },
  { label: patient.value?.name || 'Details', to: '#' }
])

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
  navigateTo(`/departments/opd?patientId=${id}`)
}

function editVisit(visit: Visit) {
  const dept = (visit.visit_type || 'opd').toLowerCase()
  navigateTo(`/departments/${dept}?visitId=${visit._id}&patientId=${id}`)
}

const stats = computed(() => [
  { label: 'Total Visits', value: visits.value.length, icon: 'i-lucide-calendar', color: 'primary' },
  { label: 'Total Paid', value: formatCurrency(billing.value?.totalPaid), icon: 'i-lucide-check-circle', color: 'success' },
  { label: 'Balance Due', value: formatCurrency(billing.value?.balanceDue), icon: 'i-lucide-alert-circle', color: billing.value?.balanceDue > 0 ? 'error' : 'neutral' }
])
</script>

<template>
  <div v-if="patient" class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <UBreadcrumb :items="breadcrumbItems" class="mb-2" />
        <h1 class="text-2xl font-bold flex items-center gap-2">
          {{ patient.name }}
          <UBadge :color="patient.gender === 1 ? 'error' : 'primary'" variant="subtle">
            {{ patient.gender === 1 ? t('patient.female') : t('patient.male') }}
          </UBadge>
        </h1>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          :label="t('common.print')"
          icon="i-lucide-printer"
          color="neutral"
          variant="outline"
          @click="printHistory"
        />
        <UButton
          :label="t('common.edit')"
          icon="i-lucide-pencil"
          color="neutral"
          variant="outline"
        />
        <UButton
          :label="t('visit.new')"
          icon="i-lucide-plus"
          color="primary"
          @click="createNewVisit"
        />
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <UCard v-for="stat in stats" :key="stat.label">
        <div class="flex items-center gap-4">
          <div :class="`p-3 rounded-full bg-${stat.color}-500/10`">
            <UIcon :name="stat.icon" :class="`size-6 text-${stat.color}-500`" />
          </div>
          <div>
            <p class="text-sm text-gray-500">
              {{ stat.label }}
            </p>
            <p class="text-xl font-semibold">
              {{ stat.value }}
            </p>
          </div>
        </div>
      </UCard>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left Column: Patient Profile -->
      <div class="space-y-6">
        <UCard>
          <template #header>
            <h3 class="font-semibold">
              {{ t('common.details') }}
            </h3>
          </template>
          <div class="space-y-4">
            <div class="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
              <span class="text-gray-500 text-sm">{{ t('patient.dob') }}</span>
              <span class="font-medium">{{ formatDate(patient.dob) }}</span>
            </div>
            <div class="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
              <span class="text-gray-500 text-sm">{{ t('patient.phone') }}</span>
              <span class="font-medium">{{ patient.phone || '-' }}</span>
            </div>
            <div class="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
              <span class="text-gray-500 text-sm">{{ t('patient.email') }}</span>
              <span class="font-medium">{{ patient.email || '-' }}</span>
            </div>
            <div class="space-y-1 pt-2">
              <span class="text-gray-500 text-sm">{{ t('patient.address') }}</span>
              <p class="text-sm font-medium leading-relaxed">
                {{ [patient.villageName, patient.communeName, patient.districtName,
                    patient.provinceName].filter(Boolean).join(', ') || patient.address || '-' }}
              </p>
            </div>
          </div>
        </UCard>

        <UCard v-if="patient.allergies">
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-alert-triangle" class="text-error-500" />
              <h3 class="font-semibold text-error-500">
                {{ t('patient.allergies') }}
              </h3>
            </div>
          </template>
          <p class="text-sm">
            {{ patient.allergies }}
          </p>
        </UCard>
      </div>

      <!-- Right Column: History Tabs -->
      <div class="lg:col-span-2 space-y-4">
        <UTabs v-model="selectedTab" :items="tabItems" class="w-full">
          <template #history>
            <div class="space-y-4 pt-4">
              <div
                v-if="visits.length === 0"
                class="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg"
              >
                <UIcon name="i-lucide-calendar-x" class="size-12 text-gray-300 mb-2" />
                <p class="text-gray-500">
                  No visits recorded yet
                </p>
              </div>
              <div
                v-else
                class="space-y-4 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-px before:bg-gray-200 dark:before:bg-gray-800"
              >
                <div v-for="visit in visits" :key="visit._id" class="pl-10 relative">
                  <div
                    class="absolute left-[13px] top-2 size-2.5 rounded-full bg-primary-500 ring-4 ring-white dark:ring-gray-950"
                  />
                  <UCard>
                    <div class="flex items-start justify-between gap-4">
                      <div>
                        <div class="flex items-center gap-2 mb-1">
                          <span class="font-semibold">{{ formatDate(visit.visit_date)
                          }}</span>
                          <UBadge size="xs" color="neutral" variant="subtle">
                            {{
                              visit.visit_type || 'Common' }}
                          </UBadge>
                        </div>
                        <h4 class="font-bold text-lg mb-2">
                          {{ visit.reason }}
                        </h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div v-if="visit.diagnosis">
                            <p class="text-gray-500 font-medium">
                              {{ t('visit.diagnosis') }}
                            </p>
                            <p>{{ visit.diagnosis }}</p>
                          </div>
                          <div v-if="visit.treatment">
                            <p class="text-gray-500 font-medium">
                              {{ t('visit.treatment') }}
                            </p>
                            <p>{{ visit.treatment }}</p>
                          </div>
                        </div>
                      </div>
                      <div class="flex flex-col items-end gap-2">
                        <UBadge :color="visit.status === 'completed' ? 'success' : 'warning'">
                          {{ visit.status || 'Pending' }}
                        </UBadge>
                        <div class="flex gap-2">
                          <UButton
                            icon="i-lucide-pencil"
                            size="xs"
                            variant="ghost"
                            color="neutral"
                            :label="t('common.edit')"
                            @click="editVisit(visit)"
                          />
                          <UButton icon="i-lucide-external-link" size="xs" variant="ghost" />
                        </div>
                      </div>
                    </div>
                  </UCard>
                </div>
              </div>
            </div>
          </template>

          <template #prescriptions>
            <div class="pt-4 space-y-4">
              <!-- Placeholder for prescriptions as they are visit-linked in backend -->
              <div
                class="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg"
              >
                <UIcon name="i-lucide-pill" class="size-12 text-gray-300 mb-2" />
                <p class="text-gray-500">
                  Prescriptions are listed under individual visits in History
                </p>
              </div>
            </div>
          </template>

          <template #payments>
            <div class="pt-4 space-y-4">
              <UTable
                :data="payments"
                :columns="[
                  { accessorKey: 'paymentId', header: 'ID' },
                  { accessorKey: 'paidAt', header: t('payment.date') },
                  { accessorKey: 'amount', header: t('payment.amount') },
                  { accessorKey: 'method', header: t('payment.method') },
                  { accessorKey: 'status', header: t('payment.status') }
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
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div class="text-center">
                    <p class="text-sm text-gray-500">
                      Total Billed
                    </p>
                    <p class="text-xl font-bold">
                      {{ formatCurrency(billing.totalBilled) }}
                    </p>
                  </div>
                  <div class="text-center">
                    <p class="text-sm text-gray-500">
                      Total Paid
                    </p>
                    <p class="text-xl font-bold text-success-500">
                      {{
                        formatCurrency(billing.totalPaid) }}
                    </p>
                  </div>
                  <div class="text-center">
                    <p class="text-sm text-gray-500">
                      Discount
                    </p>
                    <p class="text-xl font-bold text-primary-500">
                      {{
                        formatCurrency(billing.totalDiscount) }}
                    </p>
                  </div>
                  <div class="text-center">
                    <p class="text-sm text-gray-500">
                      Balance Due
                    </p>
                    <p class="text-xl font-bold text-error-500">
                      {{
                        formatCurrency(billing.balanceDue) }}
                    </p>
                  </div>
                </div>
              </UCard>
            </div>
          </template>
        </UTabs>
      </div>
    </div>
  </div>
  <div v-else class="flex flex-1 items-center justify-center py-20">
    <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-primary-500" />
  </div>
</template>
