<script setup lang="ts">
import GroupsTab from '~/components/diagnoses/settings/GroupsTab.vue'

const { t } = useI18n()
</script>

<template>
  <div class="space-y-4">
    <UBreadcrumb
      :items="[
        { label: t('nav.home'), to: '/' },
        { label: t('nav.settings'), to: '/settings' },
        { label: t('nav.diagnosisManagement') },
        { label: t('diagnosisSettings.tabs.groups') }
      ]"
    />
    <div>
      <h2 class="text-xl font-semibold">
        {{ t('diagnosisSettings.tabs.groups') }}
      </h2>
      <p class="text-sm text-gray-500">
        {{ t('diagnosisSettings.subtitle') }}
      </p>
    </div>
    <GroupsTab />
  </div>
</template>
