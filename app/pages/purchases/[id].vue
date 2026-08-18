<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const { data: purchaseResult, status } = await useAsyncData(`purchase-${route.params.id}`, () =>
  $api(`/purchases/${route.params.id}`)
)

const purchase = computed(() => (purchaseResult.value as any) || null)

function onCancel() {
  router.back()
}

function onSuccess() {
  router.push('/purchases')
}
</script>

<template>
  <div class="h-[calc(100vh-80px)] overflow-hidden flex flex-col gap-4 p-4">
    <div class="flex items-center justify-between shrink-0">
      <div class="flex items-center gap-4">
        <UButton
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          @click="onCancel"
        />
        <h1 class="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          {{ t('purchase.edit') }}
        </h1>
      </div>
      <UBreadcrumb
        :items="[
          { label: t('nav.home'), to: '/' },
          { label: t('purchase.title'), to: '/purchases' },
          { label: t('purchase.edit') }
        ]"
      />
    </div>

    <div v-if="status === 'pending'" class="flex-1 flex items-center justify-center bg-white/50 dark:bg-gray-900/50 rounded-xl border border-dashed dark:border-gray-800">
      <div class="flex flex-col items-center gap-2">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary-500" />
        <span class="text-sm font-medium">{{ t('common.loading') }}</span>
      </div>
    </div>

    <div v-else-if="purchase" class="flex-1 min-h-0 bg-gray-50 dark:bg-gray-950/50 rounded-xl border dark:border-gray-800 p-2 overflow-hidden shadow-sm">
      <PurchasesPurchaseForm :initial-data="purchase" @success="onSuccess" @cancel="onCancel" />
    </div>

    <div v-else class="flex-1 flex flex-col items-center justify-center bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-800">
      <UIcon name="i-lucide-alert-circle" class="w-12 h-12 text-error-500 mb-2" />
      <h2 class="text-lg font-bold">
        {{ t('common.error') }}
      </h2>
      <p class="text-gray-500 mb-4">
        {{ t('messages.noResults') }}
      </p>
      <UButton
        :label="t('common.back')"
        color="neutral"
        variant="subtle"
        @click="onCancel"
      />
    </div>
  </div>
</template>
