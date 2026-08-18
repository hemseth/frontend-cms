<script setup lang="ts">
const props = defineProps<{
  open: boolean
  patient: any
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'delete': []
}>()

const { t } = useI18n()
const toast = useToast()
const isOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})

const isDeleting = ref(false)

async function handleDelete() {
  if (!props.patient) return

  isDeleting.value = true
  try {
    await $api(`/patients/${props.patient._id}`, {
      method: 'DELETE'
    })
    toast.add({
      title: 'Success',
      description: 'Patient deleted successfully'
    })
    emit('delete')
    isOpen.value = false
  } catch (error) {
    toast.add({
      title: 'Error',
      description: 'Failed to delete patient',
      color: 'error'
    })
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <UModal v-model:open="isOpen" :title="t('patient.delete') || 'Delete Patient'">
    <template #body>
      <div class="space-y-3">
        <p>{{ t('messages.confirmDelete') || 'Are you sure you want to delete this patient?' }}</p>
        <p v-if="patient" class="font-medium text-primary">
          {{ patient.nameKh || patient.nameEn }}
        </p>
        <p class="text-sm text-gray-500">
          {{ t('patient.deleteConfirm') || 'This action cannot be undone.' }}
        </p>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          :label="t('common.cancel') || 'Cancel'"
          color="neutral"
          variant="ghost"
          :disabled="isDeleting"
          @click="isOpen = false"
        />
        <UButton
          :label="t('common.delete') || 'Delete'"
          color="error"
          :loading="isDeleting"
          @click="handleDelete"
        />
      </div>
    </template>
  </UModal>
</template>
