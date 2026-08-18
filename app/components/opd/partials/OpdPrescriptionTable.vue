<template>
  <UCard class="h-full flex flex-col">
    <div class="overflow-x-auto grow">
      <table class="w-full border border-gray-200 dark:border-gray-800 border-collapse text-sm">
        <thead class="text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-800">
          <tr class="border-b border-gray-200 dark:border-gray-800">
            <th class="p-2 text-center min-w-12">
              {{ t("common.number") }}
            </th>
            <th class="p-2 text-left min-w-64">
              {{ t("common.item") }}
            </th>
            <th class="p-2 text-center min-w-32">
              {{ t("common.unit") || "Unit" }}
            </th>
            <th class="p-2 text-center min-w-16 text-xs">
              {{ t("common.morning") }}
            </th>
            <th class="p-2 text-center min-w-16 text-xs">
              {{ t("common.noon") }}
            </th>
            <th class="p-2 text-center min-w-16 text-xs">
              {{ t("common.evening") }}
            </th>
            <th class="p-2 text-center min-w-16 text-xs">
              {{ t("common.night") }}
            </th>
            <th class="p-2 text-center min-w-16 text-xs">
              {{ t("common.days") || "ចំនួនថ្ងៃ" }}
            </th>
            <th class="p-2 text-center min-w-16">
              {{ t("common.quantity") }}
            </th>
            <th class="p-2 text-center min-w-24">
              {{ t("common.priceType") }}
            </th>
            <th class="p-2 text-right min-w-32">
              {{ t("common.price") }}
            </th>
            <th class="p-2 text-right min-w-32">
              {{ t("common.total") }}
            </th>
            <th class="p-2 text-center min-w-10" />
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
          <tr
            v-for="(rIndex, idx) in prescriptionIndices"
            :key="rIndex"
            class="hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800"
          >
            <td class="p-2 text-center text-gray-500 dark:text-gray-400">
              {{ idx + 1 }}
            </td>
            <td class="p-2">
              <UInput
                v-model="rows[rIndex].name"
                type="text"
                size="md"
                class="medicine-name w-full"
                :placeholder="t('medicine.nameEn')"
              />
              <div
                v-if="rows[rIndex].result"
                class="mt-1 text-xs text-gray-500 dark:text-gray-400 whitespace-pre-wrap"
              >
                {{ t("common.notes") }}: {{ rows[rIndex].result }}
              </div>
            </td>
            <td class="p-2 text-center text-sm text-gray-700 dark:text-gray-200 font-medium">
              {{ rows[rIndex].unit || '—' }}
            </td>
            <td class="p-2">
              <UInput
                :ref="(el) => setInputRef(el, rIndex)"
                v-model.number="rows[rIndex].qmor"
                type="number"
                min="0"
                size="md"
                width="w-10"
                class="text-center"
                :ui="{ base: 'text-center p-1' }"
                @update:model-value="() => onFieldChange(rIndex)"
              />
            </td>
            <td class="p-2 w-10">
              <UInput
                v-model.number="rows[rIndex].qaft"
                type="number"
                min="0"
                size="md"
                class="text-center"
                :ui="{ base: 'text-center p-1' }"
                @update:model-value="() => onFieldChange(rIndex)"
              />
            </td>
            <td class="p-2">
              <UInput
                v-model.number="rows[rIndex].qeve"
                type="number"
                min="0"
                size="md"
                class="text-center"
                :ui="{ base: 'text-center p-1' }"
                @update:model-value="() => onFieldChange(rIndex)"
              />
            </td>
            <td class="p-2">
              <UInput
                v-model.number="rows[rIndex].qngt"
                type="number"
                min="0"
                size="md"
                class="text-center w-full"
                :ui="{ base: 'text-center p-1' }"
                @update:model-value="() => onFieldChange(rIndex)"
              />
            </td>
            <td class="p-2 w-16">
              <UInput
                v-model.number="rows[rIndex].days"
                type="number"
                min="1"
                size="md"
                class="text-center w-full"
                :placeholder="'1'"
                :ui="{ base: 'text-center p-1 font-semibold text-primary-600 dark:text-primary-400' }"
                @update:model-value="() => onFieldChange(rIndex)"
              />
            </td>
            <td class="p-2 text-center font-medium">
              <UInput
                v-if="rows[rIndex].isWholesale"
                v-model.number="rows[rIndex].qty"
                type="number"
                min="1"
                size="md"
                class="w-16 mx-auto text-center"
                :ui="{ base: 'text-center p-1' }"
              />
              <span v-else class="font-semibold">{{ rowQtySum(rows[rIndex]) }}</span>
            </td>
            <td class="p-2">
              <USelectMenu
                :model-value="priceTypeItems.find(p => p.value === rows[rIndex].isWholesale)"
                :items="priceTypeItems"
                size="md"
                class="w-full"
                @update:model-value="(item: any) => onPriceTypeChange(rIndex, item?.value ?? false)"
              />
            </td>
            <td class="p-2">
              <UInput
                v-model.number="rows[rIndex].price"
                type="number"
                step="0.01"
                min="0"
                size="md"
                class="text-right"
                :ui="{ base: 'text-right' }"
              />
            </td>
            <td class="p-2 text-right font-medium">
              {{ (rowQtySum(rows[rIndex]) * (rows[rIndex].price || 0)).toLocaleString() }}
            </td>
            <td class="p-2 text-center">
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                size="xs"
                @click="$emit('remove-row', rIndex)"
              />
            </td>
          </tr>
          <tr v-if="prescriptionIndices.length === 0">
            <td
              colspan="12"
              class="p-8 text-center text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-800/30"
            >
              {{ t("common.noMedicines") }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="flex justify-between items-center mt-4 pt-3 border-t border-gray-200 dark:border-gray-800">
      <div class="flex justify-end w-full gap-3 text-right items-center">
        <div class="khmer-label font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide text-sm">
          {{ t("common.grandTotal") }}:
        </div>
        <div
          class="text-xl font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-4 py-1 rounded-md shadow-sm border border-primary-100 dark:border-primary-900/50"
        >
          ${{ grandTotal.toLocaleString() }}
        </div>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{
  rows: any[]
}>()

defineEmits<{
  (e: 'remove-row', index: number): void
  (e: 'add-row'): void
}>()

const prescriptionIndices = computed(() => props.rows.map((r, i) => (r.type === 'MEDICINE' || !r.type) ? i : -1).filter(i => i !== -1))

const priceTypeItems = computed(() => [
  { label: t('common.retail'), value: false },
  { label: t('common.wholesale'), value: true }
])

function rowQtySum(r: any): number {
  if (r.isWholesale) return Number(r.qty) || 1
  const qmor = Number(r.qmor) || 0
  const qaft = Number(r.qaft) || 0
  const qeve = Number(r.qeve) || 0
  const qngt = Number(r.qngt) || 0
  const perDay = qmor + qaft + qeve + qngt
  const days = (r.days !== undefined && r.days !== null && r.days !== '' && !isNaN(Number(r.days)))
    ? Math.max(1, Number(r.days))
    : 1

  if (perDay > 0) {
    return perDay * days
  }
  if (days > 1) {
    return (Number(r.qty) || 1) * days
  }
  return Number(r.qty) || 1
}

function rowTotal(r: any): number {
  return rowQtySum(r) * (Number(r.price) || 0)
}

const grandTotal = computed(() => props.rows.reduce((s, r) => s + rowTotal(r), 0))

function onPriceTypeChange(index: number, isWholesale: boolean) {
  const row = props.rows[index]
  row.isWholesale = isWholesale
  if (isWholesale) {
    row.price = row.wholesalePrice ?? row.price
    row.unit = row.baseUnit ?? row.unit
  } else {
    row.price = row.retailPrice ?? row.price
    row.unit = row.baseUnit ?? row.unit
  }
  onFieldChange(index)
}

function onFieldChange(index: number) {
  const row = props.rows[index]
  if (row && !row.isWholesale) {
    row.qty = rowQtySum(row)
  }
}

const inputRefs = ref<Record<number, any>>({})
function setInputRef(el: any, index: number) {
  if (el) inputRefs.value[index] = el
}

function focusRow(index: number) {
  const cmp = inputRefs.value[index]
  if (cmp?.input?.focus) {
    cmp.input.focus()
  } else if (cmp?.$el?.querySelector) {
    cmp.$el.querySelector('input')?.focus()
  }
}

defineExpose({ focusRow })
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Battambang&family=Hanuman&display=swap');

.khmer-label {
    font-family: 'Hanuman', serif;
}
</style>
