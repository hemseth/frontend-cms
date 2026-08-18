<template>
  <UCard class="mt-4 bg-gray-50/50">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
      <div class="col-span-1">
        <label class="khmer-label block text-sm mb-1 font-bold text-gray-700">Payment Method /
          ការបង់ប្រាក់</label>
        <USelectMenu
          :model-value="paymentMethod"
          :items="paymentMethods"
          value-key="value"
          class="w-full"
          @update:model-value="$emit('update:paymentMethod', $event)"
        />
      </div>
      <div class="col-span-1">
        <label class="khmer-label block text-sm mb-1 font-bold text-gray-700">Amount Paid / ចំនួនប្រាក់</label>
        <UInput
          type="number"
          class="w-full"
          placeholder="0.00"
          icon="i-lucide-dollar-sign"
        />
      </div>
      <div class="col-span-1 flex gap-3 justify-end items-center">
        <div class="mr-auto text-lg font-bold text-gray-600 hidden md:block">
          Total: <span class="text-primary-600">${{ grandTotal.toLocaleString() }}</span>
        </div>
        <UButton
          icon="i-lucide-printer"
          label="Print"
          color="neutral"
          variant="solid"
          @click="$emit('print')"
        />
        <UButton
          icon="i-lucide-save"
          label="Save Invoice"
          color="success"
          variant="solid"
          @click="$emit('save')"
        />
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
defineProps<{
  paymentMethod: string
  paymentMethods: { value: string, label: string }[]
  grandTotal: number
}>()

defineEmits<{
  (e: 'update:paymentMethod', value: string): void
  (e: 'save'): void
  (e: 'print'): void
}>()
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Battambang&family=Hanuman&display=swap');

.khmer-label {
    font-family: 'Hanuman', serif;
}
</style>
