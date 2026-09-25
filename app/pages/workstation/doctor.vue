<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { LabOrder, MedicineLineDraft, VisitDiagnosis, WorklistItem, WorkStatus } from '~/types/workstation'
import type { MedicineSuggestion } from '~/types/pharmacy'
import type { OpdService } from '~/types/models'
import WorkstationLayout from '~/components/workstation/WorkstationLayout.vue'
import WorklistQueue from '~/components/workstation/WorklistQueue.vue'
import PatientHeader from '~/components/workstation/PatientHeader.vue'
import WorkstationState from '~/components/workstation/WorkstationState.vue'
import StatusChip from '~/components/workstation/StatusChip.vue'
import LabResultTable from '~/components/workstation/LabResultTable.vue'
import LabAttachments from '~/components/workstation/LabAttachments.vue'
import OpdDiagnosisControls from '~/components/opd/partials/OpdDiagnosisControls.vue'
import BodyMapClinical from '~/components/clinical/BodyMapClinical.vue'
import MedicineAutocomplete from '~/components/pharmacy/MedicineAutocomplete.vue'

const { t, locale } = useI18n()
const toast = useToast()
const auth = useAuth()

// The backend checks these routes against the patient prefix as well as their own resource,
// so each section is enabled only when both slugs are held (see the backend gap list).
const allowed = computed(() => auth.can('prescription', 'create'))
// Nested visit routes are checked by their own resource (visit/laboratory/prescription).
const canSaveVisit = computed(() => auth.can('visit', 'update'))
const canOrder = computed(() => auth.can('laboratory', 'create'))
const canPrescribe = computed(() => auth.can('prescription', 'create'))
const canVerify = computed(() => auth.can('laboratory', 'approve'))
const canFollowUp = computed(() => auth.can('appointment', 'create'))

const { doctorQueue } = useDepartmentQueues()
// "My patients": a doctor picks themselves; visits not assigned to anyone stay visible.
const DOCTOR_FILTER_KEY = 'workstation.doctorFilter'
const ALL_DOCTORS = 'all'
const readFilter = () => {
  try {
    return localStorage.getItem(DOCTOR_FILTER_KEY) || ALL_DOCTORS
  } catch {
    return ALL_DOCTORS
  }
}
const doctorFilter = ref(import.meta.client ? readFilter() : ALL_DOCTORS)
const doctors = ref<Array<{ _id: string, nameEn?: string, nameKh?: string }>>([])
const doctorOptions = computed(() => [
  { label: t('workstation.doctor.allDoctors'), value: ALL_DOCTORS },
  ...doctors.value.map(d => ({ label: d.nameKh || d.nameEn || '-', value: String(d._id) }))
])
const worklist = useWorklist(async (day: string) => {
  const items = await doctorQueue(day)
  return doctorFilter.value && doctorFilter.value !== ALL_DOCTORS ? items.filter(i => !i.doctorId || i.doctorId === doctorFilter.value) : items
})
watch(doctorFilter, (value) => {
  try {
    localStorage.setItem(DOCTOR_FILTER_KEY, value)
  } catch {
    // Remembering the filter is only a convenience.
  }
  worklist.refresh(true)
})
const record = useVisitRecord()
const { labServices, echoServices, allServices, categoryMap, refreshData } = useOpdData()
onMounted(async () => {
  refreshData()
  try {
    doctors.value = ((await $api('/visits/doctors')) as { data?: typeof doctors.value })?.data ?? []
  } catch {
    doctors.value = []
  }
})

const selected = ref<WorklistItem | null>(null)
const queueOpen = ref(false)
const STATUSES: WorkStatus[] = ['waiting', 'triaged', 'in_consultation', 'awaiting_results', 'results_ready', 'completed', 'cancelled']

const notes = ref('')
const chiefComplaint = ref('')
const examination = ref('')
const plan = ref('')
const diagnosis = ref<VisitDiagnosis[]>([])
const bodyMarkers = ref<unknown[]>([])
const bodySnapshot = ref('')
const regionFilter = ref('')
const selectedServices = ref<Set<string>>(new Set())
const followUpDate = ref('')
const isSaving = ref(false)
const isSending = ref(false)

