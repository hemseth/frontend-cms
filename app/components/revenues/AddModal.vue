<script setup lang="ts">
const props = defineProps<{
  revenue?: any
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits(['success'])

const { t } = useI18n()
const toast = useToast()
const submitting = ref(false)

const form = ref({
  date: new Date().toISOString().split('T')[0],
  amount: 0,
  category: 'general',
  description: '',
  referenceId: '',
  paymentMethod: 'cash'
})

const categoryOptions = computed(() => [
  { label: t('nav.opd'), value: 'opd' },
  { label: t('nav.medicines'), value: 'pharmacy' },
  { label: t('common.lab'), value: 'lab' },
  { label: t('nav.reports') || 'Service', value: 'service' },
  { label: t('medicine.medicineTypes.other') || 'General', value: 'general' }
])

const paymentMethodOptions = computed(() => [
  { label: t('payment.cash'), value: 'cash' },
  { label: t('payment.transfer'), value: 'bank_transfer' },
  { label: t('payment.card') || 'Credit Card', value: 'credit_card' },
  { label: t('medicine.medicineTypes.other') || 'Other', value: 'other' }
])

watch(() => open.value, (isOpen) => {
  if (open.value && props.revenue) {
    form.value = {
      ...props.revenue,
      date: props.revenue.date ? new Date(props.revenue.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    }
  } else if (open.value && !props.revenue) {
    resetForm()
  }
})

function resetForm() {
  form.value = {
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    category: 'general',
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

    if (props.revenue?._id) {
      await $api(`/revenues/${props.revenue._id}`, {
        method: 'PUT',
        body: payload
      })
      toast.add({ title: 'Success', description: 'Revenue updated successfully', color: 'success' })
    } else {
      await $api('/revenues', {
        method: 'POST',
        body: payload
      })
      toast.add({ title: 'Success', description: 'Revenue created successfully', color: 'success' })
    }
    emit('success')
    open.value = false
    resetForm()
  } catch (error: any) {
    toast.add({ title: 'Error', description: error.data?.message || 'Failed to save revenue', color: 'error' })
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
        {{ revenue?._id ? t('revenue.edit') : t('revenue.add') }}
      </h3>
    </template>

    <template #body>
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <UFormField :label="t('revenue.date')">
            <UInput v-model="form.date" type="date" />
          </UFormField>

          <UFormField :label="t('revenue.amount')" required>
            <UInput
              v-model.number="form.amount"
              type="number"
              min="0"
              step="0.01"
            />
          </UFormField>

          <UFormField :label="t('revenue.category')">
            <USelect v-model="form.category" :options="categoryOptions" />
          </UFormField>

          <UFormField :label="t('revenue.paymentMethod')">
            <USelect v-model="form.paymentMethod" :options="paymentMethodOptions" />
          </UFormField>

          <UFormField :label="t('revenue.reference')" class="col-span-2">
            <UInput v-model="form.referenceId" :placeholder="t('revenue.reference')" />
          </UFormField>

          <UFormField :label="t('revenue.description')" class="col-span-2">
            <UTextarea v-model="form.description" :placeholder="t('revenue.description')" />
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
