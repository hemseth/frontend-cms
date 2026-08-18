<script setup lang="ts">
const props = defineProps<{
  fontSize: number
  paperSize?: 'A4' | 'A5'
}>()

const emit = defineEmits<{
  (e: 'update:fontSize', value: number): void
  (e: 'update:paperSize', value: 'A4' | 'A5'): void
}>()

function increase() {
  emit('update:fontSize', props.fontSize + 1)
}

function decrease() {
  emit('update:fontSize', props.fontSize - 1)
}

function setPaperSize(size: 'A4' | 'A5') {
  emit('update:paperSize', size)
}

function onPrint() {
  window.print()
}
</script>

<template>
  <div
    class="fixed top-4 right-4 z-50 flex items-center gap-2 bg-white/90 backdrop-blur shadow-md p-2 rounded-lg border border-gray-200 print:hidden transition-opacity hover:opacity-100 opacity-50"
  >
    <!-- Paper Size Controls -->
    <div v-if="paperSize" class="flex items-center gap-1 border-r border-gray-300 pr-2 mr-2">
      <span class="text-xs font-bold text-gray-500 uppercase mr-2">Size</span>
      <div class="flex bg-gray-100 rounded p-0.5">
        <button
          class="px-2 py-0.5 text-xs font-medium rounded transition-colors"
          :class="paperSize === 'A4' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'"
          @click="setPaperSize('A4')"
        >
          A4
        </button>
        <button
          class="px-2 py-0.5 text-xs font-medium rounded transition-colors"
          :class="paperSize === 'A5' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'"
          @click="setPaperSize('A5')"
        >
          A5
        </button>
      </div>
    </div>

    <div class="flex items-center gap-1 border-r border-gray-300 pr-2 mr-2">
      <span class="text-xs font-bold text-gray-500 uppercase mr-2">Font</span>
      <button class="p-1 hover:bg-gray-100 rounded text-gray-700" title="Decrease Font Size" @click="decrease">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-minus"
        >
          <path d="M5 12h14" />
        </svg>
      </button>
      <span class="text-sm font-mono w-8 text-center">{{ fontSize }}px</span>
      <button class="p-1 hover:bg-gray-100 rounded text-gray-700" title="Increase Font Size" @click="increase">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="lucide lucide-plus"
        >
          <path d="M5 12h14" />
          <path d="M12 5v14" />
        </svg>
      </button>
    </div>

    <button
      class="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
      @click="onPrint"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="lucide lucide-printer"
      >
        <polyline points="6 9 6 2 18 2 18 9" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2-2v5a2 2 0 0 1-2 2h-2" />
        <rect
          width="12"
          height="8"
          x="6"
          y="14"
        />
      </svg>
      Print
    </button>
  </div>
</template>
