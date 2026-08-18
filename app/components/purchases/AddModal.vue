<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  purchase?: any
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits(['success'])

const { t } = useI18n()
const toast = useToast()
const submitting = ref(false)

const { data: suppliersResult } = await useAsyncData('suppliers-list-modal', () => $api('/suppliers'), {
  default: () => ({ data: [] })
})

const { data: medicinesResult } = await useAsyncData('medicines-list-modal', () => $api('/medicines', { params: { limit: 1000 } }), {
  default: () => ({ data: [] })
})

const supplierOptions = computed(() => {
  return ((suppliersResult.value as any)?.data || []).map((s: any) => ({
    label: s.name,
    value: s._id
  }))
})

const medicineOptions = computed(() => {
  return ((medicinesResult.value as any)?.data || []).map((m: any) => ({
    label: `${m.nameEn} (${m.nameKh})`,
    value: m._id,
    data: m
  }))
})

const form = ref({
  invoiceNumber: '',
  supplierId: '',
  supplierName: '',
  date: new Date().toISOString().split('T')[0],
  expectedDeliveryDate: '',
  items: [] as any[],
  discount: 0,
  tax: 0,
  paymentStatus: 'unpaid',
  paymentMethod: 'cash',
  status: 'pending',
  notes: ''
})

const paymentStatusOptions = computed(() => [
  { label: t('payment.unpaid'), value: 'unpaid' },
  { label: t('payment.partial'), value: 'partial' },
  { label: t('payment.paid'), value: 'paid' }
])

const paymentMethodOptions = computed(() => [
  { label: t('payment.cash'), value: 'cash' },
  { label: t('payment.transfer'), value: 'bank_transfer' },
  { label: t('payment.card') || 'Credit Card', value: 'credit' }
])

const statusOptions = computed(() => [
  { label: t('common.pending'), value: 'pending' },
  { label: t('common.ordered') || 'Ordered', value: 'ordered' },
  { label: t('common.completed') || 'Received', value: 'received' },
  { label: t('common.cancelled'), value: 'cancelled' }
])

const totalAmount = computed(() => {
  return form.value.items.reduce((sum, item) => sum + (item.totalCost || 0), 0)
})

const grandTotal = computed(() => {
  return totalAmount.value - (form.value.discount || 0) + (form.value.tax || 0)
})

watch(() => open.value, (isOpen) => {
  if (isOpen && props.purchase) {
    form.value = { ...props.purchase }
  } else if (isOpen && !props.purchase) {
    resetForm()
  }
})

function addItem() {
  form.value.items.push({
    medicineId: '',
    medicineName: '',
    quantity: 1,
    unitCost: 0,
    totalCost: 0,
    conversionRate: 1,
    baseUnitQty: 0
  })
}

function removeItem(index: number) {
  form.value.items.splice(index, 1)
}

function updateItemTotal(index: number) {
  const item = form.value.items[index]
  if (item.medicineId && medicineOptions.value.length > 0) {
    const med = medicineOptions.value.find((m: any) => m.value === item.medicineId)
    if (med) {
      item.medicineName = `${med.data.nameEn} (${med.data.nameKh})`
      item.conversionRate = med.data.conversionRate || 1
    }
  }
  item.totalCost = (item.quantity || 0) * (item.unitCost || 0)
  item.baseUnitQty = (item.quantity || 0) * (item.conversionRate || 1)
}

watch(() => form.value.supplierId, (id) => {
  if (id && supplierOptions.value.length > 0) {
    const supplier = supplierOptions.value.find((s: any) => s.value === id)
    if (supplier) {
      form.value.supplierName = supplier.label
    }
  }
})

function resetForm() {
  form.value = {
    invoiceNumber: '',
    supplierId: '',
    supplierName: '',
    date: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: '',
    items: [],
    discount: 0,
    tax: 0,
    paymentStatus: 'unpaid',
    paymentMethod: 'cash',
    status: 'pending',
    notes: ''
  }
}

async function handleSubmit() {
  if (!form.value.supplierId) {
    toast.add({ title: 'Error', description: 'Supplier is required', color: 'error' })
    return
  }
  if (form.value.items.length === 0) {
    toast.add({ title: 'Error', description: 'At least one item is required', color: 'error' })
    return
  }

  submitting.value = true
  try {
    const payload = {
      ...form.value,
      date: new Date(form.value.date as string),
      expectedDeliveryDate: form.value.expectedDeliveryDate ? new Date(form.value.expectedDeliveryDate as string) : undefined,
      totalAmount: totalAmount.value,
      grandTotal: grandTotal.value
    }

    if (props.purchase?._id) {
      await $api(`/purchases/${props.purchase._id}`, {
        method: 'PUT',
        body: payload
      })
      toast.add({ title: 'Success', description: 'Purchase updated successfully', color: 'success' })
    } else {
      await $api('/purchases', {
        method: 'POST',
        body: payload
      })
      toast.add({ title: 'Success', description: 'Purchase created successfully', color: 'success' })
    }
    emit('success')
    open.value = false
    resetForm()
  } catch (error: any) {
    toast.add({ title: 'Error', description: error.data?.message || 'Failed to save purchase', color: 'error' })
  } finally {
    submitting.value = false
  }
}

