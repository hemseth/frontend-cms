<script setup lang="ts">
/**
 * Goods receipt: supplier, invoice number and the batch lines being received.
 *
 * Saving creates the GRN, then posts it. Posting is what creates the batches
 * and the stock, through stock-posting.service.ts.
 */
import { ref, computed, onMounted } from 'vue'
import { z } from 'zod'
import type { MedicineRef, MedicineSuggestion, PurchaseOrderRef, SupplierRef, WarehouseRef } from '~/types/pharmacy'

const emit = defineEmits<{
  posted: [payload: { id: string, grnNo?: string }]
}>()

const { t } = useI18n()
const toast = useToast()
const { fetchWarehouses } = useStock()
const { fetchSuppliers, fetchPurchaseOrders, receiveAndPost, isSubmitting } = useGoodsReceipt()

interface ReceiptLine {
  key: string
  medicineId: string
  medicine: MedicineRef
  receivedQty: number
  conversionFactorSnapshot: number
  batchNo: string
  manufactureDate: string
  expiryDate: string
  unitCost: number
}

const suppliers = ref<SupplierRef[]>([])
const purchaseOrders = ref<PurchaseOrderRef[]>([])
const warehouses = ref<WarehouseRef[]>([])
const isLoading = ref(false)

const form = ref({
  supplierId: '',
  purchaseOrderId: '',
  warehouseId: '',
  supplierInvoiceNo: '',
  deliveryNoteNo: '',
  receivedAt: new Date().toISOString().split('T')[0] || '',
  currency: 'USD'
})

const lines = ref<ReceiptLine[]>([])
const fieldErrors = ref<Record<string, string>>({})

/** Zod v4 (frontend). The backend has its own Zod v3 schema; they are not shared. */
const lineSchema = z.object({
  medicineId: z.string().min(1),
  receivedQty: z.number().positive(t('pharmacy.errQtyPositive')),
  batchNo: z.string().min(1, t('pharmacy.errBatchRequired')),
  expiryDate: z.string().min(1, t('pharmacy.errExpiryRequired')),
  unitCost: z.number().min(0)
})

const receiptSchema = z.object({
  supplierId: z.string().min(1, t('pharmacy.errSupplierRequired')),
  purchaseOrderId: z.string().min(1, t('pharmacy.errPoRequired')),
  warehouseId: z.string().min(1, t('pharmacy.errWarehouseRequired')),
  supplierInvoiceNo: z.string().min(1, t('pharmacy.errInvoiceRequired'))
})

const supplierOptions = computed(() =>
  suppliers.value.map(s => ({ label: s.name || s.nameEn || s.code, value: String(s._id) }))
)
const purchaseOrderOptions = computed(() =>
  purchaseOrders.value.map(p => ({
    label: `${p.purchaseNo || p.code || p._id}${p.grandTotal ? ` · ${p.grandTotal}` : ''}`,
    value: String(p._id)
  }))
)
const warehouseOptions = computed(() =>
  warehouses.value.map(w => ({ label: w.nameEn || w.nameKh || w.code, value: String(w._id) }))
)

/** Lines whose expiry date is already past — receiving these is almost always an error. */
const expiredLines = computed(() => lines.value.filter(l => l.expiryDate && !isDispensable(l.expiryDate)))
const nearExpiryLines = computed(() =>
  lines.value.filter(l => l.expiryDate && expiryLevel(l.expiryDate) === 'near')
)

const totalCost = computed(() =>
  lines.value.reduce((sum, l) => sum + (Number(l.receivedQty) || 0) * (Number(l.unitCost) || 0), 0)
)

async function loadSuppliers() {
  isLoading.value = true
  try {
    const [supplierList, warehouseList] = await Promise.all([fetchSuppliers(), fetchWarehouses()])
    suppliers.value = supplierList
    warehouses.value = warehouseList
    const main = warehouseList.find(w => String(w.type) === 'MAIN')
    form.value.warehouseId = String(main?._id || warehouseList[0]?._id || '')
  } catch (e) {
    toast.add({ title: getApiErrorMessage(e, t('pharmacy.loadFailed')), color: 'error' })
  } finally {
    isLoading.value = false
  }
}

async function onSupplierChange() {
  form.value.purchaseOrderId = ''
  purchaseOrders.value = []
  if (!form.value.supplierId) return
  try {
    purchaseOrders.value = await fetchPurchaseOrders(form.value.supplierId)
  } catch {
    purchaseOrders.value = []
  }
}

