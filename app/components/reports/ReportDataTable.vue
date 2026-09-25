<script setup lang="ts">
import type { ReportColumn } from '~/types/reports'

defineProps<{
  columns: ReportColumn[]
  rows: Record<string, unknown>[]
  loading?: boolean
  error?: string
}>()

const { t } = useI18n()

function display(value: unknown, format: ReportColumn['format'] = 'text') {
  if (value === null || value === undefined || value === '') return '-'
  if (format === 'date') return new Date(value as string).toLocaleDateString()
  const n = Number(value)
  if (format === 'money') return Number.isFinite(n) ? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'
  if (format === 'number') return Number.isFinite(n) ? n.toLocaleString() : '-'
  if (format === 'percent') return Number.isFinite(n) ? `${n.toFixed(1)}%` : '-'
  return String(value)
}
</script>

<template>
  <div>
    <div v-if="loading" class="py-10 text-center">
      <UIcon name="i-lucide-loader-2" class="w-7 h-7 animate-spin mx-auto text-primary-500" />
    </div>
    <UAlert
      v-else-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="error"
    />
    <p v-else-if="rows.length === 0" class="py-10 text-center text-sm text-muted">
      {{ t('report.noData') }}
    </p>
    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-muted text-left text-muted">
          <tr>
            <th
              v-for="column in columns"
              :key="column.key"
              class="p-2"
              :class="['money', 'number', 'percent'].includes(column.format || '') ? 'text-right' : ''"
            >
              {{ t(column.labelKey) }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-default">
          <tr v-for="(row, index) in rows" :key="index">
            <td
              v-for="column in columns"
              :key="column.key"
              class="p-2"
              :class="['money', 'number', 'percent'].includes(column.format || '') ? 'text-right tabular-nums' : ''"
            >
              {{ display(row[column.key], column.format) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
