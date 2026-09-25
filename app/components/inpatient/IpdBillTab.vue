<script setup lang="ts">
/**
 * The admission's bill: bed days, medicines from ward supply, lab/imaging and service
 * charges, money received and the balance. Finalizing (after discharge) creates the invoice;
 * reopening cancels it. Everything is computed by the server from its sources.
 */
import { computed, onMounted, reactive, ref } from 'vue'
import type { IpdBill } from '~/types/ipd'

const props = defineProps<{
  admissionId: string
}>()

interface ServiceRow { _id: string, nameEn: string, nameKh?: string, price?: number, categoryId?: string }
interface CategoryRow { _id: string, group?: string }

const { t } = useI18n()
const toast = useToast()
const auth = useAuth()
const ipd = useIpd(props.admissionId)

const bill = ref<IpdBill | null>(null)
const isLoading = ref(false)
const loadError = ref('')
const busy = ref(false)
const services = ref<ServiceRow[]>([])
const categories = ref<CategoryRow[]>([])

const canCharge = computed(() => auth.can('payment', 'create'))
const canApprove = computed(() => auth.can('payment', 'approve'))
const finalized = computed(() => !!bill.value?.admission.billFinalizedAt)
const discharged = computed(() => bill.value?.admission.status === 'discharged')
const chargeable = computed(() => {
  const groups = new Map(categories.value.map(c => [String(c._id), c.group]))
  return services.value
    .filter(s => !['laboratory', 'imaging'].includes(String(groups.get(String(s.categoryId)))))
    .map(s => ({ label: `${s.nameKh || s.nameEn} ($${s.price ?? 0})`, value: s._id }))
})

async function load() {
  isLoading.value = true
  loadError.value = ''
  try {
    bill.value = (await ipd.getBill()) ?? null
    if (canCharge.value && !services.value.length) {
      const [svc, cat] = await Promise.all([
        $api<{ data?: ServiceRow[] }>('/services', { params: { limit: 1000 } }).catch(() => ({ data: [] })),
        $api<{ data?: CategoryRow[] }>('/service-categories').catch(() => ({ data: [] }))
      ])
      services.value = svc?.data ?? []
      categories.value = cat?.data ?? []
    }
  } catch (e) {
    loadError.value = getApiErrorMessage(e, t('ipd.loadFailed'))
  } finally {
    isLoading.value = false
  }
}

async function run(action: () => Promise<unknown>, success: string) {
  busy.value = true
  try {
    await action()
    toast.add({ title: success, color: 'success' })
    await load()
  } catch (e) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(e, t('common.saveFailed')), color: 'error' })
  } finally {
    busy.value = false
  }
}

const charge = reactive({ serviceId: '', quantity: 1, note: '' })
const receipt = reactive({ type: 'DEPOSIT' as 'DEPOSIT' | 'PAYMENT' | 'REFUND', amount: '', method: 'cash', note: '' })
const finalizeForm = reactive({ discount: 0, reason: '' })

function addCharge() {
  run(() => ipd.addCharge(charge.serviceId, Number(charge.quantity), charge.note || undefined), t('ipd.bill.chargeAdded')).then(() => {
    charge.serviceId = ''
    charge.quantity = 1
    charge.note = ''
  })
}
function addReceipt() {
  run(() => ipd.addReceipt({ type: receipt.type, amount: Number(receipt.amount), method: receipt.method, note: receipt.note || undefined }), t('ipd.bill.receiptAdded')).then(() => {
    receipt.amount = ''
    receipt.note = ''
  })
}
function voidItem(kind: 'charge' | 'receipt', id: string) {
  const reason = window.prompt(t('ipd.bill.voidReason'))?.trim()
  if (!reason) return
  run(() => (kind === 'charge' ? ipd.voidCharge(id, reason) : ipd.voidReceipt(id, reason)), t('ipd.bill.voided'))
}
function finalize() {
  if (!window.confirm(t('ipd.bill.finalizeConfirm'))) return
  run(() => ipd.finalizeBill(Number(finalizeForm.discount) || 0, finalizeForm.reason || undefined), t('ipd.bill.finalized'))
}
function reopen() {
  const reason = window.prompt(t('ipd.bill.reopenReason'))?.trim()
  if (!reason) return
  run(() => ipd.reopenBill(reason), t('ipd.bill.reopened'))
}

