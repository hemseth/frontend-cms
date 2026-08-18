<script setup lang="ts">
import { ref } from 'vue'

const { t } = useI18n()
const router = useRouter()
const purchaseFormRef = ref<any>(null)

function onCancel() {
  router.back()
}

function onSuccess() {
  router.push('/purchases')
}

function triggerSave() {
  purchaseFormRef.value?.handleSave()
}
</script>

<template>
  <div class="h-[calc(100vh-80px)] overflow-hidden flex flex-col gap-4 p-4">
    <div class="flex flex-col gap-2 shrink-0">
      <div class="flex items-center justify-between">
        <UBreadcrumb
          :items="[
            { label: t('nav.home'), to: '/' },
            { label: t('purchase.title'), to: '/purchases' },
            { label: t('purchase.add') }
          ]"
        />
      </div>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <UButton
            icon="i-lucide-arrow-left"
            color="neutral"
            variant="ghost"
            @click="onCancel"
          />
          <h1 class="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {{ t('purchase.add') }}
          </h1>
        </div>
        <UButton
          icon="i-lucide-save"
          :label="t('common.save') || 'Save'"
          color="primary"
          @click="triggerSave"
        />
      </div>
    </div>

    <div class="flex-1 min-h-0 bg-gray-50 dark:bg-gray-950/50 rounded-xl border dark:border-gray-800 p-2 overflow-hidden shadow-sm">
      <PurchasesPurchaseForm ref="purchaseFormRef" @success="onSuccess" @cancel="onCancel" />
    </div>
  </div>
</template>

<style scoped>
/* Ensure main content takes full height without scrolling if possible,
   except for the internal components that have their own scroll */
</style>
