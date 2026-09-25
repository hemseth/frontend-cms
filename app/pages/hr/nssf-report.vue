<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import NSSFReport from '~/components/hr/NSSFReport.vue'
import ExcelExport from '~/components/hr/ExcelExport.vue'
import type { PayrollRecord, StaffRef } from '~/types/hr'

const { t } = useI18n()
const toast = useToast()
const { clinicId } = useAuth()
const { selectedClinicId } = useClinicContext()
const { rate } = useExchangeRate()
const { fetchStaff, fetchPayrolls, fetchClinic } = usePayroll()

// The last 12 months, newest first, like the payroll page.
const periodOptions = computed(() => {
  const now = new Date()
  return Array.from({ length: 12 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    return { label: periodLabel(value, 'en'), value }
  })
})

const period = ref(periodOptions.value[0]?.value ?? '')
const staff = ref<StaffRef[]>([])
const payrolls = ref<PayrollRecord[]>([])
const clinicName = ref('')
const isLoading = ref(false)
const loadError = ref('')

async function load() {
  if (!period.value) return
  isLoading.value = true
  loadError.value = ''
  try {
    const [staffList, records] = await Promise.all([fetchStaff(), fetchPayrolls(period.value)])
    staff.value = staffList
    payrolls.value = records
  } catch (e) {
    payrolls.value = []
    loadError.value = getApiErrorMessage(e, t('hr.loadFailed'))
    toast.add({ title: loadError.value, color: 'error' })
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  const activeClinicId = clinicId.value || selectedClinicId.value
  if (activeClinicId) {
    const clinic = await fetchClinic(String(activeClinicId))
    clinicName.value = clinic?.name || ''
  }
  await load()
})

watch(period, load)

const nssfRows = computed(() => buildNssfRows(payrolls.value, staff.value))
const sheetRows = computed(() => buildPayrollSheetRows(payrolls.value, staff.value, rate.value))
</script>

<template>
  <div class="p-4 space-y-4">
    <div class="no-print flex items-end justify-between gap-3 flex-wrap">
      <h1 class="text-xl font-bold flex items-center gap-2">
        <UIcon name="i-lucide-shield-check" class="w-6 h-6 text-primary" />
        {{ t('hr.nssfReport') }}
      </h1>

      <UFormField :label="t('hr.periodLabel')" class="w-52">
        <USelect
          v-model="period"
          :items="periodOptions"
          value-key="value"
          size="sm"
        />
      </UFormField>
    </div>

    <UAlert
      v-if="loadError"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="loadError"
    />

    <div v-if="isLoading" class="space-y-2">
      <USkeleton v-for="i in 4" :key="i" class="h-10 w-full" />
    </div>

    <NSSFReport
      v-else
      :rows="nssfRows"
      :period="period"
      :clinic-name="clinicName || '-'"
    >
      <template #actions>
        <ExcelExport
          :rows="sheetRows"
          :nssf-rows="nssfRows"
          :period="period"
          :clinic-name="clinicName || '-'"
          :khr-per-usd="rate"
        />
      </template>
    </NSSFReport>
  </div>
</template>

<style>
@media print {
  .no-print {
    display: none !important;
  }
}
</style>
