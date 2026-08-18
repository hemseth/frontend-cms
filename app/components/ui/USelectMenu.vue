<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

const props = defineProps<{
  modelValue?: string | number | null
  items?: Array<{ value: string | number, label: string }>
  placeholder?: string
  searchable?: boolean
}>()
const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const search = ref('')

const items = computed(() => props.items ?? [])

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return items.value
  return items.value.filter(i => i.label.toLowerCase().includes(q))
})

function select(val: string | number) {
  emit('update:modelValue', val)
  open.value = false
  search.value = ''
}

function toggle() {
  open.value = !open.value
}

// display label for current value
const currentLabel = computed(() => {
  const found = items.value.find(i => `${i.value}` === `${props.modelValue}`)
  return found ? found.label : (props.placeholder ?? '')
})
</script>

<template>
  <div class="relative inline-block w-full">
    <button type="button" class="w-full text-left p-2 border rounded" @click="toggle">
      <span class="truncate">{{ currentLabel }}</span>
      <span class="float-right">▾</span>
    </button>

    <div v-if="open" class="absolute z-50 mt-1 w-full bg-white border rounded shadow">
      <div v-if="props.searchable !== false" class="p-2">
        <input v-model="search" class="w-full p-2 border rounded" placeholder="Search...">
      </div>
      <ul class="max-h-48 overflow-auto">
        <li
          v-for="it in filtered"
          :key="it.value"
          class="p-2 hover:bg-gray-100 cursor-pointer"
          @click="select(it.value)"
        >
          {{ it.label }}
        </li>
        <li v-if="!filtered.length" class="p-2 text-gray-400">
          No results
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
