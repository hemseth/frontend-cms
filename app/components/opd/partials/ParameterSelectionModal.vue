<template>
  <UModal v-model:open="isOpen" title="Select Parameters" :ui="{ content: 'max-w-4xl' }">
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-gray-100">
          Select Parameters for {{ service?.nameEn }}
        </h3>
      </div>
    </template>

    <template #body>
      <div class="p-4 space-y-4">
        <!-- Search & Actions -->
        <div class="flex justify-between items-center gap-4">
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Search parameters..."
            class="flex-1"
          />
          <div class="flex gap-2">
            <UButton
              size="sm"
              color="neutral"
              variant="soft"
              label="Select All"
              @click="selectAll"
            />
            <UButton
              size="sm"
              color="neutral"
              variant="ghost"
              label="Clear"
              @click="clearAll"
            />
          </div>
        </div>

        <!-- Parameters Table -->
        <div class="border rounded-lg overflow-hidden max-h-[60vh] overflow-y-auto">
          <table class="w-full text-sm text-left">
            <thead class="bg-gray-50 text-gray-700 uppercase font-bold border-b sticky top-0 z-10">
              <tr>
                <th class="px-4 py-3 w-10 bg-gray-50">
                  <UCheckbox
                    :model-value="areAllFilteredSelected"
                    @update:model-value="toggleAllFiltered"
                  />
                </th>
                <th class="px-4 py-3 bg-gray-50">
                  Parameter Name
                </th>
                <th class="px-4 py-3 w-32 bg-gray-50">
                  Unit
                </th>
                <th class="px-4 py-3 w-40 bg-gray-50">
                  Ref Range
                </th>
              </tr>
            </thead>
            <tbody class="divide-y relative bg-white dark:bg-gray-900">
              <tr
                v-for="(param, idx) in filteredParameters"
                :key="idx"
                class="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                :class="{ 'bg-primary-50 dark:bg-primary-900/10': selectedIndices.has(param.originalIndex) }"
                @click="toggleSelection(param.originalIndex)"
              >
                <td class="px-4 py-3" @click.stop>
                  <UCheckbox
                    :model-value="selectedIndices.has(param.originalIndex)"
                    @update:model-value="toggleSelection(param.originalIndex)"
                  />
                </td>
                <td class="px-4 py-3">
                  <div class="font-medium text-gray-900 dark:text-gray-100">
                    {{ param.labelEn }}
                  </div>
                  <div v-if="param.labelKh" class="text-xs text-gray-500 battambang hidden md:block">
                    {{ param.labelKh }}
                  </div>
                </td>
                <td class="px-4 py-3 text-gray-500">
                  {{ param.unit || '-' }}
                </td>
                <td class="px-4 py-3 text-gray-500">
                  {{ param.refRange || '-' }}
                </td>
              </tr>
              <tr v-if="filteredParameters.length === 0">
                <td colspan="4" class="px-4 py-8 text-center text-gray-500 italic">
                  No parameters found matching "{{ search }}"
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex justify-between items-center text-sm text-gray-500">
          <span>{{ selectedIndices.size }} selected</span>
          <span>Total: {{ service?.parameters?.length || 0 }}</span>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3">
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          @click="handleCancel"
        />
        <UButton
          label="Add Selected"
          color="primary"
          :disabled="selectedIndices.size === 0"
          @click="handleConfirm"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  modelValue: boolean
  service: any
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', selectedParams: any[]): void
}>()

const search = ref('')
const selectedIndices = ref<Set<number>>(new Set())

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

// Reset when modal opens
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    selectedIndices.value.clear()
    search.value = ''
  }
})

const filteredParameters = computed(() => {
  if (!props.service?.parameters) return []
  const q = search.value.toLowerCase().trim()

  return props.service.parameters
    .map((p: any, idx: number) => ({ ...p, originalIndex: idx }))
    .filter((p: any) => {
      if (!q) return true
      return (p.labelEn?.toLowerCase().includes(q)
        || p.labelKh?.toLowerCase().includes(q)
        || p.key?.toLowerCase().includes(q))
    })
})

const areAllFilteredSelected = computed(() => {
  if (filteredParameters.value.length === 0) return false
  return filteredParameters.value.every((p: any) => selectedIndices.value.has(p.originalIndex))
})

function toggleAllFiltered(val: boolean | 'indeterminate') {
  if (val === true) {
    filteredParameters.value.forEach((p: any) => selectedIndices.value.add(p.originalIndex))
  } else {
    filteredParameters.value.forEach((p: any) => selectedIndices.value.delete(p.originalIndex))
  }
  // Force reactivity
  selectedIndices.value = new Set(selectedIndices.value)
}

function toggleSelection(index: number) {
  if (selectedIndices.value.has(index)) {
    selectedIndices.value.delete(index)
  } else {
    selectedIndices.value.add(index)
  }
  selectedIndices.value = new Set(selectedIndices.value)
}

function selectAll() {
  if (!props.service?.parameters) return
  selectedIndices.value = new Set(
    props.service.parameters.map((_: any, idx: number) => idx)
  )
}

function clearAll() {
  selectedIndices.value.clear()
  selectedIndices.value = new Set()
}

function handleCancel() {
  emit('update:modelValue', false)
}

function handleConfirm() {
  const allParams = props.service?.parameters || []
  const selectedParams = Array.from(selectedIndices.value)
    .map((idx: number) => allParams[idx])
    .filter(Boolean)

  emit('confirm', selectedParams)
  emit('update:modelValue', false)
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Battambang&display=swap');

.battambang {
    font-family: 'Battambang', serif;
}
</style>
