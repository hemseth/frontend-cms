<script setup lang="ts">
import { ref } from 'vue'
import DispensePrescriptionForm from '~/components/pharmacy/DispensePrescriptionForm.vue'
import WardSupplyForm from '~/components/pharmacy/WardSupplyForm.vue'

const { t } = useI18n()
const route = useRoute()

// Driven by the visit or patient being dispensed for, e.g.
// /inventory/dispense?visitId=...
const visitId = ref(String(route.query.visitId || ''))
const patientId = ref(String(route.query.patientId || ''))
// /inventory/dispense?admissionId=... : ward supply for an admitted patient (docs/IPD.md).
const admissionId = String(route.query.admissionId || '')
const allergies = ref<string[]>([])

const lastDispensingId = ref('')

async function loadPatientAllergies() {
  if (!patientId.value) return
  try {
    const res: { data?: { allergies?: string[] | string } } = await $api(`/patients/${patientId.value}`)
    const raw = res?.data?.allergies
    allergies.value = Array.isArray(raw) ? raw : (raw ? [String(raw)] : [])
  } catch {
    allergies.value = []
  }
}

onMounted(loadPatientAllergies)
</script>

<template>
  <div class="p-4 space-y-4">
    <div class="flex items-center gap-2">
      <UIcon name="i-lucide-pill" class="w-6 h-6 text-primary" />
      <h1 class="text-xl font-bold">
        {{ t('pharmacy.dispenseTitle') }}
      </h1>
    </div>

    <WardSupplyForm v-if="admissionId" :admission-id="admissionId" />
    <DispensePrescriptionForm
      v-else
      :visit-id="visitId || undefined"
      :patient-id="patientId || undefined"
      :allergies="allergies"
      @dispensed="lastDispensingId = $event.id"
    />
  </div>
</template>
