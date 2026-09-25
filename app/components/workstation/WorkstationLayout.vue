<script setup lang="ts">
/**
 * Queue on the left, the selected patient on the right. Below the lg breakpoint (a 10" tablet in
 * portrait) the queue moves into a slide-over opened from the toolbar.
 */
defineProps<{ title: string, icon: string }>()
const queueOpen = defineModel<boolean>('queueOpen', { default: false })
const { t } = useI18n()
</script>

<template>
  <div class="flex h-[calc(100vh-4rem)] min-h-0 flex-col">
    <div class="flex items-center gap-2 border-b border-default px-4 py-2">
      <UButton
        class="lg:hidden"
        icon="i-lucide-list"
        :label="t('workstation.queue')"
        variant="soft"
        @click="queueOpen = true"
      />
      <UIcon :name="icon" class="size-5 text-primary" />
      <h1 class="text-lg font-semibold">
        {{ title }}
      </h1>
      <div class="ml-auto flex items-center gap-2">
        <slot name="toolbar" />
      </div>
    </div>

    <div class="grid min-h-0 flex-1 lg:grid-cols-[320px_1fr]">
      <aside class="hidden min-h-0 border-r border-default lg:block">
        <slot name="queue" />
      </aside>
      <main class="min-h-0 overflow-y-auto">
        <slot />
      </main>
    </div>

    <USlideover v-model:open="queueOpen" side="left" :title="t('workstation.queue')">
      <template #body>
        <div class="-m-4 h-full" @click.capture="queueOpen = false">
          <slot name="queue" />
        </div>
      </template>
    </USlideover>
  </div>
</template>
