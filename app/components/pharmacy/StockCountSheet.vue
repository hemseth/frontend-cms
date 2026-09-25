<script setup lang="ts">
/**
 * Printable physical stock count sheet.
 *
 * On screen the counted column is editable; printed, it is a blank box for the
 * counter to write in. Posting the count is what writes the adjustment, through
 * stock-posting.service.ts.
 */
import { ref, computed, onMounted } from 'vue'
import type { WarehouseRef } from '~/types/pharmacy'
import type { StockCountLine } from '~/composables/pharmacy/useStockCount'

const props = withDefaults(defineProps<{
  /** Start on a given warehouse instead of the first one. */
  warehouseId?: string
  /** Sheet only: hide the buttons that create and post a count document. */
  printOnly?: boolean
}>(), {})

const { t } = useI18n()
const toast = useToast()
const { fetchStock, fetchWarehouses } = useStock()
const {
  linesFromStock, createCount, startCount, countLine, reviewCount, approveCount, postCount
} = useStockCount()

interface SheetLine extends StockCountLine {
  key: string
  /** What the counter physically found; empty until entered. */
  counted: number | null
}

const warehouses = ref<WarehouseRef[]>([])
const warehouseId = ref(props.warehouseId || '')
const lines = ref<SheetLine[]>([])
const isLoading = ref(false)
const isPosting = ref(false)
const countedAt = ref(new Date().toISOString().split('T')[0] || '')
const counterName = ref('')

const warehouseOptions = computed(() =>
  warehouses.value.map(w => ({ label: w.nameEn || w.nameKh || w.code, value: String(w._id) }))
)
const warehouseLabel = computed(() =>
  warehouseOptions.value.find(w => w.value === warehouseId.value)?.label || '-'
)

const enteredLines = computed(() => lines.value.filter(l => l.counted !== null && l.counted !== undefined))

function variance(line: SheetLine): number | null {
  if (line.counted === null || line.counted === undefined) return null
  return Number(line.counted) - Number(line.systemQtyBase)
}

const varianceCount = computed(() => enteredLines.value.filter(l => (variance(l) ?? 0) !== 0).length)

async function load() {
  isLoading.value = true
  try {
    if (!warehouses.value.length) {
      warehouses.value = await fetchWarehouses()
      if (!warehouseId.value) {
        const pharmacy = warehouses.value.find(w => ['PHARMACY', 'DISPENSING'].includes(String(w.type)))
        warehouseId.value = String(pharmacy?._id || warehouses.value[0]?._id || '')
      }
    }
    if (!warehouseId.value) return

    const rows = await fetchStock({ warehouseId: warehouseId.value, limit: 500 })
    lines.value = linesFromStock(rows).map((l, index) => ({
      ...l,
      key: `${l.medicineId}-${l.batchId || 'nobatch'}-${index}`,
      counted: null
    }))
  } catch (e) {
    toast.add({ title: getApiErrorMessage(e, t('pharmacy.loadFailed')), color: 'error' })
  } finally {
    isLoading.value = false
  }
}

/**
 * Walks the count through its full lifecycle. Any failing step throws, so a
 * half-finished count is never reported as posted.
 */
async function submitCount() {
  if (!enteredLines.value.length) {
    toast.add({ title: t('pharmacy.errNoCounts'), color: 'error' })
    return
  }

  isPosting.value = true
  try {
    const created = await createCount({
      warehouseId: warehouseId.value,
      countType: 'FULL',
      lines: lines.value.map(l => ({
        medicineId: l.medicineId,
        batchId: l.batchId,
        stockStatus: 'AVAILABLE',
        systemQtyBase: Number(l.systemQtyBase) || 0
      }))
    })

    const id = created?._id
    if (!id) throw new Error('Stock count was created without an id')

    await startCount(id)

    // The backend assigns its own line ids, so match them back by position.
    const serverLines = created?.lines || []
    for (const [index, line] of lines.value.entries()) {
      if (line.counted === null || line.counted === undefined) continue
      const lineId = serverLines[index]?._id
      if (!lineId) continue
      await countLine(id, String(lineId), Number(line.counted))
    }

    await reviewCount(id)
    await approveCount(id)
    await postCount(id)

    toast.add({ title: t('pharmacy.countPosted'), color: 'success' })
    await load()
  } catch (e) {
    toast.add({
      title: t('pharmacy.countFailed'),
      description: getApiErrorMessage(e, t('pharmacy.countFailed')),
      color: 'error'
    })
  } finally {
    isPosting.value = false
  }
}

function printSheet() {
  window.print()
}

onMounted(load)
</script>

