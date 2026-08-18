<template>
  <UCard class="col-span-1 md:col-span-4 h-full">
    <template #header>
      <div class="font-semibold flex items-center">
        <UIcon name="i-lucide-activity" size="30" class="text-red-500" />
        <span class="ml-2"> {{ t('vitals.title') }}</span>
      </div>
    </template>
    <div class="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
      <div v-for="(field, idx) in fields" :key="idx">
        <label class="khmer-label block text-sm mb-1 text-gray-700 dark:text-gray-200">{{ field.label }}</label>
        <UInput
          v-model="vitals[field.key]"
          type="text"
          class="w-full"
          :placeholder="field.placeholder"
        />
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{
  vitals: any
}>()

const fields = computed(() => [
  { label: t('vitals.bp'), key: 'bp', placeholder: '120/80' },
  { label: t('vitals.pulse'), key: 'heartRate', placeholder: '80' },
  { label: t('vitals.respRate'), key: 'respRate', placeholder: '20' },
  { label: t('vitals.temp'), key: 'temp', placeholder: '36.5' },
  { label: t('vitals.weight'), key: 'weight', placeholder: '60' },
  { label: t('vitals.oxygen'), key: 'oxygen', placeholder: '98' }
])
</script>

<style scoped>
.khmer-label {
    font-family: 'Battambang', serif;
    font-size: 11pt;
}
</style>
