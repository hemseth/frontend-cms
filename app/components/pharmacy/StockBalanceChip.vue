<script setup lang="ts">
/**
 * Colour-coded stock level: red when nothing is on hand, yellow at or below the
 * reorder level, green above it.
 *
 * `qty` is in BASE units, the same unit the backend reports as `qtyBase`.
 */
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  qty?: number | null
  /** The medicine's `minStockAlert`; there is no `reorderLevel` field. */
  reorderLevel?: number
  /** Base unit label, e.g. "pill". */
  unit?: string
  loading?: boolean
  size?: 'sm' | 'md' | 'lg'
  /** Hide the number and show only the status word. */
  labelOnly?: boolean
}>(), {
  qty: 0,
  reorderLevel: DEFAULT_REORDER_LEVEL,
  size: 'sm'
})

const { t } = useI18n()

const level = computed(() => stockLevel(props.qty, props.reorderLevel))
const color = computed(() => stockLevelColor(level.value))

const icon = computed(() => ({
  out: 'i-lucide-circle-x',
  low: 'i-lucide-triangle-alert',
  ok: 'i-lucide-circle-check'
}[level.value]))

const statusLabel = computed(() => ({
  out: t('pharmacy.stockOut'),
  low: t('pharmacy.stockLow'),
  ok: t('pharmacy.stockOk')
}[level.value]))

const qtyLabel = computed(() => {
  const n = Number(props.qty) || 0
  return props.unit ? `${n.toLocaleString()} ${props.unit}` : n.toLocaleString()
})
</script>

<template>
  <USkeleton v-if="loading" class="h-5 w-20" />
  <UBadge
    v-else
    :color="color"
    variant="subtle"
    :size="size"
    :icon="icon"
    :title="`${statusLabel} · ${qtyLabel}`"
  >
    {{ labelOnly ? statusLabel : qtyLabel }}
  </UBadge>
</template>
