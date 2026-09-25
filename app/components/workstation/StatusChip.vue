<script setup lang="ts">
import type { WorkStatus } from '~/types/workstation'

defineProps<{ status: WorkStatus, size?: 'xs' | 'sm' | 'md' }>()
const { t } = useI18n()
</script>

<template>
  <UBadge :color="WORK_STATUS_COLOR[status]" variant="subtle" :size="size || 'sm'">
    {{ t(`workstation.status.${status}`) }}
  </UBadge>
</template>
