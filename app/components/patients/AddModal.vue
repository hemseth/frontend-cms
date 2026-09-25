<script setup lang="ts">
import AddModals from './AddModals.vue'

const props = defineProps<{
  modelValue?: boolean
  open?: boolean
  patient?: Record<string, unknown> | null
  hideButton?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'update:open': [value: boolean]
  'save': []
  'success': [patient: Record<string, unknown>]
}>()

const isOpen = computed({
  get: () => props.open ?? props.modelValue ?? false,
  set: (val) => {
    emit('update:modelValue', val)
    emit('update:open', val)
  }
})
</script>

<template>
  <AddModals
    v-model:open="isOpen"
    :patient="patient"
    :hide-button="hideButton"
    @save="emit('save')"
    @success="(p) => emit('success', p)"
  >
    <template #trigger>
      <slot name="trigger" />
    </template>
  </AddModals>
</template>
