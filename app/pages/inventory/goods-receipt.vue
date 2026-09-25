<script setup lang="ts">
import GoodsReceiptForm from '~/components/pharmacy/GoodsReceiptForm.vue'

const { t } = useI18n()
</script>

<template>
  <div class="p-4 space-y-4">
    <div class="flex items-center gap-2">
      <UIcon name="i-lucide-package-plus" class="w-6 h-6 text-primary" />
      <h1 class="text-xl font-bold">
        {{ t('pharmacy.grnTitle') }}
      </h1>
    </div>

    <GoodsReceiptForm />
  </div>
</template>
