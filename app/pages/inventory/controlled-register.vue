<script setup lang="ts">
/**
 * Controlled-drug register (GET /controlled-drugs/register).
 *
 * For every medicine flagged "controlled": opening balance, each movement in the period
 * with a running balance, who did it, which batch, which document and patient, the
 * closing balance and whether it agrees with stock on hand. Read-only; printable.
 */
import { computed, onMounted, ref } from 'vue'
import type { ControlledRegisterMedicine } from '~/types/pharmacy'

const { t, te } = useI18n()

const today = new Date()
const toInput = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const from = ref(toInput(new Date(today.getFullYear(), today.getMonth(), 1)))
const to = ref(toInput(today))

const medicines = ref<ControlledRegisterMedicine[]>([])
const isLoading = ref(false)
const loadError = ref('')

/** The server may run in another timezone, so the local day boundaries are sent as instants. */
function boundary(value: string, endOfDay: boolean) {
  const [y, m, d] = value.split('-').map(Number)
  const date = endOfDay ? new Date(y!, m! - 1, d!, 23, 59, 59, 999) : new Date(y!, m! - 1, d!, 0, 0, 0, 0)
  return date.toISOString()
}

async function load() {
  if (!from.value || !to.value) return
  isLoading.value = true
  loadError.value = ''
  try {
    const res: { data?: { medicines?: ControlledRegisterMedicine[] } } = await $api('/controlled-drugs/register', {
      params: { from: boundary(from.value, false), to: boundary(to.value, true) }
    })
    medicines.value = res?.data?.medicines ?? []
  } catch (e) {
    loadError.value = getApiErrorMessage(e, t('pharmacy.register.loadFailed'))
    medicines.value = []
  } finally {
    isLoading.value = false
  }
}

const hasMismatch = computed(() => medicines.value.some(m => m.reconciled === false))
const formatDateTime = (value: string) => new Date(value).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })
const movementLabel = (type: string) => (te(`pharmacy.register.movement.${type}`) ? t(`pharmacy.register.movement.${type}`) : type)

function printPage() {
  window.print()
}

onMounted(load)
</script>

