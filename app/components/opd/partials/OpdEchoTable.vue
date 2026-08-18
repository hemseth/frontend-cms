<template>
  <UCard class="h-full">
    <div class="overflow-x-auto">
      <table class="w-full border border-gray-200 dark:border-gray-800 border-collapse text-sm text-left">
        <thead
          class="bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 uppercase font-bold border-b border-gray-200 dark:border-gray-700"
        >
          <tr>
            <th class="px-4 py-3 w-10">
              {{ t("common.number") }}
            </th>
            <th class="px-4 py-3 w-1/3">
              {{ t("common.serviceName") }}
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
        <tbody class="border-b border-gray-200 dark:border-gray-800">
          <template v-for="(r, idx) in rows" :key="idx">
            <tr
              v-if="r.type === 'ECHO'"
              class="hover:bg-gray-50 dark:hover:bg-gray-800/50 group border-b border-gray-200 dark:border-gray-800"
            >
              <td class="px-4 py-3 font-medium align-top pt-4">
                {{ idx + 1 }}
              </td>
              <td class="px-4 py-3 font-medium align-top pt-4">
                <div class="flex flex-col">
                  <span>{{ r.name }}-{{ r.nameKh }}</span>
                  <span v-if="r.category" class="text-xs text-gray-400 font-normal mt-0.5">{{
                    r.category
                  }}</span>
                </div>
              </td>
              <td class="px-4 py-3">
                <UTextarea
                  v-model="r.result"
                  placeholder="Enter findings..."
                  :rows="3"
                  autoresize
                  class="w-full"
                  size="sm"
                />
              </td>
              <td class="px-4 py-3 text-right align-top pt-4 font-mono">
                ${{ r.price }}
              </td>
              <td class="px-4 py-3 text-center align-top pt-4">
                <UButton
                  icon="i-lucide-trash"
                  color="error"
                  variant="ghost"
                  size="xs"
                  class="opacity-0 group-hover:opacity-100 transition-opacity"
                  @click="$emit('remove-row', idx)"
                />
              </td>
            </tr>
          </template>
          <tr v-if="!rows.some(r => r.type === 'ECHO')">
            <td
              colspan="5"
              class="px-4 py-12 text-center text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-800/30"
            >
              <div class="flex flex-col items-center gap-3">
                <UIcon name="i-lucide-activity" class="w-10 h-10 text-gray-300" />
                <span class="font-medium">No Echo services selected</span>
                <span class="text-xs">Select services from the sidebar to add them here.</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
defineProps<{
  rows: any[]
}>()

defineEmits<{
  (e: 'remove-row', index: number): void
}>()
</script>