const visit = computed(() => record.visit.value)
const readOnly = computed(() => ['completed', 'cancelled'].includes(visit.value?.status || ''))
const allergies = computed(() => visit.value?.patient?.allergies || [])

async function select(item: WorklistItem) {
  selected.value = item
  await reload()
}
async function reload() {
  if (!selected.value) return
  await record.load(selected.value.visitId)
  const v = record.visit.value
  notes.value = v?.notes || ''
  chiefComplaint.value = v?.chiefComplaint || ''
  examination.value = v?.examination || ''
  plan.value = v?.plan || ''
  diagnosis.value = [...(v?.diagnosis || [])]
  bodyMarkers.value = [...(v?.bodyMarkers || [])]
  selectedServices.value = new Set()
  draft.value = null
}

// ---- 1. Triage summary --------------------------------------------------------------
const vitalRows = computed(() => {
  const v = visit.value?.vitals || {}
  const [sys, dia] = splitBp(v.bp)
  const bpState = vitalState('systolic', sys ?? '') || vitalState('diastolic', dia ?? '')
  return [
    { key: 'bp', value: v.bp, state: bpState },
    { key: 'temp', value: v.temp, state: vitalState('temp', v.temp) },
    { key: 'heartRate', value: v.heartRate, state: vitalState('heartRate', v.heartRate) },
    { key: 'respRate', value: v.respRate, state: vitalState('respRate', v.respRate) },
    { key: 'oxygen', value: v.oxygen, state: vitalState('oxygen', v.oxygen) },
    { key: 'weight', value: v.weight, state: null },
    { key: 'bsl', value: v.bsl, state: vitalState('bsl', v.bsl) },
    { key: 'painScore', value: v.painScore, state: vitalState('painScore', v.painScore) }
  ].filter(row => row.value)
})

// ---- 2/3. History, exam and diagnosis ------------------------------------------------
async function saveConsultation(status?: 'in-progress' | 'completed') {
  if (!visit.value || !canSaveVisit.value) return
  isSaving.value = true
  try {
    // Keep exactly one primary diagnosis: the first one unless the doctor marked another.
    const dx = diagnosis.value.map((d, i) => ({ ...d, isPrimary: diagnosis.value.some(x => x.isPrimary) ? !!d.isPrimary : i === 0 }))
    await record.updateVisit({
      notes: notes.value,
      chiefComplaint: chiefComplaint.value.trim(),
      examination: examination.value,
      plan: plan.value,
      diagnosis: dx,
      bodyMarkers: bodyMarkers.value,
      ...(bodySnapshot.value ? { bodyChartSnapshot: bodySnapshot.value } : {}),
      ...(status ? { status } : {})
    })
    toast.add({ title: t('common.saved'), color: 'success' })
    await Promise.all([reload(), worklist.refresh()])
  } catch (err) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(err, t('common.saveFailed')), color: 'error' })
  } finally {
    isSaving.value = false
  }
}

function setPrimary(index: number) {
  diagnosis.value = diagnosis.value.map((d, i) => ({ ...d, isPrimary: i === index }))
}

// ---- 4. Orders -----------------------------------------------------------------------
// Procedures and nursing services (injection, dressing, nebulisation ...): billed like tests.
const procedureServices = computed(() => (allServices.value as OpdService[]).filter((s) => {
  const group = categoryMap.value.get(s.categoryId || (s as { category?: string }).category || '')?.group
  return group === 'nursing' || group === 'other' || group === 'package'
}))
const orderedServiceIds = computed(() => new Set((visit.value?.labRequests || []).filter(o => o.status !== 'cancelled').map(o => o.serviceId)))
const orderGroups = computed(() => [
  { key: 'laboratory' as const, label: t('workstation.doctor.groupLab'), services: labServices.value as OpdService[] },
  { key: 'imaging' as const, label: t('workstation.doctor.groupImaging'), services: echoServices.value as OpdService[] },
  { key: 'other' as const, label: t('workstation.doctor.groupProcedures'), services: procedureServices.value }
].filter(group => group.services.length))
const serviceName = (s: OpdService) => (locale.value === 'km' ? s.nameKh || s.nameEn : s.nameEn || s.nameKh)
const selectedTotal = computed(() => orderGroups.value.flatMap(g => g.services).filter(s => selectedServices.value.has(s._id)).reduce((sum, s) => sum + (s.price || 0), 0))

