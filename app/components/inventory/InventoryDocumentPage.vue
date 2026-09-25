<script setup lang="ts">
/**
 * List + create + workflow actions for one kind of inventory document (transfer, adjustment,
 * return, recall). Every stock change happens server-side in the posting endpoints; this page
 * only creates drafts and calls the workflow actions the backend exposes for each status.
 */
import { ref, computed, onMounted } from 'vue'
import type { BatchSummary, MedicineSuggestion, WarehouseRef } from '~/types/pharmacy'
import type { DocumentConfig, WorkflowAction } from '~/types/inventoryDocs'
import MedicineAutocomplete from '~/components/pharmacy/MedicineAutocomplete.vue'

type Permission = DocumentConfig['actions'][string][number]['permission']

interface Line {
  medicine: MedicineSuggestion | null
  batchId: string
  qty: number | null
  batches: BatchSummary[]
}

interface InventoryDoc {
  _id: string
  status: string
  createdAt?: string
  [key: string]: unknown
}

const props = defineProps<{ config: DocumentConfig }>()

const { t } = useI18n()
const toast = useToast()
const auth = useAuth()
const { fetchWarehouses, fetchBatches } = useStock()

const docs = ref<InventoryDoc[]>([])
const warehouses = ref<WarehouseRef[]>([])
// Select items may not have an empty value, so "all" / "any" have their own values.
const ALL_STATUSES = 'ALL'
const ANY_BATCH = '__any__'
const statusFilter = ref(ALL_STATUSES)
const isLoading = ref(true)
const loadError = ref('')
const busyId = ref('')

const can = (permission: Permission) => auth.can(props.config.resource, permission)
const warehouseName = (id: unknown) => {
  const wh = warehouses.value.find(w => w._id === String(id))
  return wh ? `${wh.code ? `${wh.code} • ` : ''}${wh.nameKh || wh.nameEn || ''}` : ''
}
const warehouseOptions = computed(() => warehouses.value.map(w => ({ label: warehouseName(w._id), value: w._id })))
const statusOptions = computed(() => [
  { label: t('pharmacy.docs.allStatuses'), value: ALL_STATUSES },
  ...Object.keys(props.config.actions).concat(['COMPLETED', 'RECEIVED', 'POSTED', 'RETURNED', 'CANCELLED', 'REJECTED'])
    .filter((value, index, all) => all.indexOf(value) === index)
    .map(value => ({ label: value, value }))
])

async function load() {
  isLoading.value = true
  loadError.value = ''
  try {
    const [list, wh]: [{ data?: InventoryDoc[] }, WarehouseRef[]] = await Promise.all([
      $api(props.config.endpoint, { params: statusFilter.value && statusFilter.value !== ALL_STATUSES ? { status: statusFilter.value } : {} }),
      warehouses.value.length ? Promise.resolve(warehouses.value) : fetchWarehouses()
    ])
    docs.value = list?.data ?? []
    warehouses.value = wh
  } catch (err) {
    loadError.value = getApiErrorMessage(err, t('pharmacy.docs.loadFailed'))
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

async function runAction(doc: InventoryDoc, action: WorkflowAction) {
  if (action.confirmKey && !window.confirm(t(action.confirmKey))) return
  busyId.value = doc._id
  try {
    await $api(`${props.config.endpoint}/${doc._id}/${action.action}`, { method: 'POST' })
    toast.add({ title: t('pharmacy.docs.actionDone'), color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(err, t('pharmacy.docs.actionFailed')), color: 'error' })
  } finally {
    busyId.value = ''
  }
}

function describeHeader(doc: InventoryDoc) {
  return props.config.headerFields
    .filter(field => field.type === 'warehouse' && doc[field.key])
    .map(field => warehouseName(doc[field.key]))
    .filter(Boolean)
    .join(' → ')
}

const lineCount = (doc: InventoryDoc) => (doc[props.config.linesKey] as unknown[] | undefined)?.length ?? 0

// ---- Create -------------------------------------------------------------

const isCreateOpen = ref(false)
const isSaving = ref(false)
const header = ref<Record<string, string>>({})
const headerMedicine = ref<MedicineSuggestion | null>(null)
const headerBatches = ref<BatchSummary[]>([])
const lines = ref<Line[]>([])

const emptyLine = (): Line => ({ medicine: null, batchId: '', qty: null, batches: [] })

function openCreate() {
  header.value = Object.fromEntries(props.config.headerFields.map(field => [field.key, field.default ?? '']))
  headerMedicine.value = null
  headerBatches.value = []
  lines.value = props.config.lineMode === 'batchOnly' ? [] : [emptyLine()]
  isCreateOpen.value = true
}

const batchWarehouse = computed(() => (props.config.batchWarehouseKey ? header.value[props.config.batchWarehouseKey] : '') || undefined)

async function loadBatchesFor(medicineId: string): Promise<BatchSummary[]> {
  try {
    return await fetchBatches(medicineId, { warehouseId: batchWarehouse.value, limit: 100 })
  } catch (err) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(err, t('pharmacy.docs.batchesFailed')), color: 'error' })
    return []
  }
}

