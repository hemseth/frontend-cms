<script setup lang="ts">
/**
 * Dispense a prescription.
 *
 * Lines are seeded from the prescription with what is still owed on each, the
 * pharmacist confirms each quantity, then the server allocates batches FEFO and
 * posts the deduction. The frontend never chooses a batch and never writes stock.
 *
 * Quantities here are BASE units (the unit stock is counted in). The server
 * enforces the safety rules (docs/PHARMACY.md); this form shows them early:
 * remaining quantity, pharmacist verification, controlled medicines and allergies.
 */
import { ref, computed, watch, onMounted } from 'vue'
import type { MedicineRef, MedicineSuggestion, PrescriptionLine, PrescriptionStatus, WarehouseRef } from '~/types/pharmacy'

const props = defineProps<{
  visitId?: string
  patientId?: string
  prescriptionId?: string
  /** Patient allergies, shown as a blocking-looking warning on every line. */
  allergies?: string[]
}>()

const emit = defineEmits<{
  dispensed: [payload: { id: string }]
}>()

const { t } = useI18n()
const toast = useToast()
const auth = useAuth()
const { fetchStock, summarise, fetchWarehouses } = useStock()
const { dispense, isSubmitting, fetchPrescriptions, verifyPrescription } = useDispensing()

interface Line {
  key: string
  medicineId: string
  medicine: MedicineRef
  prescriptionItemId?: string
  /** What the doctor prescribed, in base units (0 for a walk-in line). */
  prescribedQty: number
  /** What is still owed on the prescription line. */
  remainingQty: number
  /** What the pharmacist will actually hand over. */
  dispenseQty: number
  stockBase: number
  nearestExpiry: Date | null
  include: boolean
  status?: PrescriptionStatus
  verified: boolean
  allergyConflict?: string
  allergyOverrideReason?: string
  verifying?: boolean
}

const lines = ref<Line[]>([])
const warehouses = ref<WarehouseRef[]>([])
const warehouseId = ref<string>('')
const isLoading = ref(false)
const loadError = ref<string | null>(null)
const lastDispensingId = ref('')

const canVerify = computed(() => auth.can('prescription', 'approve'))
const selectedLines = computed(() => lines.value.filter(l => l.include && l.dispenseQty > 0))

const warehouseOptions = computed(() =>
  warehouses.value.map(w => ({ label: w.nameEn || w.nameKh || w.code, value: String(w._id) }))
)

/** A line the clinic cannot fill completely from AVAILABLE stock. */
function shortfall(line: Line): number {
  return Math.max(0, line.dispenseQty - line.stockBase)
}

/** The medicine's own threshold, falling back to the shared default. */
function reorderLevelFor(line: Line): number {
  return line.medicine?.minStockAlert ?? DEFAULT_REORDER_LEVEL
}

const hasShortfall = computed(() => selectedLines.value.some(l => shortfall(l) > 0))
const hasExpiredOnly = computed(() =>
  selectedLines.value.some(l => l.stockBase > 0 && l.nearestExpiry && !isDispensable(l.nearestExpiry))
)

/** Same matcher as the server and the OPD screen (utils/drugAllergy.ts). */
function allergyMatch(line: Line): string | null {
  const m = line.medicine
  return checkDrugAllergy(`${m?.nameEn || ''} ${m?.nameKh || ''} ${m?.brandName || ''}`, props.allergies || [])
}

/** What stops a selected line from being dispensed, or null. */
function blockReason(line: Line): string | null {
  if (line.prescriptionItemId && line.dispenseQty > line.remainingQty) {
    return t('pharmacy.safety.overRemaining', { qty: line.remainingQty })
  }
  if (!line.prescriptionItemId && line.medicine?.controlled) return t('pharmacy.safety.controlledNeedsRx')
  if (line.prescriptionItemId && line.medicine?.controlled && !line.verified) return t('pharmacy.safety.controlledNeedsVerify')
  if (!line.prescriptionItemId && allergyMatch(line) && !line.allergyOverrideReason?.trim()) return t('pharmacy.safety.reasonRequired')
  return null
}

const blockedLines = computed(() => selectedLines.value.filter(l => blockReason(l)))

const canSubmit = computed(() =>
  !!warehouseId.value && selectedLines.value.length > 0 && !blockedLines.value.length && !isSubmitting.value
)

function statusColor(status?: PrescriptionStatus) {
  if (status === 'VERIFIED') return 'success'
  if (status === 'PARTIALLY_DISPENSED') return 'warning'
  return 'neutral'
}

