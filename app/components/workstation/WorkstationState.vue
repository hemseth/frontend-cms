<script setup lang="ts">
/** The loading, empty, error and permission-denied states every workstation page shows. */
defineProps<{
  state: 'loading' | 'empty' | 'error' | 'denied' | 'select'
  message?: string
}>()
const emit = defineEmits<{ retry: [] }>()
const { t } = useI18n()

const ICONS = {
  loading: 'i-lucide-loader-2',
  empty: 'i-lucide-inbox',
  error: 'i-lucide-circle-alert',
  denied: 'i-lucide-lock',
  select: 'i-lucide-mouse-pointer-click'
} as const
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted" role="status">
    <UIcon :name="ICONS[state]" class="size-10" :class="[state === 'loading' ? 'animate-spin text-primary' : '', state === 'error' ? 'text-error' : '']" />
    <p class="text-sm max-w-md">
      {{ message || t(`workstation.state.${state}`) }}
    </p>
    <UButton
      v-if="state === 'error'"
      :label="t('common.refresh')"
      icon="i-lucide-refresh-cw"
      variant="soft"
      @click="emit('retry')"
    />
  </div>
</template>
