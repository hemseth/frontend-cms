<script setup lang="ts">
import PayrollCalculator from '~/components/hr/PayrollCalculator.vue'
import { usePayrollRules } from '~/composables/hr/usePayrollRules'

const { t } = useI18n()
const { rules, load } = usePayrollRules()
const rulesError = ref(false)

// Use the clinic's saved brackets so this matches the tax stored on payroll records.
onMounted(async () => {
  try {
    await load()
  } catch {
    rulesError.value = true
  }
})
</script>

<template>
  <div class="p-4 space-y-4 max-w-6xl">
    <h1 class="text-xl font-bold flex items-center gap-2">
      <UIcon name="i-lucide-calculator" class="w-6 h-6 text-primary" />
      {{ t('hr.calcTitle') }}
    </h1>

    <UAlert
      v-if="rulesError"
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="t('settings.taxSettings.usingDefaults')"
    />

    <PayrollCalculator :rules="rules" />
  </div>
</template>