async function load() {
  isLoading.value = true
  loadError.value = null
  try {
    const [whList, prescriptions] = await Promise.all([
      fetchWarehouses(),
      fetchPrescriptions({ visitId: props.visitId, patientId: props.visitId ? undefined : props.patientId })
    ])

    warehouses.value = whList
    // Prefer a dispensing/pharmacy warehouse when the clinic has one.
    const preferred = whList.find(w => ['PHARMACY', 'DISPENSING'].includes(String(w.type)))
    warehouseId.value = String(preferred?._id || whList[0]?._id || '')

    const relevant = props.prescriptionId
      ? prescriptions.filter((p: PrescriptionLine) => String(p._id) === props.prescriptionId)
      : prescriptions

    const seeded: Line[] = relevant
      // Nothing left to hand over, or cancelled: not shown.
      .filter((p: PrescriptionLine) => p.medicineId && p.status !== 'CANCELLED' && (p.remainingBaseQty ?? 1) > 0)
      .map((p: PrescriptionLine, index: number) => {
        const prescribed = Number(p.prescribedBaseQty) || Number(p.quantity) || prescriptionTotalQty(p)
        const remaining = p.remainingBaseQty ?? prescribed
        return {
          key: String(p._id || index),
          medicineId: String(p.medicineId),
          medicine: {
            _id: String(p.medicineId),
            nameEn: p.medicine?.nameEn || p.medication,
            nameKh: p.medicine?.nameKh || p.medication,
            ...p.medicine,
            baseUnit: p.medicine?.baseUnit || p.unit
          },
          prescriptionItemId: p._id ? String(p._id) : undefined,
          prescribedQty: prescribed,
          remainingQty: remaining,
          dispenseQty: remaining,
          stockBase: 0,
          nearestExpiry: null,
          include: true,
          status: p.status,
          verified: !!p.verifiedAt,
          allergyConflict: p.allergyConflict,
          allergyOverrideReason: p.allergyOverrideReason
        }
      })

    lines.value = seeded
    await refreshStock()
  } catch (e) {
    loadError.value = getApiErrorMessage(e, t('pharmacy.loadPrescriptionFailed'))
  } finally {
    isLoading.value = false
  }
}

/** Refresh on-hand figures for the medicines on this form. */
async function refreshStock() {
  if (!lines.value.length) return
  try {
    const rows = await fetchStock({
      limit: 200,
      ...(warehouseId.value ? { warehouseId: warehouseId.value } : {})
    })
    const byMedicine = summarise(rows)
    for (const line of lines.value) {
      const summary = byMedicine.get(line.medicineId)
      line.stockBase = summary?.totalBase ?? 0
      line.nearestExpiry = summary?.nearestExpiry ?? null
      // Enrich the display name from the stock join when the prescription only
      // stored free text. The safety flags from the prescription endpoint win.
      const med = summary?.rows?.[0]?.medicine
      if (med) line.medicine = { ...med, ...line.medicine }
    }
  } catch {
    // Leave the figures at zero; the server still validates on confirm.
  }
}

watch(warehouseId, () => {
  refreshStock()
})

function addManualLine(medicine: MedicineSuggestion) {
  if (!medicine?._id) return
  if (lines.value.some(l => l.medicineId === String(medicine._id))) {
    toast.add({ title: t('pharmacy.alreadyOnList'), color: 'info' })
    return
  }
  lines.value.push({
    key: `manual-${medicine._id}-${Date.now()}`,
    medicineId: String(medicine._id),
    medicine,
    prescribedQty: 0,
    remainingQty: 0,
    dispenseQty: 1,
    stockBase: Number(medicine._stockBase) || 0,
    nearestExpiry: medicine._nearestExpiry || null,
    include: true,
    verified: false
  })
}

function removeLine(key: string) {
  lines.value = lines.value.filter(l => l.key !== key)
}

async function verify(line: Line) {
  if (!line.prescriptionItemId) return
  line.verifying = true
  try {
    const updated = await verifyPrescription(line.prescriptionItemId)
    line.verified = true
    line.status = updated?.status ?? 'VERIFIED'
    toast.add({ title: t('pharmacy.safety.verifiedOk'), color: 'success' })
  } catch (e) {
    toast.add({ title: t('pharmacy.safety.verifyFailed'), description: getApiErrorMessage(e, t('pharmacy.safety.verifyFailed')), color: 'error' })
  } finally {
    line.verifying = false
  }
}