function toggleService(id: string, on: boolean) {
  const next = new Set(selectedServices.value)
  if (on) next.add(id)
  else next.delete(id)
  selectedServices.value = next
}

/** One click sends every selected order; each lands in its own department's queue. */
async function sendOrders() {
  if (!canOrder.value || !selectedServices.value.size) return
  isSending.value = true
  const failed: string[] = []
  for (const group of orderGroups.value) {
    for (const service of group.services.filter(s => selectedServices.value.has(s._id))) {
      // A sensitive test (e.g. HIV) is only ordered with the patient's consent.
      let consent: { counsellingNote?: string } | undefined
      if (service.sensitive) {
        if (!window.confirm(t('workstation.doctor.consentConfirm', { test: serviceName(service) }))) continue
        consent = { counsellingNote: window.prompt(t('workstation.doctor.counsellingPrompt'))?.trim() || undefined }
      }
      try {
        await record.addOrder(service, group.key, consent)
      } catch (err) {
        failed.push(`${serviceName(service)}: ${getApiErrorMessage(err, t('common.saveFailed'))}`)
      }
    }
  }
  if (failed.length) toast.add({ title: t('workstation.doctor.someOrdersFailed'), description: failed.join('\n'), color: 'error' })
  else toast.add({ title: t('workstation.doctor.ordersSent'), color: 'success' })
  await Promise.all([reload(), worklist.refresh()])
  isSending.value = false
}

const orders = computed<LabOrder[]>(() => visit.value?.labRequests || [])
const allVerifiedOrDone = computed(() => orders.value.length > 0 && orders.value.every(o => o.status === 'completed' || o.status === 'cancelled'))

// ---- 6. Prescription -----------------------------------------------------------------
const draft = ref<MedicineLineDraft | null>(null)
const allergyConflict = computed(() => {
  const m = draft.value?.medicine
  if (!m) return null
  return checkDrugAllergy(`${m.nameEn || ''} ${m.nameKh || ''} ${m.brandName || ''}`, allergies.value)
})

function pickMedicine(m: MedicineSuggestion | null) {
  draft.value = m ? { medicine: m, morning: 1, afternoon: 0, evening: 1, night: 0, days: 5 } : null
}

async function addPrescription() {
  const d = draft.value
  if (!d || !canPrescribe.value) return
  // The server refuses a medicine matching a recorded allergy unless a reason is given.
  let allergyOverrideReason: string | undefined
  if (allergyConflict.value) {
    allergyOverrideReason = window.prompt(t('workstation.doctor.allergyReasonPrompt', { allergy: allergyConflict.value }))?.trim()
    if (!allergyOverrideReason) return
  }
  try {
    await record.addPrescription({
      ...(allergyOverrideReason ? { allergyOverrideReason } : {}),
      medicineId: d.medicine._id,
      medication: d.medicine.nameEn || d.medicine.nameKh || '',
      unit: d.medicine.baseUnit || d.medicine.unit,
      unitPrice: d.medicine.retailPrice ?? 0,
      morning: Number(d.morning) || 0,
      afternoon: Number(d.afternoon) || 0,
      evening: Number(d.evening) || 0,
      night: Number(d.night) || 0,
      days: Math.max(1, Number(d.days) || 1)
    })
    draft.value = null
    await reload()
  } catch (err) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(err, t('common.saveFailed')), color: 'error' })
  }
}

async function removePrescription(id?: string) {
  if (!id || !window.confirm(t('workstation.doctor.removeRxConfirm'))) return
  try {
    await record.removePrescription(id)
    await reload()
  } catch (err) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(err, t('common.saveFailed')), color: 'error' })
  }
}

