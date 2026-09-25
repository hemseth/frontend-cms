<script setup lang="ts">
/**
 * Medicine type-ahead. The backend searches nameEn, nameKh, code and brandName
 * in one query, so typing either the generic name (nameEn) or the brand name
 * finds the medicine.
 *
 * Each suggestion carries the stock quantity, the nearest expiry date and the
 * warehouse, fetched in parallel with the medicine list.
 */
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import type { MedicineRef, MedicineSuggestion, StockRow } from '~/types/pharmacy'

const props = withDefaults(defineProps<{
  modelValue?: MedicineSuggestion | null
  warehouseId?: string
  placeholder?: string
  disabled?: boolean
  /** Hide medicines with no AVAILABLE stock. */
  inStockOnly?: boolean
  autofocus?: boolean
}>(), {})

const emit = defineEmits<{
  'update:modelValue': [value: MedicineSuggestion | null]
  'select': [medicine: MedicineSuggestion]
}>()

const { t, locale } = useI18n()
const { fetchStock, summarise } = useStock()

const query = ref('')
const isOpen = ref(false)
const isSearching = ref(false)
const results = ref<MedicineSuggestion[]>([])
const highlighted = ref(0)

let debounceTimer: ReturnType<typeof setTimeout> | null = null
/** Guards against an older, slower response overwriting a newer one. */
let requestSeq = 0

function displayName(m: MedicineRef): string {
  return locale.value === 'km' ? (m?.nameKh || m?.nameEn || '') : (m?.nameEn || m?.nameKh || '')
}

function secondaryName(m: MedicineRef): string {
  const other = locale.value === 'km' ? m?.nameEn : m?.nameKh
  return other && other !== displayName(m) ? other : ''
}

/** The medicine's own threshold, falling back to the shared default. */
function reorderLevelFor(m: MedicineRef): number {
  return m.minStockAlert ?? DEFAULT_REORDER_LEVEL
}

async function search(term: string) {
  const trimmed = term.trim()
  if (trimmed.length < 2) {
    results.value = []
    return
  }

  const seq = ++requestSeq
  isSearching.value = true
  try {
    const [medRes, stockRows] = await Promise.all([
      $api('/medicines', { params: { search: trimmed, limit: 20 } }) as Promise<{ data?: MedicineRef[] }>,
      // Stock lives in a separate collection, so a medicine with no balance row
      // simply has no stock; it is still listed unless inStockOnly is set.
      fetchStock({
        search: trimmed,
        limit: 100,
        ...(props.warehouseId ? { warehouseId: props.warehouseId } : {})
      }).catch((): StockRow[] => [])
    ])

    if (seq !== requestSeq) return

    const medicines = medRes?.data || []
    const stockByMedicine = summarise(stockRows)

    const merged: MedicineSuggestion[] = medicines.map((m) => {
      const summary = stockByMedicine.get(String(m._id))
      return {
        ...m,
        _stockBase: summary?.totalBase ?? 0,
        _nearestExpiry: summary?.nearestExpiry ?? null,
        _warehouses: summary?.warehouses ?? []
      }
    })

    results.value = props.inStockOnly ? merged.filter(m => m._stockBase > 0) : merged
    highlighted.value = 0
  } catch {
    if (seq === requestSeq) results.value = []
  } finally {
    if (seq === requestSeq) isSearching.value = false
  }
}

watch(query, (val) => {
  isOpen.value = true
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => search(val), 250)
})

onBeforeUnmount(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
})

function choose(medicine: MedicineSuggestion) {
  emit('update:modelValue', medicine)
  emit('select', medicine)
  query.value = displayName(medicine)
  isOpen.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (!isOpen.value || !results.value.length) return

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    highlighted.value = (highlighted.value + 1) % results.value.length
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    highlighted.value = (highlighted.value - 1 + results.value.length) % results.value.length
  } else if (event.key === 'Enter') {
    event.preventDefault()
    const item = results.value[highlighted.value]
    if (item) choose(item)
  } else if (event.key === 'Escape') {
    isOpen.value = false
  }
}

function onBlur() {
  // Delay so a click on a suggestion registers before the list unmounts.
  setTimeout(() => {
    isOpen.value = false
  }, 150)
}

const showEmpty = computed(() =>
  isOpen.value && !isSearching.value && query.value.trim().length >= 2 && !results.value.length
)
</script>

<template>
  <div class="relative w-full">
    <UInput
      v-model="query"
      :placeholder="placeholder || t('pharmacy.searchMedicine')"
      :disabled="disabled"
      :autofocus="autofocus"
      icon="i-lucide-search"
      :loading="isSearching"
      class="w-full"
      size="sm"
      @keydown="onKeydown"
      @focus="isOpen = true"
      @blur="onBlur"
    />

    <div
      v-if="isOpen && results.length"
      class="absolute z-50 mt-1 w-full max-h-80 overflow-y-auto rounded-lg border border-default bg-default shadow-lg"
    >
      <button
        v-for="(m, index) in results"
        :key="m._id"
        type="button"
        class="w-full px-3 py-2 text-left border-b border-default last:border-b-0 transition-colors"
        :class="index === highlighted ? 'bg-elevated' : 'hover:bg-elevated/60'"
        @mouseenter="highlighted = index"
        @click="choose(m)"
      >
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="font-medium text-sm truncate">{{ displayName(m) }}</span>
              <span v-if="m.strength" class="text-xs text-muted">{{ m.strength }}</span>
              <UBadge
                v-if="m.brandName"
                color="neutral"
                variant="subtle"
                size="sm"
              >
                {{ m.brandName }}
              </UBadge>
            </div>

            <div v-if="secondaryName(m)" class="text-xs text-muted truncate">
              {{ secondaryName(m) }}
            </div>

            <div class="mt-1 flex items-center gap-3 flex-wrap text-xs text-muted">
              <span v-if="m.code" class="font-mono">{{ m.code }}</span>

              <span v-if="m._nearestExpiry" class="flex items-center gap-1">
                <UIcon name="i-lucide-calendar-clock" class="w-3 h-3" />
                {{ formatKhDate(m._nearestExpiry) }}
              </span>

              <span v-if="m._warehouses.length" class="flex items-center gap-1 truncate">
                <UIcon name="i-lucide-warehouse" class="w-3 h-3 shrink-0" />
                {{ m._warehouses.join(', ') }}
              </span>
            </div>

            <PharmacyBatchExpiryAlert
              v-if="m._nearestExpiry"
              dense
              class="mt-1"
              :expiry-date="m._nearestExpiry"
            />
          </div>

          <PharmacyStockBalanceChip
            :qty="m._stockBase"
            :reorder-level="reorderLevelFor(m)"
            :unit="m.baseUnit"
          />
        </div>
      </button>
    </div>

    <div
      v-else-if="showEmpty"
      class="absolute z-50 mt-1 w-full rounded-lg border border-default bg-default p-3 text-sm text-muted shadow-lg"
    >
      {{ t('pharmacy.noMedicineFound') }}
    </div>
  </div>
</template>