async function submit() {
  if (!canSubmit.value) return
  try {
    const { id, shortages, status } = await dispense({
      warehouseId: warehouseId.value,
      patientId: props.patientId,
      visitId: props.visitId,
      prescriptionId: props.prescriptionId,
      items: selectedLines.value.map(l => ({
        medicineId: l.medicineId,
        prescriptionItemId: l.prescriptionItemId,
        requestedQty: l.dispenseQty,
        // Quantities on this form are already base units.
        conversionFactorSnapshot: 1,
        ...(!l.prescriptionItemId && l.allergyOverrideReason?.trim() ? { allergyOverrideReason: l.allergyOverrideReason.trim() } : {})
      }))
    })

    if (status === 'PREPARED') {
      // Nothing was in stock: nothing was handed over.
      toast.add({ title: t('pharmacy.dispenseFailed'), description: t('pharmacy.safety.nothingInStock'), color: 'error' })
    } else if (shortages.length) {
      lastDispensingId.value = id
      toast.add({
        title: t('pharmacy.dispensedPartial'),
        description: t('pharmacy.dispensedPartialHint', { count: shortages.length }),
        color: 'warning'
      })
    } else {
      lastDispensingId.value = id
      toast.add({ title: t('pharmacy.dispensedOk'), color: 'success' })
    }

    emit('dispensed', { id })
    await load()
  } catch (e) {
    // Never report success on failure: the pharmacist must know stock was not
    // deducted and the patient was not given the medicine.
    toast.add({
      title: t('pharmacy.dispenseFailed'),
      description: getApiErrorMessage(e, t('pharmacy.dispenseFailed')),
      color: 'error'
    })
  }
}

