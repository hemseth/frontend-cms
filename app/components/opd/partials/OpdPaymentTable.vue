<template>
  <div class="h-full flex flex-col overflow-hidden rounded-xl border border-slate-800 shadow-xl bg-[#0a0f1d]">
    <div class="overflow-x-auto grow">
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr class="bg-[#0f172a] border-b border-slate-800">
            <th class="p-3 text-center w-12 text-slate-500 uppercase tracking-wider font-bold">
              #
            </th>
            <th class="p-3 text-left text-slate-500 uppercase tracking-wider font-bold">
              {{ t("common.itemName") }}
            </th>
            <th class="p-3 text-center text-slate-500 uppercase tracking-wider font-bold">
              {{ t("common.type") }}
            </th>
            <th class="p-3 text-center text-slate-500 uppercase tracking-wider font-bold">
              {{ t("common.qty") }}
            </th>
            <th class="p-3 text-right text-slate-500 uppercase tracking-wider font-bold">
              {{ t("common.price") }}
            </th>
            <th class="p-3 text-right text-slate-500 uppercase tracking-wider font-bold">
              {{ t("common.total") }}
            </th>
            <th class="p-3 text-center w-12" />
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800/50">
          <tr
            v-for="(row, idx) in rows"
            :key="idx"
            class="hover:bg-slate-800/30 transition-colors group"
          >
            <td class="p-3 text-center text-slate-500 font-medium">
              {{ idx + 1 }}
            </td>
            <td class="p-3">
              <div class="flex flex-col">
                <span class="font-bold text-slate-200 text-base">{{ row.name }}</span>
                <span
                  v-if="row.parameters && row.parameters.length > 0"
                  class="text-xs text-slate-500 mt-0.5"
                >
                  {{ row.parameters.length }} parameters
                </span>
              </div>
            </td>
            <td class="p-3 text-center">
              <div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                <UIcon :name="getTypeIcon(row.type)" class="w-3 h-3" />
                {{ row.type }}
              </div>
            </td>
            <td class="p-3 text-center text-slate-300 font-bold text-base">
              {{ rowQtySum(row) }}
            </td>
            <td class="p-3 text-right text-slate-100 font-bold text-base">
              ${{ (row.price || 0).toLocaleString() }}
            </td>
            <td class="p-3 text-right text-slate-500 font-semibold text-base">
              ${{ (rowTotal(row)).toLocaleString() }}
            </td>
            <td class="p-3 text-center">
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                size="sm"
                class="opacity-40 group-hover:opacity-100 transition-opacity"
                @click="$emit('remove-row', idx)"
              />
            </td>
          </tr>
          <tr v-if="rows.length === 0">
            <td colspan="7" class="p-16 text-center text-slate-600 italic">
              {{ t("common.noItemsAdded") }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <!-- Grand Total Section mimics the white footer in the screenshot -->
    <div class="bg-white p-4 flex justify-end items-center border-t border-slate-200">
      <div class="flex items-center gap-8">
        <span class="text-slate-400 font-bold uppercase tracking-wider text-xs">Grand Total:</span>
        <span class="text-3xl font-black text-emerald-600">${{ grandTotal.toLocaleString() }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{
  rows: any[]
}>()

defineEmits<{
  (e: 'remove-row', index: number): void
}>()

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
  const qty = rowQtySum(r)
  return qty * (Number(r.price) || 0)
}

const grandTotal = computed(() => props.rows.reduce((s, r) => s + rowTotal(r), 0))

function getTypeIcon(type: string) {
  switch (type) {
    case 'MEDICINE': return 'i-lucide-pill'
    case 'LAB': return 'i-lucide-test-tube'
    case 'ECHO': return 'i-lucide-activity'
    case 'SCAN': return 'i-lucide-scan'
    default: return 'i-lucide-circle'
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');

tr {
    font-family: 'Inter', sans-serif;
}
</style>
