<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { isOpenEnded, type StoredTaxBracket, type StoredTaxSettings } from '~/composables/hr/usePayrollRules'

interface BracketRow {
  min: number
  /** Empty means no upper limit. */
  max: number | null
  rate: number
  description: string
}

const { t } = useI18n()
const toast = useToast()
const auth = useAuth()

const canEdit = computed(() => auth.can('settings', 'update'))
const canReset = computed(() => auth.can('settings', 'approve'))

const currency = ref('KHR')
const period = ref<'monthly' | 'annual'>('annual')
const rows = ref<BracketRow[]>([])
const isLoading = ref(true)
const isSaving = ref(false)
const loadError = ref('')

const periodOptions = computed(() => [
  { label: t('settings.taxSettings.monthly'), value: 'monthly' },
  { label: t('settings.taxSettings.annual'), value: 'annual' }
])
const currencyOptions = [{ label: 'KHR', value: 'KHR' }, { label: 'USD', value: 'USD' }]

function fromStored(settings: StoredTaxSettings | null) {
  currency.value = settings?.currency || 'KHR'
  period.value = settings?.period || 'annual'
  rows.value = [...(settings?.brackets ?? [])]
    .sort((a, b) => a.min - b.min)
    .map((b: StoredTaxBracket) => ({ min: b.min, max: isOpenEnded(b) ? null : b.max, rate: b.rate, description: b.description || '' }))
}

async function load() {
  isLoading.value = true
  loadError.value = ''
  try {
    const res: { data?: StoredTaxSettings } = await $api('/tax-settings')
    fromStored(res?.data ?? null)
  } catch (err) {
    loadError.value = getApiErrorMessage(err, t('settings.taxSettings.loadFailed'))
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

// Each bracket starts where the previous one ends, so only the upper limits are edited.
function syncMins() {
  rows.value.forEach((row, index) => {
    row.min = index === 0 ? 0 : Number(rows.value[index - 1]!.max ?? row.min)
  })
}

function addBracket() {
  const last = rows.value[rows.value.length - 1]
  if (last && last.max == null) last.max = last.min
  rows.value.push({ min: last?.max ?? 0, max: null, rate: 0, description: '' })
  syncMins()
}

function removeBracket(index: number) {
  rows.value.splice(index, 1)
  if (rows.value.length) rows.value[rows.value.length - 1]!.max = null
  syncMins()
}

const validationError = computed(() => {
  if (!rows.value.length) return t('settings.taxSettings.needOneBracket')
  for (const [index, row] of rows.value.entries()) {
    const isLast = index === rows.value.length - 1
    if (row.rate < 0 || row.rate > 100) return t('settings.taxSettings.rateRange')
    if (!isLast && (row.max == null || Number(row.max) <= row.min)) return t('settings.taxSettings.maxAboveMin', { n: index + 1 })
  }
  return ''
})

async function save() {
  if (validationError.value) return
  isSaving.value = true
  try {
    const brackets = rows.value.map((row, index) => ({
      min: Number(row.min),
      // The API needs a number; 0 on the top bracket is stored as "no upper limit".
      max: index === rows.value.length - 1 || row.max == null ? 0 : Number(row.max),
      rate: Number(row.rate),
      description: row.description || `${row.rate}%`
    }))
    const res: { data?: StoredTaxSettings } = await $api('/tax-settings', {
      method: 'PUT',
      body: { currency: currency.value, period: period.value, brackets }
    })
    fromStored(res?.data ?? null)
    toast.add({ title: t('common.saved'), color: 'success' })
  } catch (err) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(err, t('common.saveFailed')), color: 'error' })
  } finally {
    isSaving.value = false
  }
}

async function resetDefaults() {
  if (!window.confirm(t('settings.taxSettings.resetConfirm'))) return
  try {
    const res: { data?: StoredTaxSettings } = await $api('/tax-settings/reset', { method: 'POST' })
    fromStored(res?.data ?? null)
    toast.add({ title: t('settings.taxSettings.resetDone'), color: 'success' })
  } catch (err) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(err, t('common.saveFailed')), color: 'error' })
  }
}
</script>

<template>
  <div class="p-4 space-y-4 max-w-4xl">
    <div>
      <h1 class="text-xl font-bold flex items-center gap-2">
        <UIcon name="i-lucide-percent" class="w-6 h-6 text-primary" />
        {{ t('nav.taxSettings') }}
      </h1>
      <p class="text-sm text-muted mt-1">
        {{ t('settings.taxSettings.subtitle') }}
      </p>
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

    <UCard v-else>
      <div class="grid grid-cols-2 gap-3 max-w-md">
        <UFormField :label="t('settings.taxSettings.currency')">
          <USelect
            v-model="currency"
            :items="currencyOptions"
            :disabled="!canEdit"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="t('settings.taxSettings.period')" :help="t('settings.taxSettings.periodHelp')">
          <USelect
            v-model="period"
            :items="periodOptions"
            :disabled="!canEdit"
            class="w-full"
          />
        </UFormField>
      </div>

      <table class="w-full text-sm mt-4">
        <thead>
          <tr class="text-left text-muted border-b border-default">
            <th class="py-2 pr-2">
              {{ t('settings.taxSettings.from') }}
            </th>
            <th class="py-2 pr-2">
              {{ t('settings.taxSettings.upTo') }}
            </th>
            <th class="py-2 pr-2">
              {{ t('settings.taxSettings.rate') }}
            </th>
            <th class="py-2 pr-2">
              {{ t('common.description') }}
            </th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, index) in rows" :key="index" class="border-b border-default">
            <td class="py-2 pr-2 tabular-nums">
              {{ row.min.toLocaleString() }}
            </td>
            <td class="py-2 pr-2">
              <span v-if="index === rows.length - 1" class="text-muted">{{ t('settings.taxSettings.noLimit') }}</span>
              <UInput
                v-else
                v-model.number="row.max"
                type="number"
                min="0"
                :disabled="!canEdit"
                @change="syncMins"
              />
            </td>
            <td class="py-2 pr-2">
              <UInput
                v-model.number="row.rate"
                type="number"
                min="0"
                max="100"
                step="0.5"
                :disabled="!canEdit"
              >
                <template #trailing>
                  %
                </template>
              </UInput>
            </td>
            <td class="py-2 pr-2">
              <UInput v-model="row.description" :disabled="!canEdit" />
            </td>
            <td class="py-2 text-right">
              <UButton
                v-if="canEdit && rows.length > 1"
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                size="xs"
                :aria-label="t('common.remove')"
                @click="removeBracket(index)"
              />
            </td>
          </tr>
        </tbody>
      </table>

      <p v-if="validationError" class="text-sm text-error mt-3">
        {{ validationError }}
      </p>

      <template #footer>
        <div class="flex flex-wrap justify-between gap-2">
          <UButton
            v-if="canEdit"
            :label="t('settings.taxSettings.addBracket')"
            icon="i-lucide-plus"
            variant="soft"
            @click="addBracket"
          />
          <div class="flex gap-2 ml-auto">
            <UButton
              v-if="canReset"
              :label="t('settings.taxSettings.reset')"
              color="neutral"
              variant="outline"
              @click="resetDefaults"
            />
            <UButton
              v-if="canEdit"
              :label="t('common.save')"
              icon="i-lucide-save"
              :loading="isSaving"
              :disabled="Boolean(validationError)"
              @click="save"
            />
          </div>
        </div>
      </template>
    </UCard>
  </div>
</template>
