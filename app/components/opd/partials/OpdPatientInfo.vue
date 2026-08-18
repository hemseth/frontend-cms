<template>
  <UCard class="col-span-1 md:col-span-4 h-full">
    <template #header>
      <div class="font-semibold flex items-center">
        <UIcon name="i-lucide-user" size="30" class="text-primary-500" />
        <span class="ml-2"> {{ t('patient.info') }}</span>
      </div>
    </template>
    <div class="flex items-end gap-2 mb-3">
      <div class="flex-1">
        <label class="khmer-label block text-sm mb-1">{{ t('patient.id') }}</label>
        <div class="flex gap-2 items-center">
          <UInput
            :model-value="patientId"
            type="text"
            class="w-full"
            placeholder="P-000001"
            icon="i-lucide-user"
            @update:model-value="emit('update:patientId', $event)"
          />

          <!-- Explicit trigger so the modal reliably opens inside OPD -->
          <PatientSearch
            :open="patientSearchOpen"
            @update:open="emit('update:patientSearchOpen', $event)"
            @select="emit('patient-selected', $event)"
          >
            <template #trigger>
              <UButton
                icon="i-lucide-search"
                color="primary"
                variant="solid"
                @click="emit('update:patientSearchOpen', true)"
              />
            </template>
          </PatientSearch>

          <UButton
            icon="i-lucide-plus"
            color="success"
            variant="solid"
            @click="emit('add-patient')"
          />
        </div>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="khmer-label block text-sm mb-1">{{ t('patient.name') }}</label>
        <UInput
          :model-value="patientName"
          type="text"
          class="w-full"
          :placeholder="t('patient.name')"
          @update:model-value="emit('update:patientName', $event)"
        />
      </div>
      <div>
        <label class="khmer-label block text-sm mb-1">{{ t('patient.gender') }}</label>
        <USelect
          :model-value="patientGender"
          :options="genderOptions"
          class="w-full"
          @update:model-value="emit('update:patientGender', $event)"
        />
      </div>
      <div>
        <label class="khmer-label block text-sm mb-1">{{ t('patient.dob') }}</label>
        <UDateInput :model-value="patientDob" @update:model-value="emit('update:patientDob', $event)" />
      </div>
      <div>
        <label class="khmer-label block text-sm mb-1">{{ t('patient.age') }}</label>
        <UInput
          :model-value="patientAge"
          type="text"
          class="w-full"
          disabled
        />
      </div>
    </div>

    <!-- Clinical Safety & Drug Allergy Alert Bar -->
    <div v-if="patientId" class="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-800">
      <div v-if="allergies && allergies.length > 0" class="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2 animate-pulse">
        <UIcon name="i-lucide-shield-alert" class="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wide">
              ⚠️ ប្រតិកម្មថ្នាំ (Allergies):
            </span>
            <span v-if="bloodGroup" class="text-[11px] font-semibold px-1.5 py-0.2 rounded bg-rose-200/60 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
              🩸 {{ bloodGroup }}
            </span>
          </div>
          <div class="flex flex-wrap gap-1 mt-1">
            <span
              v-for="(alg, idx) in allergies"
              :key="idx"
              class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-rose-600 text-white shadow-xs"
            >
              <UIcon name="i-lucide-alert-triangle" class="w-3 h-3" />
              {{ alg }}
            </span>
          </div>
        </div>
      </div>
      <div v-else class="px-2 py-1.5 rounded-md bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 flex items-center justify-between">
        <div class="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
          <UIcon name="i-lucide-shield-check" class="w-4 h-4 text-emerald-500" />
          <span>គ្មានប្រវត្តិប្រតិកម្មថ្នាំ (No known allergies)</span>
        </div>
        <span v-if="bloodGroup" class="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
          🩸 ក្រុមឈាម: {{ bloodGroup }}
        </span>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PatientSearch from '../../patients/PatientSearch.vue'
import type { Patient } from '~/types/models'

const { t } = useI18n()

defineProps<{
  patientId: string
  patientName: string
  patientGender: string
  patientDob?: string
  patientAge?: string | number
  allergies?: string[]
  bloodGroup?: string
  patientSearchOpen: boolean
  genderOptions: { value: string, label: string }[]
}>()

const emit = defineEmits(['update:patientId', 'update:patientName', 'update:patientGender', 'update:patientDob', 'update:patientSearchOpen', 'patient-selected', 'add-patient'])
</script>

<style scoped>
.khmer-label {
  font-family: 'Battambang', serif;
  font-size: 11pt;
}
</style>
