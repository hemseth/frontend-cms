<script setup lang="ts">
import { useSidebar } from '~/composables/useSidebar'
import { useRouter } from 'vue-router'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const { open, toggleOpen: toggle } = useSidebar()

function handleToggle() {
  toggle()
}
</script>

<template>
  <header
    class="sticky top-0 z-40 w-full backdrop-blur flex-none transition-colors duration-500 lg:z-50 border-b border-gray-200 dark:border-gray-800 bg-primary-100 dark:bg-gray-900/75">
    <div class="max-w-8xl mx-auto">
      <div class="py-4 border-b border-slate-900/10 lg:px-8 lg:border-0 dark:border-slate-300/10 mx-4 lg:mx-0">
        <div class="relative flex items-center">
          <!-- Left: Toggle (Mobile) -->
          <UButton class="lg:hidden mr-4" variant="ghost" color="primary" size="md" square
            :icon="open ? 'i-lucide-chevron-left' : 'i-lucide-chevron-right'" aria-label="Toggle sidebar"
            @click="handleToggle" />

          <!-- Title/Logo -->
          <!-- <Logo class="h-6 w-auto" /> -->

          <!-- Right: Menu -->
          <div class="relative flex items-center ml-auto">
            <LanguageSwitcher class="mr-2" />
            <UColorModeButton class="mr-2" />
            <UserMenu />
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
