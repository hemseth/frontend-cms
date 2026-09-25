<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { WorklistItem, WorkStatus } from '~/types/workstation'
import type { DispensingDoc } from '~/types/pharmacy'
import WorkstationLayout from '~/components/workstation/WorkstationLayout.vue'
import WorklistQueue from '~/components/workstation/WorklistQueue.vue'
import PatientHeader from '~/components/workstation/PatientHeader.vue'
import WorkstationState from '~/components/workstation/WorkstationState.vue'
import DispensePrescriptionForm from '~/components/pharmacy/DispensePrescriptionForm.vue'

const { t } = useI18n()
const toast = useToast()
const auth = useAuth()
const allowed = computed(() => auth.can('dispensing', 'create'))

const { pharmacyQueue } = useDepartmentQueues()
const worklist = useWorklist(pharmacyQueue)
const record = useVisitRecord()
const selected = ref<WorklistItem | null>(null)
const queueOpen = ref(false)
const STATUSES: WorkStatus[] = ['to_prepare', 'prepared', 'paid', 'dispensed']

const visit = computed(() => record.visit.value)
const isPaid = computed(() => visit.value?.payment?.status === 'paid')

async function select(item: WorklistItem) {
  selected.value = item
  lastDispensingId.value = ''
  await record.load(item.visitId)
}

async function onDispensed(payload: { id: string }) {
  lastDispensingId.value = payload.id
  await worklist.refresh()
}

/**
 * Labels are printed from what was actually handed over (batch, expiry), so they come
 * from the visit's latest dispensing, not from the prescription.
 */
const lastDispensingId = ref('')
const isFindingLabels = ref(false)

async function printLabels() {
  const v = visit.value
  if (!v) return
  let id = lastDispensingId.value
  if (!id) {
    isFindingLabels.value = true
    try {
      const res: { data?: DispensingDoc[] } = await $api('/dispensings', { params: { visitId: v._id } })
      id = (res?.data ?? []).find(d => d.status === 'DISPENSED' || d.status === 'PARTIAL')?._id ?? ''
    } catch {
      id = ''
    } finally {
      isFindingLabels.value = false
    }
  }
  if (!id) {
    toast.add({ title: t('pharmacy.label.nothingToPrint'), color: 'warning' })
    return
  }
  window.open(`/print/medicine-label/${id}`, '_blank')
}

watch(() => worklist.day.value, () => {
  selected.value = null
})
</script>

<template>
  <WorkstationLayout v-model:queue-open="queueOpen" :title="t('workstation.pages.pharmacy')" icon="i-lucide-pill">
    <template #queue>
      <WorklistQueue
        v-model:day="worklist.day.value"
        v-model:status="worklist.statusFilter.value"
        v-model:search="worklist.search.value"
        :items="worklist.filtered.value"
        :selected-id="selected?.id"
        :loading="worklist.isLoading.value"
        :error="worklist.error.value"
        :last-updated="worklist.lastUpdated.value"
        :now="worklist.now.value"
        :statuses="STATUSES"
        @select="select"
        @refresh="worklist.refresh(true)"
      />
    </template>

    <WorkstationState v-if="!allowed" state="denied" />
    <WorkstationState v-else-if="!selected" state="select" />
    <WorkstationState v-else-if="record.isLoading.value && !visit" state="loading" />
    <WorkstationState
      v-else-if="record.error.value"
      state="error"
      :message="record.error.value"
      @retry="select(selected!)"
    />
    <template v-else-if="visit">
      <PatientHeader :patient="visit.patient" :visit-no="visit.visitId" />
      <div class="space-y-4 p-4">
        <!-- Not paid yet: the medicine can be prepared; it is handed over after payment. -->
        <UAlert
          v-if="!isPaid"
          color="warning"
          variant="subtle"
          icon="i-lucide-wallet"
          :title="t('workstation.pharmacy.notPaid')"
          :description="t('workstation.pharmacy.prepareWhileUnpaid')"
        />
        <template v-if="visit">
          <div v-if="isPaid" class="flex justify-end">
            <UButton
              :label="t('workstation.pharmacy.printLabels')"
              icon="i-lucide-tag"
              variant="outline"
              color="neutral"
              :disabled="!visit.medications.length"
              :loading="isFindingLabels"
              @click="printLabels"
            />
          </div>
          <DispensePrescriptionForm
            :key="visit._id"
            :visit-id="visit._id"
            :patient-id="visit.patientId"
            :allergies="visit.patient?.allergies || []"
            :hold-until-paid="!isPaid"
            @dispensed="onDispensed"
            @prepared="onDispensed"
          />
        </template>
      </div>
    </template>
  </WorkstationLayout>
</template>