<template>
  <div class="stock-count-sheet">
    <div class="no-print flex items-end justify-between gap-3 flex-wrap mb-4">
      <UFormField :label="t('pharmacy.warehouse')" class="min-w-56">
        <USelect
          v-model="warehouseId"
          :items="warehouseOptions"
          value-key="value"
          size="sm"
          @update:model-value="load"
        />
      </UFormField>

      <div class="flex items-center gap-2">
        <UButton
          :label="t('common.print')"
          icon="i-lucide-printer"
          color="neutral"
          variant="outline"
          size="sm"
          @click="printSheet"
        />
        <UButton
          v-if="!printOnly"
          :label="t('pharmacy.postCount')"
          icon="i-lucide-check"
          color="primary"
          size="sm"
          :loading="isPosting"
          :disabled="!enteredLines.length || isPosting"
          @click="submitCount"
        />
      </div>
    </div>

    <!-- Printable area -->
    <div class="print-area rounded-lg border border-default p-4 bg-default">
      <div class="text-center mb-4">
        <h2 class="text-lg font-bold">
          {{ t('pharmacy.countSheetTitle') }}
        </h2>
        <p class="text-xs text-muted">
          {{ t('pharmacy.warehouse') }}: <span class="font-medium">{{ warehouseLabel }}</span>
          · {{ t('pharmacy.countDate') }}: <span class="font-medium">{{ formatKhDate(countedAt) }}</span>
        </p>
      </div>

      <div class="grid grid-cols-2 gap-3 mb-4 text-xs">
        <div>
          <span class="text-muted">{{ t('pharmacy.countedBy') }}:</span>
          <input
            v-model="counterName"
            class="ms-1 border-b border-default bg-transparent outline-none px-1"
            :placeholder="t('pharmacy.namePlaceholder')"
          >
        </div>
        <div class="text-end">
          <span class="text-muted">{{ t('pharmacy.signature') }}:</span>
          <span class="inline-block w-32 border-b border-default" />
        </div>
      </div>

      <div v-if="isLoading" class="space-y-2">
        <USkeleton v-for="i in 5" :key="i" class="h-8 w-full" />
      </div>

      <table v-else class="w-full text-sm border-collapse">
        <thead>
          <tr class="border-y border-default text-xs uppercase text-muted">
            <th class="py-2 w-8 text-left">
              #
            </th>
            <th class="py-2 text-left">
              {{ t('pharmacy.medicine') }}
            </th>
            <th class="py-2 text-left w-28">
              {{ t('pharmacy.batchNo') }}
            </th>
            <th class="py-2 text-left w-28">
              {{ t('pharmacy.expiryDate') }}
            </th>
            <th class="py-2 text-right w-24">
              {{ t('pharmacy.systemQty') }}
            </th>
            <th class="py-2 text-right w-28">
              {{ t('pharmacy.countedQty') }}
            </th>
            <th class="py-2 text-right w-24">
              {{ t('pharmacy.variance') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(line, index) in lines" :key="line.key" class="border-b border-default">
            <td class="py-1.5 text-muted">
              {{ index + 1 }}
            </td>

            <td class="py-1.5">
              <div class="font-medium">
                {{ line.medicine?.nameEn || line.medicine?.nameKh || line.medicineId }}
              </div>
              <div v-if="line.medicine?.nameKh && line.medicine?.nameKh !== line.medicine?.nameEn" class="text-xs text-muted">
                {{ line.medicine.nameKh }}
              </div>
            </td>

            <td class="py-1.5 font-mono text-xs">
              {{ line.batch?.batchNo || '-' }}
            </td>

            <td class="py-1.5 text-xs">
              {{ formatKhDate(line.batch?.expiryDate) }}
              <PharmacyBatchExpiryAlert
                v-if="line.batch?.expiryDate"
                dense
                :expiry-date="line.batch.expiryDate"
              />
            </td>

            <td class="py-1.5 text-right tabular-nums">
              {{ Number(line.systemQtyBase).toLocaleString() }}
            </td>

            <td class="py-1.5 text-right">
              <input
                v-model.number="line.counted"
                type="number"
                min="0"
                class="count-input w-24 text-right border-b border-default bg-transparent outline-none px-1 py-0.5"
              >
            </td>

            <td
              class="py-1.5 text-right tabular-nums font-medium"
              :class="(variance(line) ?? 0) > 0 ? 'text-success' : (variance(line) ?? 0) < 0 ? 'text-error' : ''"
            >
              {{ variance(line) === null ? '' : (variance(line)! > 0 ? `+${variance(line)}` : variance(line)) }}
            </td>
          </tr>

          <tr v-if="!lines.length">
            <td colspan="7" class="py-6 text-center text-muted">
              {{ t('pharmacy.noStockRows') }}
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="enteredLines.length" class="no-print mt-3 text-xs text-muted">
        {{ t('pharmacy.countSummary', { counted: enteredLines.length, total: lines.length, variance: varianceCount }) }}
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Blank boxes print instead of input chrome, so the sheet can be filled by hand. */
@media print {
  .no-print {
    display: none !important;
  }

  .print-area {
    border: none;
    padding: 0;
  }

  .count-input {
    border-bottom: 1px solid #000;
  }

  table {
    page-break-inside: auto;
  }

  tr {
    page-break-inside: avoid;
  }

  thead {
    display: table-header-group;
  }
}
</style>
