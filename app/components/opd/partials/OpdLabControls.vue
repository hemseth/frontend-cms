<template>
  <div class="h-full flex flex-col">
    <label class="khmer-label block mb-2 font-bold text-gray-700 dark:text-gray-200">Add Lab Test</label>

    <div class="mb-3 space-y-2">
      <UInput
        v-model="labSearch"
        icon="i-lucide-search"
        placeholder="Search lab test..."
        class="w-full"
        @keydown="onLabSearchKeydown"
      />
    </div>

    <!-- Quick Add List -->
    <div class="flex-1 min-h-0 flex flex-col">
      <div class="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
        Available Tests
      </div>
      <div class="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2">
        <button
          v-for="s in filteredLabServices"
          :key="s._id"
          class="w-full p-2.5 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900 hover:bg-primary-50 dark:hover:bg-primary-900/50 hover:border-primary-300 dark:hover:border-primary-700 text-left flex justify-between items-center group transition-all shadow-sm"
          @click="addService(s)"
        >
          <div class="flex-1 min-w-0">
            <span
              class="font-medium text-sm text-gray-900 dark:text-gray-100 group-hover:text-primary-700 dark:group-hover:text-primary-400 line-clamp-1"
              :title="s.nameEn || s.nameKh"
            >{{ s.nameEn || s.nameKh }}</span>
            <span v-if="s.parameters && s.parameters.length > 0" class="text-xs text-gray-400 block mt-0.5">
              {{ s.parameters.length }} parameter{{ s.parameters.length > 1 ? 's' : '' }}
            </span>
          </div>
          <span
            class="font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded text-xs ml-2 custom-price"
          >${{
            s.price }}</span>
        </button>

        <div
          v-if="filteredLabServices.length === 0"
          class="text-center text-gray-400 py-8 flex flex-col items-center"
        >
          <UIcon name="i-lucide-test-tube-2" class="w-8 h-8 mb-2 opacity-50" />
          <span class="text-sm">No matching lab tests found.</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  labServices: any[]
}>()

const emit = defineEmits<{
  (e: 'add', service: any): void
}>()

const labSearch = ref('')

const filteredLabServices = computed(() => {
  const q = labSearch.value.toLowerCase()
  return props.labServices.filter(
    s =>
      (s.nameEn?.toLowerCase().includes(q)
        || s.nameKh?.toLowerCase().includes(q))
  )
})

function addService(s: any) {
  emit('add', s)
  // Clean up
  labSearch.value = ''
}

function onLabSearchKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    const first = filteredLabServices.value[0]
    if (first) {
      addService(first)
    }
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Battambang&family=Hanuman&display=swap');

.khmer-label {
    font-family: 'Hanuman', serif;
}

.custom-price {
    min-width: 3rem;
    text-align: center;
}
</style>
