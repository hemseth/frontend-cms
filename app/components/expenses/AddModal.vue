<script setup lang="ts">
const props = defineProps<{
  expense?: any
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits(['success'])

const { t } = useI18n()
const toast = useToast()
const submitting = ref(false)

const form = ref({
  date: new Date().toISOString().split('T')[0],
  amount: 0,
  category: 'other',
  description: '',
  referenceId: '',
  paymentMethod: 'cash'
})

const categoryOptions = computed(() => [
  { label: t('revenue.purchase') || 'Purchase', value: 'purchase' },
  { label: t('staff.salary') || t('staff.role') || 'Salary', value: 'salary' },
  { label: t('common.utility') || 'Utility', value: 'utility' },
  { label: t('common.rent') || 'Rent', value: 'rent' },
  { label: t('common.equipment') || 'Equipment', value: 'equipment' },
  { label: t('medicine.medicineTypes.other') || 'Other', value: 'other' }
])

const paymentMethodOptions = computed(() => [
  { label: t('payment.cash'), value: 'cash' },
  { label: t('payment.transfer'), value: 'bank_transfer' },
  { label: t('payment.card') || 'Credit Card', value: 'credit_card' },
  { label: t('medicine.medicineTypes.other') || 'Other', value: 'other' }
])

watch(() => open.value, (isOpen) => {
  if (open.value && props.expense) {
    form.value = {
      ...props.expense,
      date: props.expense.date ? new Date(props.expense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    }
  } else if (open.value && !props.expense) {
    resetForm()
  }
})

function resetForm() {
  form.value = {
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    category: 'other',
    description: '',
    referenceId: '',
    paymentMethod: 'cash'
  }
}

async function handleSubmit() {
  if (!form.value.amount || form.value.amount <= 0) {
    toast.add({ title: 'Error', description: 'Amount is required', color: 'error' })
    return
  }

  submitting.value = true
  try {
    const payload = {
      ...form.value,
      date: new Date(form.value.date as string)
    }

    if (props.expense?._id) {
      await $api(`/expenses/${props.expense._id}`, {
        method: 'PUT',
        body: payload
      })
      toast.add({ title: 'Success', description: 'Expense updated successfully', color: 'success' })
    } else {
      await $api('/expenses', {
        method: 'POST',
        body: payload
      })
      toast.add({ title: 'Success', description: 'Expense created successfully', color: 'success' })
    }
    emit('success')
    open.value = false
    resetForm()
  } catch (error: any) {
    toast.add({ title: 'Error', description: error.data?.message || 'Failed to save expense', color: 'error' })
  } finally {
    submitting.value = false
  }
}

function handleClose() {
  open.value = false
  resetForm()
}
</script>

<template>
  <UModal v-model:open="open" :prevent-close="submitting">
    <template #header>
      <h3 class="text-lg font-semibold">
        {{ expense?._id ? t('expense.edit') : t('expense.add') }}
      </h3>
    </template>

    <template #body>
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <UFormField :label="t('expense.date')">
            <UInput v-model="form.date" type="date" />
          </UFormField>

          <UFormField :label="t('expense.amount')" required>
            <UInput
              v-model.number="form.amount"
              type="number"
              min="0"
              step="0.01"
            />
          </UFormField>

          <UFormField :label="t('expense.category')">
            <USelect v-model="form.category" :options="categoryOptions" />
          </UFormField>

          <UFormField :label="t('expense.paymentMethod')">
            <USelect v-model="form.paymentMethod" :options="paymentMethodOptions" />
          </UFormField>

          <UFormField :label="t('expense.reference')" class="col-span-2">
            <UInput v-model="form.referenceId" :placeholder="t('expense.reference')" />
          </UFormField>

          <UFormField :label="t('expense.description')" class="col-span-2">
            <UTextarea v-model="form.description" :placeholder="t('expense.description')" />
          </UFormField>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          :label="t('common.cancel')"
          color="neutral"
          variant="subtle"
          :disabled="submitting"
          @click="handleClose"
        />
        <UButton :label="t('common.save')" :loading="submitting" @click="handleSubmit" />
      </div>
    </template>
  </UModal>
</template>
