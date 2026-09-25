<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { PaymentItem, WorklistItem, WorkStatus } from '~/types/workstation'
import type { OpdService } from '~/types/models'
import WorkstationLayout from '~/components/workstation/WorkstationLayout.vue'
import WorklistQueue from '~/components/workstation/WorklistQueue.vue'
import PatientHeader from '~/components/workstation/PatientHeader.vue'
import WorkstationState from '~/components/workstation/WorkstationState.vue'
import StatusChip from '~/components/workstation/StatusChip.vue'

const { t, locale } = useI18n()
const toast = useToast()
const auth = useAuth()
const allowed = computed(() => auth.can('payment', 'create'))
// A discount is a sensitive change (CLINIC_WORKFLOW_CAMBODIA.md), so only an approver can set it.
const canDiscount = computed(() => auth.can('payment', 'approve'))

const { cashierQueue } = useDepartmentQueues()
const worklist = useWorklist(cashierQueue)
const record = useVisitRecord()
const { allServices, categoryMap, refreshData } = useOpdData()
onMounted(() => refreshData())

const selected = ref<WorklistItem | null>(null)
const queueOpen = ref(false)
const STATUSES: WorkStatus[] = ['awaiting_payment', 'paid']
const METHODS = ['cash', 'aba', 'wing', 'acleda', 'bakong'] as const

const consultationId = ref('')
const discount = ref(0)
const received = ref<number | null>(null)
const method = ref<(typeof METHODS)[number]>('cash')
// Shown for the cashier's reference only: the payment model has no exchange-rate field yet.
const exchangeRate = ref(4100)
const isSaving = ref(false)

const visit = computed(() => record.visit.value)
const payment = computed(() => visit.value?.payment ?? null)
const isPaid = computed(() => payment.value?.status === 'paid')

const consultationServices = computed(() => (allServices.value as OpdService[]).filter((s) => {
  const cat = categoryMap.value.get(s.categoryId || s.category || '')
  return cat?.group === 'consultation'
}))
const serviceLabel = (s: OpdService) => `${locale.value === 'km' ? s.nameKh || s.nameEn : s.nameEn || s.nameKh} — ${(s.price || 0).toFixed(2)}`

/** One invoice: consultation, every non-cancelled order and every prescribed medicine. */
const draftLines = computed<PaymentItem[]>(() => {
  const v = visit.value
  if (!v) return []
  const lines: PaymentItem[] = []
  const consult = consultationServices.value.find(s => s._id === consultationId.value)
  if (consult) lines.push({ itemId: consult._id, name: consult.nameEn || consult.nameKh, price: consult.price || 0, quantity: 1, category: 'consultation' })
  for (const order of v.labRequests.filter(o => o.status !== 'cancelled')) {
    lines.push({ itemId: order.serviceId, name: order.serviceName, price: order.price || 0, quantity: 1, category: order.category === 'imaging' ? 'imaging' : 'laboratory' })
  }
  for (const med of v.medications) {
    lines.push({ itemId: med.medicineId, name: med.medication, price: med.unitPrice || 0, quantity: Math.max(1, med.quantity || 1), category: 'medicine' })
  }
  return lines
})

const lines = computed(() => (payment.value ? payment.value.items : draftLines.value))
const subtotal = computed(() => lines.value.reduce((sum, l) => sum + l.price * l.quantity, 0))
const total = computed(() => Math.max(0, subtotal.value - (discount.value || 0)))
const balance = computed(() => payment.value ? payment.value.balance : total.value)
const khr = (usd: number) => Math.round(usd * (exchangeRate.value || 0)).toLocaleString()
const linesChanged = computed(() => !!payment.value && !isPaid.value && JSON.stringify(draftLines.value.map(l => [l.name, l.price, l.quantity])) !== JSON.stringify(payment.value.items.map(l => [l.name, l.price, l.quantity])))

