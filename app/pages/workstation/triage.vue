<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Vitals, WorklistItem, WorkStatus } from '~/types/workstation'
import type { VitalKey } from '~/utils/labRange'
import WorkstationLayout from '~/components/workstation/WorkstationLayout.vue'
import WorklistQueue from '~/components/workstation/WorklistQueue.vue'
import PatientHeader from '~/components/workstation/PatientHeader.vue'
import WorkstationState from '~/components/workstation/WorkstationState.vue'

const { t } = useI18n()
const toast = useToast()
const auth = useAuth()
// Vitals are written through the visit update route, checked as visit:update.
const allowed = computed(() => auth.can('visit', 'update'))

const { triageQueue } = useDepartmentQueues()
const worklist = useWorklist(triageQueue)
const record = useVisitRecord()
const selected = ref<WorklistItem | null>(null)
const queueOpen = ref(false)
const STATUSES: WorkStatus[] = ['waiting', 'triaged', 'in_consultation', 'completed', 'cancelled']

interface Form { systolic: string, diastolic: string, heartRate: string, respRate: string, temp: string, oxygen: string, weight: string, height: string, bsl: string, painScore: string }
const empty = (): Form => ({ systolic: '', diastolic: '', heartRate: '', respRate: '', temp: '', oxygen: '', weight: '', height: '', bsl: '', painScore: '' })
const form = ref<Form>(empty())
const chiefComplaint = ref('')
const priority = ref<'EMERGENCY' | 'URGENT' | 'NORMAL'>('NORMAL')
const priorityOptions = computed(() => (['EMERGENCY', 'URGENT', 'NORMAL'] as const).map(p => ({ label: t(`workstation.priority.${p}`), value: p })))
const isSaving = ref(false)

const FIELDS: Array<{ key: Exclude<keyof Form, 'systolic' | 'diastolic'>, limit: VitalKey, unit: string }> = [
  { key: 'temp', limit: 'temp', unit: '°C' },
  { key: 'heartRate', limit: 'heartRate', unit: '/min' },
  { key: 'respRate', limit: 'respRate', unit: '/min' },
  { key: 'oxygen', limit: 'oxygen', unit: '%' },
  { key: 'weight', limit: 'weight', unit: 'kg' },
  { key: 'height', limit: 'height', unit: 'cm' },
  { key: 'bsl', limit: 'bsl', unit: 'mg/dL' },
  { key: 'painScore', limit: 'painScore', unit: '0–10' }
]

async function select(item: WorklistItem) {
  selected.value = item
  await record.load(item.visitId)
  const v = record.visit.value?.vitals || {}
  chiefComplaint.value = record.visit.value?.chiefComplaint || ''
  priority.value = record.visit.value?.triagePriority || 'NORMAL'
  const [sys, dia] = splitBp(v.bp)
  form.value = {
    ...empty(),
    systolic: sys ? String(sys) : '',
    diastolic: dia ? String(dia) : '',
    heartRate: v.heartRate || '',
    respRate: v.respRate || '',
    temp: v.temp || '',
    oxygen: v.oxygen || '',
    weight: v.weight || '',
    height: v.height || '',
    bsl: v.bsl || '',
    painScore: v.painScore || ''
  }
}

const stateOf = (key: VitalKey, value: string) => vitalState(key, value)
const invalidFields = computed(() => {
  const bad = FIELDS.filter(f => stateOf(f.limit, form.value[f.key]) === 'invalid').map(f => t(`workstation.vitals.${f.key}`))
  if (stateOf('systolic', form.value.systolic) === 'invalid' || stateOf('diastolic', form.value.diastolic) === 'invalid') bad.push(t('workstation.vitals.bp'))
  if (Boolean(form.value.systolic) !== Boolean(form.value.diastolic)) bad.push(t('workstation.vitals.bp'))
  return bad
})
const inputColor = (key: VitalKey, value: string) => {
  const s = stateOf(key, value)
  return s === 'invalid' ? 'error' : s ? 'warning' : undefined
}

const readOnly = computed(() => ['completed', 'cancelled'].includes(record.visit.value?.status || ''))

