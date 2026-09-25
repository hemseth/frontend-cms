<script setup lang="ts">
/**
 * Ward supply: the pharmacy sends medicine to the ward for an admitted patient's active
 * orders. The server caps each order (the whole course, or what was given plus three days
 * for an open-ended order), allocates batches FEFO and charges the admission's bill.
 * Controlled medicines, and every order in a pharmacy-counter clinic, need verification.
 */
import { computed, onMounted, ref } from 'vue'
import type { WarehouseRef } from '~/types/pharmacy'
import type { IpdMedicationOrder } from '~/types/ipd'

const props = defineProps<{
  admissionId: string
}>()

const { t } = useI18n()
const toast = useToast()
const auth = useAuth()
const ipd = useIpd(props.admissionId)
const { dispense, isSubmitting } = useDispensing()
const { fetchWarehouses } = useStock()

interface Line { order: IpdMedicationOrder, qty: number, include: boolean }

const lines = ref<Line[]>([])
const warehouses = ref<WarehouseRef[]>([])
const warehouseId = ref('')
const isLoading = ref(false)
const loadError = ref('')
const lastId = ref('')
const canVerify = computed(() => auth.can('prescription', 'approve'))

/** One day of doses, within what the order still allows. */
function oneDay(order: IpdMedicationOrder) {
  const perDay = order.frequency === 'PRN' ? (order.prnMaxPerDay ?? 1) : order.frequency === 'STAT' ? 1 : Math.max(1, order.scheduleTimes.length)
  return Math.min(order.dispensableBaseQty, perDay * order.doseBaseQty)
}

async function load() {
  isLoading.value = true
  loadError.value = ''
  try {
    const [orders, whList] = await Promise.all([ipd.listOrders(), fetchWarehouses()])
    warehouses.value = whList
    const preferred = whList.find(w => ['PHARMACY', 'DISPENSING'].includes(String(w.type)))
    warehouseId.value = warehouseId.value || String(preferred?._id || whList[0]?._id || '')
    lines.value = orders
      .filter(o => o.status === 'ACTIVE' && o.dispensableBaseQty > 0)
      .map(order => ({ order, qty: oneDay(order), include: true }))
  } catch (e) {
    loadError.value = getApiErrorMessage(e, t('ipd.loadFailed'))
  } finally {
    isLoading.value = false
  }
}

const selected = computed(() => lines.value.filter(l => l.include && l.qty > 0))
const blocked = (l: Line) => l.qty > l.order.dispensableBaseQty || (l.order.medicine?.controlled && !l.order.verifiedAt)

async function verify(line: Line) {
  try {
    await ipd.verifyOrder(line.order._id)
    line.order.verifiedAt = new Date().toISOString()
  } catch (e) {
    toast.add({ title: t('pharmacy.safety.verifyFailed'), description: getApiErrorMessage(e, ''), color: 'error' })
  }
}

async function submit() {
  if (!warehouseId.value || !selected.value.length || selected.value.some(blocked)) return
  try {
    const { id, shortages, status } = await dispense({
      warehouseId: warehouseId.value,
      admissionId: props.admissionId,
      items: selected.value.map(l => ({ medicineId: l.order.medicineId, inpatientOrderId: l.order._id, requestedQty: l.qty, conversionFactorSnapshot: 1 }))
    })
    if (status === 'PREPARED') {
      toast.add({ title: t('pharmacy.dispenseFailed'), description: t('pharmacy.safety.nothingInStock'), color: 'error' })
    } else {
      lastId.value = id
      toast.add({ title: shortages.length ? t('pharmacy.dispensedPartial') : t('pharmacy.dispensedOk'), color: shortages.length ? 'warning' : 'success' })
    }
    await load()
  } catch (e) {
    toast.add({ title: t('pharmacy.dispenseFailed'), description: getApiErrorMessage(e, t('pharmacy.dispenseFailed')), color: 'error' })
  }
}

