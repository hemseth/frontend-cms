<script setup lang="ts">
import StockCountSheet from '~/components/pharmacy/StockCountSheet.vue'

const { t } = useI18n()
</script>

<template>
  <div class="p-4 space-y-4">
    <div class="no-print flex items-center gap-2">
      <UIcon name="i-lucide-clipboard-list" class="w-6 h-6 text-primary" />
      <h1 class="text-xl font-bold">
        {{ t('pharmacy.countSheetTitle') }}
      </h1>
    </div>

    <StockCountSheet />
  </div>
</template>

<style>
/* The sheet itself controls what prints; hide app chrome around it. */
@media print {
  .no-print {
    display: none !important;
  }
}
</style>