async function save(next = false) {
  if (!selected.value || !record.visit.value || invalidFields.value.length || readOnly.value) return
  isSaving.value = true
  const f = form.value
  const vitals: Vitals = {
    ...(record.visit.value.vitals || {}),
    bp: f.systolic && f.diastolic ? `${f.systolic}/${f.diastolic}` : '',
    heartRate: f.heartRate, respRate: f.respRate, temp: f.temp, oxygen: f.oxygen,
    weight: f.weight, height: f.height, bsl: f.bsl, painScore: f.painScore
  }
  try {
    await record.updateVisit({ vitals, chiefComplaint: chiefComplaint.value.trim(), triagePriority: priority.value })
    toast.add({ title: t(next ? 'workstation.triage.sent' : 'common.saved'), color: 'success' })
    await worklist.refresh()
    if (next) {
      const upcoming = worklist.items.value.find(i => i.status === 'waiting' && i.id !== selected.value?.id)
      if (upcoming) await select(upcoming)
    }
  } catch (err) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(err, t('common.saveFailed')), color: 'error' })
  } finally {
    isSaving.value = false
  }
}

useSaveShortcut(() => save(), () => allowed.value && !!selected.value)
watch(() => worklist.day.value, () => {
  selected.value = null
})
</script>

<template>
  <WorkstationLayout v-model:queue-open="queueOpen" :title="t('workstation.pages.triage')" icon="i-lucide-activity">
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
    <WorkstationState v-else-if="record.isLoading.value" state="loading" />
    <WorkstationState
      v-else-if="record.error.value"
      state="error"
      :message="record.error.value"
      @retry="select(selected!)"
    />
    <template v-else-if="record.visit.value">
      <PatientHeader :patient="record.visit.value.patient" :visit-no="record.visit.value.visitId" />
      <form class="space-y-4 p-4" @submit.prevent="save(true)">
        <UAlert
          v-if="readOnly"
          color="neutral"
          variant="subtle"
          icon="i-lucide-lock"
          :title="t('workstation.readOnlyVisit')"
        />
        <UCard>
          <template #header>
            <h2 class="font-semibold">
              {{ t('workstation.vitals.title') }}
            </h2>
          </template>
          <div class="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
            <UFormField :label="t('workstation.vitals.bp')" hint="mmHg">
              <div class="flex items-center gap-1">
                <UInput
                  v-model="form.systolic"
                  inputmode="numeric"
                  :color="inputColor('systolic', form.systolic)"
                  :highlight="!!inputColor('systolic', form.systolic)"
                  :disabled="readOnly"
                  :aria-label="t('workstation.vitals.systolic')"
                  class="w-20"
                />
                <span>/</span>
                <UInput
                  v-model="form.diastolic"
                  inputmode="numeric"
                  :color="inputColor('diastolic', form.diastolic)"
                  :highlight="!!inputColor('diastolic', form.diastolic)"
                  :disabled="readOnly"
                  :aria-label="t('workstation.vitals.diastolic')"
                  class="w-20"
                />
              </div>
            </UFormField>
            <UFormField
              v-for="field in FIELDS"
              :key="field.key"
              :label="t(`workstation.vitals.${field.key}`)"
              :hint="field.unit"
              :error="stateOf(field.limit, form[field.key]) === 'invalid' ? t('workstation.vitals.outOfRange') : undefined"
            >
              <UInput
                v-model="form[field.key]"
                inputmode="decimal"
                :color="inputColor(field.limit, form[field.key])"
                :highlight="!!inputColor(field.limit, form[field.key])"
                :disabled="readOnly"
                class="w-full"
              />
            </UFormField>
          </div>
          <p class="mt-3 text-xs text-muted">
            {{ t('workstation.vitals.legend') }}
          </p>
        </UCard>

        <UCard>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <UFormField :label="t('workstation.triage.chiefComplaint')" class="md:col-span-2">
              <UTextarea
                v-model="chiefComplaint"
                :rows="2"
                autoresize
                class="w-full"
                :maxlength="500"
                :disabled="readOnly || !allowed"
                :placeholder="t('workstation.triage.chiefComplaintPlaceholder')"
              />
            </UFormField>
            <UFormField :label="t('workstation.priority.label')">
              <USelect
                v-model="priority"
                :items="priorityOptions"
                value-key="value"
                class="w-full"
                :disabled="readOnly || !allowed"
              />
            </UFormField>
          </div>
        </UCard>

        <div class="flex flex-wrap justify-end gap-2">
          <p v-if="invalidFields.length" class="mr-auto text-sm text-error">
            {{ t('workstation.vitals.fixFields', { fields: invalidFields.join(', ') }) }}
          </p>
          <UButton
            :label="t('common.save')"
            variant="soft"
            icon="i-lucide-save"
            :loading="isSaving"
            :disabled="readOnly || !!invalidFields.length"
            @click="save(false)"
          />
          <UButton
            type="submit"
            :label="t('workstation.triage.sendToDoctor')"
            icon="i-lucide-arrow-right"
            :loading="isSaving"
            :disabled="readOnly || !!invalidFields.length"
          />
        </div>
      </form>
    </template>
  </WorkstationLayout>
</template>