async function onLineMedicine(line: Line, medicine: MedicineSuggestion | null) {
  line.medicine = medicine
  line.batchId = ''
  line.batches = medicine ? await loadBatchesFor(medicine._id) : []
}

async function onHeaderMedicine(medicine: MedicineSuggestion | null) {
  headerMedicine.value = medicine
  header.value.medicineId = medicine?._id ?? ''
  lines.value = []
  headerBatches.value = medicine ? await loadBatchesFor(medicine._id) : []
}

function toggleRecallBatch(batch: BatchSummary) {
  const index = lines.value.findIndex(line => line.batchId === batch._id)
  if (index >= 0) lines.value.splice(index, 1)
  else lines.value.push({ medicine: headerMedicine.value, batchId: batch._id, qty: batch.qtyBase ?? null, batches: [] })
}

const batchLabel = (batch: BatchSummary) =>
  [batch.batchNo || batch._id, batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : '', batch.qtyBase != null ? `${t('pharmacy.docs.onHand')} ${batch.qtyBase}` : '']
    .filter(Boolean)
    .join(' • ')

const createError = computed(() => {
  for (const field of props.config.headerFields) {
    if (field.required && !header.value[field.key]) return t('pharmacy.docs.fillRequired', { field: t(field.labelKey) })
  }
  if (!lines.value.length) return t('pharmacy.docs.needOneLine')
  if (props.config.lineMode === 'batchOnly') return ''
  for (const [index, line] of lines.value.entries()) {
    const n = index + 1
    if (!line.medicine) return t('pharmacy.docs.lineMedicine', { n })
    if (props.config.batchRequired && (!line.batchId || line.batchId === ANY_BATCH)) return t('pharmacy.docs.lineBatch', { n })
    const qty = Number(line.qty)
    if (!qty || (!props.config.allowNegativeQty && qty < 0)) return t('pharmacy.docs.lineQty', { n })
  }
  return ''
})

function buildBody() {
  const body: Record<string, unknown> = {}
  for (const field of props.config.headerFields) {
    if (header.value[field.key]) body[field.key] = header.value[field.key]
  }
  if (props.config.lineMode === 'batchOnly') {
    body[props.config.linesKey] = lines.value.map((line) => {
      const batch = headerBatches.value.find(b => b._id === line.batchId)
      return { batchId: line.batchId, batchNo: batch?.batchNo, quantity: batch?.qtyBase }
    })
  } else {
    const qtyKey = props.config.qtyKey ?? 'qtyBase'
    body[props.config.linesKey] = lines.value.map(line => ({
      medicineId: line.medicine!._id,
      ...(line.batchId && line.batchId !== ANY_BATCH ? { batchId: line.batchId } : {}),
      [qtyKey]: Number(line.qty)
    }))
  }
  return body
}

async function create() {
  if (createError.value) return
  isSaving.value = true
  try {
    await $api(props.config.endpoint, { method: 'POST', body: buildBody() })
    toast.add({ title: t('common.saved'), color: 'success' })
    isCreateOpen.value = false
    await load()
  } catch (err) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(err, t('common.saveFailed')), color: 'error' })
  } finally {
    isSaving.value = false
  }
}

function statusColor(status: string) {
  if (['COMPLETED', 'RECEIVED', 'POSTED', 'RETURNED'].includes(status)) return 'success'
  if (['CANCELLED', 'REJECTED'].includes(status)) return 'neutral'
  if (['APPROVED', 'ACTIVE', 'IN_TRANSIT', 'PARTIALLY_RECEIVED'].includes(status)) return 'warning'
  return 'primary'
}
</script>

