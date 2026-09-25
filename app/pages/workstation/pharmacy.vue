<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { WorklistItem, WorkStatus } from '~/types/workstation'
import WorkstationLayout from '~/components/workstation/WorkstationLayout.vue'
import WorklistQueue from '~/components/workstation/WorklistQueue.vue'
import PatientHeader from '~/components/workstation/PatientHeader.vue'
import WorkstationState from '~/components/workstation/WorkstationState.vue'
import DispensePrescriptionForm from '~/components/pharmacy/DispensePrescriptionForm.vue'

const { t } = useI18n()
const auth = useAuth()
const allowed = computed(() => auth.can('dispensing', 'create'))

const { pharmacyQueue } = useDepartmentQueues()
const worklist = useWorklist(pharmacyQueue)
const record = useVisitRecord()
const selected = ref<WorklistItem | null>(null)
const queueOpen = ref(false)
const STATUSES: WorkStatus[] = ['paid', 'dispensed']

const visit = computed(() => record.visit.value)
const isPaid = computed(() => visit.value?.payment?.status === 'paid')

async function select(item: WorklistItem) {
  selected.value = item
  await record.load(item.visitId)
}

async function onDispensed() {
  await worklist.refresh()
}

const escape = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c]!))

/** One small label per medicine, printed from a separate window so only the labels print. */
function printLabels() {
  const v = visit.value
  if (!v?.medications.length) return
  const name = v.patient?.nameKh || v.patient?.nameEn || ''
  const labels = v.medications.map(m => `
    <div class="label">
      <strong>${escape(m.medication)}</strong>
      <div>${escape(name)} ${escape(patientCode(v.patient))}</div>
      <div>${escape(t('workstation.pharmacy.labelSchedule', { m: m.morning, a: m.afternoon, e: m.evening, n: m.night }))}</div>
      <div>${escape(t('workstation.pharmacy.labelDays', { n: m.days }))} • ${escape(m.quantity ?? '')} ${escape(m.unit || '')}</div>
    </div>`).join('')
  const win = window.open('', '_blank', 'width=420,height=600')
  if (!win) return
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escape(t('workstation.pharmacy.labels'))}</title>
    <style>body{font-family:'Battambang','Noto Sans Khmer',sans-serif;margin:0}.label{width:60mm;padding:3mm;border-bottom:1px dashed #999;font-size:11px;page-break-inside:avoid}strong{font-size:13px}</style>
    </head><body>${labels}</body></html>`)
  win.document.close()
  // Printed from here rather than an inline script in the label document; the short delay lets
  // the written document lay out first.
  win.focus()
  setTimeout(() => win.print(), 300)
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
        <UAlert
          v-if="!isPaid"
          color="warning"
          variant="subtle"
          icon="i-lucide-wallet"
          :title="t('workstation.pharmacy.notPaid')"
        />
        <template v-else>
          <div class="flex justify-end">
            <UButton
              :label="t('workstation.pharmacy.printLabels')"
              icon="i-lucide-tag"
              variant="outline"
              color="neutral"
              :disabled="!visit.medications.length"
              @click="printLabels"
            />
          </div>
          <DispensePrescriptionForm
            :key="visit._id"
            :visit-id="visit._id"
            :patient-id="visit.patientId"
            :allergies="visit.patient?.allergies || []"
            @dispensed="onDispensed"
          />
        </template>
      </div>
    </template>
  </WorkstationLayout>
</template>
