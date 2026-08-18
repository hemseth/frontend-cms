<template>
  <UModal v-model:open="isOpen" :title="`Enter Results: ${service?.name}`">
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-gray-100">
          Enter Results: {{ service?.name }}
        </h3>
        <UBadge color="primary" variant="soft">
          {{ service?.parameters?.length }} parameters
        </UBadge>
      </div>
    </template>

    <template #body>
      <div class="p-4 space-y-4 max-h-[500px] overflow-y-auto">
        <div
          v-for="(param, idx) in service?.parameters"
          :key="idx"
          class="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50"
        >
          <div class="flex flex-col gap-2">
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <div class="font-medium text-sm">
                  {{ param.labelEn }}
                </div>
                <div v-if="param.labelKh" class="text-xs text-gray-500 battambang">
                  {{ param.labelKh }}
                </div>
              </div>
              <div class="text-xs text-gray-400 text-right">
                <div v-if="param.unit">
                  Unit: {{ param.unit }}
                </div>
                <div v-if="param.refRange">
                  Ref: {{ param.refRange }}
                </div>
              </div>
            </div>
            <UInput
              v-model="param.value"
              placeholder="Enter result..."
              size="md"
              :ui="{ base: 'w-full' }"
            />
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton
          label="Skip for Now"
          color="neutral"
          variant="ghost"
          @click="handleClose"
        />
        <UButton label="Save Results" color="primary" @click="handleSave" />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  open: boolean
  service: any
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
  (e: 'save'): void
}>()

const isOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})

function handleClose() {
  emit('update:open', false)
}

function handleSave() {
  emit('save')
  emit('update:open', false)
}
</script>

<style scoped>
/* Local fonts defined in main.css */

.battambang {
    font-family: 'Battambang', serif;
}
</style>
