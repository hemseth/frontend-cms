<script setup lang="ts">
import type { PrintProfile } from '~/composables/clinic/useClinicProfile'

const props = defineProps<{ profile: PrintProfile }>()

const config = useRuntimeConfig()
const logoSrc = computed(() => resolveAssetUrl(props.profile.logo, String(config.public.apiBase)))
</script>

<template>
  <div class="flex justify-center items-center gap-6 px-4">
    <img
      v-if="logoSrc"
      :src="logoSrc"
      alt=""
      class="h-16 w-16 object-contain shrink-0"
    >
    <div v-else class="text-6xl font-bold leading-none select-none">
      +
    </div>

    <div class="text-center">
      <h1 class="text-[14pt] font-khmer-moul tracking-wide mb-1 leading-tight">
        {{ profile.title }}
      </h1>
      <h2 v-if="profile.subtitle" class="text-xl font-bold uppercase tracking-wider">
        {{ profile.subtitle }}
      </h2>
    </div>

    <div v-if="logoSrc" class="w-16 shrink-0" />
    <div v-else class="text-6xl font-bold leading-none select-none">
      +
    </div>
  </div>
</template>

<style scoped>
.font-khmer-moul {
  font-family: 'Moul', serif;
}
</style>
