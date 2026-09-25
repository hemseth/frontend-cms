<script setup lang="ts">
/**
 * Dispense a prescription.
 *
 * Lines are seeded from the prescription, the pharmacist confirms each quantity,
 * then the server allocates batches FEFO and posts the deduction. The frontend
 * never chooses a batch and never writes stock.
 *
 * Quantities here are BASE units (the unit stock is counted in), which is what
 * the prescription schedule produces: (morning+afternoon+evening+night) x days.
 */
import { ref, computed, watch, onMounted } from 'vue'
import type { MedicineRef, MedicineSuggestion, PrescriptionLine, WarehouseRef } from '~/types/pharmacy'

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
const { fetchStock, summarise, fetchWarehouses } = useStock()
const { dispense, isSubmitting } = useDispensing()
const { fetchPrescriptions } = useDispensing()

interface Line {
  key: string
  medicineId: string
  medicine: MedicineRef
  prescriptionItemId?: string
  /** What the doctor prescribed, in base units. */
  prescribedQty: number
  /** What the pharmacist will actually hand over. */
  dispenseQty: number
  stockBase: number
  nearestExpiry: Date | null
  include: boolean
}

const lines = ref<Line[]>([])
const warehouses = ref<WarehouseRef[]>([])
const warehouseId = ref<string>('')
const isLoading = ref(false)
const loadError = ref<string | null>(null)

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

/** Matches a line's medicine against the patient's recorded allergies. */
function allergyMatch(line: Line): string | null {
  const list = props.allergies || []
  if (!list.length) return null
  const name = `${line.medicine?.nameEn || ''} ${line.medicine?.brandName || ''}`.toLowerCase()
  if (!name.trim()) return null
  for (const allergy of list) {
    const a = String(allergy || '').toLowerCase().trim()
    if (a && name.includes(a)) return allergy
  }
  return null
}

const canSubmit = computed(() =>
  !!warehouseId.value && selectedLines.value.length > 0 && !isSubmitting.value
)

async function load() {
  isLoading.value = true
  loadError.value = null
  try {
    const [whList, prescriptions] = await Promise.all([
      fetchWarehouses(),
      fetchPrescriptions({ visitId: props.visitId, patientId: props.patientId })
    ])

    warehouses.value = whList
    // Prefer a dispensing/pharmacy warehouse when the clinic has one.
    const preferred = whList.find(w => ['PHARMACY', 'DISPENSING'].includes(String(w.type)))
    warehouseId.value = String(preferred?._id || whList[0]?._id || '')

    const relevant = props.prescriptionId
      ? prescriptions.filter((p: PrescriptionLine) => String(p._id) === props.prescriptionId)
      : prescriptions

    const seeded: Line[] = relevant
      .filter((p: PrescriptionLine) => p.medicineId)
      .map((p: PrescriptionLine, index: number) => {
        const qty = Number(p.quantity) || prescriptionTotalQty(p)
        return {
          key: String(p._id || index),
          medicineId: String(p.medicineId),
          // The prescription only stores free text; refreshStock() fills in the
          // real medicine document once the stock join comes back.
          medicine: {
            _id: String(p.medicineId),
            nameEn: p.medication,
            nameKh: p.medication,
            baseUnit: p.unit
          },
          prescriptionItemId: p._id ? String(p._id) : undefined,
          prescribedQty: qty,
          dispenseQty: qty,
          stockBase: 0,
          nearestExpiry: null,
          include: true
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
      // stored free text.
      const med = summary?.rows?.[0]?.medicine
      if (med) line.medicine = { ...line.medicine, ...med }
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
    dispenseQty: 1,
    stockBase: Number(medicine._stockBase) || 0,
    nearestExpiry: medicine._nearestExpiry || null,
    include: true
  })
}

function removeLine(key: string) {
  lines.value = lines.value.filter(l => l.key !== key)
}

async function submit() {
  if (!canSubmit.value) return
  try {
    const { id, shortages } = await dispense({
      warehouseId: warehouseId.value,
      patientId: props.patientId,
      visitId: props.visitId,
      prescriptionId: props.prescriptionId,
      items: selectedLines.value.map(l => ({
        medicineId: l.medicineId,
        prescriptionItemId: l.prescriptionItemId,
        requestedQty: l.dispenseQty,
        // Quantities on this form are already base units.
        conversionFactorSnapshot: 1
      }))
    })

    if (shortages.length) {
      toast.add({
        title: t('pharmacy.dispensedPartial'),
        description: t('pharmacy.dispensedPartialHint', { count: shortages.length }),
        color: 'warning'
      })
    } else {
      toast.add({ title: t('pharmacy.dispensedOk'), color: 'success' })
    }

    emit('dispensed', { id })
    await refreshStock()
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

                <div v-if="allergyMatch(line)" class="mt-1 flex items-center gap-1 text-xs font-bold text-error">
                  <UIcon name="i-lucide-octagon-alert" class="w-3.5 h-3.5" />
                  {{ t('pharmacy.allergyWarning', { allergy: allergyMatch(line) }) }}
                </div>
              </td>

              <td class="py-2 text-right tabular-nums text-muted">
                {{ line.prescribedQty || '-' }}
              </td>

              <td class="py-2 text-right">
                <UInput
                  v-model.number="line.dispenseQty"
                  type="number"
                  min="0"
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
