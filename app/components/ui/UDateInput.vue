<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue?: string
  placeholder?: string
  disabled?: boolean
  icon?: string
}>()

const emit = defineEmits(['update:modelValue'])

// Internal formatting logic
const toDisplay = (val: string | undefined): string => {
  if (!val) return ''
  // Try to split YYYY-MM-DD
  const parts = val.split('-')
  if (parts.length === 3 && parts[0] && parts[0].length === 4) {
    const [y, m, d] = parts
    return `${d}-${m}-${y}`
  }
  return val
}

const toInternal = (val: string | undefined): string => {
  if (!val) return ''
  // Try to split DD-MM-YYYY
  const parts = val.split('-')
  if (parts.length === 3 && parts[2] && parts[2].length === 4) {
    const [d, m, y] = parts
    return `${y}-${m}-${d}`
  }
  return val
}

const displayValue = computed({
  get: () => toDisplay(props.modelValue),
  set: (val: string) => {
    // Only emit if it looks like a valid DD-MM-YYYY (len 10)
    if (val.length === 10) {
      const internal = toInternal(val)
      emit('update:modelValue', internal)
    } else if (val === '') {
      emit('update:modelValue', '')
    }
  }
})
</script>

<template>
  <UInput
    v-model="displayValue"
    :placeholder="placeholder || 'dd-mm-yyyy'"
    :disabled="disabled"
    :icon="icon || 'i-lucide-calendar'"
    class="w-full"
    v-bind="$attrs"
  />
</template>