// ---- 7. Follow-up and footer ---------------------------------------------------------
async function bookFollowUp() {
  if (!visit.value || !followUpDate.value) return
  try {
    await $api('/appointments', {
      method: 'POST',
      body: { patientId: visit.value.patientId, appointmentDate: followUpDate.value, reason: t('workstation.doctor.followUpReason'), doctorId: visit.value.doctorId }
    })
    toast.add({ title: t('workstation.doctor.followUpBooked'), color: 'success' })
    followUpDate.value = ''
  } catch (err) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(err, t('common.saveFailed')), color: 'error' })
  }
}

async function verify(orderId: string) {
  try {
    await record.verifyOrder(orderId)
    await reload()
  } catch (err) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(err, t('common.saveFailed')), color: 'error' })
  }
}

async function finishToCashier() {
  if (!window.confirm(t('workstation.doctor.finishConfirm'))) return
  await saveConsultation('completed')
}

function admit() {
  if (visit.value) navigateTo({ path: '/inpatient/bed-board', query: { patientId: visit.value.patientId } })
}

useSaveShortcut(() => saveConsultation(), () => canSaveVisit.value && !!visit.value && !readOnly.value)
watch(() => worklist.day.value, () => {
  selected.value = null
})

const vitalClass = (state: string | null) => (state === 'high' || state === 'invalid' ? 'text-error font-semibold' : state === 'low' ? 'text-info font-semibold' : '')
</script>

