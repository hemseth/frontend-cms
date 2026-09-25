<script setup lang="ts">
/**
 * Nursing chart: vital signs (with the NEWS2 early-warning score the server computes),
 * fluid intake/output with the day's balance, and nursing notes. A small trend chart shows
 * temperature and pulse. Wrong entries are marked "entered in error", never deleted.
 */
import { computed, onMounted, reactive, ref } from 'vue'
import type { FluidBalance, IpdChartEntry } from '~/types/ipd'

const props = defineProps<{
  admissionId: string
  active: boolean
}>()

const { t } = useI18n()
const toast = useToast()
const auth = useAuth()
const ipd = useIpd(props.admissionId)

const entries = ref<IpdChartEntry[]>([])
const balance = ref<FluidBalance | null>(null)
const isLoading = ref(false)
const loadError = ref('')
const canRecord = computed(() => props.active && auth.can('admission', 'update'))

async function load() {
  isLoading.value = true
  loadError.value = ''
  try {
    const [list, fluid] = await Promise.all([ipd.listChart(), ipd.fluidBalance(localDay())])
    entries.value = list
    balance.value = fluid ?? null
  } catch (e) {
    loadError.value = getApiErrorMessage(e, t('ipd.loadFailed'))
  } finally {
    isLoading.value = false
  }
}

const observations = computed(() => entries.value.filter(e => e.entryType === 'OBSERVATION'))
const fluids = computed(() => entries.value.filter(e => e.entryType === 'FLUID'))
const notes = computed(() => entries.value.filter(e => e.entryType === 'NOTE'))

// ---- Trend (last 20 observations, oldest first) --------------------------------------------
const trend = computed(() => observations.value.filter(o => !o.enteredInError).slice(0, 20).reverse())
function polyline(values: Array<number | undefined>, min: number, max: number) {
  const pts = values.map((v, i) => (v === undefined ? null : `${(i / Math.max(1, values.length - 1)) * 300},${100 - ((v - min) / (max - min)) * 100}`))
  return pts.filter(Boolean).join(' ')
}
const tempLine = computed(() => polyline(trend.value.map(o => o.temperature), 34, 41))
const pulseLine = computed(() => polyline(trend.value.map(o => o.pulse), 40, 160))

// ---- Forms ------------------------------------------------------------------------------------
const obs = reactive<Record<string, string | boolean>>({ temperature: '', pulse: '', respiratoryRate: '', systolic: '', diastolic: '', spo2: '', onOxygen: false, consciousness: 'ALERT', painScore: '', bloodGlucose: '' })
const fluid = reactive({ direction: 'IN' as 'IN' | 'OUT', fluidCategory: 'ORAL', volumeMl: '', text: '' })
const note = reactive({ noteCategory: 'GENERAL', text: '' })
const isSaving = ref(false)

const IN_CATEGORIES = ['ORAL', 'IV', 'NG', 'BLOOD', 'OTHER_IN']
const OUT_CATEGORIES = ['URINE', 'VOMIT', 'STOOL', 'DRAIN', 'NG_ASPIRATE', 'BLOOD_LOSS', 'OTHER_OUT']
const fluidCategories = computed(() => (fluid.direction === 'IN' ? IN_CATEGORIES : OUT_CATEGORIES).map(c => ({ label: t(`ipd.chart.fluid.${c}`), value: c })))

async function submit(payload: Record<string, unknown>, reset: () => void) {
  isSaving.value = true
  try {
    await ipd.addChartEntry(payload)
    reset()
    toast.add({ title: t('ipd.chart.saved'), color: 'success' })
    await load()
  } catch (e) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(e, t('common.saveFailed')), color: 'error' })
  } finally {
    isSaving.value = false
  }
}

