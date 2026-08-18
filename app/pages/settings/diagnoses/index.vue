<script setup lang="ts">
import ClinicDiagnosesTab from '~/components/diagnoses/settings/ClinicDiagnosesTab.vue'

const route = useRoute()
const { t } = useI18n()

// Redirect old ?tab= deep links from the previous tabbed page.
const tab = route.query.tab
if (tab === 'master') {
  navigateTo({ path: '/settings/diagnoses/master', replace: true })
} else if (tab === 'groups') {
  navigateTo({ path: '/settings/diagnoses/groups', replace: true })
}
</script>

<template>
  <div class="space-y-4">
    <UBreadcrumb
      :items="[
        { label: t('nav.home'), to: '/' },
        { label: t('nav.settings'), to: '/settings' },
        { label: t('nav.diagnosisManagement') },
        { label: t('diagnosisSettings.tabs.clinicDiagnoses') }
      ]"
    />
    <div>
      <h2 class="text-xl font-semibold">
        {{ t('diagnosisSettings.tabs.clinicDiagnoses') }}
      </h2>
      <p class="text-sm text-gray-500">
        {{ t('diagnosisSettings.subtitle') }}
      </p>
    </div>
    <ClinicDiagnosesTab />
  </div>
</template>