<template>
  <div class="p-4 space-y-4">
    <div class="flex items-center justify-between gap-3 flex-wrap">
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-lock" class="w-6 h-6 text-primary" />
        <h1 class="text-xl font-bold">
          {{ t('pharmacy.register.title') }}
        </h1>
      </div>
      <div class="flex items-end gap-2 flex-wrap no-print">
        <UFormField :label="t('pharmacy.register.from')">
          <UInput v-model="from" type="date" size="sm" />
        </UFormField>
        <UFormField :label="t('pharmacy.register.to')">
          <UInput v-model="to" type="date" size="sm" />
        </UFormField>
        <UButton
          :label="t('pharmacy.register.show')"
          icon="i-lucide-search"
          size="sm"
          :loading="isLoading"
          @click="load"
        />
        <UButton
          :label="t('pharmacy.register.print')"
          icon="i-lucide-printer"
          size="sm"
          color="neutral"
          variant="outline"
          :disabled="!medicines.length"
          @click="printPage"
        />
      </div>
    </div>

    <p class="text-sm text-muted">
      {{ t('pharmacy.register.intro') }}
    </p>

    <div v-if="isLoading" class="space-y-2">
      <USkeleton v-for="i in 3" :key="i" class="h-16 w-full" />
    </div>
    <UAlert
      v-else-if="loadError"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="loadError"
    />
    <UAlert
      v-else-if="!medicines.length"
      color="neutral"
      variant="subtle"
      icon="i-lucide-info"
      :title="t('pharmacy.register.empty')"
      :description="t('pharmacy.register.emptyHint')"
    />

    <template v-else>
      <UAlert
        v-if="hasMismatch"
        color="error"
        variant="subtle"
        icon="i-lucide-octagon-alert"
        :title="t('pharmacy.register.mismatchTitle')"
        :description="t('pharmacy.register.mismatchHint')"
      />

      <UCard v-for="row in medicines" :key="row.medicine._id" class="register-card">
        <template #header>
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <div class="font-semibold">
                {{ row.medicine.nameEn || row.medicine.nameKh }} <span class="text-muted">{{ row.medicine.strength }}</span>
              </div>
              <div class="text-xs text-muted">
                {{ row.medicine.code }} · {{ row.medicine.baseUnit }}
              </div>
            </div>
            <div class="flex gap-4 text-sm tabular-nums">
              <span>{{ t('pharmacy.register.opening') }}: <strong>{{ row.openingBalance }}</strong></span>
              <span>{{ t('pharmacy.register.in') }}: <strong>{{ row.totalIn }}</strong></span>
              <span>{{ t('pharmacy.register.out') }}: <strong>{{ row.totalOut }}</strong></span>
              <span>{{ t('pharmacy.register.closing') }}: <strong>{{ row.closingBalance }}</strong></span>
              <UBadge
                v-if="row.reconciled === true"
                color="success"
                variant="subtle"
                size="sm"
              >
                {{ t('pharmacy.register.reconciled') }}
              </UBadge>
              <UBadge
                v-else-if="row.reconciled === false"
                color="error"
                variant="subtle"
                size="sm"
              >
                {{ t('pharmacy.register.onHand', { qty: row.stockOnHand }) }}
              </UBadge>
            </div>
          </div>
        </template>

        <p v-if="!row.entries.length" class="text-sm text-muted">
          {{ t('pharmacy.register.noMovements') }}
        </p>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="text-xs uppercase text-muted border-b border-default">
              <tr>
                <th class="py-2 text-left">
                  {{ t('pharmacy.register.date') }}
                </th>
                <th class="py-2 text-left">
                  {{ t('pharmacy.register.type') }}
                </th>
                <th class="py-2 text-left">
                  {{ t('pharmacy.register.document') }}
                </th>
                <th class="py-2 text-left">
                  {{ t('pharmacy.register.patient') }}
                </th>
                <th class="py-2 text-left">
                  {{ t('pharmacy.register.batch') }}
                </th>
                <th class="py-2 text-right">
                  {{ t('pharmacy.register.in') }}
                </th>
                <th class="py-2 text-right">
                  {{ t('pharmacy.register.out') }}
                </th>
                <th class="py-2 text-right">
                  {{ t('pharmacy.register.balance') }}
                </th>
                <th class="py-2 text-left">
                  {{ t('pharmacy.register.by') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(entry, index) in row.entries" :key="index" class="border-b border-default last:border-b-0">
                <td class="py-1.5 whitespace-nowrap">
                  {{ formatDateTime(entry.occurredAt) }}
                </td>
                <td class="py-1.5">
                  {{ movementLabel(entry.movementType) }}
                  <span v-if="entry.stockStatus && entry.stockStatus !== 'AVAILABLE'" class="text-xs text-muted">({{ entry.stockStatus }})</span>
                </td>
                <td class="py-1.5">
                  {{ entry.referenceNo || entry.referenceType }}
                </td>
                <td class="py-1.5">
                  {{ entry.patientName || '-' }}
                </td>
                <td class="py-1.5">
                  {{ entry.batchNo || '-' }}
                </td>
                <td class="py-1.5 text-right tabular-nums">
                  {{ entry.qtyIn || '' }}
                </td>
                <td class="py-1.5 text-right tabular-nums">
                  {{ entry.qtyOut || '' }}
                </td>
                <td class="py-1.5 text-right tabular-nums font-semibold">
                  {{ entry.balance }}
                </td>
                <td class="py-1.5">
                  {{ entry.by || '-' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>
    </template>
  </div>
</template>

<style scoped>
@media print {
  .no-print { display: none !important; }
  .register-card { break-inside: avoid; }
}
</style>
