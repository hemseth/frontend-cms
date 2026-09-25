<script setup lang="ts">
/**
 * Medication administration record (MAR): the nurse's view of one day. Each scheduled dose
 * is recorded as given, refused, held or missed; as-needed doses are recorded when given.
 * Wrong records are marked "entered in error", never deleted.
 */
import { computed, onMounted, ref, watch } from 'vue'
import type { AdministrationStatus, MarOrderRow, MarSlot } from '~/types/ipd'

const props = defineProps<{
  admissionId: string
  active: boolean
}>()

const { t } = useI18n()
const toast = useToast()
const auth = useAuth()
const ipd = useIpd(props.admissionId)

const day = ref(localDay())
const rows = ref<MarOrderRow[]>([])
const isLoading = ref(false)
const loadError = ref('')
const canRecord = computed(() => props.active && auth.can('admission', 'update'))

async function load() {
  isLoading.value = true
  loadError.value = ''
  try {
    rows.value = await ipd.getMar(day.value)
  } catch (e) {
    loadError.value = getApiErrorMessage(e, t('ipd.loadFailed'))
  } finally {
    isLoading.value = false
  }
}
watch(day, load)

function shiftDay(delta: number) {
  const [y, m, d] = day.value.split('-').map(Number)
  day.value = localDay(new Date(y!, m! - 1, d! + delta))
}

// ---- Record dialog -------------------------------------------------------------------------
const recordOpen = ref(false)
const target = ref<{ row: MarOrderRow, slot: MarSlot | null } | null>(null)
const recordStatus = ref<AdministrationStatus>('GIVEN')
const recordReason = ref('')
const recordNote = ref('')
const isSaving = ref(false)

function openRecord(row: MarOrderRow, slot: MarSlot | null) {
  target.value = { row, slot }
  recordStatus.value = slot?.state === 'ON_HOLD' ? 'HELD' : 'GIVEN'
  recordReason.value = ''
  recordNote.value = ''
  recordOpen.value = true
}

async function saveRecord() {
  if (!target.value) return
  if (recordStatus.value !== 'GIVEN' && !recordReason.value.trim()) return
  isSaving.value = true
  try {
    const result = await ipd.recordDose({
      orderId: target.value.row.order._id,
      ...(target.value.slot ? { scheduledAt: target.value.slot.scheduledAt } : {}),
      status: recordStatus.value,
      ...(recordReason.value.trim() ? { reason: recordReason.value.trim() } : {}),
      ...(recordNote.value.trim() ? { note: recordNote.value.trim() } : {})
    })
    toast.add({
      title: t('ipd.mar.recorded'),
      ...(result?.supplyShort ? { description: t('ipd.mar.supplyShort'), color: 'warning' as const } : { color: 'success' as const })
    })
    recordOpen.value = false
    await load()
  } catch (e) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(e, t('common.saveFailed')), color: 'error' })
  } finally {
    isSaving.value = false
  }
}

async function markError(recordId: string) {
  const reason = window.prompt(t('ipd.enteredInErrorReason'))?.trim()
  if (!reason) return
  try {
    await ipd.markDoseError(recordId, reason)
    await load()
  } catch (e) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(e, t('common.saveFailed')), color: 'error' })
  }
}