function saveObservation() {
  const numeric = ['temperature', 'pulse', 'respiratoryRate', 'systolic', 'diastolic', 'spo2', 'painScore', 'bloodGlucose']
  const payload: Record<string, unknown> = { entryType: 'OBSERVATION', onOxygen: !!obs.onOxygen, consciousness: obs.consciousness }
  for (const key of numeric) if (obs[key] !== '' && obs[key] !== undefined) payload[key] = Number(obs[key])
  submit(payload, () => {
    for (const key of numeric) obs[key] = ''
    obs.onOxygen = false
    obs.consciousness = 'ALERT'
  })
}
function saveFluid() {
  submit({ entryType: 'FLUID', direction: fluid.direction, fluidCategory: fluid.fluidCategory, volumeMl: Number(fluid.volumeMl), ...(fluid.text ? { text: fluid.text } : {}) }, () => {
    fluid.volumeMl = ''
    fluid.text = ''
  })
}
function saveNote() {
  submit({ entryType: 'NOTE', noteCategory: note.noteCategory, text: note.text }, () => {
    note.text = ''
  })
}
function setDirection(direction: 'IN' | 'OUT') {
  fluid.direction = direction
  fluid.fluidCategory = direction === 'IN' ? 'ORAL' : 'URINE'
}

async function markError(id: string) {
  const reason = window.prompt(t('ipd.enteredInErrorReason'))?.trim()
  if (!reason) return
  try {
    await ipd.markChartError(id, reason)
    await load()
  } catch (e) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(e, t('common.saveFailed')), color: 'error' })
  }
}

const riskColor = (risk?: string) => (risk === 'HIGH' ? 'error' : risk === 'MEDIUM' ? 'warning' : risk === 'LOW_MEDIUM' ? 'warning' : 'success')
const fmt = (value: string) => new Date(value).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })

onMounted(load)
defineExpose({ load })
</script>

