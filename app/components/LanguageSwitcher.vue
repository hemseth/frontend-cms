<script setup lang="ts">
const { locale, locales, setLocale } = useI18n()

const availableLocales = computed(() => {
  return locales.value.filter(i => typeof i !== 'string')
})

const currentLocale = computed(() => {
  return availableLocales.value.find(l => l.code === locale.value)
})

function switchLanguage(code: 'en' | 'km') {
  setLocale(code)
}
</script>

<template>
  <UPopover mode="click">
    <UButton
      color="neutral"
      variant="ghost"
      icon="i-lucide-languages"
      size="md"
    >
      <span class="hidden sm:inline">{{ currentLocale?.name || locale }}</span>
    </UButton>

    <template #content>
      <div class="p-2">
        <UButton
          v-for="loc in availableLocales"
          :key="loc.code"
          :variant="locale === loc.code ? 'solid' : 'ghost'"
          class="w-full justify-start mb-1"
          @click="switchLanguage(loc.code)"
        >
          <span class="text-lg">{{ loc.code === 'km' ? '🇰🇭' : '🇺🇸' }}</span>
          {{ loc.name }}
          <UIcon v-if="locale === loc.code" name="i-lucide-check" class="text-primary ml-auto" />
        </UButton>
      </div>
    </template>
  </UPopover>
</template>
