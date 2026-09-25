<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { LabOrder, WorklistItem, WorkStatus } from '~/types/workstation'
import WorkstationLayout from '~/components/workstation/WorkstationLayout.vue'
import WorklistQueue from '~/components/workstation/WorklistQueue.vue'
import PatientHeader from '~/components/workstation/PatientHeader.vue'
import WorkstationState from '~/components/workstation/WorkstationState.vue'
import StatusChip from '~/components/workstation/StatusChip.vue'

const { t, locale } = useI18n()
const toast = useToast()
const auth = useAuth()
// Echo orders are lab requests with an imaging service, so the same permission applies.
const allowed = computed(() => auth.can('laboratory', 'update'))
const canVerify = computed(() => auth.can('laboratory', 'approve'))

const { orderQueue } = useDepartmentQueues()
const worklist = useWorklist(day => orderQueue(day, 'imaging'))
const record = useVisitRecord()
const selected = ref<WorklistItem | null>(null)
const queueOpen = ref(false)
const STATUSES: WorkStatus[] = ['requested', 'draft', 'result_entered', 'cancelled']

const TEMPLATES = ['abdomen', 'obstetric', 'cardiac', 'pelvic', 'thyroid'] as const
const template = ref<(typeof TEMPLATES)[number] | undefined>(undefined)
const findings = ref('')
const conclusion = ref('')
const isSaving = ref(false)

// The backend stores one free-text `result`; findings and conclusion are kept apart with
// language-independent markers so the report can be reopened and edited.
const FINDINGS = '[FINDINGS]'
const CONCLUSION = '[CONCLUSION]'
function parseReport(text = '') {
  const f = text.indexOf(FINDINGS)
  const c = text.indexOf(CONCLUSION)
  if (f === -1 && c === -1) return { findings: text, conclusion: '' }
  return {
    findings: text.slice(f + FINDINGS.length, c === -1 ? undefined : c).trim(),
    conclusion: c === -1 ? '' : text.slice(c + CONCLUSION.length).trim()
  }
}
const buildReport = () => `${FINDINGS}\n${findings.value.trim()}\n\n${CONCLUSION}\n${conclusion.value.trim()}`

const order = computed<LabOrder | null>(() => record.visit.value?.labRequests.find(o => o._id === selected.value?.id) ?? null)
const locked = computed(() => order.value?.status === 'completed' || order.value?.status === 'cancelled')
const isPaid = computed(() => record.visit.value?.payment?.status === 'paid')
const templateOptions = computed(() => TEMPLATES.map(value => ({ label: t(`workstation.echo.template.${value}.name`), value })))

async function select(item: WorklistItem) {
  selected.value = item
  await record.load(item.visitId)
  const parsed = parseReport(order.value?.result)
  findings.value = parsed.findings
  conclusion.value = parsed.conclusion
  template.value = undefined
}

function applyTemplate(value: (typeof TEMPLATES)[number]) {
  if ((findings.value || conclusion.value) && !window.confirm(t('workstation.echo.replaceConfirm'))) {
    template.value = undefined
    return
  }
  findings.value = t(`workstation.echo.template.${value}.findings`)
  conclusion.value = t(`workstation.echo.template.${value}.conclusion`)
}

async function save(submit: boolean) {
  if (!order.value || locked.value) return
  if (submit && !conclusion.value.trim()) {
    toast.add({ title: t('workstation.echo.conclusionRequired'), color: 'warning' })
    return
  }
  isSaving.value = true
  try {
    await record.updateOrder(order.value._id, { result: buildReport(), status: submit ? 'completed' : 'in-progress' })
    toast.add({ title: t(submit ? 'workstation.lab.submitted' : 'workstation.lab.draftSaved'), color: 'success' })
    await Promise.all([select(selected.value!), worklist.refresh()])
  } catch (err) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(err, t('common.saveFailed')), color: 'error' })
  } finally {
    isSaving.value = false
  }
}

function print() {
  const v = record.visit.value
  if (v && isPaid.value) window.open(`/print/lab/${v._id}?patientId=${v.patientId}`, '_blank')
}

useSaveShortcut(() => save(false), () => allowed.value && !!order.value && !locked.value)
watch(() => worklist.day.value, () => {
  selected.value = null
})
</script>

<template>
  <WorkstationLayout v-model:queue-open="queueOpen" :title="t('workstation.pages.echo')" icon="i-lucide-scan-line">
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
    <WorkstationState v-else-if="record.isLoading.value && !order" state="loading" />
    <WorkstationState
      v-else-if="record.error.value"
      state="error"
      :message="record.error.value"
      @retry="select(selected!)"
    />
    <WorkstationState v-else-if="!order" state="empty" :message="t('workstation.lab.orderMissing')" />
    <template v-else>
      <PatientHeader :patient="record.visit.value!.patient" :visit-no="record.visit.value!.visitId" />
      <div class="space-y-4 p-4">
        <UCard>
          <template #header>
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="font-semibold">
                {{ locale === 'km' ? order.serviceNameKh || order.serviceName : order.serviceName }}
              </h2>
              <StatusChip :status="orderStatus(order.status)" />
              <USelect
                v-if="!locked"
                v-model="template"
                :items="templateOptions"
                :placeholder="t('workstation.echo.chooseTemplate')"
                class="ml-auto w-56"
                @update:model-value="(v) => v && applyTemplate(v as (typeof TEMPLATES)[number])"
              />
            </div>
          </template>

          <div class="space-y-4">
            <UFormField :label="t('workstation.echo.findings')">
              <UTextarea
                v-model="findings"
                :rows="10"
                autoresize
                class="w-full"
                :disabled="locked"
              />
            </UFormField>
            <UFormField :label="t('workstation.echo.conclusion')" required>
              <UTextarea
                v-model="conclusion"
                :rows="3"
                autoresize
                class="w-full"
                :disabled="locked"
              />
            </UFormField>
            <UAlert
              color="neutral"
              variant="outline"
              icon="i-lucide-image-up"
              :title="t('workstation.pendingBackend')"
              :description="t('workstation.echo.imagesPending')"
            />
          </div>

          <template #footer>
            <div class="flex flex-wrap items-center justify-end gap-2">
              <span v-if="!isPaid" class="mr-auto text-xs text-muted">{{ t('workstation.lab.printAfterPayment') }}</span>
              <UButton
                :label="t('workstation.lab.print')"
                icon="i-lucide-printer"
                variant="outline"
                color="neutral"
                :disabled="!isPaid"
                @click="print"
              />
              <UTooltip v-if="canVerify" :text="t('workstation.pendingBackend')">
                <UButton
                  :label="t('workstation.lab.verify')"
                  icon="i-lucide-badge-check"
                  variant="soft"
                  disabled
                />
              </UTooltip>
              <UButton
                :label="t('workstation.lab.saveDraft')"
                icon="i-lucide-save"
                variant="soft"
                :loading="isSaving"
                :disabled="locked"
                @click="save(false)"
              />
              <UButton
                :label="t('workstation.lab.submit')"
                icon="i-lucide-send"
                :loading="isSaving"
                :disabled="locked"
                @click="save(true)"
              />
            </div>
          </template>
        </UCard>
      </div>
    </template>
  </WorkstationLayout>
</template>