<template>
  <div class="p-4 space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-xl font-bold">
        {{ t(config.titleKey) }}
      </h1>
      <div class="flex items-center gap-2">
        <USelect
          v-model="statusFilter"
          :items="statusOptions"
          class="w-48"
          @update:model-value="load"
        />
        <UButton
          v-if="can('create')"
          :label="t('pharmacy.docs.new')"
          icon="i-lucide-plus"
          @click="openCreate"
        />
      </div>
    </div>

    <div v-if="isLoading" class="py-12 text-center">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto text-primary-500" />
    </div>

    <UAlert
      v-else-if="loadError"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="loadError"
      :actions="[{ label: t('common.refresh'), onClick: load }]"
    />

    <p v-else-if="docs.length === 0" class="py-12 text-center text-sm text-muted">
      {{ t('pharmacy.docs.none') }}
    </p>

    <UCard v-else :ui="{ body: 'p-0 sm:p-0' }">
      <table class="w-full text-sm">
        <thead class="bg-muted text-left text-muted">
          <tr>
            <th class="p-3">
              {{ t('pharmacy.docs.number') }}
            </th>
            <th class="p-3">
              {{ t('common.date') }}
            </th>
            <th class="p-3">
              {{ t('pharmacy.docs.details') }}
            </th>
            <th class="p-3">
              {{ t('pharmacy.docs.lines') }}
            </th>
            <th class="p-3">
              {{ t('common.status') }}
            </th>
            <th class="p-3 text-right">
              {{ t('common.actions') }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-default">
          <tr v-for="doc in docs" :key="doc._id">
            <td class="p-3 font-medium">
              {{ doc[config.numberField] || doc._id.slice(-6) }}
            </td>
            <td class="p-3 text-toned">
              {{ doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : '-' }}
            </td>
            <td class="p-3 text-toned">
              {{ describeHeader(doc) || doc.reason || doc.reasonCode || '-' }}
            </td>
            <td class="p-3">
              {{ lineCount(doc) }}
            </td>
            <td class="p-3">
              <UBadge :color="statusColor(doc.status)" variant="subtle">
                {{ doc.status }}
              </UBadge>
            </td>
            <td class="p-3">
              <div class="flex justify-end gap-1">
                <template v-for="action in config.actions[doc.status] || []" :key="action.action">
                  <UButton
                    v-if="can(action.permission)"
                    :label="t(action.labelKey)"
                    :color="action.color || 'primary'"
                    variant="soft"
                    size="xs"
                    :loading="busyId === doc._id"
                    @click="runAction(doc, action)"
                  />
                </template>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </UCard>

    <UModal v-model:open="isCreateOpen" :title="t('pharmacy.docs.new')" :ui="{ content: 'sm:max-w-3xl' }">
      <template #body>
        <div class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <UFormField
              v-for="field in config.headerFields"
              :key="field.key"
              :label="t(field.labelKey)"
              :required="field.required"
              :class="field.type === 'medicine' || field.type === 'text' ? 'sm:col-span-2' : ''"
            >
              <USelect
                v-if="field.type === 'warehouse'"
                v-model="header[field.key]"
                :items="warehouseOptions"
                class="w-full"
              />
              <USelect
                v-else-if="field.type === 'select'"
                v-model="header[field.key]"
                :items="(field.options || []).map(value => ({ label: field.optionPrefix ? t(`${field.optionPrefix}.${value}`) : value, value }))"
                class="w-full"
              />
              <MedicineAutocomplete
                v-else-if="field.type === 'medicine'"
                :model-value="headerMedicine"
                @update:model-value="onHeaderMedicine"
              />
              <UInput v-else v-model="header[field.key]" class="w-full" />
            </UFormField>
          </div>

          <!-- Recall: tick the affected batches of the chosen medicine. -->
          <div v-if="config.lineMode === 'batchOnly'" class="space-y-2">
            <p class="text-sm font-medium">
              {{ t('pharmacy.docs.batches') }}
            </p>
            <p v-if="!headerMedicine" class="text-sm text-muted">
              {{ t('pharmacy.docs.pickMedicineFirst') }}
            </p>
            <p v-else-if="headerBatches.length === 0" class="text-sm text-muted">
              {{ t('pharmacy.docs.noBatches') }}
            </p>
            <UCheckbox
              v-for="batch in headerBatches"
              :key="batch._id"
              :model-value="lines.some(line => line.batchId === batch._id)"
              :label="batchLabel(batch)"
              @update:model-value="toggleRecallBatch(batch)"
            />
          </div>

          <!-- Medicine lines -->
          <div v-else class="space-y-2">
            <p class="text-sm font-medium">
              {{ t('pharmacy.docs.lines') }}
            </p>
            <div
              v-for="(line, index) in lines"
              :key="index"
              class="grid grid-cols-1 sm:grid-cols-12 gap-2 items-start"
            >
              <div class="sm:col-span-5">
                <MedicineAutocomplete
                  :model-value="line.medicine"
                  :warehouse-id="batchWarehouse"
                  @update:model-value="(m: MedicineSuggestion | null) => onLineMedicine(line, m)"
                />
              </div>
              <USelect
                v-model="line.batchId"
                class="sm:col-span-4"
                :items="[
                  ...(config.batchRequired ? [] : [{ label: t('pharmacy.docs.anyBatch'), value: ANY_BATCH }]),
                  ...line.batches.map(batch => ({ label: batchLabel(batch), value: batch._id }))
                ]"
                :placeholder="t('pharmacy.docs.batch')"
                :disabled="!line.medicine"
              />
              <UInput
                v-model.number="line.qty"
                class="sm:col-span-2"
                type="number"
                :placeholder="t('pharmacy.docs.qtyBase')"
              />
              <UButton
                class="sm:col-span-1"
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                :disabled="lines.length === 1"
                :aria-label="t('common.remove')"
                @click="lines.splice(index, 1)"
              />
            </div>
            <p v-if="config.allowNegativeQty" class="text-xs text-muted">
              {{ t('pharmacy.docs.signedQtyHint') }}
            </p>
            <UButton
              :label="t('pharmacy.docs.addLine')"
              icon="i-lucide-plus"
              variant="soft"
              size="sm"
              @click="lines.push(emptyLine())"
            />
          </div>

          <p v-if="createError" class="text-sm text-error">
            {{ createError }}
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            :label="t('common.cancel')"
            color="neutral"
            variant="ghost"
            @click="isCreateOpen = false"
          />
          <UButton
            :label="t('common.save')"
            icon="i-lucide-save"
            :loading="isSaving"
            :disabled="Boolean(createError)"
            @click="create"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