function handleClose() {
  open.value = false
  resetForm()
}

function handleOpenChange(open: boolean) {
  if (!open) {
    resetForm()
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :prevent-close="submitting"
    size="xl"
    @update:open="handleOpenChange"
  >
    <template #header>
      <h3 class="text-lg font-semibold">
        {{ purchase?._id ? t('purchase.edit') : t('purchase.add') }}
      </h3>
    </template>

    <template #body>
      <div class="space-y-4 max-h-[60vh] overflow-y-auto">
        <div class="grid grid-cols-2 gap-4">
          <UFormField :label="t('purchase.invoiceNumber')">
            <UInput v-model="form.invoiceNumber" :placeholder="t('purchase.invoiceNumber')" />
          </UFormField>

          <UFormField :label="t('supplier.title')" required>
            <USelect v-model="form.supplierId" :items="supplierOptions" :placeholder="t('supplier.title')" />
          </UFormField>

          <UFormField :label="t('purchase.date')">
            <UInput v-model="form.date" type="date" />
          </UFormField>

          <UFormField :label="t('purchase.expectedDeliveryDate')">
            <UInput v-model="form.expectedDeliveryDate" type="date" />
          </UFormField>

          <UFormField :label="t('purchase.paymentStatus')">
            <USelect v-model="form.paymentStatus" :options="paymentStatusOptions" />
          </UFormField>

          <UFormField :label="t('purchase.paymentMethod')">
            <USelect v-model="form.paymentMethod" :options="paymentMethodOptions" />
          </UFormField>

          <UFormField v-if="purchase?._id" :label="t('common.status')">
            <USelect v-model="form.status" :options="statusOptions" />
          </UFormField>
        </div>

        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <h4 class="font-medium">
              {{ t('purchase.items') }}
            </h4>
            <UButton
              size="sm"
              icon="i-lucide-plus"
              :label="t('common.add')"
              @click="addItem"
            />
          </div>

          <div v-for="(item, index) in form.items" :key="index" class="flex gap-2 items-end border p-2 rounded">
            <UFormField :label="t('medicine.title')" class="flex-1">
              <USelect
                v-model="item.medicineId"
                :items="medicineOptions"
                value-key="value"
                :placeholder="t('medicine.title')"
                @update:model-value="() => updateItemTotal(index)"
              />
            </UFormField>

            <UFormField :label="t('purchase.quantity')" class="w-24">
              <UInput
                v-model.number="item.quantity"
                type="number"
                min="1"
                @input="() => updateItemTotal(index)"
              />
            </UFormField>

            <UFormField :label="t('purchase.unitCost')" class="w-28">
              <UInput
                v-model.number="item.unitCost"
                type="number"
                min="0"
                step="0.01"
                @input="() => updateItemTotal(index)"
              />
            </UFormField>

            <UFormField :label="t('purchase.total')" class="w-28">
              <UInput :model-value="item.totalCost.toFixed(2)" disabled />
            </UFormField>

            <UButton
              icon="i-lucide-trash"
              color="error"
              variant="ghost"
              @click="removeItem(index)"
            />
          </div>

          <div v-if="form.items.length === 0" class="text-center py-4 text-gray-500">
            {{ t('purchase.noItems') }}
          </div>
        </div>

        <div class="grid grid-cols-3 gap-4">
          <UFormField :label="t('purchase.discount')">
            <UInput
              v-model.number="form.discount"
              type="number"
              min="0"
              step="0.01"
            />
          </UFormField>

          <UFormField :label="t('purchase.tax')">
            <UInput
              v-model.number="form.tax"
              type="number"
              min="0"
              step="0.01"
            />
          </UFormField>

          <UFormField :label="t('purchase.grandTotal')">
            <UInput :model-value="grandTotal.toFixed(2)" disabled class="font-bold" />
          </UFormField>
        </div>

        <UFormField :label="t('purchase.notes')">
          <UTextarea v-model="form.notes" :placeholder="t('purchase.notes')" />
        </UFormField>
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