function addLine(medicine: MedicineSuggestion) {
  if (!medicine?._id) return
  lines.value.push({
    key: `${medicine._id}-${Date.now()}`,
    medicineId: String(medicine._id),
    medicine,
    receivedQty: 1,
    // Receiving is entered in base units, matching how stock is counted.
    conversionFactorSnapshot: 1,
    batchNo: '',
    manufactureDate: '',
    expiryDate: '',
    unitCost: Number(medicine.wholesalePrice) || 0
  })
}

function removeLine(key: string) {
  lines.value = lines.value.filter(l => l.key !== key)
}

function validate(): boolean {
  fieldErrors.value = {}
  const header = receiptSchema.safeParse(form.value)
  if (!header.success) {
    for (const issue of header.error.issues) {
      const key = String(issue.path[0])
      if (key) fieldErrors.value[key] = issue.message
    }
  }

  if (!lines.value.length) {
    fieldErrors.value.lines = t('pharmacy.errNoLines')
  } else {
    for (const [index, line] of lines.value.entries()) {
      const parsed = lineSchema.safeParse(line)
      if (!parsed.success) {
        const first = parsed.error.issues[0]
        fieldErrors.value[`line-${index}`] = first?.message || t('pharmacy.errLineInvalid')
      }
    }
  }

  return Object.keys(fieldErrors.value).length === 0
}

async function submit() {
  if (!validate()) {
    toast.add({ title: t('pharmacy.errFormInvalid'), color: 'error' })
    return
  }

  try {
    const { id, grnNo } = await receiveAndPost({
      warehouseId: form.value.warehouseId,
      purchaseOrderId: form.value.purchaseOrderId,
      supplierId: form.value.supplierId,
      supplierInvoiceNo: form.value.supplierInvoiceNo,
      deliveryNoteNo: form.value.deliveryNoteNo || undefined,
      receivedAt: form.value.receivedAt,
      items: lines.value.map(l => ({
        medicineId: l.medicineId,
        receivedQty: Number(l.receivedQty),
        conversionFactorSnapshot: l.conversionFactorSnapshot,
        batchNo: l.batchNo,
        manufactureDate: l.manufactureDate || undefined,
        expiryDate: l.expiryDate || undefined,
        unitCost: Number(l.unitCost) || 0,
        currency: form.value.currency
      }))
    })

    toast.add({ title: t('pharmacy.grnPosted', { no: grnNo || '' }), color: 'success' })
    emit('posted', { id, grnNo })
    lines.value = []
    form.value.supplierInvoiceNo = ''
    form.value.deliveryNoteNo = ''
  } catch (e) {
    toast.add({
      title: t('pharmacy.grnFailed'),
      description: getApiErrorMessage(e, t('pharmacy.grnFailed')),
      color: 'error'
    })
  }
}