async function select(item: WorklistItem) {
  selected.value = item
  await record.load(item.visitId)
  discount.value = payment.value?.discount || 0
  received.value = null
  method.value = (METHODS as readonly string[]).includes(String(payment.value?.method || '').toLowerCase()) ? String(payment.value!.method).toLowerCase() as (typeof METHODS)[number] : 'cash'
  // Keep the consultation line if the invoice already has one.
  consultationId.value = payment.value?.items.find(i => i.category === 'consultation')?.itemId || ''
}

async function run(action: () => Promise<unknown>, success: string) {
  isSaving.value = true
  try {
    await action()
    toast.add({ title: success, color: 'success' })
    await Promise.all([select(selected.value!), worklist.refresh()])
  } catch (err) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(err, t('common.saveFailed')), color: 'error' })
  } finally {
    isSaving.value = false
  }
}

const createInvoice = () => run(() => record.createPayment(draftLines.value, discount.value || 0), t('workstation.cashier.invoiceCreated'))
const refreshLines = () => run(() => record.updatePayment(payment.value!._id, { items: draftLines.value, discount: discount.value || 0 }), t('workstation.cashier.linesUpdated'))

function takePayment() {
  if (!payment.value || received.value === null || received.value <= 0) return
  const totalReceived = (payment.value.totalReceived || 0) + received.value
  return run(() => record.updatePayment(payment.value!._id, { totalReceived, method: method.value, discount: discount.value || 0 }), t('workstation.cashier.paymentTaken'))
}

function printReceipt() {
  if (payment.value) window.open(`/print/invoice/${payment.value._id}`, '_blank')
}

useSaveShortcut(() => (payment.value ? takePayment() : createInvoice()), () => allowed.value && !!visit.value && !isPaid.value)
watch(() => worklist.day.value, () => {
  selected.value = null
})
</script>

