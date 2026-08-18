<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  medicine?: any
  /** Optional label for the trigger button */
  buttonLabel?: string
}>()

const emit = defineEmits<{
  (e: 'delete'): void
}>()

const toast = useToast()
const open = ref(false)
const isDeleting = ref(false)

async function handleDelete() {
  if (!props.medicine) return

  isDeleting.value = true
  try {
    await $api(`/medicines/${props.medicine._id}`, {
      method: 'DELETE'
    })
    toast.add({
      title: 'Success',
      description: 'Medicine deleted successfully'
    })
    emit('delete')
    open.value = false
  } catch (error) {
    toast.add({
      title: 'Error',
      description: 'Failed to delete medicine',
      color: 'error'
    })
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <!-- First child acts as the trigger button for the modal -->
  <UModal v-model:open="open" title="Delete Medicine" description="Are you sure you want to delete this medicine?">
    <UButton
      :label="buttonLabel ?? ''"
      icon="i-lucide-trash"
      color="error"
      variant="outline"
      size="sm"
    />

    <template #body>
      <div class="space-y-3">
        <div v-if="medicine" class="space-y-1">
          <p class="font-medium">
            {{ medicine.name }}
          </p>
          <p class="text-sm text-gray-500">
            Code: {{ medicine.code }}
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
