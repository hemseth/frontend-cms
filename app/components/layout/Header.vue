<script setup lang="ts">
import { useSidebar } from '~/composables/shared/useSidebar'
import { useRouter } from 'vue-router'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const { open, toggleOpen: toggle } = useSidebar()

// Workflow alerts (plugins/workflow-alerts.client.ts): green while connected; click mutes the tone.
const alerts = useWorkflowAlerts()
const muted = ref(false)
onMounted(() => {
  try {
    muted.value = localStorage.getItem('alerts.muted') === '1'
  } catch {
    muted.value = false
  }
})
function toggleMute() {
  muted.value = !muted.value
  try {
    localStorage.setItem('alerts.muted', muted.value ? '1' : '0')
  } catch {
    // Private mode: the choice lasts until the page is reloaded.
  }
}

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
          <UButton
            class="lg:hidden mr-4"
            variant="ghost"
            color="primary"
            size="md"
            square
            :icon="open ? 'i-lucide-chevron-left' : 'i-lucide-chevron-right'"
            aria-label="Toggle sidebar"
            @click="handleToggle"
          />

          <!-- Title/Logo -->
          <!-- <Logo class="h-6 w-auto" /> -->

          <!-- Right: Menu -->
          <div class="relative flex items-center ml-auto">
            <UTooltip :text="`${alerts.state.value.connected ? t('alerts.live') : t('alerts.offline')} · ${muted ? t('alerts.unmute') : t('alerts.mute')}`">
              <UButton
                class="mr-2"
                variant="ghost"
                square
                :color="alerts.state.value.connected ? 'success' : 'neutral'"
                :icon="muted ? 'i-lucide-bell-off' : 'i-lucide-bell-ring'"
                :aria-label="muted ? t('alerts.unmute') : t('alerts.mute')"
                @click="toggleMute"
              />
            </UTooltip>
            <LanguageSwitcher class="mr-2" />
            <UColorModeButton class="mr-2" />
            <UserMenu />
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
