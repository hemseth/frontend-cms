<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { $api } from '~/utils/api'

const props = defineProps<{
  patientId?: string
  drugName?: string
  patientAllergies?: string[]
}>()

const emit = defineEmits<{
  (e: 'statusChange', payload: {
    verdict: 'SAFE' | 'REVIEW' | 'CONTRAINDICATED' | 'IDLE'
    probability: number
    isBlocked: boolean
  }): void
}>()

const loading = ref(false)
const checkResult = ref<{
  probability: number
  verdict: 'SAFE' | 'REVIEW' | 'CONTRAINDICATED'
  explanation: string
  appliedAi: boolean
} | null>(null)

let debounceTimer: any = null

const performCheck = async () => {
  if (!props.patientId || !props.drugName || props.drugName.trim().length < 2) {
    checkResult.value = null
    emit('statusChange', { verdict: 'IDLE', probability: 0, isBlocked: false })
    return
  }

  loading.value = true
  try {
    const res: any = await $api('/maternity/mar/orders/check-allergy', {
      method: 'POST',
      body: {
        patientId: props.patientId,
        drugName: props.drugName.trim(),
      },
    })

    if (res?.data) {
      checkResult.value = res.data
      emit('statusChange', {
        verdict: res.data.verdict,
        probability: res.data.probability,
        isBlocked: res.data.verdict === 'CONTRAINDICATED',
      })
    }
  } catch (err) {
    console.warn('Pre-flight allergy check error:', err)
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.patientId, props.drugName],
  () => {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(performCheck, 350)
  },
  { deep: true }
)

onMounted(() => {
  if (props.patientId && props.drugName) {
    performCheck()
  }
})
</script>

<template>
  <div class="mt-2 space-y-1.5 transition-all duration-200">
    <!-- Active Loading State -->
    <div
      v-if="loading"
      class="flex items-center gap-2 p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-xs text-muted"
    >
      <UIcon name="i-lucide-loader-2" class="w-4 h-4 animate-spin text-primary-500" />
      <span>AI Sentinel: Evaluating cross-reactivity with TypeSafe System One...</span>
    </div>

    <!-- Contraindicated (High Probability Conflict) -->
    <div
      v-else-if="checkResult && checkResult.verdict === 'CONTRAINDICATED'"
      class="p-3 rounded-lg border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 shadow-xs"
    >
      <div class="flex items-start gap-2.5">
        <UIcon name="i-lucide-octagon-alert" class="w-5 h-5 text-rose-600 dark:text-rose-400 mt-0.5 shrink-0" />
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
              🚨 Severe Allergy Conflict
            </span>
            <UBadge color="error" variant="solid" size="xs">
              {{ Math.round(checkResult.probability * 100) }}% Threat Score
            </UBadge>
          </div>
          <p class="text-xs font-medium leading-relaxed">
            {{ checkResult.explanation }}
          </p>
          <div class="pt-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
            ⚠️ Order placement is restricted. Please consult the attending obstetrician or choose an alternative drug class.
          </div>
        </div>
      </div>
    </div>

    <!-- Review Required (Moderate Probability) -->
    <div
      v-else-if="checkResult && checkResult.verdict === 'REVIEW'"
      class="p-3 rounded-lg border border-amber-300 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 shadow-xs"
    >
      <div class="flex items-start gap-2.5">
        <UIcon name="i-lucide-alert-triangle" class="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <div class="space-y-1">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              ⚠️ Potential Cross-Reactivity
            </span>
            <UBadge color="warning" variant="subtle" size="xs">
              {{ Math.round(checkResult.probability * 100) }}% Probability
            </UBadge>
          </div>
          <p class="text-xs font-medium leading-relaxed">
            {{ checkResult.explanation }}
          </p>
          <p class="text-[11px] text-amber-600 dark:text-amber-400">
            Clinical pharmacist co-signature and post-administration bedside monitoring will be mandated.
          </p>
        </div>
      </div>
    </div>

    <!-- Safe to Order -->
    <div
      v-else-if="checkResult && checkResult.verdict === 'SAFE'"
      class="flex items-center justify-between p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-200"
    >
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-shield-check" class="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span class="text-xs font-medium">{{ checkResult.explanation }}</span>
      </div>
      <UBadge color="success" variant="subtle" size="xs">
        Verified Safe
      </UBadge>
    </div>

    <!-- Passive Patient Allergy Reminder when form is partially filled -->
    <div
      v-else-if="patientAllergies && patientAllergies.length > 0 && !drugName"
      class="flex items-center gap-1.5 text-[11px] text-rose-600 dark:text-rose-400 p-1.5 rounded-md bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40"
    >
      <UIcon name="i-lucide-info" class="w-3.5 h-3.5 shrink-0" />
      <span>Patient has documented allergies: <strong>{{ patientAllergies.join(', ') }}</strong></span>
    </div>
  </div>
</template>

