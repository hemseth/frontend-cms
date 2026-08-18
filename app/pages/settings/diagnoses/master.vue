<script setup lang="ts">
import WhoMasterTab from '~/components/diagnoses/settings/WhoMasterTab.vue'

const { t } = useI18n()
</script>

<template>
  <div class="space-y-4">
    <UBreadcrumb
      :items="[
        { label: t('nav.home'), to: '/' },
        { label: t('nav.settings'), to: '/settings' },
        { label: t('nav.diagnosisManagement') },
        { label: t('diagnosisSettings.tabs.whoMaster') }
      ]"
    />
    <div>
      <h2 class="text-xl font-semibold">
        {{ t('diagnosisSettings.tabs.whoMaster') }}
      </h2>
      <p class="text-sm text-gray-500">
        {{ t('diagnosisSettings.whoSubtitle') }}
      </p>
    </div>
    <WhoMasterTab />
  </div>
</template>