const money = (n: number) => `$${(Math.round(n * 100) / 100).toFixed(2)}`
const lineName = (l: IpdBill['lines'][number]) => (l.kind === 'BED' ? l.name.replace('Bed', t('ipd.bill.bed')) : l.nameKh || l.name)
const fmt = (value?: string) => (value ? new Date(value).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '')

onMounted(load)
defineExpose({ load })
</script>

<template>
  <div class="space-y-4 pt-3">
    <div v-if="isLoading" class="space-y-2">
      <USkeleton v-for="i in 3" :key="i" class="h-12 w-full" />
    </div>
    <UAlert
      v-else-if="loadError"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="loadError"
    />

    <template v-else-if="bill">
      <UAlert
        v-if="finalized"
        color="success"
        variant="subtle"
        icon="i-lucide-lock"
        :title="t('ipd.bill.finalizedOn', { date: fmt(bill.admission.billFinalizedAt) })"
      />

      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-2">
            <h4 class="font-semibold text-sm">
              {{ t('ipd.bill.title') }} · {{ bill.admission.admissionNumber }}
            </h4>
            <UButton
              :label="t('ipd.bill.print')"
              icon="i-lucide-printer"
              size="xs"
              color="neutral"
              variant="outline"
              :to="`/print/ipd-bill/${admissionId}`"
              target="_blank"
            />
          </div>
        </template>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="text-xs uppercase text-muted border-b border-default">
              <tr>
                <th class="py-1.5 text-left">
                  {{ t('ipd.bill.item') }}
                </th>
                <th class="py-1.5 text-right">
                  {{ t('ipd.bill.qty') }}
                </th>
                <th class="py-1.5 text-right">
                  {{ t('ipd.bill.price') }}
                </th>
                <th class="py-1.5 text-right">
                  {{ t('ipd.bill.amount') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(line, i) in bill.lines" :key="i" class="border-b border-default last:border-b-0">
                <td class="py-1.5">
                  <UBadge
                    color="neutral"
                    variant="outline"
                    size="sm"
                    class="me-1"
                  >
                    {{ t(`ipd.bill.kind.${line.kind}`) }}
                  </UBadge>
                  {{ lineName(line) }}
                </td>
                <td class="py-1.5 text-right tabular-nums">
                  {{ line.quantity }} {{ line.unit === 'day' ? t('ipd.bill.days') : line.unit || '' }}
                </td>
                <td class="py-1.5 text-right tabular-nums">
                  {{ money(line.unitPrice) }}
                </td>
                <td class="py-1.5 text-right tabular-nums">
                  {{ money(line.amount) }}
                </td>
              </tr>
            </tbody>
            <tfoot class="text-sm tabular-nums">
              <tr>
                <td colspan="3" class="pt-2 text-right">
                  {{ t('ipd.bill.subtotal') }}
                </td>
                <td class="pt-2 text-right">
                  {{ money(bill.subtotal) }}
                </td>
              </tr>
              <tr v-if="bill.discount">
                <td colspan="3" class="text-right">
                  {{ t('ipd.bill.discount') }} <span class="text-xs text-muted">({{ bill.discountReason }})</span>
                </td>
                <td class="text-right">
                  -{{ money(bill.discount) }}
                </td>
              </tr>
              <tr class="font-bold">
                <td colspan="3" class="text-right">
                  {{ t('ipd.bill.total') }}
                </td>
                <td class="text-right">
                  {{ money(bill.total) }}
                </td>
              </tr>
              <tr>
                <td colspan="3" class="text-right">
                  {{ t('ipd.bill.received') }}
                </td>
                <td class="text-right">
                  {{ money(bill.received) }}
                </td>
              </tr>
              <tr class="font-bold" :class="bill.balance > 0 ? 'text-error' : 'text-success'">
                <td colspan="3" class="text-right">
                  {{ t('ipd.bill.balance') }}
                </td>
                <td class="text-right">
                  {{ money(bill.balance) }}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </UCard>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UCard>
          <template #header>
            <h4 class="font-semibold text-sm">
              {{ t('ipd.bill.charges') }}
            </h4>
          </template>
          <div v-if="canCharge && !finalized" class="flex items-end gap-2 flex-wrap mb-3">
            <USelectMenu
              v-model="charge.serviceId"
              :items="chargeable"
              value-key="value"
              size="sm"
              class="w-64"
              :placeholder="t('ipd.bill.chooseService')"
            />
            <UInput
              v-model.number="charge.quantity"
              type="number"
              min="1"
              size="sm"
              class="w-20"
            />
            <UButton
              :label="t('ipd.bill.addCharge')"
              icon="i-lucide-plus"
              size="sm"
              :loading="busy"
              :disabled="!charge.serviceId"
              @click="addCharge"
            />
          </div>
          <ul class="text-xs space-y-1">
            <li v-for="c in bill.charges" :key="c._id" class="flex justify-between gap-2">
              <span>{{ fmt(c.chargedAt) }} · {{ c.nameKh || c.name }} × {{ c.quantity }} · {{ money(c.quantity * c.unitPrice) }}</span>
              <UButton
                v-if="canApprove && !finalized"
                icon="i-lucide-x"
                size="xs"
                color="neutral"
                variant="ghost"
                :aria-label="t('ipd.bill.void')"
                @click="voidItem('charge', c._id)"
              />
            </li>
          </ul>
        </UCard>

        <UCard>
          <template #header>
            <h4 class="font-semibold text-sm">
              {{ t('ipd.bill.receipts') }}
            </h4>
          </template>
          <div v-if="canCharge" class="flex items-end gap-2 flex-wrap mb-3">
            <USelect
              v-model="receipt.type"
              size="sm"
              class="w-32"
              :items="(canApprove ? ['DEPOSIT', 'PAYMENT', 'REFUND'] : ['DEPOSIT', 'PAYMENT']).map(v => ({ label: t(`ipd.bill.receiptType.${v}`), value: v }))"
              value-key="value"
            />
            <UInput
              v-model="receipt.amount"
              type="number"
              min="0"
              step="0.01"
              size="sm"
              class="w-28"
              placeholder="0.00"
            />
            <USelect
              v-model="receipt.method"
              size="sm"
              class="w-28"
              :items="['cash', 'aba', 'card', 'transfer']"
            />
            <UButton
              :label="t('ipd.bill.addReceipt')"
              icon="i-lucide-plus"
              size="sm"
              :loading="busy"
              :disabled="!(Number(receipt.amount) > 0)"
              @click="addReceipt"
            />
          </div>
          <ul class="text-xs space-y-1">
            <li
              v-for="r in bill.receipts"
              :key="r._id"
              class="flex justify-between gap-2"
              :class="r.voided ? 'line-through text-muted' : ''"
            >
              <span>{{ r.receiptNo }} · {{ fmt(r.receivedAt) }} · {{ t(`ipd.bill.receiptType.${r.type}`) }} · {{ r.method }} · <b>{{ money(r.amount) }}</b></span>
              <UButton
                v-if="canApprove && !r.voided"
                icon="i-lucide-x"
                size="xs"
                color="neutral"
                variant="ghost"
                :aria-label="t('ipd.bill.void')"
                @click="voidItem('receipt', r._id)"
              />
            </li>
          </ul>
        </UCard>
      </div>

      <UCard v-if="canApprove">
        <div v-if="!finalized" class="flex items-end gap-2 flex-wrap">
          <UFormField :label="t('ipd.bill.discount')">
            <UInput
              v-model.number="finalizeForm.discount"
              type="number"
              min="0"
              step="0.01"
              size="sm"
              class="w-28"
            />
          </UFormField>
          <UFormField v-if="finalizeForm.discount > 0" :label="t('ipd.bill.discountReason')" required>
            <UInput v-model="finalizeForm.reason" size="sm" class="w-64" />
          </UFormField>
          <UButton
            :label="t('ipd.bill.finalize')"
            icon="i-lucide-lock"
            size="sm"
            :loading="busy"
            :disabled="!discharged || (finalizeForm.discount > 0 && !finalizeForm.reason.trim())"
            @click="finalize"
          />
          <span v-if="!discharged" class="text-xs text-muted">{{ t('ipd.bill.dischargeFirst') }}</span>
        </div>
        <UButton
          v-else
          :label="t('ipd.bill.reopen')"
          icon="i-lucide-unlock"
          size="sm"
          color="warning"
          variant="outline"
          :loading="busy"
          @click="reopen"
        />
      </UCard>
    </template>
  </div>
</template>
