<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { LabOrder, LabParameter, WorklistItem, WorkStatus } from '~/types/workstation'
import WorkstationLayout from '~/components/workstation/WorkstationLayout.vue'
import WorklistQueue from '~/components/workstation/WorklistQueue.vue'
import PatientHeader from '~/components/workstation/PatientHeader.vue'
import WorkstationState from '~/components/workstation/WorkstationState.vue'
import StatusChip from '~/components/workstation/StatusChip.vue'
import LabResultTable from '~/components/workstation/LabResultTable.vue'

const { t, locale } = useI18n()
const toast = useToast()
const auth = useAuth()
const allowed = computed(() => auth.can('laboratory', 'update'))
const canVerify = computed(() => auth.can('laboratory', 'approve'))

const { orderQueue } = useDepartmentQueues()
const worklist = useWorklist(day => orderQueue(day, 'laboratory'))
const record = useVisitRecord()
const selected = ref<WorklistItem | null>(null)
const queueOpen = ref(false)
const STATUSES: WorkStatus[] = ['requested', 'draft', 'result_entered', 'cancelled']

const parameters = ref<LabParameter[]>([])
const note = ref('')
const isSaving = ref(false)

const order = computed<LabOrder | null>(() => record.visit.value?.labRequests.find(o => o._id === selected.value?.id) ?? null)
const isPaid = computed(() => record.visit.value?.payment?.status === 'paid')
const locked = computed(() => order.value?.status === 'completed' || order.value?.status === 'cancelled')
const flagged = computed(() => parameters.value.filter(p => flagValue(p.value, p.refRange)).length)

async function select(item: WorklistItem) {
  selected.value = item
  await record.load(item.visitId)
  parameters.value = (order.value?.parameters || []).map(p => ({ ...p }))
  note.value = order.value?.result || ''
}

function setValue(index: number, value: string) {
  parameters.value[index] = { ...parameters.value[index], value }
}

const isCollecting = ref(false)
async function collectSample() {
  if (!order.value) return
  isCollecting.value = true
  try {
    await record.collectSample(order.value._id)
    await record.load(order.value.visitId)
    await worklist.refresh()
  } catch (err) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(err, t('common.saveFailed')), color: 'error' })
  } finally {
    isCollecting.value = false
  }
}

async function verify() {
  if (!order.value) return
  try {
    await record.verifyOrder(order.value._id)
    await record.load(order.value.visitId)
  } catch (err) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(err, t('common.saveFailed')), color: 'error' })
  }
}

async function save(submit: boolean) {
  if (!order.value || locked.value) return
  if (submit && parameters.value.some(p => !String(p.value || '').trim()) && !window.confirm(t('workstation.lab.submitIncomplete'))) return
  isSaving.value = true
  try {
    await record.updateOrder(order.value._id, {
      parameters: parameters.value,
      result: note.value,
      status: submit ? 'completed' : 'in-progress'
    })
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
  <WorkstationLayout v-model:queue-open="queueOpen" :title="t('workstation.pages.lab')" icon="i-lucide-flask-conical">
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
              <span v-if="order.requestedAt" class="text-xs text-muted">
                {{ t('workstation.lab.requestedAt', { time: new Date(order.requestedAt).toLocaleString() }) }}
              </span>
            </div>
          </template>

          <LabResultTable :parameters="parameters" :editable="!locked" @update:value="setValue" />
          <p v-if="flagged" class="mt-2 text-sm text-warning">
            {{ t('workstation.lab.flaggedCount', { n: flagged }) }}
          </p>

          <UFormField :label="t('workstation.lab.note')" class="mt-4">
            <UTextarea
              v-model="note"
              :rows="3"
              class="w-full"
              :disabled="locked"
            />
          </UFormField>

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
              <UButton
                v-if="!order.sampleCollectedAt && !locked"
                :label="t('workstation.lab.sampleCollected')"
                icon="i-lucide-test-tube"
                variant="outline"
                :loading="isCollecting"
                @click="collectSample"
              />
              <UBadge v-else-if="order.sampleCollectedAt" color="neutral" variant="outline">
                {{ t('workstation.lab.sampleAt', { time: new Date(order.sampleCollectedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) }) }}
              </UBadge>
              <UBadge v-if="order.verifiedAt" color="success" variant="subtle">
                {{ t('workstation.lab.verified') }}
              </UBadge>
              <UButton
                v-else-if="canVerify && order.status === 'completed'"
                :label="t('workstation.lab.verify')"
                icon="i-lucide-badge-check"
                variant="soft"
                @click="verify"
              />
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