<template>
  <WorkstationLayout v-model:queue-open="queueOpen" :title="t('workstation.pages.doctor')" icon="i-lucide-stethoscope">
    <template #queue>
      <div v-if="doctors.length" class="border-b border-default p-2">
        <USelect
          v-model="doctorFilter"
          :items="doctorOptions"
          value-key="value"
          size="sm"
          class="w-full"
        />
      </div>
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
      @retry="reload"
    />
    <template v-else-if="visit">
      <PatientHeader :patient="visit.patient" :visit-no="visit.visitId" />
      <div class="space-y-4 p-4 pb-28">
        <UAlert
          v-if="readOnly"
          color="neutral"
          variant="subtle"
          icon="i-lucide-lock"
          :title="t('workstation.readOnlyVisit')"
        />
        <UAlert
          v-if="!canSaveVisit"
          color="warning"
          variant="subtle"
          icon="i-lucide-shield-alert"
          :title="t('workstation.doctor.cannotSaveVisit')"
        />
        <UAlert
          v-if="selected.status === 'results_ready'"
          color="success"
          variant="subtle"
          icon="i-lucide-flask-conical"
          :title="t('workstation.doctor.resultsReady')"
        />

        <!-- 1. Triage summary (read-only) -->
        <UCard>
          <template #header>
            <h2 class="font-semibold">
              {{ t('workstation.doctor.triageSummary') }}
            </h2>
          </template>
          <p v-if="!vitalRows.length" class="text-sm text-muted">
            {{ t('workstation.doctor.noVitals') }}
          </p>
          <dl v-else class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div v-for="row in vitalRows" :key="row.key">
              <dt class="text-xs text-muted">
                {{ t(`workstation.vitals.${row.key}`) }}
              </dt>
              <dd :class="vitalClass(row.state)">
                {{ row.value }}
                <UIcon v-if="row.state" name="i-lucide-triangle-alert" class="size-3.5" />
              </dd>
            </div>
          </dl>
        </UCard>

        <!-- 2. History and exam -->
        <UCard>
          <template #header>
            <h2 class="font-semibold">
              {{ t('workstation.doctor.historyExam') }}
            </h2>
          </template>
          <UFormField :label="t('workstation.triage.chiefComplaint')" class="mb-3">
            <UInput
              v-model="chiefComplaint"
              class="w-full"
              :maxlength="500"
              :disabled="readOnly || !canSaveVisit"
            />
          </UFormField>
          <UFormField :label="t('workstation.doctor.history')">
            <UTextarea
              v-model="notes"
              :rows="4"
              autoresize
              class="w-full"
              :disabled="readOnly || !canSaveVisit"
              :placeholder="t('workstation.doctor.historyPlaceholder')"
            />
          </UFormField>
          <UFormField :label="t('workstation.doctor.examination')" class="mt-3">
            <UTextarea
              v-model="examination"
              :rows="3"
              autoresize
              class="w-full"
              :maxlength="4000"
              :disabled="readOnly || !canSaveVisit"
            />
          </UFormField>
          <UFormField :label="t('workstation.doctor.plan')" class="mt-3">
            <UTextarea
              v-model="plan"
              :rows="2"
              autoresize
              class="w-full"
              :maxlength="4000"
              :disabled="readOnly || !canSaveVisit"
            />
          </UFormField>
          <details class="mt-3">
            <summary class="cursor-pointer text-sm font-medium">
              {{ t('workstation.doctor.bodyChart') }}
            </summary>
            <div class="mt-2 min-h-[420px]">
              <BodyMapClinical
                v-model="bodyMarkers as any"
                :read-only="readOnly || !canSaveVisit"
                @region-selected="(code: string) => (regionFilter = code)"
                @snapshot="(url: string) => (bodySnapshot = url)"
              />
            </div>
          </details>
        </UCard>

        <!-- 3. Diagnosis -->
        <UCard>
          <template #header>
            <h2 class="font-semibold">
              {{ t('workstation.doctor.diagnosis') }}
            </h2>
          </template>
          <OpdDiagnosisControls
            v-if="!readOnly && canSaveVisit"
            v-model="diagnosis"
            :region-filter="regionFilter"
            @clear-region-filter="regionFilter = ''"
          />
          <ul v-if="diagnosis.length" class="mt-3 divide-y divide-default">
            <li v-for="(d, index) in diagnosis" :key="index" class="flex items-center gap-2 py-1.5 text-sm">
              <UBadge v-if="d.isPrimary || (index === 0 && !diagnosis.some(x => x.isPrimary))" color="primary" size="sm">
                {{ t('workstation.doctor.primary') }}
              </UBadge>
              <span class="font-mono text-xs">{{ d.code }}</span>
              <span>{{ locale === 'km' ? d.nameKh || d.nameEn : d.nameEn || d.nameKh }}</span>
              <UButton
                v-if="!readOnly && canSaveVisit && !d.isPrimary"
                size="xs"
                variant="ghost"
                :label="t('workstation.doctor.makePrimary')"
                class="ml-auto"
                @click="setPrimary(index)"
              />
            </li>
          </ul>
        </UCard>

        <!-- 4. Orders -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="font-semibold">
                {{ t('workstation.doctor.orders') }}
              </h2>
              <span class="text-sm text-muted">{{ t('workstation.doctor.selectedTotal', { amount: selectedTotal.toFixed(2) }) }}</span>
            </div>
          </template>
          <p v-if="!canOrder" class="text-sm text-muted">
            {{ t('workstation.doctor.cannotOrder') }}
          </p>
          <div v-else class="grid gap-4 md:grid-cols-2">
            <fieldset v-for="group in orderGroups" :key="group.key">
              <legend class="mb-2 text-sm font-medium">
                {{ group.label }}
              </legend>
              <div class="max-h-56 space-y-1 overflow-y-auto pr-1">
                <label
                  v-for="service in group.services"
                  :key="service._id"
                  class="flex items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-elevated"
                >
                  <UCheckbox
                    :model-value="selectedServices.has(service._id) || orderedServiceIds.has(service._id)"
                    :disabled="readOnly || orderedServiceIds.has(service._id)"
                    @update:model-value="(v: boolean | 'indeterminate') => toggleService(service._id, v === true)"
                  />
                  <span class="flex-1">{{ serviceName(service) }}</span>
                  <span class="text-muted tabular-nums">{{ (service.price || 0).toFixed(2) }}</span>
                </label>
              </div>
            </fieldset>
          </div>
          <template v-if="canOrder" #footer>
            <div class="flex justify-end">
              <UButton
                :label="t('workstation.doctor.sendToDepartments')"
                icon="i-lucide-send"
                :loading="isSending"
                :disabled="readOnly || !selectedServices.size"
                @click="sendOrders"
              />
            </div>
          </template>
        </UCard>

        <!-- 5. Results -->
        <UCard v-if="orders.length">
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="font-semibold">
                {{ t('workstation.doctor.results') }}
              </h2>
              <UButton
                icon="i-lucide-refresh-cw"
                size="xs"
                variant="ghost"
                :aria-label="t('common.refresh')"
                @click="reload"
              />
            </div>
          </template>
          <div class="space-y-3">
            <div v-for="order in orders" :key="order._id" class="rounded-lg border border-default p-3">
              <div class="mb-2 flex flex-wrap items-center gap-2">
                <span class="font-medium">{{ locale === 'km' ? order.serviceNameKh || order.serviceName : order.serviceName }}</span>
                <StatusChip :status="orderStatus(order.status)" size="xs" />
                <UBadge
                  v-if="order.verifiedAt"
                  color="success"
                  variant="subtle"
                  size="xs"
                  class="ml-auto"
                >
                  {{ t('workstation.lab.verified') }}
                </UBadge>
                <UButton
                  v-else-if="canVerify && order.status === 'completed' && !order.redacted"
                  size="xs"
                  variant="soft"
                  icon="i-lucide-badge-check"
                  :label="t('workstation.lab.verify')"
                  class="ml-auto"
                  @click="verify(order._id)"
                />
              </div>
              <LabResultTable v-if="order.category !== 'imaging'" :parameters="order.parameters || []" />
              <div v-else-if="order.result" class="space-y-2 text-sm">
                <div v-if="parseEchoReport(order.result).findings">
                  <p class="font-medium">
                    {{ t('workstation.echo.findings') }}
                  </p>
                  <p class="whitespace-pre-line">
                    {{ parseEchoReport(order.result).findings }}
                  </p>
                </div>
                <div v-if="parseEchoReport(order.result).conclusion">
                  <p class="font-medium">
                    {{ t('workstation.echo.conclusion') }}
                  </p>
                  <p class="whitespace-pre-line">
                    {{ parseEchoReport(order.result).conclusion }}
                  </p>
                </div>
              </div>
              <p v-else class="text-sm text-muted">
                {{ t('workstation.echo.noReport') }}
              </p>
              <LabAttachments v-if="order.attachments?.length" class="mt-3" :order="order" />
            </div>
          </div>
          <p v-if="allVerifiedOrDone" class="mt-3 text-sm text-success">
            {{ t('workstation.doctor.allResultsBack') }}
          </p>
        </UCard>

        <!-- 6. Prescription -->
        <UCard>
          <template #header>
            <h2 class="font-semibold">
              {{ t('workstation.doctor.prescription') }}
            </h2>
          </template>
          <p v-if="!canPrescribe" class="mb-3 text-sm text-muted">
            {{ t('workstation.doctor.cannotPrescribe') }}
          </p>
          <div v-else-if="!readOnly" class="space-y-3">
            <MedicineAutocomplete :model-value="draft?.medicine ?? null" @update:model-value="pickMedicine" />
            <div v-if="draft" class="space-y-2 rounded-lg border border-default p-3">
              <div class="flex flex-wrap items-center gap-2 text-sm">
                <span class="font-medium">{{ draft.medicine.nameKh || draft.medicine.nameEn }}</span>
                <UBadge :color="draft.medicine._stockBase > 0 ? 'success' : 'error'" variant="subtle" size="sm">
                  {{ t('workstation.doctor.inStock', { n: draft.medicine._stockBase }) }}
                </UBadge>
              </div>
              <UAlert
                v-if="allergyConflict"
                color="error"
                variant="solid"
                icon="i-lucide-triangle-alert"
                :title="t('workstation.doctor.allergyWarning', { allergy: allergyConflict })"
              />
              <div class="flex flex-wrap items-end gap-2">
                <UFormField v-for="slot in (['morning', 'afternoon', 'evening', 'night'] as const)" :key="slot" :label="t(`workstation.doctor.dose.${slot}`)">
                  <UInput
                    v-model.number="draft[slot]"
                    type="number"
                    min="0"
                    class="w-16"
                  />
                </UFormField>
                <span class="pb-2">×</span>
                <UFormField :label="t('workstation.doctor.days')">
                  <UInput
                    v-model.number="draft.days"
                    type="number"
                    min="1"
                    class="w-16"
                  />
                </UFormField>
                <UButton :label="t('workstation.doctor.addMedicine')" icon="i-lucide-plus" @click="addPrescription" />
              </div>
              <p class="text-xs text-muted">
                {{ t('workstation.doctor.totalByServer') }}
              </p>
            </div>
          </div>
          <table v-if="visit.medications.length" class="mt-3 w-full text-sm">
            <thead class="text-left text-xs text-muted">
              <tr>
                <th class="py-1">
                  {{ t('workstation.doctor.medicine') }}
                </th>
                <th class="py-1">
                  {{ t('workstation.doctor.schedule') }}
                </th>
                <th class="py-1">
                  {{ t('workstation.doctor.days') }}
                </th>
                <th class="py-1 text-right">
                  {{ t('workstation.doctor.quantity') }}
                </th>
                <th />
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr v-for="line in visit.medications" :key="line._id">
                <td class="py-1.5">
                  {{ line.medication }}
                </td>
                <td class="py-1.5 tabular-nums">
                  {{ line.morning }}-{{ line.afternoon }}-{{ line.evening }}-{{ line.night }}
                </td>
                <td class="py-1.5">
                  {{ line.days }}
                </td>
                <td class="py-1.5 text-right tabular-nums">
                  {{ line.quantity ?? '-' }} {{ line.unit || '' }}
                </td>
                <td class="py-1.5 text-right">
                  <UButton
                    v-if="canPrescribe && !readOnly"
                    icon="i-lucide-trash-2"
                    size="xs"
                    color="error"
                    variant="ghost"
                    :aria-label="t('common.remove')"
                    @click="removePrescription(line._id)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </UCard>

        <!-- 7. Plan and follow-up -->
        <UCard>
          <template #header>
            <h2 class="font-semibold">
              {{ t('workstation.doctor.planFollowUp') }}
            </h2>
          </template>
          <div v-if="canFollowUp" class="flex flex-wrap items-end gap-2">
            <UFormField :label="t('workstation.doctor.followUpDate')">
              <UInput v-model="followUpDate" type="date" />
            </UFormField>
            <UButton
              :label="t('workstation.doctor.bookFollowUp')"
              variant="soft"
              icon="i-lucide-calendar-plus"
              :disabled="!followUpDate"
              @click="bookFollowUp"
            />
          </div>
        </UCard>
      </div>

      <!-- Footer actions -->
      <div class="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-default bg-default/95 px-4 py-3 backdrop-blur">
        <UButton
          :label="t('common.save')"
          icon="i-lucide-save"
          variant="soft"
          :loading="isSaving"
          :disabled="readOnly || !canSaveVisit"
          @click="saveConsultation(visit.status === 'pending' ? 'in-progress' : undefined)"
        />
        <UButton
          :label="t('workstation.doctor.sendToDepartments')"
          icon="i-lucide-send"
          variant="soft"
          :loading="isSending"
          :disabled="readOnly || !canOrder || !selectedServices.size"
          @click="sendOrders"
        />
        <UButton
          :label="t('workstation.doctor.admit')"
          icon="i-lucide-bed"
          variant="soft"
          color="neutral"
          :disabled="readOnly"
          @click="admit"
        />
        <UTooltip :text="t('workstation.pendingBackend')">
          <UButton
            :label="t('workstation.doctor.referOut')"
            icon="i-lucide-send-to-back"
            variant="soft"
            color="neutral"
            disabled
          />
        </UTooltip>
        <UButton
          :label="t('workstation.doctor.finish')"
          icon="i-lucide-wallet"
          :loading="isSaving"
          :disabled="readOnly || !canSaveVisit"
          @click="finishToCashier"
        />
      </div>
    </template>
  </WorkstationLayout>
</template>
