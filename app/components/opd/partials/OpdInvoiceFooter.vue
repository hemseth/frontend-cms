<template>
  <div
    class="flex flex-col md:flex-row gap-4 justify-between items-center bg-white dark:bg-gray-900 border-t dark:border-gray-800 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]"
  >
    <!-- Financials -->
    <div class="flex flex-wrap items-center gap-6">
      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-600 dark:text-gray-400">Subtotal:</span>
        <span class="font-medium dark:text-gray-200">${{ subtotal?.toLocaleString() ?? 0 }}</span>
      </div>

      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-600 dark:text-gray-400">Discount ($):</span>
        <UInput
          :model-value="discount"
          type="number"
          size="xs"
          color="neutral"
          class="w-24 text-right"
          placeholder="0"
          @update:model-value="$emit('update:discount', Number($event))"
        />
      </div>

      <div class="flex items-center gap-2 border-l pl-6 dark:border-gray-700">
        <span class="text-lg font-bold text-gray-800 dark:text-white">Total:</span>
        <span class="text-xl font-bold text-primary-600 dark:text-primary-400">${{ grandTotal.toLocaleString()
        }}</span>
      </div>

      <div class="flex items-center gap-2 border-l pl-6 dark:border-gray-700">
        <span class="text-sm text-gray-600 dark:text-gray-400">Received ($):</span>
        <UInput
          :model-value="totalReceived"
          type="number"
          size="xs"
          color="neutral"
          class="w-24 text-right"
          placeholder="0"
          @update:model-value="$emit('update:totalReceived', Number($event))"
        />
      </div>

      <div class="flex items-center gap-2">
        <span class="text-sm font-bold text-gray-800 dark:text-white">Balance:</span>
        <span class="text-lg font-bold" :class="(balance || 0) > 0 ? 'text-red-600' : 'text-green-600'">${{
          (balance || 0).toLocaleString() }}</span>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex flex-wrap items-center gap-3">
      <div class="flex items-center gap-2 border-r pr-3 mr-1 dark:border-gray-700">
        <UTooltip text="Print Invoice">
          <UButton
            size="sm"
            color="neutral"
            variant="ghost"
            icon="i-lucide-printer"
            @click="$emit('print-invoice')"
          />
        </UTooltip>
        <UTooltip text="Print Prescription">
          <UButton
            size="sm"
            color="neutral"
            variant="ghost"
            icon="i-lucide-file-text"
            @click="$emit('print-prescription')"
          />
        </UTooltip>
        <UTooltip text="Print Lab Results">
          <UButton
            size="sm"
            color="neutral"
            variant="ghost"
            icon="i-lucide-flask-conical"
            @click="$emit('print-lab')"
          />
        </UTooltip>
        <UTooltip text="Print Echo Report">
          <UButton
            size="sm"
            color="neutral"
            variant="ghost"
            icon="i-lucide-activity"
            @click="$emit('print-echo')"
          />
        </UTooltip>
      </div>

      <UButton
        size="md"
        color="success"
        icon="i-lucide-save"
        class="px-6"
        @click="$emit('save')"
      >
        Save & Invoice
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  grandTotal: number
  subtotal?: number
  discount?: number
  totalReceived?: number
  balance?: number
}>()

defineEmits<{
  (e: 'update:discount', value: number): void
  (e: 'update:totalReceived', value: number): void
  (e: 'save'): void
  (e: 'print-invoice'): void
  (e: 'print-prescription'): void
  (e: 'print-lab'): void
  (e: 'print-echo'): void
}>()
</script>
