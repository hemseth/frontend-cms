<template>
  <div class="h-full flex flex-col">
    <label class="khmer-label block mb-2 font-bold text-gray-700">Payment Method</label>

    <!-- Payment Methods -->
    <div>
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="method in paymentMethods"
          :key="method.value"
          class="p-2 border rounded text-sm text-center transition-colors"
          :class="paymentMethod === method.value ? 'bg-primary-50 border-primary-500 text-primary-700 font-medium' : 'hover:bg-gray-50 text-gray-600'"
          @click="$emit('update:paymentMethod', method.value)"
        >
          {{ method.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  paymentMethod: string
  paymentMethods: { value: string, label: string }[]
}>()

defineEmits<{
  (e: 'update:paymentMethod', value: string): void
}>()
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Battambang&family=Hanuman&display=swap');

.khmer-label {
    font-family: 'Hanuman', serif;
}
</style>
