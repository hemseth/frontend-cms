<script setup lang="ts">
import { ref } from 'vue'
import { useDiagnosis } from '~/composables/useDiagnosis'

const props = defineProps<{
  diagnosis?: any
  /** Optional label for the trigger button */
  buttonLabel?: string
}>()

const emit = defineEmits<{
  (e: 'delete'): void
  (e: 'close'): void // Allow external close control
}>()

const toast = useToast()
const { deleteDiagnosis } = useDiagnosis()
const isDeleting = ref(false)

// Use a ref for internal control if needed, but typically controlled by parent
// For consistency with other modals, let's allow v-model:open pattern or just internal
const open = defineModel<boolean>('open', { default: false })

async function handleDelete() {
  if (!props.diagnosis) return

  isDeleting.value = true
  try {
    await deleteDiagnosis(props.diagnosis._id)
    toast.add({
      title: 'Success',
      description: 'Diagnosis deleted successfully'
    })
    emit('delete')
    open.value = false
  } catch (error: any) {
    toast.add({
      title: 'Error',
      description: error.message || 'Failed to delete diagnosis',
      color: 'error'
    })
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Delete Diagnosis" description="Are you sure you want to delete this diagnosis?">
    <template #body>
      <div class="space-y-3">
        <div v-if="diagnosis" class="space-y-1">
          <p class="font-medium">
            {{ diagnosis.nameEn }} / {{ diagnosis.nameKh }}
          </p>
          <p class="text-sm text-gray-500">
            Code: {{ diagnosis.code }}
          </p>
        </div>
        <p class="text-sm text-gray-500">
          This action cannot be undone.
        </p>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          :disabled="isDeleting"
          @click="open = false"
        />
        <UButton
          label="Delete"
          color="error"
          :loading="isDeleting"
          @click="handleDelete"
        />
      </div>
    </template>
  </UModal>
</template>
