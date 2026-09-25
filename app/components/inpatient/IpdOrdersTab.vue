<script setup lang="ts">
/**
 * Doctor's medication orders for an admission, with pharmacist verification and the ward
 * supply per order. A change never edits an order: it stops it and creates a new one.
 */
import { computed, onMounted, reactive, ref } from 'vue'
import type { MedicineSuggestion } from '~/types/pharmacy'
import { IPD_FREQUENCIES, IPD_ROUTES, type IpdFrequency, type IpdMedicationOrder, type IpdOrderInput, type IpdRoute } from '~/types/ipd'

const props = defineProps<{
  admissionId: string
  active: boolean
  allergies?: string[]
}>()

const { t } = useI18n()
const toast = useToast()
const auth = useAuth()
const ipd = useIpd(props.admissionId)

const orders = ref<IpdMedicationOrder[]>([])
const isLoading = ref(false)
const loadError = ref('')
const showStopped = ref(false)

const canOrder = computed(() => props.active && auth.can('prescription', 'create'))
const canUpdate = computed(() => props.active && auth.can('prescription', 'update'))
const canVerify = computed(() => auth.can('prescription', 'approve'))
const canSupply = computed(() => props.active && auth.can('dispensing', 'create'))

const visibleOrders = computed(() => orders.value.filter(o => showStopped.value || o.status === 'ACTIVE' || o.status === 'ON_HOLD'))

async function load() {
  isLoading.value = true
  loadError.value = ''
  try {
    orders.value = await ipd.listOrders()
  } catch (e) {
    loadError.value = getApiErrorMessage(e, t('ipd.loadFailed'))
  } finally {
    isLoading.value = false
  }
}

// ---- New / change order form -------------------------------------------------------------
const formOpen = ref(false)
const changingOrder = ref<IpdMedicationOrder | null>(null)
const isSaving = ref(false)
const picked = ref<MedicineSuggestion | null>(null)
const form = reactive({
  doseText: '',
  doseBaseQty: 1,
  route: 'PO' as IpdRoute,
  frequency: 'BID' as IpdFrequency,
  scheduleTimes: '',
  prnIndication: '',
  prnMaxPerDay: 4,
  durationDays: 5 as number | null,
  startAt: '',
  instructions: '',
  allergyOverrideReason: '',
  changeReason: ''
})

const nowLocalInput = () => {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

const allergyMatch = computed(() => {
  const m = picked.value
  return m ? checkDrugAllergy(`${m.nameEn || ''} ${m.nameKh || ''} ${m.brandName || ''}`, props.allergies || []) : null
})

function openNew() {
  changingOrder.value = null
  picked.value = null
  Object.assign(form, { doseText: '', doseBaseQty: 1, route: 'PO', frequency: 'BID', scheduleTimes: '', prnIndication: '', prnMaxPerDay: 4, durationDays: 5, startAt: nowLocalInput(), instructions: '', allergyOverrideReason: '', changeReason: '' })
  formOpen.value = true
}

function openChange(order: IpdMedicationOrder) {
  changingOrder.value = order
  picked.value = { _id: order.medicineId, nameEn: order.medication, ...order.medicine, _stockBase: 0, _nearestExpiry: null, _warehouses: [] } as MedicineSuggestion
  Object.assign(form, {
    doseText: order.doseText,
    doseBaseQty: order.doseBaseQty,
    route: order.route,
    frequency: order.frequency,
    scheduleTimes: order.scheduleTimes.join(', '),
    prnIndication: order.prnIndication || '',
    prnMaxPerDay: order.prnMaxPerDay || 4,
    durationDays: null,
    startAt: nowLocalInput(),
    instructions: order.instructions || '',
    allergyOverrideReason: order.allergyOverrideReason || '',
    changeReason: ''
  })
  formOpen.value = true
}

async function save() {
  if (!picked.value?._id) return
  if (allergyMatch.value && !form.allergyOverrideReason.trim()) {
    toast.add({ title: t('pharmacy.safety.reasonRequired'), color: 'error' })
    return
  }
  const times = form.scheduleTimes.split(/[,\s]+/).map(s => s.trim()).filter(Boolean)
  const input: IpdOrderInput = {
    medicineId: String(picked.value._id),
    doseText: form.doseText.trim(),
    doseBaseQty: Number(form.doseBaseQty),
    route: form.route,
    frequency: form.frequency,
    ...(times.length && form.frequency !== 'PRN' && form.frequency !== 'STAT' ? { scheduleTimes: times } : {}),
    ...(form.frequency === 'PRN' ? { prnIndication: form.prnIndication.trim(), prnMaxPerDay: Number(form.prnMaxPerDay) } : {}),
    ...(form.durationDays && form.frequency !== 'STAT' ? { durationDays: Number(form.durationDays) } : {}),
    startAt: form.startAt ? new Date(form.startAt).toISOString() : undefined,
    ...(form.instructions.trim() ? { instructions: form.instructions.trim() } : {}),
    ...(form.allergyOverrideReason.trim() ? { allergyOverrideReason: form.allergyOverrideReason.trim() } : {})
  }
  isSaving.value = true
  try {
    if (changingOrder.value) {
      await ipd.changeOrder(changingOrder.value._id, { ...input, reason: form.changeReason.trim() || undefined })
    } else {
      await ipd.createOrder(input)
    }
    toast.add({ title: t('ipd.orders.saved'), color: 'success' })
    formOpen.value = false
    await load()
  } catch (e) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(e, t('common.saveFailed')), color: 'error' })
  } finally {
    isSaving.value = false
  }
}