const stateColor = (state: MarSlot['state']) => ({
  GIVEN: 'success', REFUSED: 'error', HELD: 'warning', MISSED: 'error', DUE: 'primary', OVERDUE: 'error', ON_HOLD: 'warning'
} as const)[state]
const time = (value: string) => new Date(value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

onMounted(load)
defineExpose({ load })
</script>

<template>
  <div class="space-y-3 pt-3">
    <div class="flex items-center gap-2 flex-wrap">
      <UButton
        icon="i-lucide-chevron-left"
        color="neutral"
        variant="outline"
        size="sm"
        @click="shiftDay(-1)"
      />
      <UInput v-model="day" type="date" size="sm" />
      <UButton
        icon="i-lucide-chevron-right"
        color="neutral"
        variant="outline"
        size="sm"
        @click="shiftDay(1)"
      />
      <UButton
        :label="t('ipd.mar.today')"
        color="neutral"
        variant="ghost"
        size="sm"
        @click="day = localDay()"
      />
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
    <p v-else-if="!rows.length" class="text-sm text-muted text-center py-6">
      {{ t('ipd.mar.empty') }}
    </p>

    <div v-else class="space-y-2">
      <div v-for="row in rows" :key="row.order._id" class="p-3 rounded-lg border border-default space-y-2">
        <div class="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <div class="font-medium text-sm">
              {{ row.order.medication }} — {{ row.order.doseText }} · {{ row.order.route }} · {{ row.order.frequency }}
            </div>
            <div class="text-xs text-muted">
              {{ t('ipd.orders.wardSupply') }}: {{ row.order.wardSupplyBaseQty }} {{ row.order.medicine?.baseUnit }}
              <span v-if="row.order.instructions"> · {{ row.order.instructions }}</span>
            </div>
            <div v-if="row.order.allergyConflict" class="text-xs font-semibold text-error">
              {{ t('pharmacy.allergyWarning', { allergy: row.order.allergyConflict }) }}
            </div>
          </div>
          <UButton
            v-if="row.order.frequency === 'PRN' && canRecord && row.order.status === 'ACTIVE'"
            :label="t('ipd.mar.givePrn')"
            icon="i-lucide-plus"
            size="xs"
            @click="openRecord(row, null)"
          />
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            v-for="slot in row.slots"
            :key="slot.scheduledAt"
            type="button"
            class="text-left"
            :disabled="!canRecord || !!slot.record"
            @click="openRecord(row, slot)"
          >
            <UBadge :color="stateColor(slot.state)" :variant="slot.record ? 'solid' : 'outline'" size="md">
              {{ slot.localTime }} · {{ t(`ipd.mar.state.${slot.state}`) }}
              <span v-if="slot.record && slot.record.administeredAt">({{ time(slot.record.administeredAt) }})</span>
            </UBadge>
          </button>
          <UBadge
            v-for="dose in row.prnGiven"
            :key="dose._id"
            color="success"
            variant="solid"
            size="md"
          >
            PRN {{ time(dose.administeredAt) }}
          </UBadge>
        </div>

        <div v-for="slot in row.slots.filter(s => s.record && (s.record.reason || s.record.note))" :key="`n-${slot.scheduledAt}`" class="text-xs text-muted">
          {{ slot.localTime }}: {{ slot.record?.reason || slot.record?.note }}
        </div>
        <div v-if="canRecord" class="flex flex-wrap gap-2">
          <UButton
            v-for="rec in [...row.slots.filter(s => s.record).map(s => s.record!), ...row.prnGiven]"
            :key="`e-${rec._id}`"
            :label="t('ipd.enteredInError') + ' ' + time(rec.administeredAt)"
            size="xs"
            color="neutral"
            variant="ghost"
            @click="markError(rec._id)"
          />
        </div>
        <div v-for="err in row.errors" :key="`x-${err._id}`" class="text-xs text-muted line-through">
          {{ err.status }} {{ time(err.administeredAt) }} — {{ err.errorReason }}
        </div>
      </div>
    </div>

    <UModal v-model:open="recordOpen" :title="t('ipd.mar.recordTitle')">
      <template #body>
        <div v-if="target" class="space-y-3">
          <p class="text-sm font-medium">
            {{ target.row.order.medication }} — {{ target.row.order.doseText }} · {{ target.row.order.route }}
            <span v-if="target.slot"> · {{ target.slot.localTime }}</span>
          </p>
          <URadioGroup
            v-if="target.slot"
            v-model="recordStatus"
            orientation="horizontal"
            :items="(['GIVEN', 'REFUSED', 'HELD', 'MISSED'] as const).map(s => ({ label: t(`ipd.mar.state.${s}`), value: s }))"
          />
          <UFormField v-if="recordStatus !== 'GIVEN'" :label="t('ipd.mar.reason')" required>
            <UInput v-model="recordReason" class="w-full" :maxlength="500" />
          </UFormField>
          <UFormField :label="t('ipd.mar.note')">
            <UInput v-model="recordNote" class="w-full" :maxlength="500" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            :label="t('common.cancel')"
            color="neutral"
            variant="outline"
            @click="recordOpen = false"
          />
          <UButton
            :label="t('common.save')"
            icon="i-lucide-check"
            :loading="isSaving"
            :disabled="recordStatus !== 'GIVEN' && !recordReason.trim()"
            @click="saveRecord"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
