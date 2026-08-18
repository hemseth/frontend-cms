<script setup lang="ts">
const props = defineProps<{
  payroll?: any
  period?: string
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits(['success'])

const { t } = useI18n()
const toast = useToast()
const submitting = ref(false)

const { data: staffResult } = await useAsyncData('staff-list-modal', () => $api('/staff'), {
  default: () => ({ data: [] })
})

const staffOptions = computed(() => {
  const data = staffResult.value
  if (!data) return []
  const arr = (data.data as any)?.data || []
  if (!Array.isArray(arr)) return []
  return arr.map((s: any) => ({
    label: s.nameEn || s.nameKh || s.name,
    value: s._id
  }))
})

const currentYear = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1

const form = ref({
  staffId: '',
  staffName: '',
  period: props.period || `${currentYear}-${String(currentMonth).padStart(2, '0')}`,
  year: currentYear,
  month: currentMonth,
  baseSalary: 0,
  positionAllowance: 0,
  transportAllowance: 0,
  housingAllowance: 0,
  otherAllowances: 0,
  overtime: 0,
  bonus: 0,
  absenceDeduction: 0,
  lateDeduction: 0,
  otherDeductions: 0,
  notes: ''
})

const grossSalary = computed(() => {
  return form.value.baseSalary
    + form.value.positionAllowance
    + form.value.transportAllowance
    + form.value.housingAllowance
    + form.value.otherAllowances
    + form.value.overtime
    + form.value.bonus
})

const totalDeductions = computed(() => {
  return form.value.absenceDeduction + form.value.lateDeduction + form.value.otherDeductions
})

const taxableIncome = computed(() => {
  return Math.max(0, grossSalary.value - totalDeductions.value)
})

const taxAmount = computed(() => {
  return calculateTax(taxableIncome.value)
})

const netSalary = computed(() => {
  return grossSalary.value - taxAmount.value - totalDeductions.value
})

function calculateTax(monthlyIncome: number): number {
  const annualIncome = monthlyIncome * 12
  let annualTax = 0

  if (annualIncome <= 15000000) {
    annualTax = 0
  } else if (annualIncome <= 20000000) {
    const taxable = annualIncome - 15000000
    annualTax = taxable * 0.05
  } else if (annualIncome <= 85000000) {
    const taxable = annualIncome - 20000000
    annualTax = 250000 + (taxable * 0.10)
  } else if (annualIncome <= 125000000) {
    const taxable = annualIncome - 85000000
    annualTax = 250000 + 6500000 + (taxable * 0.15)
  } else {
    const taxable = annualIncome - 125000000
    annualTax = 250000 + 6500000 + 6000000 + (taxable * 0.20)
  }

  return Math.round(annualTax / 12)
}

watch(() => open.value, (isOpen) => {
  if (isOpen && props.payroll) {
    form.value = { ...props.payroll }
  } else if (isOpen && !props.payroll) {
    resetForm()
  }
})

watch(() => form.value.staffId, (id) => {
  if (id && staffOptions.value.length > 0) {
    const staff = staffOptions.value.find(s => s.value === id)
    if (staff) {
      form.value.staffName = staff.label
    }
  }
})

watch(() => form.value.period, (period) => {
  if (period) {
    const [year, month] = period.split('-').map(Number)
    form.value.year = year!
    form.value.month = month!
  }
})

function resetForm() {
  form.value = {
    staffId: '',
    staffName: '',
    period: props.period || `${currentYear}-${String(currentMonth).padStart(2, '0')}`,
    year: currentYear,
    month: currentMonth,
    baseSalary: 0,
    positionAllowance: 0,
    transportAllowance: 0,
    housingAllowance: 0,
    otherAllowances: 0,
    overtime: 0,
    bonus: 0,
    absenceDeduction: 0,
    lateDeduction: 0,
    otherDeductions: 0,
    notes: ''
  }
}

async function handleSubmit() {
  if (!form.value.staffId) {
    toast.add({ title: 'Error', description: 'Staff is required', color: 'error' })
    return
  }
  if (!form.value.baseSalary || form.value.baseSalary <= 0) {
    toast.add({ title: 'Error', description: 'Base salary is required', color: 'error' })
    return
  }

  submitting.value = true
  try {
    const payload = { ...form.value }

    if (props.payroll?._id) {
      await $api(`/payrolls/${props.payroll._id}`, {
        method: 'PUT',
        body: payload
      })
      toast.add({ title: 'Success', description: 'Payroll updated successfully', color: 'success' })
    } else {
      await $api('/payrolls', {
        method: 'POST',
        body: payload
      })
      toast.add({ title: 'Success', description: 'Payroll created successfully', color: 'success' })
    }
    emit('success')
    open.value = false
    resetForm()
  } catch (error: any) {
    toast.add({ title: 'Error', description: error.data?.message || 'Failed to save payroll', color: 'error' })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" :prevent-close="submitting" size="xl">
    <template #header>
      <h3 class="text-lg font-semibold">
        {{ payroll?._id ? t('payroll.edit') : t('payroll.add') }}
      </h3>
    </template>

    <template #body>
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <UFormField :label="t('payroll.staff')" required>
            <USelect v-model="form.staffId" :items="staffOptions" :placeholder="t('payroll.staff')" />
          </UFormField>

          <UFormField :label="t('payroll.period')">
            <UInput v-model="form.period" placeholder="YYYY-MM" />
          </UFormField>
        </div>

        <div class="border-t pt-4">
          <h4 class="font-medium mb-2">
            {{ t('payroll.salary') }}
          </h4>
          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="t('payroll.baseSalary')" required>
              <UInput
                v-model.number="form.baseSalary"
                type="number"
                min="0"
                step="0.01"
              />
            </UFormField>

            <UFormField :label="t('payroll.positionAllowance')">
              <UInput
                v-model.number="form.positionAllowance"
                type="number"
                min="0"
                step="0.01"
              />
            </UFormField>

            <UFormField :label="t('payroll.transportAllowance')">
              <UInput
                v-model.number="form.transportAllowance"
                type="number"
                min="0"
                step="0.01"
              />
            </UFormField>

            <UFormField :label="t('payroll.housingAllowance')">
              <UInput
                v-model.number="form.housingAllowance"
                type="number"
                min="0"
                step="0.01"
              />
            </UFormField>

            <UFormField :label="t('payroll.otherAllowances')">
              <UInput
                v-model.number="form.otherAllowances"
                type="number"
                min="0"
                step="0.01"
              />
            </UFormField>
          </div>
        </div>

        <div class="border-t pt-4">
          <h4 class="font-medium mb-2">
            {{ t('payroll.overtimeBonus') }}
          </h4>
          <div class="grid grid-cols-2 gap-4">
            <UFormField :label="t('payroll.overtime')">
              <UInput
                v-model.number="form.overtime"
                type="number"
                min="0"
                step="0.01"
              />
            </UFormField>

            <UFormField :label="t('payroll.bonus')">
              <UInput
                v-model.number="form.bonus"
                type="number"
                min="0"
                step="0.01"
              />
            </UFormField>
          </div>
        </div>

        <div class="border-t pt-4">
          <h4 class="font-medium mb-2">
            {{ t('payroll.deductions') }}
          </h4>
          <div class="grid grid-cols-3 gap-4">
            <UFormField :label="t('payroll.absenceDeduction')">
              <UInput
                v-model.number="form.absenceDeduction"
                type="number"
                min="0"
                step="0.01"
              />
            </UFormField>

            <UFormField :label="t('payroll.lateDeduction')">
              <UInput
                v-model.number="form.lateDeduction"
                type="number"
                min="0"
                step="0.01"
              />
            </UFormField>

            <UFormField :label="t('payroll.otherDeductions')">
              <UInput
                v-model.number="form.otherDeductions"
                type="number"
                min="0"
                step="0.01"
              />
            </UFormField>
          </div>
        </div>

        <div class="border-t pt-4 bg-gray-50 dark:bg-gray-900 rounded p-4">
          <h4 class="font-medium mb-2">
            {{ t('payroll.summary') }}
          </h4>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div class="flex justify-between">
              <span>{{ t('payroll.grossSalary') }}:</span>
              <span class="font-medium">${{ grossSalary.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between">
              <span>{{ t('payroll.deductions') }}:</span>
              <span class="font-medium text-red-600">-${{ totalDeductions.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between">
              <span>{{ t('payroll.taxableIncome') }}:</span>
              <span class="font-medium">${{ taxableIncome.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between">
              <span>{{ t('payroll.tax') }}:</span>
              <span class="font-medium text-red-600">-${{ taxAmount.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between col-span-2 border-t pt-2">
              <span class="font-semibold">{{ t('payroll.netSalary') }}:</span>
              <span class="font-bold text-green-600 text-lg">${{ netSalary.toFixed(2) }}</span>
            </div>
          </div>
        </div>

        <UFormField :label="t('common.notes')">
          <UTextarea v-model="form.notes" :placeholder="t('common.notes')" />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          label="Cancel"
          color="neutral"
          variant="subtle"
          :disabled="submitting"
          @click="open = false"
        />
        <UButton :label="t('common.save')" :loading="submitting" @click="handleSubmit" />
      </div>
    </template>
  </UModal>
</template>