onMounted(load)
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-bed" class="w-5 h-5 text-primary" />
          <h3 class="font-semibold">
            {{ t('ipd.supply.title') }}
          </h3>
        </div>
        <USelect
          v-model="warehouseId"
          :items="warehouses.map(w => ({ label: w.nameEn || w.nameKh || w.code, value: String(w._id) }))"
          value-key="value"
          size="sm"
          class="min-w-56"
        />
      </div>
    </template>

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
    <p v-else-if="!lines.length" class="text-sm text-muted text-center py-6">
      {{ t('ipd.supply.empty') }}
    </p>
    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="text-xs uppercase text-muted border-b border-default">
          <tr>
            <th class="py-2 w-8" />
            <th class="py-2 text-left">
              {{ t('ipd.orders.medicine') }}
            </th>
            <th class="py-2 text-right">
              {{ t('ipd.orders.wardSupply') }}
            </th>
            <th class="py-2 text-right">
              {{ t('ipd.supply.allowed') }}
            </th>
            <th class="py-2 text-right w-28">
              {{ t('pharmacy.dispenseQty') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="line in lines" :key="line.order._id" class="border-b border-default last:border-b-0 align-top">
            <td class="py-2">
              <UCheckbox v-model="line.include" />
            </td>
            <td class="py-2 pe-2">
              <div class="font-medium">
                {{ line.order.medication }} — {{ line.order.doseText }} · {{ line.order.route }} · {{ line.order.frequency }}
              </div>
              <div class="mt-1 flex flex-wrap gap-1 items-center">
                <UBadge :color="line.order.verifiedAt ? 'success' : 'neutral'" variant="outline" size="sm">
                  {{ line.order.verifiedAt ? t('pharmacy.safety.status.VERIFIED') : t('pharmacy.safety.status.PENDING') }}
                </UBadge>
                <UBadge
                  v-if="line.order.medicine?.controlled"
                  color="error"
                  variant="subtle"
                  size="sm"
                >
                  {{ t('pharmacy.safety.controlled') }}
                </UBadge>
                <UButton
                  v-if="canVerify && !line.order.verifiedAt"
                  :label="t('pharmacy.safety.verify')"
                  size="xs"
                  variant="soft"
                  @click="verify(line)"
                />
              </div>
              <div v-if="line.order.allergyConflict" class="text-xs font-semibold text-error">
                {{ t('pharmacy.allergyWarning', { allergy: line.order.allergyConflict }) }} — {{ line.order.allergyOverrideReason }}
              </div>
              <div v-if="line.include && blocked(line)" class="text-xs font-semibold text-error">
                {{ line.qty > line.order.dispensableBaseQty ? t('ipd.supply.overCap', { qty: line.order.dispensableBaseQty }) : t('pharmacy.safety.controlledNeedsVerify') }}
              </div>
            </td>
            <td class="py-2 text-right tabular-nums">
              {{ line.order.wardSupplyBaseQty }} {{ line.order.medicine?.baseUnit }}
            </td>
            <td class="py-2 text-right tabular-nums">
              {{ line.order.dispensableBaseQty }}
            </td>
            <td class="py-2 text-right">
              <UInput
                v-model.number="line.qty"
                type="number"
                min="0"
                :max="line.order.dispensableBaseQty"
                size="sm"
                class="w-24"
                :disabled="!line.include"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <template #footer>
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <span class="text-xs text-muted">{{ t('ipd.supply.note') }}</span>
        <div class="flex gap-2">
          <UButton
            v-if="lastId"
            :label="t('pharmacy.safety.printLabels')"
            icon="i-lucide-tag"
            color="neutral"
            variant="outline"
            :to="`/print/medicine-label/${lastId}`"
            target="_blank"
          />
          <UButton
            :label="t('ipd.supply.send')"
            icon="i-lucide-check"
            :loading="isSubmitting"
            :disabled="!warehouseId || !selected.length || selected.some(blocked)"
            @click="submit"
          />
        </div>
      </div>
    </template>
  </UCard>
</template>
