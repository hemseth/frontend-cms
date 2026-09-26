<script setup lang="ts">
import { useSidebar } from '~/composables/shared/useSidebar'
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
  <!-- Theme surface tokens (not fixed colours) so light and dark mode match the sidebar; h-16
       lines the bottom border up with the sidebar's header row. -->
  <header
    class="sticky top-0 z-40 w-full flex-none border-b border-default bg-default/75 backdrop-blur lg:z-50"
  >
    <div class="max-w-8xl mx-auto">
      <div class="h-16 flex items-center px-4 lg:px-8">
        <div class="relative flex w-full items-center">
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