// ---- Order actions ----------------------------------------------------------------------
async function act(order: IpdMedicationOrder, action: 'stop' | 'hold' | 'resume' | 'verify') {
  let reason = ''
  if (action === 'stop' || action === 'hold') {
    reason = window.prompt(t(action === 'stop' ? 'ipd.orders.stopReason' : 'ipd.orders.holdReason'))?.trim() || ''
    if (!reason) return
  }
  try {
    if (action === 'stop') await ipd.discontinueOrder(order._id, reason)
    else if (action === 'hold') await ipd.holdOrder(order._id, reason)
    else if (action === 'resume') await ipd.resumeOrder(order._id)
    else await ipd.verifyOrder(order._id)
    await load()
  } catch (e) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(e, t('common.saveFailed')), color: 'error' })
  }
}

const statusColor = (status: string) =>
  status === 'ACTIVE' ? 'success' : status === 'ON_HOLD' ? 'warning' : 'neutral'

function schedule(order: IpdMedicationOrder) {
  if (order.frequency === 'PRN') return t('ipd.orders.prnSummary', { max: order.prnMaxPerDay ?? '-', indication: order.prnIndication || '-' })
  if (order.frequency === 'STAT') return t('ipd.orders.statSummary')
  return order.scheduleTimes.join(' · ')
}
const fmt = (value?: string) => (value ? new Date(value).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '')

onMounted(load)
defineExpose({ load })
</script>

