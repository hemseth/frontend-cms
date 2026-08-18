<script setup lang="ts">
const props = defineProps<{
  supplier?: any
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits(['success'])

const { t } = useI18n()
const toast = useToast()
const submitting = ref(false)

const form = ref({
  name: '',
  code: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  country: 'Cambodia',
  taxNumber: '',
  paymentTerms: '',
  notes: '',
  status: 'active'
})

const statusOptions = computed(() => [
  { label: t('common.active'), value: 'active' },
  { label: t('common.inactive'), value: 'inactive' }
])

watch(() => open.value, (isOpen) => {
  if (isOpen && props.supplier) {
    form.value = { ...props.supplier }
  } else if (isOpen && !props.supplier) {
    resetForm()
  }
})

function resetForm() {
  form.value = {
    name: '',
    code: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    country: 'Cambodia',
    taxNumber: '',
    paymentTerms: '',
    notes: '',
    status: 'active'
  }
}

async function handleSubmit() {
  if (!form.value.name) {
    toast.add({ title: 'Error', description: 'Supplier name is required', color: 'error' })
    return
  }

  submitting.value = true
  try {
    if (props.supplier?._id) {
      await $api(`/suppliers/${props.supplier._id}`, {
        method: 'PUT',
        body: form.value
      })
      toast.add({ title: 'Success', description: 'Supplier updated successfully', color: 'success' })
    } else {
      await $api('/suppliers', {
        method: 'POST',
        body: form.value
      })
      toast.add({ title: 'Success', description: 'Supplier created successfully', color: 'success' })
    }
    emit('success')
    open.value = false
    resetForm()
  } catch (error: any) {
    toast.add({ title: 'Error', description: error.data?.message || 'Failed to save supplier', color: 'error' })
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
        {{ supplier?._id ? t('supplier.edit') : t('supplier.add') }}
      </h3>
    </template>

    <template #body>
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <UFormField :label="t('supplier.name')" required>
            <UInput v-model="form.name" :placeholder="t('supplier.name')" />
          </UFormField>

          <UFormField :label="t('supplier.code')">
            <UInput v-model="form.code" :placeholder="t('supplier.code')" />
          </UFormField>

          <UFormField :label="t('supplier.contactPerson')">
            <UInput v-model="form.contactPerson" :placeholder="t('supplier.contactPerson')" />
          </UFormField>

          <UFormField :label="t('supplier.phone')">
            <UInput v-model="form.phone" :placeholder="t('supplier.phone')" />
          </UFormField>

          <UFormField :label="t('supplier.email')" class="col-span-2">
            <UInput v-model="form.email" type="email" :placeholder="t('supplier.email')" />
          </UFormField>

          <UFormField :label="t('supplier.address')" class="col-span-2">
            <UTextarea v-model="form.address" :placeholder="t('supplier.address')" />
          </UFormField>

          <UFormField :label="t('supplier.city')">
            <UInput v-model="form.city" :placeholder="t('supplier.city')" />
          </UFormField>

          <UFormField :label="t('supplier.country')">
            <UInput v-model="form.country" :placeholder="t('supplier.country')" />
          </UFormField>

          <UFormField :label="t('supplier.taxNumber')">
            <UInput v-model="form.taxNumber" :placeholder="t('supplier.taxNumber')" />
          </UFormField>

          <UFormField :label="t('supplier.paymentTerms')">
            <UInput v-model="form.paymentTerms" :placeholder="t('supplier.paymentTerms')" />
          </UFormField>

          <UFormField :label="t('common.status')">
            <USelect v-model="form.status" :options="statusOptions" />
          </UFormField>

          <UFormField :label="t('supplier.notes')" class="col-span-2">
            <UTextarea v-model="form.notes" :placeholder="t('supplier.notes')" />
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