onMounted(load)
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-pill" class="w-5 h-5 text-primary" />
          <h3 class="font-semibold">
            {{ t('pharmacy.dispenseTitle') }}
          </h3>
        </div>

        <UFormField :label="t('pharmacy.warehouse')" class="min-w-56">
          <USelect
            v-model="warehouseId"
            :items="warehouseOptions"
            value-key="value"
            :placeholder="t('pharmacy.selectWarehouse')"
            size="sm"
          />
        </UFormField>
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

    <div v-else class="space-y-3">
      <UAlert
        v-if="allergies?.length"
        color="error"
        variant="subtle"
        icon="i-lucide-octagon-alert"
        :title="t('pharmacy.patientAllergies')"
        :description="allergies.join(', ')"
      />

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-xs uppercase text-muted border-b border-default">
            <tr>
              <th class="py-2 w-8" />
              <th class="py-2 text-left">
                {{ t('pharmacy.medicine') }}
              </th>
              <th class="py-2 text-right w-24">
                {{ t('pharmacy.prescribed') }}
              </th>
              <th class="py-2 text-right w-28">
                {{ t('pharmacy.dispenseQty') }}
              </th>
              <th class="py-2 text-center w-32">
                {{ t('pharmacy.inStock') }}
              </th>
              <th class="py-2 w-8" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="line in lines" :key="line.key" class="border-b border-default last:border-b-0 align-top">
              <td class="py-2">
                <UCheckbox v-model="line.include" />
              </td>

              <td class="py-2 pe-2">
                <div class="font-medium">
                  {{ line.medicine?.nameEn || line.medicine?.nameKh }}
                </div>
                <div v-if="line.medicine?.nameKh && line.medicine?.nameKh !== line.medicine?.nameEn" class="text-xs text-muted">
                  {{ line.medicine.nameKh }}
                </div>

                <PharmacyBatchExpiryAlert
                  v-if="line.nearestExpiry"
                  dense
                  class="mt-1"
                  :expiry-date="line.nearestExpiry"
                />

                <div class="mt-1 flex flex-wrap items-center gap-1">
                  <UBadge
                    v-if="line.prescriptionItemId"
                    :color="statusColor(line.status)"
                    variant="subtle"
                    size="sm"
                  >
                    {{ t(`pharmacy.safety.status.${line.status || 'PENDING'}`) }}
                  </UBadge>
                  <UBadge
                    v-else
                    color="neutral"
                    variant="outline"
                    size="sm"
                  >
                    {{ t('pharmacy.safety.walkIn') }}
                  </UBadge>
                  <UBadge
                    v-if="line.medicine?.controlled"
                    color="error"
                    variant="subtle"
                    size="sm"
                    icon="i-lucide-lock"
                  >
                    {{ t('pharmacy.safety.controlled') }}
                  </UBadge>
                  <UBadge
                    v-if="line.medicine?.highAlert"
                    color="warning"
                    variant="subtle"
                    size="sm"
                    icon="i-lucide-triangle-alert"
                  >
                    {{ t('pharmacy.safety.highAlert') }}
                  </UBadge>
                  <UButton
                    v-if="line.prescriptionItemId && !line.verified && canVerify"
                    :label="t('pharmacy.safety.verify')"
                    icon="i-lucide-badge-check"
                    size="xs"
                    color="primary"
                    variant="soft"
                    :loading="line.verifying"
                    @click="verify(line)"
                  />
                </div>

                <div v-if="line.allergyConflict || allergyMatch(line)" class="mt-1 flex items-center gap-1 text-xs font-bold text-error">
                  <UIcon name="i-lucide-octagon-alert" class="w-3.5 h-3.5" />
                  {{ t('pharmacy.allergyWarning', { allergy: line.allergyConflict || allergyMatch(line) }) }}
                </div>
                <div v-if="line.prescriptionItemId && line.allergyOverrideReason" class="text-xs text-muted">
                  {{ t('pharmacy.safety.prescriberReason', { reason: line.allergyOverrideReason }) }}
                </div>
                <UInput
                  v-if="!line.prescriptionItemId && allergyMatch(line)"
                  v-model="line.allergyOverrideReason"
                  size="xs"
                  class="mt-1 w-full max-w-sm"
                  :placeholder="t('pharmacy.safety.overrideReason')"
                  :maxlength="500"
                />
                <div v-if="line.include && blockReason(line)" class="mt-1 text-xs font-semibold text-error">
                  {{ blockReason(line) }}
                </div>
              </td>

              <td class="py-2 text-right tabular-nums text-muted">
                <div>{{ line.prescribedQty || '-' }}</div>
                <div v-if="line.prescriptionItemId && line.remainingQty < line.prescribedQty" class="text-xs">
                  {{ t('pharmacy.safety.remaining', { qty: line.remainingQty }) }}
                </div>
              </td>

              <td class="py-2 text-right">
                <UInput
                  v-model.number="line.dispenseQty"
                  type="number"
                  min="0"
                  :max="line.prescriptionItemId ? line.remainingQty : undefined"
                  size="sm"
                  class="w-24"
                  :disabled="!line.include"
                />
              </td>

              <td class="py-2 text-center">
                <PharmacyStockBalanceChip
                  :qty="line.stockBase"
                  :reorder-level="reorderLevelFor(line)"
                  :unit="line.medicine?.baseUnit"
                />
                <div v-if="line.include && shortfall(line) > 0" class="mt-1 text-xs font-semibold text-warning">
                  {{ t('pharmacy.shortBy', { qty: shortfall(line) }) }}
                </div>
              </td>

              <td class="py-2 text-right">
                <UButton
                  icon="i-lucide-x"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  @click="removeLine(line.key)"
                />
              </td>
            </tr>

            <tr v-if="!lines.length">
              <td colspan="6" class="py-6 text-center text-muted">
                {{ t('pharmacy.noPrescriptionLines') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div>
        <label class="block text-xs font-semibold text-muted mb-1">
          {{ t('pharmacy.addMedicine') }}
        </label>
        <PharmacyMedicineAutocomplete
          :warehouse-id="warehouseId"
          @select="addManualLine"
        />
      </div>

      <UAlert
        v-if="hasShortfall"
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        :title="t('pharmacy.shortStockTitle')"
        :description="t('pharmacy.shortStockHint')"
      />

      <UAlert
        v-if="hasExpiredOnly"
        color="error"
        variant="subtle"
        icon="i-lucide-octagon-alert"
        :title="t('pharmacy.expiredBatch')"
        :description="t('pharmacy.expiredBlockedHint')"
      />
    </div>

    <template #footer>
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <div class="text-xs text-muted">
          {{ t('pharmacy.fefoNote') }}
        </div>
        <UButton
          v-if="lastDispensingId"
          :label="t('pharmacy.safety.printLabels')"
          icon="i-lucide-tag"
          color="neutral"
          variant="outline"
          :to="`/print/medicine-label/${lastDispensingId}`"
          target="_blank"
        />
        <UButton
          :label="t('pharmacy.confirmDispense')"
          icon="i-lucide-check"
          color="primary"
          :loading="isSubmitting"
          :disabled="!canSubmit"
          @click="submit"
        />
      </div>
    </template>
  </UCard>
</template>