<template>
  <div class="space-y-4 pt-3">
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

    <template v-else>
      <!-- Observations -->
      <UCard>
        <template #header>
          <h4 class="font-semibold text-sm">
            {{ t('ipd.chart.observations') }}
          </h4>
        </template>
        <div v-if="canRecord" class="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
          <UFormField :label="t('ipd.chart.temperature')">
            <UInput
              v-model="obs.temperature as string"
              type="number"
              step="0.1"
              size="sm"
            />
          </UFormField>
          <UFormField :label="t('ipd.chart.pulse')">
            <UInput v-model="obs.pulse as string" type="number" size="sm" />
          </UFormField>
          <UFormField :label="t('ipd.chart.respiratoryRate')">
            <UInput v-model="obs.respiratoryRate as string" type="number" size="sm" />
          </UFormField>
          <UFormField :label="t('ipd.chart.bp')">
            <div class="flex gap-1">
              <UInput
                v-model="obs.systolic as string"
                type="number"
                size="sm"
                placeholder="120"
              />
              <UInput
                v-model="obs.diastolic as string"
                type="number"
                size="sm"
                placeholder="80"
              />
            </div>
          </UFormField>
          <UFormField :label="t('ipd.chart.spo2')">
            <UInput v-model="obs.spo2 as string" type="number" size="sm" />
          </UFormField>
          <UFormField :label="t('ipd.chart.consciousness')">
            <USelect
              v-model="obs.consciousness as string"
              size="sm"
              :items="['ALERT', 'CONFUSION', 'VOICE', 'PAIN', 'UNRESPONSIVE'].map(c => ({ label: t(`ipd.chart.avpu.${c}`), value: c }))"
              value-key="value"
            />
          </UFormField>
          <UFormField :label="t('ipd.chart.painScore')">
            <UInput
              v-model="obs.painScore as string"
              type="number"
              min="0"
              max="10"
              size="sm"
            />
          </UFormField>
          <UFormField :label="t('ipd.chart.bloodGlucose')">
            <UInput
              v-model="obs.bloodGlucose as string"
              type="number"
              step="0.1"
              size="sm"
            />
          </UFormField>
          <UFormField :label="t('ipd.chart.onOxygen')">
            <UCheckbox v-model="obs.onOxygen as boolean" />
          </UFormField>
          <div class="flex items-end">
            <UButton
              :label="t('common.save')"
              icon="i-lucide-check"
              size="sm"
              :loading="isSaving"
              @click="saveObservation"
            />
          </div>
        </div>

        <svg
          v-if="trend.length > 1"
          viewBox="-5 -5 310 110"
          class="w-full h-28 mb-3"
          role="img"
          :aria-label="t('ipd.chart.trend')"
        >
          <polyline
            :points="tempLine"
            fill="none"
            stroke="currentColor"
            class="text-error"
            stroke-width="2"
          />
          <polyline
            :points="pulseLine"
            fill="none"
            stroke="currentColor"
            class="text-primary"
            stroke-width="2"
            stroke-dasharray="4 3"
          />
        </svg>
        <p v-if="trend.length > 1" class="text-xs text-muted mb-2">
          <span class="text-error">━</span> {{ t('ipd.chart.temperature') }} (34–41) · <span class="text-primary">╌</span> {{ t('ipd.chart.pulse') }} (40–160)
        </p>

        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead class="uppercase text-muted border-b border-default">
              <tr>
                <th class="py-1.5 text-left">
                  {{ t('ipd.chart.time') }}
                </th>
                <th class="py-1.5">
                  T
                </th>
                <th class="py-1.5">
                  P
                </th>
                <th class="py-1.5">
                  RR
                </th>
                <th class="py-1.5">
                  BP
                </th>
                <th class="py-1.5">
                  SpO2
                </th>
                <th class="py-1.5">
                  AVPU
                </th>
                <th class="py-1.5">
                  NEWS2
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="o in observations"
                :key="o._id"
                class="border-b border-default last:border-b-0 text-center"
                :class="o.enteredInError ? 'line-through text-muted' : ''"
              >
                <td class="py-1.5 text-left whitespace-nowrap">
                  {{ fmt(o.recordedAt) }}
                </td>
                <td>{{ o.temperature ?? '' }}</td>
                <td>{{ o.pulse ?? '' }}</td>
                <td>{{ o.respiratoryRate ?? '' }}</td>
                <td>{{ o.systolic ? `${o.systolic}/${o.diastolic ?? ''}` : '' }}</td>
                <td>{{ o.spo2 ?? '' }}{{ o.onOxygen ? ' O₂' : '' }}</td>
                <td>{{ o.consciousness ? o.consciousness[0] : '' }}</td>
                <td>
                  <UBadge
                    v-if="o.news2Score !== undefined"
                    :color="riskColor(o.news2Risk)"
                    variant="subtle"
                    size="sm"
                  >
                    {{ o.news2Score }}
                  </UBadge>
                </td>
                <td class="text-right">
                  <UButton
                    v-if="canRecord && !o.enteredInError"
                    icon="i-lucide-eraser"
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    :aria-label="t('ipd.enteredInError')"
                    @click="markError(o._id)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
          <p v-if="observations.some(o => o.news2Risk === 'HIGH' || o.news2Risk === 'MEDIUM')" class="mt-2 text-xs text-error font-semibold">
            {{ t('ipd.chart.news2Escalate') }}
          </p>
        </div>
      </UCard>

      <!-- Fluid -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <h4 class="font-semibold text-sm">
              {{ t('ipd.chart.fluidTitle') }}
            </h4>
            <span v-if="balance" class="text-xs tabular-nums">
              {{ t('ipd.chart.today') }}: {{ t('ipd.chart.in') }} {{ balance.totalIn }} ml · {{ t('ipd.chart.out') }} {{ balance.totalOut }} ml ·
              <b :class="balance.balance < 0 ? 'text-warning' : ''">{{ t('ipd.chart.balance') }} {{ balance.balance }} ml</b>
            </span>
          </div>
        </template>
        <div v-if="canRecord" class="flex items-end gap-2 flex-wrap mb-3">
          <UFieldGroup size="sm">
            <UButton :label="t('ipd.chart.in')" :variant="fluid.direction === 'IN' ? 'solid' : 'outline'" @click="setDirection('IN')" />
            <UButton :label="t('ipd.chart.out')" :variant="fluid.direction === 'OUT' ? 'solid' : 'outline'" @click="setDirection('OUT')" />
          </UFieldGroup>
          <USelect
            v-model="fluid.fluidCategory"
            :items="fluidCategories"
            value-key="value"
            size="sm"
            class="w-40"
          />
          <UInput
            v-model="fluid.volumeMl"
            type="number"
            min="1"
            size="sm"
            class="w-28"
            placeholder="ml"
          />
          <UInput
            v-model="fluid.text"
            size="sm"
            class="w-48"
            :placeholder="t('ipd.mar.note')"
          />
          <UButton
            :label="t('common.save')"
            icon="i-lucide-check"
            size="sm"
            :loading="isSaving"
            :disabled="!(Number(fluid.volumeMl) > 0)"
            @click="saveFluid"
          />
        </div>
        <ul class="text-xs space-y-1">
          <li
            v-for="f in fluids.slice(0, 30)"
            :key="f._id"
            class="flex items-center justify-between gap-2"
            :class="f.enteredInError ? 'line-through text-muted' : ''"
          >
            <span>{{ fmt(f.recordedAt) }} · {{ f.direction === 'IN' ? t('ipd.chart.in') : t('ipd.chart.out') }} · {{ t(`ipd.chart.fluid.${f.fluidCategory}`) }} · <b>{{ f.volumeMl }} ml</b> {{ f.text }}</span>
            <UButton
              v-if="canRecord && !f.enteredInError"
              icon="i-lucide-eraser"
              size="xs"
              color="neutral"
              variant="ghost"
              :aria-label="t('ipd.enteredInError')"
              @click="markError(f._id)"
            />
          </li>
        </ul>
      </UCard>

      <!-- Notes -->
      <UCard>
        <template #header>
          <h4 class="font-semibold text-sm">
            {{ t('ipd.chart.notesTitle') }}
          </h4>
        </template>
        <div v-if="canRecord" class="space-y-2 mb-3">
          <USelect
            v-model="note.noteCategory"
            size="sm"
            class="w-48"
            :items="['GENERAL', 'HANDOVER', 'CARE_PLAN', 'INCIDENT', 'WOUND'].map(c => ({ label: t(`ipd.chart.noteCategory.${c}`), value: c }))"
            value-key="value"
          />
          <UTextarea
            v-model="note.text"
            :rows="3"
            autoresize
            class="w-full"
            :maxlength="4000"
          />
          <UButton
            :label="t('common.save')"
            icon="i-lucide-check"
            size="sm"
            :loading="isSaving"
            :disabled="!note.text.trim()"
            @click="saveNote"
          />
        </div>
        <div class="space-y-2">
          <div
            v-for="n in notes"
            :key="n._id"
            class="text-xs p-2 rounded-md bg-muted/60"
            :class="n.enteredInError ? 'line-through text-muted' : ''"
          >
            <div class="flex justify-between gap-2">
              <span class="font-semibold">{{ fmt(n.recordedAt) }} · {{ t(`ipd.chart.noteCategory.${n.noteCategory || 'GENERAL'}`) }}</span>
              <UButton
                v-if="canRecord && !n.enteredInError"
                icon="i-lucide-eraser"
                size="xs"
                color="neutral"
                variant="ghost"
                :aria-label="t('ipd.enteredInError')"
                @click="markError(n._id)"
              />
            </div>
            <p class="whitespace-pre-line mt-1">
              {{ n.text }}
            </p>
          </div>
        </div>
      </UCard>
    </template>
  </div>
</template>