<template>
  <div class="space-y-3 pt-3">
    <div class="flex items-center justify-between gap-2 flex-wrap">
      <UCheckbox v-model="showStopped" :label="t('ipd.orders.showStopped')" />
      <div class="flex gap-2">
        <UButton
          v-if="canSupply"
          :label="t('ipd.orders.sendToPharmacy')"
          icon="i-lucide-pill-bottle"
          color="neutral"
          variant="outline"
          size="sm"
          :to="`/inventory/dispense?admissionId=${admissionId}`"
        />
        <UButton
          v-if="canOrder"
          :label="t('ipd.orders.new')"
          icon="i-lucide-plus"
          size="sm"
          @click="openNew"
        />
      </div>
    </div>

    <div v-if="isLoading" class="space-y-2">
      <USkeleton v-for="i in 3" :key="i" class="h-14 w-full" />
    </div>
    <UAlert
      v-else-if="loadError"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="loadError"
    />
    <p v-else-if="!visibleOrders.length" class="text-sm text-muted text-center py-6">
      {{ t('ipd.orders.empty') }}
    </p>

    <div v-else class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="text-xs uppercase text-muted border-b border-default">
          <tr>
            <th class="py-2 text-left">
              {{ t('ipd.orders.medicine') }}
            </th>
            <th class="py-2 text-left">
              {{ t('ipd.orders.dose') }}
            </th>
            <th class="py-2 text-left">
              {{ t('ipd.orders.schedule') }}
            </th>
            <th class="py-2 text-left">
              {{ t('ipd.orders.period') }}
            </th>
            <th class="py-2 text-right">
              {{ t('ipd.orders.wardSupply') }}
            </th>
            <th class="py-2" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in visibleOrders" :key="order._id" class="border-b border-default last:border-b-0 align-top">
            <td class="py-2 pe-2">
              <div class="font-medium">
                {{ order.medication }} <span class="text-muted">{{ order.medicine?.strength }}</span>
              </div>
              <div class="text-xs text-muted">
                {{ order.orderNo }}
              </div>
              <div class="mt-1 flex flex-wrap gap-1">
                <UBadge :color="statusColor(order.status)" variant="subtle" size="sm">
                  {{ t(`ipd.orders.status.${order.status}`) }}
                </UBadge>
                <UBadge
                  v-if="order.status === 'ACTIVE' || order.status === 'ON_HOLD'"
                  :color="order.verifiedAt ? 'success' : 'neutral'"
                  variant="outline"
                  size="sm"
                >
                  {{ order.verifiedAt ? t('pharmacy.safety.status.VERIFIED') : t('pharmacy.safety.status.PENDING') }}
                </UBadge>
                <UBadge
                  v-if="order.medicine?.controlled"
                  color="error"
                  variant="subtle"
                  size="sm"
                >
                  {{ t('pharmacy.safety.controlled') }}
                </UBadge>
                <UBadge
                  v-if="order.medicine?.highAlert"
                  color="warning"
                  variant="subtle"
                  size="sm"
                >
                  {{ t('pharmacy.safety.highAlert') }}
                </UBadge>
              </div>
              <div v-if="order.allergyConflict" class="mt-1 text-xs font-semibold text-error">
                {{ t('pharmacy.allergyWarning', { allergy: order.allergyConflict }) }} — {{ order.allergyOverrideReason }}
              </div>
              <div v-if="order.discontinueReason" class="text-xs text-muted">
                {{ t('ipd.orders.stoppedBecause', { reason: order.discontinueReason }) }}
              </div>
            </td>
            <td class="py-2 pe-2">
              {{ order.doseText }} · {{ order.route }}
              <div v-if="order.instructions" class="text-xs text-muted">
                {{ order.instructions }}
              </div>
            </td>
            <td class="py-2 pe-2">
              <div class="font-medium">
                {{ order.frequency }}
              </div>
              <div class="text-xs text-muted">
                {{ schedule(order) }}
              </div>
            </td>
            <td class="py-2 pe-2 text-xs">
              {{ fmt(order.startAt) }}<br>
              {{ order.endAt ? fmt(order.endAt) : t('ipd.orders.untilStopped') }}
            </td>
            <td class="py-2 text-right tabular-nums">
              <span :class="order.wardSupplyBaseQty > 0 ? '' : 'text-warning font-semibold'">{{ order.wardSupplyBaseQty }}</span>
              <span class="text-xs text-muted"> {{ order.medicine?.baseUnit }}</span>
            </td>
            <td class="py-2 text-right whitespace-nowrap">
              <UButton
                v-if="canVerify && !order.verifiedAt && (order.status === 'ACTIVE' || order.status === 'ON_HOLD')"
                :label="t('pharmacy.safety.verify')"
                size="xs"
                variant="soft"
                @click="act(order, 'verify')"
              />
              <UDropdownMenu
                v-if="canUpdate && (order.status === 'ACTIVE' || order.status === 'ON_HOLD')"
                :items="[
                  ...(canOrder ? [{ label: t('ipd.orders.change'), icon: 'i-lucide-pencil', onSelect: () => openChange(order) }] : []),
                  order.status === 'ACTIVE'
                    ? { label: t('ipd.orders.hold'), icon: 'i-lucide-pause', onSelect: () => act(order, 'hold') }
                    : { label: t('ipd.orders.resume'), icon: 'i-lucide-play', onSelect: () => act(order, 'resume') },
                  { label: t('ipd.orders.stop'), icon: 'i-lucide-square', color: 'error', onSelect: () => act(order, 'stop') }
                ]"
              >
                <UButton
                  icon="i-lucide-ellipsis-vertical"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                />
              </UDropdownMenu>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <UModal v-model:open="formOpen" :title="changingOrder ? t('ipd.orders.changeTitle') : t('ipd.orders.newTitle')">
      <template #body>
        <div class="space-y-3">
          <UFormField :label="t('ipd.orders.medicine')" required>
            <div v-if="picked" class="flex items-center justify-between gap-2 text-sm font-medium">
              {{ picked.nameEn || picked.nameKh }}
              <UButton
                v-if="!changingOrder"
                icon="i-lucide-x"
                size="xs"
                color="neutral"
                variant="ghost"
                @click="picked = null"
              />
            </div>
            <PharmacyMedicineAutocomplete v-else @select="picked = $event" />
          </UFormField>
          <UAlert
            v-if="allergyMatch"
            color="error"
            variant="subtle"
            icon="i-lucide-octagon-alert"
            :title="t('pharmacy.allergyWarning', { allergy: allergyMatch })"
          />
          <UFormField v-if="allergyMatch" :label="t('pharmacy.safety.overrideReason')" required>
            <UInput v-model="form.allergyOverrideReason" class="w-full" :maxlength="500" />
          </UFormField>
          <div class="grid grid-cols-2 gap-3">
            <UFormField :label="t('ipd.orders.dose')" :help="t('ipd.orders.doseHelp')" required>
              <UInput v-model="form.doseText" placeholder="1 g" class="w-full" />
            </UFormField>
            <UFormField :label="t('ipd.orders.doseQty')" :help="t('ipd.orders.doseQtyHelp', { unit: picked?.baseUnit || '' })" required>
              <UInput
                v-model.number="form.doseBaseQty"
                type="number"
                min="1"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="t('ipd.orders.route')" required>
              <USelect
                v-model="form.route"
                :items="IPD_ROUTES.map(r => ({ label: t(`ipd.route.${r}`), value: r }))"
                value-key="value"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="t('ipd.orders.frequency')" required>
              <USelect
                v-model="form.frequency"
                :items="IPD_FREQUENCIES.map(f => ({ label: t(`ipd.frequency.${f}`), value: f }))"
                value-key="value"
                class="w-full"
              />
            </UFormField>
          </div>
          <UFormField
            v-if="form.frequency !== 'PRN' && form.frequency !== 'STAT'"
            :label="t('ipd.orders.times')"
            :help="t('ipd.orders.timesHelp')"
          >
            <UInput v-model="form.scheduleTimes" placeholder="08:00, 20:00" class="w-full" />
          </UFormField>
          <div v-if="form.frequency === 'PRN'" class="grid grid-cols-2 gap-3">
            <UFormField :label="t('ipd.orders.prnIndication')">
              <UInput v-model="form.prnIndication" class="w-full" />
            </UFormField>
            <UFormField :label="t('ipd.orders.prnMax')" required>
              <UInput
                v-model.number="form.prnMaxPerDay"
                type="number"
                min="1"
                max="24"
                class="w-full"
              />
            </UFormField>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <UFormField :label="t('ipd.orders.start')">
              <UInput v-model="form.startAt" type="datetime-local" class="w-full" />
            </UFormField>
            <UFormField v-if="form.frequency !== 'STAT'" :label="t('ipd.orders.durationDays')" :help="t('ipd.orders.durationHelp')">
              <UInput
                v-model.number="form.durationDays"
                type="number"
                min="1"
                max="365"
                class="w-full"
              />
            </UFormField>
          </div>
          <UFormField :label="t('ipd.orders.instructions')">
            <UInput v-model="form.instructions" class="w-full" :maxlength="500" />
          </UFormField>
          <UFormField v-if="changingOrder" :label="t('ipd.orders.changeReason')">
            <UInput v-model="form.changeReason" class="w-full" :maxlength="500" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            :label="t('common.cancel')"
            color="neutral"
            variant="outline"
            @click="formOpen = false"
          />
          <UButton
            :label="t('common.save')"
            icon="i-lucide-check"
            :loading="isSaving"
            :disabled="!picked || !form.doseText.trim() || !(form.doseBaseQty >= 1)"
            @click="save"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
