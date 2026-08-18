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
