<template>
  <div class="h-full flex flex-col">
    <label class="khmer-label block mb-2 font-bold text-gray-700 dark:text-gray-200">Add Echo Service</label>

    <div class="mb-3">
      <UInput
        v-model="echoSearch"
        icon="i-lucide-search"
        placeholder="Search echo service..."
        class="w-full"
        clearable
      />
    </div>

    <!-- Quick Add List -->
    <div class="flex-1 min-h-0 flex flex-col">
      <div class="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
        Available Services
      </div>
      <div class="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2">
        <button
          v-for="s in filteredEchoServices"
          :key="s._id"
          class="w-full p-2.5 border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900 hover:bg-primary-50 dark:hover:bg-primary-900/50 hover:border-primary-300 dark:hover:border-primary-700 text-left flex justify-between items-center group transition-all shadow-sm"
          @click="$emit('add', s)"
        >
          <span
            class="font-medium text-sm text-gray-900 dark:text-gray-100 group-hover:text-primary-700 dark:group-hover:text-primary-400 line-clamp-1"
            :title="s.nameEn || s.nameKh"
          >{{ s.nameEn || s.nameKh }}</span>
          <span
            class="font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded text-xs ml-2 custom-price"
          >${{
            s.price }}</span>
        </button>

        <div
          v-if="filteredEchoServices.length === 0"
          class="text-center text-gray-400 py-8 flex flex-col items-center"
        >
          <UIcon name="i-lucide-search-x" class="w-8 h-8 mb-2 opacity-50" />
          <span class="text-sm">No matching services found.</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  echoServices: any[]
}>()

const emit = defineEmits<{
  (e: 'add', service: any): void
}>()

const echoSearch = ref('')

const filteredEchoServices = computed(() => {
  const q = echoSearch.value.toLowerCase()
  return props.echoServices.filter(
    s =>
      (s.nameEn?.toLowerCase().includes(q)
        || s.nameKh?.toLowerCase().includes(q))
  )
})
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
