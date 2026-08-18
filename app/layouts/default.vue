<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const open = ref(false)
const collapsed = ref(false)
provideSidebar(open, collapsed)
</script>

<template>
  <div class="flex min-h-screen w-full bg-white dark:bg-gray-950">
    <!-- Mobile Sidebar Backdrop -->
    <div v-if="open" class="fixed inset-0 z-40 bg-gray-950/25 backdrop-blur-sm lg:hidden" @click="open = false" />

    <LayoutSidebar v-model:open="open" />

    <div class="flex-1 flex flex-col min-w-0">
      <LayoutHeader />

      <main class="flex-1 p-2 overflow-y-auto">
        <slot />
      </main>

      <!-- NotificationsSlideover can be kept if it is not a Dashboard component wrapper -->
      <NotificationsSlideover />
    </div>
  </div>
</template>
