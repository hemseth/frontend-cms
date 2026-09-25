<script setup lang="ts">
/**
 * Red banner for expired stock, yellow for stock expiring within
 * NEAR_EXPIRY_DAYS. Renders nothing when everything is in date.
 *
 * Pass a single `expiryDate`, or `batches` to summarise several at once.
 */
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  expiryDate?: string | Date | null
  batches?: Array<{ batchNo?: string, expiryDate?: string | Date | null, qtyBase?: number }>
  /** Warn this many days ahead. */
  nearDays?: number
  /** Compact single-line form, for inside a table row. */
  dense?: boolean
}>(), {
  nearDays: NEAR_EXPIRY_DAYS
})

const { t } = useI18n()

/** Every date to consider, from either prop. */
const dates = computed(() => {
  const list: Array<{ batchNo?: string, expiryDate?: string | Date | null }> = []
  if (props.expiryDate) list.push({ expiryDate: props.expiryDate })
  for (const b of props.batches || []) {
    // A batch with no stock left cannot be dispensed, so it needs no warning.
    if (b?.expiryDate && (b.qtyBase === undefined || Number(b.qtyBase) > 0)) list.push(b)
  }
  return list
})

const expired = computed(() => dates.value.filter(d => expiryLevel(d.expiryDate, props.nearDays) === 'expired'))
const near = computed(() => dates.value.filter(d => expiryLevel(d.expiryDate, props.nearDays) === 'near'))

const level = computed(() => (expired.value.length ? 'expired' : near.value.length ? 'near' : null))
const color = computed(() => (level.value === 'expired' ? 'error' : 'warning'))

/** Soonest date in the group being reported. */
const soonest = computed(() => nearestExpiry(level.value === 'expired' ? expired.value : near.value))
const daysLeft = computed(() => daysUntil(soonest.value))

const title = computed(() => {
  if (level.value === 'expired') {
    return expired.value.length > 1
      ? t('pharmacy.expiredBatchesCount', { count: expired.value.length })
      : t('pharmacy.expiredBatch')
  }
  return near.value.length > 1
    ? t('pharmacy.nearExpiryBatchesCount', { count: near.value.length })
    : t('pharmacy.nearExpiryBatch')
})

const description = computed(() => {
  const when = formatKhDate(soonest.value)
  if (level.value === 'expired') return t('pharmacy.expiredHint', { date: when })
  return t('pharmacy.nearExpiryHint', { date: when, days: daysLeft.value ?? 0 })
})
</script>

<template>
  <div v-if="level && dense" class="flex items-center gap-1.5 text-xs" :class="level === 'expired' ? 'text-error' : 'text-warning'">
    <UIcon :name="level === 'expired' ? 'i-lucide-octagon-alert' : 'i-lucide-triangle-alert'" class="w-3.5 h-3.5 shrink-0" />
    <span class="font-semibold">{{ title }}</span>
    <span class="opacity-80">{{ formatKhDate(soonest) }}</span>
  </div>

  <UAlert
    v-else-if="level"
    :color="color"
    variant="subtle"
    :icon="level === 'expired' ? 'i-lucide-octagon-alert' : 'i-lucide-triangle-alert'"
    :title="title"
    :description="description"
  >
    <template v-if="(expired.length + near.length) > 1" #description>
      <p class="mb-1">
        {{ description }}
      </p>
      <ul class="list-disc ps-4 space-y-0.5">
        <li v-for="(b, i) in [...expired, ...near]" :key="b.batchNo || i" class="text-xs">
          <span class="font-medium">{{ b.batchNo || t('pharmacy.noBatchNo') }}</span>
          — {{ formatKhDate(b.expiryDate) }}
        </li>
      </ul>
    </template>
  </UAlert>
</template>
