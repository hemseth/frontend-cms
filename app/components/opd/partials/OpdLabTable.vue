<template>
  <UCard class="h-full">
    <div class="overflow-x-auto">
      <table class="w-full text-sm text-left">
        <thead
          class="bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 uppercase font-bold border-b border-gray-200 dark:border-gray-700"
        >
          <tr>
            <th class="px-4 py-3 w-1/4">
              {{ t("common.testName") }}
            </th>
            <th class="px-4 py-3 w-1/2">
              {{ t("common.result") }}
            </th>
            <th class="px-4 py-3 text-right">
              {{ t("common.price") }}
            </th>
            <th class="px-4 py-3 text-center">
              {{ t("common.action") }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-800 relative">
          <template v-for="(r, idx) in rows" :key="idx">
            <tr
              v-if="r.type === 'LAB'"
              class="hover:bg-gray-50 dark:hover:bg-gray-800/50 group"
              :class="{ 'bg-gray-50 dark:bg-gray-800/50': expandedRowIndex === idx }"
            >
              <td class="px-4 py-3 font-medium align-top">
                <div class="flex flex-col">
                  <span>{{ r.name }}</span>
                  <span class="text-xs text-gray-500 mt-1">{{ r.category }}</span>
                </div>
              </td>
              <td class="px-4 py-3 align-top">
                <!-- If parameters exist: Show Status Badge + Toggle Button -->
                <div
                  v-if="r.parameters && r.parameters.length > 0"
                  class="flex items-center gap-3 h-full"
                >
                  <UBadge
                    :color="getResultStatus(r) === 'complete' ? 'success' : 'warning'"
                    variant="soft"
                    size="xs"
                  >
                    {{ getResultStatus(r) === 'complete' ? t('common.completed') : t('common.pending') }}
                  </UBadge>
                  <span class="text-xs text-gray-500">{{ r.parameters.length }} {{ t('common.qty') }}</span>
                  <UButton
                    :icon="expandedRowIndex === idx ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                    :color="expandedRowIndex === idx ? 'primary' : 'neutral'"
                    variant="soft"
                    size="xs"
                    :label="expandedRowIndex === idx ? t('common.hideDetail') : t('common.enterResults')"
                    @click="toggleResultEntry(idx)"
                  />
                </div>
                <!-- If NO parameters: Show Inline Textarea -->
                <div v-else>
                  <UTextarea
                    v-model="r.result"
                    :rows="2"
                    autoresize
                    :placeholder="t('common.notes')"
                    class="w-full"
                    :ui="{ base: 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700' }"
                  />
                </div>
              </td>
              <td class="px-4 py-3 text-right align-top font-mono">
                ${{ r.price }}
              </td>
              <td class="px-4 py-3 text-center align-top">
                <div class="flex items-center justify-center gap-2">
                  <!-- Save button (always visible for quick save) -->
                  <UButton
                    icon="i-lucide-save"
                    color="primary"
                    variant="ghost"
                    size="xs"
                    :label="t('common.save')"
                    @click="$emit('save-lab', r, idx)"
                  />

                  <UButton
                    icon="i-lucide-trash"
                    color="error"
                    variant="ghost"
                    size="xs"
                    class="opacity-50 group-hover:opacity-100 transition-opacity"
                    @click="$emit('remove-row', idx)"
                  />
                </div>
              </td>
            </tr>

            <tr
              v-if="r.type === 'LAB' && expandedRowIndex === idx && r.parameters && r.parameters.length > 0"
            >
              <td
                colspan="4"
                class="p-0 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30"
              >
                <div class="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div
                    v-for="(param, pIdx) in r.parameters"
                    :key="pIdx"
                    class="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
                  >
                    <div class="flex justify-between items-start mb-2">
                      <div>
                        <div class="font-medium text-sm">
                          {{ param.labelEn }}
                        </div>
                        <div v-if="param.labelKh" class="text-xs text-gray-500 battambang">
                          {{
                            param.labelKh }}
                        </div>
                      </div>
                      <div class="text-xs text-gray-400 text-right">
                        <div v-if="param.unit">
                          {{ param.unit }}
                        </div>
                        <div v-if="param.refRange">
                          {{ param.refRange }}
                        </div>
                      </div>
                    </div>
                    <UInput v-model="param.value" :placeholder="t('common.result')" size="sm" />
                  </div>
                </div>
                <div class="px-4 pb-4 flex justify-end">
                  <UButton
                    icon="i-lucide-save"
                    :label="t('common.saveResults')"
                    color="primary"
                    size="sm"
                    @click="$emit('save-lab', r, idx)"
                  />
                </div>
              </td>
            </tr>
          </template>

          <tr v-if="!rows.some(r => r.type === 'LAB')">
            <td
              colspan="4"
              class="px-4 py-12 text-center text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-800/30 border-b border-gray-200 dark:border-gray-800"
            >
              <div class="flex flex-col items-center gap-3">
                <UIcon name="i-lucide-flask-conical" class="w-10 h-10 text-gray-300" />
                <span class="font-medium">{{ t("common.noLabTests") }}</span>
                <span class="text-xs">{{ t("common.selectFromSidebar") }}</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps<{
  rows: any[]
}>()

defineEmits<{
  (e: 'remove-row', index: number): void
  (e: 'save-lab', row: any, index: number): void
}>()

const expandedRowIndex = ref<number>(-1)

function getResultStatus(service: any): string {
  if (!service) return 'pending'
  if (service.parameters && service.parameters.length > 0) {
    const filledCount = service.parameters.filter((p: any) => p.value && p.value.trim()).length
    if (filledCount === 0) return 'pending'
    if (filledCount === service.parameters.length) return 'complete'
    return 'partial'
  } else {
    return service.result && service.result.trim() ? 'complete' : 'pending'
  }
}

function toggleResultEntry(index: number) {
  if (expandedRowIndex.value === index) {
    expandedRowIndex.value = -1
  } else {
    expandedRowIndex.value = index
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Battambang&display=swap');

.battambang {
    font-family: 'Battambang', serif;
}
</style>