onMounted(loadSuppliers)
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-package-plus" class="w-5 h-5 text-primary" />
        <h3 class="font-semibold">
          {{ t('pharmacy.grnTitle') }}
        </h3>
      </div>
    </template>

    <div class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <UFormField :label="t('pharmacy.supplier')" required :error="fieldErrors.supplierId">
          <USelect
            v-model="form.supplierId"
            :items="supplierOptions"
            value-key="value"
            :placeholder="t('pharmacy.selectSupplier')"
            :loading="isLoading"
            size="sm"
            class="w-full"
            @update:model-value="onSupplierChange"
          />
        </UFormField>

        <UFormField :label="t('pharmacy.purchaseOrder')" required :error="fieldErrors.purchaseOrderId">
          <USelect
            v-model="form.purchaseOrderId"
            :items="purchaseOrderOptions"
            value-key="value"
            :placeholder="form.supplierId ? t('pharmacy.selectPo') : t('pharmacy.selectSupplierFirst')"
            :disabled="!form.supplierId"
            size="sm"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="t('pharmacy.warehouse')" required :error="fieldErrors.warehouseId">
          <USelect
            v-model="form.warehouseId"
            :items="warehouseOptions"
            value-key="value"
            size="sm"
            class="w-full"
          />
        </UFormField>

        <UFormField :label="t('pharmacy.invoiceNo')" required :error="fieldErrors.supplierInvoiceNo">
          <UInput
            v-model="form.supplierInvoiceNo"
            size="sm"
            class="w-full"
            placeholder="INV-0001"
          />
        </UFormField>

        <UFormField :label="t('pharmacy.deliveryNoteNo')">
          <UInput v-model="form.deliveryNoteNo" size="sm" class="w-full" />
        </UFormField>

        <UFormField :label="t('pharmacy.receivedAt')">
          <UInput
            v-model="form.receivedAt"
            type="date"
            size="sm"
            class="w-full"
          />
        </UFormField>
      </div>

      <div>
        <label class="block text-xs font-semibold text-muted mb-1">
          {{ t('pharmacy.addMedicine') }}
        </label>
        <PharmacyMedicineAutocomplete :warehouse-id="form.warehouseId" @select="addLine" />
      </div>

      <UAlert
        v-if="fieldErrors.lines"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :title="fieldErrors.lines"
      />

      <div v-if="lines.length" class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-xs uppercase text-muted border-b border-default">
            <tr>
              <th class="py-2 text-left">
                {{ t('pharmacy.medicine') }}
              </th>
              <th class="py-2 text-left w-32">
                {{ t('pharmacy.batchNo') }}
              </th>
              <th class="py-2 text-left w-36">
                {{ t('pharmacy.expiryDate') }}
              </th>
              <th class="py-2 text-right w-24">
                {{ t('pharmacy.qty') }}
              </th>
              <th class="py-2 text-right w-28">
                {{ t('pharmacy.unitCost') }}
              </th>
              <th class="py-2 text-right w-24">
                {{ t('pharmacy.lineTotal') }}
              </th>
              <th class="py-2 w-8" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="(line, index) in lines" :key="line.key" class="border-b border-default last:border-b-0 align-top">
              <td class="py-2 pe-2">
                <div class="font-medium">
                  {{ line.medicine?.nameEn || line.medicine?.nameKh }}
                </div>
                <div v-if="line.medicine?.strength" class="text-xs text-muted">
                  {{ line.medicine.strength }}
                </div>
                <div v-if="fieldErrors[`line-${index}`]" class="text-xs text-error mt-0.5">
                  {{ fieldErrors[`line-${index}`] }}
                </div>
              </td>

              <td class="py-2 pe-2">
                <UInput
                  v-model="line.batchNo"
                  size="sm"
                  class="w-full"
                  placeholder="LOT-001"
                />
              </td>

              <td class="py-2 pe-2">
                <UInput
                  v-model="line.expiryDate"
                  type="date"
                  size="sm"
                  class="w-full"
                />
                <PharmacyBatchExpiryAlert
                  v-if="line.expiryDate"
                  dense
                  class="mt-1"
                  :expiry-date="line.expiryDate"
                />
              </td>

              <td class="py-2 pe-2 text-right">
                <UInput
                  v-model.number="line.receivedQty"
                  type="number"
                  min="1"
                  size="sm"
                  class="w-20"
                />
              </td>

              <td class="py-2 pe-2 text-right">
                <UInput
                  v-model.number="line.unitCost"
                  type="number"
                  min="0"
                  step="0.01"
                  size="sm"
                  class="w-24"
                />
              </td>

              <td class="py-2 text-right tabular-nums">
                {{ ((Number(line.receivedQty) || 0) * (Number(line.unitCost) || 0)).toFixed(2) }}
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
          </tbody>
          <tfoot>
            <tr class="border-t border-default font-semibold">
              <td colspan="5" class="py-2 text-right">
                {{ t('pharmacy.total') }}
              </td>
              <td class="py-2 text-right tabular-nums">
                {{ totalCost.toFixed(2) }} {{ form.currency }}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <UAlert
        v-if="expiredLines.length"
        color="error"
        variant="subtle"
        icon="i-lucide-octagon-alert"
        :title="t('pharmacy.receivingExpired')"
        :description="t('pharmacy.receivingExpiredHint')"
      />

      <UAlert
        v-else-if="nearExpiryLines.length"
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        :title="t('pharmacy.receivingNearExpiry', { count: nearExpiryLines.length })"
        :description="t('pharmacy.receivingNearExpiryHint')"
      />
    </div>

    <template #footer>
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <p class="text-xs text-muted">
          {{ t('pharmacy.grnPostNote') }}
        </p>
        <UButton
          :label="t('pharmacy.saveAndPost')"
          icon="i-lucide-check"
          color="primary"
          :loading="isSubmitting"
          :disabled="!lines.length || isSubmitting"
          @click="submit"
        />
      </div>
    </template>
  </UCard>
</template>
