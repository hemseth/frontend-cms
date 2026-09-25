<script setup lang="ts">
import { computed } from 'vue'
import type { QueuePatient } from '~/types/workstation'

const props = defineProps<{ patient: QueuePatient | null, visitNo?: string }>()
const { t } = useI18n()

const age = computed(() => ageOf(props.patient?.dob))
const sex = computed(() => (props.patient?.gender === 2 ? t('workstation.sex.female') : props.patient?.gender === 1 ? t('workstation.sex.male') : ''))
const allergies = computed(() => (props.patient?.allergies || []).filter(Boolean))
const coverage = computed(() => props.patient?.coverageType || 'self_pay')
const COVERAGE_COLOR: Record<string, 'success' | 'info' | 'warning' | 'neutral'> = {
  hef: 'success', idpoor: 'success', nssf: 'info', private_insurance: 'warning', self_pay: 'neutral', other: 'neutral'
}
</script>

<template>
  <header
    v-if="patient"
    class="sticky top-0 z-10 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-default bg-default/95 px-4 py-3 backdrop-blur"
  >
    <div class="min-w-0">
      <p class="font-semibold text-base truncate">
        {{ patient.nameKh || patient.nameEn }}
        <span v-if="patient.nameKh && patient.nameEn" class="font-normal text-muted">/ {{ patient.nameEn }}</span>
      </p>
      <p class="text-xs text-muted">
        {{ patientCode(patient) }}
        <template v-if="age !== null">
          • {{ t('workstation.ageYears', { n: age }) }}
        </template>
        <template v-if="sex">
          • {{ sex }}
        </template>
        <template v-if="visitNo">
          • {{ visitNo }}
        </template>
      </p>
    </div>
    <UBadge :color="COVERAGE_COLOR[coverage] || 'neutral'" variant="subtle">
      {{ t(`workstation.coverage.${coverage}`) }}
    </UBadge>
    <!-- Always visible: allergies drive prescribing and orders on every page. -->
    <UBadge
      v-if="allergies.length"
      color="error"
      variant="solid"
      icon="i-lucide-triangle-alert"
      class="max-w-full whitespace-normal"
    >
      {{ t('workstation.allergies') }}: {{ allergies.join(', ') }}
    </UBadge>
    <UBadge
      v-else
      color="neutral"
      variant="outline"
      icon="i-lucide-shield-check"
    >
      {{ t('workstation.noAllergies') }}
    </UBadge>
  </header>
</template>
