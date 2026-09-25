<script setup lang="ts">
/** Parameters of one order with unit, reference range and an H/L flag. Read-only or editable. */
import type { LabParameter } from '~/types/workstation'

const props = defineProps<{ parameters: LabParameter[], editable?: boolean }>()
const emit = defineEmits<{ 'update:value': [index: number, value: string] }>()
const { t, locale } = useI18n()

const label = (p: LabParameter) => (locale.value === 'km' ? p.labelKh || p.labelEn || p.name : p.labelEn || p.name || p.labelKh) || '-'
const secondLabel = (p: LabParameter) => (locale.value === 'km' ? p.labelEn : p.labelKh) || ''
const flagClass = (flag: 'H' | 'L' | null) => (flag === 'H' ? 'text-error font-semibold' : flag === 'L' ? 'text-info font-semibold' : '')
</script>

<template>
  <p v-if="!props.parameters.length" class="text-sm text-muted">
    {{ t('workstation.lab.noParameters') }}
  </p>
  <table v-else class="w-full text-sm">
    <thead class="text-left text-xs text-muted">
      <tr>
        <th class="py-1.5 pr-2">
          {{ t('workstation.lab.parameter') }}
        </th>
        <th class="py-1.5 pr-2">
          {{ t('workstation.lab.result') }}
        </th>
        <th class="py-1.5 pr-2">
          {{ t('workstation.lab.unit') }}
        </th>
        <th class="py-1.5 pr-2">
          {{ t('workstation.lab.refRange') }}
        </th>
        <th class="py-1.5 w-10" />
      </tr>
    </thead>
    <tbody class="divide-y divide-default">
      <tr v-for="(p, index) in props.parameters" :key="index">
        <td class="py-1.5 pr-2">
          <span class="block">{{ label(p) }}</span>
          <span v-if="secondLabel(p)" class="block text-xs text-muted">{{ secondLabel(p) }}</span>
        </td>
        <td class="py-1.5 pr-2">
          <UInput
            v-if="editable"
            :model-value="p.value || ''"
            size="sm"
            class="w-28"
            :color="flagValue(p.value, p.refRange) ? 'warning' : undefined"
            :highlight="!!flagValue(p.value, p.refRange)"
            :aria-label="label(p)"
            @update:model-value="(v: string | number) => emit('update:value', index, String(v))"
          />
          <span v-else :class="flagClass(flagValue(p.value, p.refRange))">{{ p.value || '-' }}</span>
        </td>
        <td class="py-1.5 pr-2 text-muted">
          {{ p.unit || '' }}
        </td>
        <td class="py-1.5 pr-2 text-muted">
          {{ p.refRange || '' }}
        </td>
        <td class="py-1.5">
          <UBadge v-if="flagValue(p.value, p.refRange)" :color="flagValue(p.value, p.refRange) === 'H' ? 'error' : 'info'" size="sm">
            {{ flagValue(p.value, p.refRange) }}
          </UBadge>
        </td>
      </tr>
    </tbody>
  </table>
</template>
