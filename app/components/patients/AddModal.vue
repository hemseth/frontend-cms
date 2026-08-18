<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  patient?: any
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'save': []
}>()

const toast = useToast()
const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const form = ref({
  name: '',
  dob: '',
  gender: '1',
  phone: '',
  email: '',
  address: '',
  province: '',
  district: '',
  commune: '',
  village: ''
})

watch(() => props.patient, (patient) => {
  if (patient) {
    form.value = {
      name: patient.name || '',
      dob: patient.dob ? (new Date(patient.dob).toISOString().split('T')[0] ?? '') : '',
      gender: patient.gender || '1',
      phone: patient.phone || '',
      email: patient.email || '',
      address: patient.address || '',
      province: patient.province || '',
      district: patient.district || '',
      commune: patient.commune || '',
      village: patient.village || ''
    }
  } else {
    resetForm()
  }
}, { immediate: true })

function resetForm() {
  form.value = {
    name: '',
    dob: '',
    gender: '1',
    phone: '',
    email: '',
    address: '',
    province: '',
    district: '',
    commune: '',
    village: ''
  }
}

async function handleSubmit() {
  try {
    if (props.patient) {
      await $api(`/patients/${props.patient._id}`, {
        method: 'PUT',
        body: form.value
      })
      toast.add({
        title: 'Success',
        description: 'Patient updated successfully'
      })
    } else {
      await $api('/patients', {
        method: 'POST',
        body: form.value
      })
      toast.add({
        title: 'Success',
        description: 'Patient created successfully'
      })
    }
    emit('save')
    isOpen.value = false
    resetForm()
  } catch (error) {
    toast.add({
      title: 'Error',
      description: `Failed to ${props.patient ? 'update' : 'create'} patient`,
      color: 'error'
    })
  }
}

function handleCancel() {
  isOpen.value = false
  resetForm()
}
</script>

<template>
  <UModal v-model="isOpen">
    <UCard>
      <UHeader :title="patient ? 'Edit Patient' : 'Add New Patient'" class="border-b border-default" />
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <UFormField label="Name" required>
          <UInput v-model="form.name" required />
        </UFormField>

        <UFormField label="Date of Birth" required>
          <UInput v-model="form.dob" type="date" required />
        </UFormField>

        <UFormField label="Gender" required>
          <USelectMenu
            v-model="form.gender"
            :options="[
              { label: 'Male', value: '1' },
              { label: 'Female', value: '2' }
            ]"
          />
        </UFormField>

        <UFormField label="Phone">
          <UInput v-model="form.phone" type="tel" />
        </UFormField>

        <UFormField label="Email">
          <UInput v-model="form.email" type="email" />
        </UFormField>

        <UFormField label="Address">
          <UTextarea v-model="form.address" />
        </UFormField>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Province">
            <UInput v-model="form.province" />
          </UFormField>

          <UFormField label="District">
            <UInput v-model="form.district" />
          </UFormField>

          <UFormField label="Commune">
            <UInput v-model="form.commune" />
          </UFormField>

          <UFormField label="Village">
            <UInput v-model="form.village" />
          </UFormField>
        </div>
      </form>

      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            @click="handleCancel"
          />
          <UButton label="Save" @click="handleSubmit" />
        </div>
      </template>
    </UCard>
  </UModal>
</template>