<template>
  <WorkstationLayout v-model:queue-open="queueOpen" :title="t('workstation.pages.cashier')" icon="i-lucide-wallet">
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
      <div class="grid gap-4 p-4 xl:grid-cols-[1fr_360px]">
        <UCard>
          <template #header>
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="font-semibold">
                {{ t('workstation.cashier.invoice') }}
              </h2>
              <span v-if="payment?.invoiceNumber" class="text-sm text-muted">{{ payment.invoiceNumber }}</span>
              <StatusChip :status="isPaid ? 'paid' : 'awaiting_payment'" />
            </div>
          </template>

          <UFormField v-if="!payment" :label="t('workstation.cashier.consultationFee')" class="mb-3">
            <USelect
              v-model="consultationId"
              :items="[{ label: t('workstation.cashier.noConsultation'), value: '' }, ...consultationServices.map(s => ({ label: serviceLabel(s), value: s._id }))]"
              class="w-full sm:w-80"
            />
          </UFormField>

          <WorkstationState v-if="!lines.length" state="empty" :message="t('workstation.cashier.noLines')" />
          <table v-else class="w-full text-sm">
            <thead class="text-left text-xs text-muted">
              <tr>
                <th class="py-1">
                  {{ t('workstation.cashier.item') }}
                </th>
                <th class="py-1">
                  {{ t('workstation.cashier.type') }}
                </th>
                <th class="py-1 text-right">
                  {{ t('workstation.doctor.quantity') }}
                </th>
                <th class="py-1 text-right">
                  {{ t('workstation.cashier.price') }}
                </th>
                <th class="py-1 text-right">
                  {{ t('workstation.cashier.lineTotal') }}
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-default">
              <tr v-for="(line, index) in lines" :key="index">
                <td class="py-1.5">
                  {{ line.name }}
                </td>
                <td class="py-1.5 text-muted">
                  {{ t(`workstation.cashier.category.${line.category || 'other'}`) }}
                </td>
                <td class="py-1.5 text-right tabular-nums">
                  {{ line.quantity }}
                </td>
                <td class="py-1.5 text-right tabular-nums">
                  {{ line.price.toFixed(2) }}
                </td>
                <td class="py-1.5 text-right tabular-nums">
                  {{ (line.price * line.quantity).toFixed(2) }}
                </td>
              </tr>
            </tbody>
          </table>

          <UAlert
            v-if="linesChanged"
            class="mt-3"
            color="warning"
            variant="subtle"
            icon="i-lucide-refresh-ccw"
            :title="t('workstation.cashier.linesChanged')"
            :actions="[{ label: t('workstation.cashier.updateLines'), onClick: refreshLines }]"
          />
        </UCard>

        <UCard>
          <template #header>
            <h2 class="font-semibold">
              {{ t('workstation.cashier.payment') }}
            </h2>
          </template>
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between">
              <dt>{{ t('workstation.cashier.subtotal') }}</dt>
              <dd class="tabular-nums">
                {{ subtotal.toFixed(2) }}
              </dd>
            </div>
            <div class="flex items-center justify-between gap-2">
              <dt>{{ t('workstation.cashier.discount') }}</dt>
              <dd>
                <UInput
                  v-model.number="discount"
                  type="number"
                  min="0"
                  size="sm"
                  class="w-28"
                  :disabled="!canDiscount || isPaid"
                />
              </dd>
            </div>
            <div class="flex justify-between text-base font-semibold">
              <dt>{{ t('workstation.cashier.total') }} (USD)</dt>
              <dd class="tabular-nums">
                {{ (payment ? payment.amount : total).toFixed(2) }}
              </dd>
            </div>
            <div class="flex justify-between text-muted">
              <dt>{{ t('workstation.cashier.totalKhr') }}</dt>
              <dd class="tabular-nums">
                ៛ {{ khr(payment ? payment.amount : total) }}
              </dd>
            </div>
            <div class="flex items-center justify-between gap-2 text-xs text-muted">
              <dt>{{ t('workstation.cashier.exchangeRate') }}</dt>
              <dd>
                <UInput
                  v-model.number="exchangeRate"
                  type="number"
                  size="xs"
                  class="w-24"
                />
              </dd>
            </div>
            <p class="text-xs text-muted">
              {{ t('workstation.cashier.ratePending') }}
            </p>
            <div v-if="payment" class="flex justify-between border-t border-default pt-2">
              <dt>{{ t('workstation.cashier.paidSoFar') }}</dt>
              <dd class="tabular-nums">
                {{ (payment.totalReceived || 0).toFixed(2) }}
              </dd>
            </div>
            <div v-if="payment" class="flex justify-between font-semibold" :class="balance > 0 ? 'text-warning' : 'text-success'">
              <dt>{{ t('workstation.cashier.balance') }}</dt>
              <dd class="tabular-nums">
                {{ balance.toFixed(2) }}
              </dd>
            </div>
          </dl>

          <div v-if="payment && !isPaid" class="mt-4 space-y-3">
            <UFormField :label="t('workstation.cashier.method')">
              <div class="flex flex-wrap gap-1">
                <UButton
                  v-for="m in METHODS"
                  :key="m"
                  :label="t(`workstation.cashier.methods.${m}`)"
                  size="sm"
                  :variant="method === m ? 'solid' : 'outline'"
                  @click="method = m"
                />
              </div>
            </UFormField>
            <UFormField :label="t('workstation.cashier.amountReceived')">
              <UInput
                v-model.number="received"
                type="number"
                min="0"
                step="0.01"
                class="w-full"
              />
            </UFormField>
          </div>

          <template #footer>
            <div class="flex flex-wrap justify-end gap-2">
              <UButton
                v-if="payment"
                :label="t('workstation.cashier.printReceipt')"
                icon="i-lucide-printer"
                variant="outline"
                color="neutral"
                @click="printReceipt"
              />
              <UButton
                v-if="!payment"
                :label="t('workstation.cashier.createInvoice')"
                icon="i-lucide-file-plus"
                :loading="isSaving"
                :disabled="!lines.length"
                @click="createInvoice"
              />
              <UButton
                v-else-if="!isPaid"
                :label="t('workstation.cashier.takePayment')"
                icon="i-lucide-banknote"
                :loading="isSaving"
                :disabled="!received || received <= 0 || linesChanged"
                @click="takePayment"
              />
            </div>
          </template>
        </UCard>
      </div>
    </template>
  </WorkstationLayout>
</template>
