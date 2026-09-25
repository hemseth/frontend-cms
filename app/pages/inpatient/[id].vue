<template>
  <div class="space-y-6 font-khmer p-4">
    <div class="flex items-center gap-3">
      <UButton
        icon="i-lucide-arrow-left"
        color="neutral"
        variant="outline"
        size="sm"
        to="/inpatient"
      />
      <h1 class="text-xl font-bold">
        ព័ត៌មានអ្នកជំងឺសម្រាកព្យាបាល (Admission)
      </h1>
    </div>

    <div v-if="isLoading" class="py-16 text-center text-dimmed">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto mb-2 text-primary-500" />
    </div>

    <UAlert
      v-else-if="loadError"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="loadError"
      :actions="[{ label: 'Retry', onClick: fetchDetails }]"
    />

    <template v-else-if="admission">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold flex items-center gap-2">
            <span>{{ patientName }}</span>
            <UBadge :color="statusColor" variant="subtle" size="xs">
              {{ statusLabel }}
            </UBadge>
          </h2>
          <p class="text-xs text-muted">
            {{ admission.admissionNumber || '-' }} • ចូលសម្រាក៖ {{ formatDate(admission.admittedAt || admission.admissionDate) }}
          </p>
        </div>

        <div v-if="isActive" class="flex flex-wrap items-center gap-2">
          <UButton
            label="កត់ត្រាពិនិត្យជុំសាល (New Round)"
            icon="i-lucide-stethoscope"
            color="primary"
            size="sm"
            @click="isRoundModalOpen = true"
          />
          <UButton
            label="ផ្ទេរគ្រែ (Transfer)"
            icon="i-lucide-arrow-left-right"
            color="neutral"
            variant="outline"
            size="sm"
            @click="isTransferModalOpen = true"
          />
          <UButton
            label="ប្តូរគ្រូពេទ្យ (Doctor)"
            icon="i-lucide-user-cog"
            color="neutral"
            variant="outline"
            size="sm"
            @click="isDoctorModalOpen = true"
          />
          <UButton
            label="ចេញពីពេទ្យ (Discharge)"
            icon="i-lucide-log-out"
            color="error"
            variant="soft"
            size="sm"
            @click="isDischargeModalOpen = true"
          />
        </div>
        <UButton
          v-else-if="admission.status === 'discharged'"
          label="បោះពុម្ពសេចក្តីសង្ខេប (Print discharge summary)"
          icon="i-lucide-printer"
          color="neutral"
          variant="outline"
          size="sm"
          @click="openPrintDischarge"
        />
      </div>

      <!-- Overview -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="p-4 rounded-xl bg-default border border-default shadow-xs space-y-3">
          <div class="flex items-center gap-2 pb-2 border-b border-default">
            <UIcon name="i-lucide-map-pin" class="text-rose-500 w-5 h-5" />
            <h3 class="font-bold text-sm">
              ទីតាំងបច្ចុប្បន្ន (Current Location)
            </h3>
          </div>
          <dl class="text-xs space-y-2">
            <div class="flex justify-between">
              <dt class="text-muted">
                សាល (Ward)
              </dt>
              <dd class="font-bold">
                {{ admission.location?.wardNameKh || admission.location?.wardNameEn || notSet }}
              </dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-muted">
                បន្ទប់ (Room)
              </dt>
              <dd class="font-bold">
                {{ admission.location?.roomCode || notSet }}
              </dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-muted">
                គ្រែ (Bed)
              </dt>
              <dd class="font-bold text-primary-600">
                {{ admission.location?.bedCode || notSet }}
              </dd>
            </div>
            <div class="flex justify-between pt-1 border-t border-default">
              <dt class="text-muted">
                រយៈពេលស្នាក់នៅ (Length of stay)
              </dt>
              <dd class="font-bold text-rose-600">
                {{ admission.lengthOfStayDays }} ថ្ងៃ
              </dd>
            </div>
          </dl>
        </div>

        <div class="p-4 rounded-xl bg-default border border-default shadow-xs space-y-3">
          <div class="flex items-center gap-2 pb-2 border-b border-default">
            <UIcon name="i-lucide-users" class="text-indigo-500 w-5 h-5" />
            <h3 class="font-bold text-sm">
              គ្រូពេទ្យទទួលបន្ទុក (Attending doctor)
            </h3>
          </div>
          <p class="text-sm font-bold text-primary-700 dark:text-primary-400">
            {{ admission.attendingDoctor?.name || notSet }}
          </p>
          <p class="text-xs text-muted">
            {{ admission.patient?.phone || '' }}
          </p>
        </div>

        <div class="p-4 rounded-xl bg-default border border-default shadow-xs space-y-3">
          <div class="flex items-center gap-2 pb-2 border-b border-default">
            <UIcon name="i-lucide-activity" class="text-emerald-500 w-5 h-5" />
            <h3 class="font-bold text-sm">
              មូលហេតុ និងរោគវិនិច្ឆ័យ (Reason and diagnosis)
            </h3>
          </div>
          <p class="text-xs font-bold">
            {{ admission.admissionReason || notSet }}
          </p>
          <p v-if="diagnosisLabel" class="text-xs text-toned">
            {{ diagnosisLabel }}
          </p>
          <p v-if="admission.patient?.allergies?.length" class="text-xs text-rose-600 font-semibold">
            ⚠ អាឡែស៊ី (Allergies): {{ allergyLabel }}
          </p>
        </div>
      </div>

      <!-- Rounds -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-sm flex items-center gap-2">
              <UIcon name="i-lucide-history" class="w-5 h-5 text-primary-500" />
              ប្រវត្តិពិនិត្យជុំសាល (Clinical Rounds &amp; Progress Notes)
            </h3>
            <UButton
              v-if="isActive"
              label="បន្ថែម (Add Round)"
              icon="i-lucide-plus"
              size="xs"
              @click="isRoundModalOpen = true"
            />
          </div>
        </template>

        <UAlert
          v-if="roundsError"
          color="error"
          variant="subtle"
          icon="i-lucide-circle-alert"
          :title="roundsError"
        />
        <p v-else-if="rounds.length === 0" class="text-sm text-muted text-center py-6">
          មិនទាន់មានការពិនិត្យជុំសាលនៅឡើយទេ (No rounds recorded yet)
        </p>
        <div v-else class="space-y-4">
          <div
            v-for="round in rounds"
            :key="round._id"
            class="p-4 rounded-xl bg-muted/70 border border-default/80 space-y-3 text-xs"
          >
            <div class="flex items-center justify-between pb-2 border-b border-default">
              <div class="flex items-center gap-2">
                <span class="font-bold">
                  {{ formatDate(round.roundDate) }} • {{ formatTime(round.roundDate) }}
                </span>
                <UBadge color="primary" variant="subtle" size="xs">
                  {{ round.roundType }}
                </UBadge>
              </div>
              <span class="font-bold text-primary-700 dark:text-primary-400">
                {{ round.doctorId?.nameKh || round.doctorId?.nameEn || '' }}
              </span>
            </div>

            <div v-if="round.vitalsSnapshot" class="flex flex-wrap gap-x-4 gap-y-1 p-2.5 rounded-lg bg-default border border-default">
              <span v-if="round.vitalsSnapshot.bp"><span class="text-muted">BP</span> <b>{{ round.vitalsSnapshot.bp }}</b></span>
              <span v-if="round.vitalsSnapshot.temp"><span class="text-muted">Temp</span> <b>{{ round.vitalsSnapshot.temp }} °C</b></span>
              <span v-if="round.vitalsSnapshot.pulse"><span class="text-muted">Pulse</span> <b>{{ round.vitalsSnapshot.pulse }}</b></span>
              <span v-if="round.vitalsSnapshot.spo2"><span class="text-muted">SpO2</span> <b>{{ round.vitalsSnapshot.spo2 }} %</b></span>
              <span v-if="round.vitalsSnapshot.respiratoryRate"><span class="text-muted">RR</span> <b>{{ round.vitalsSnapshot.respiratoryRate }}</b></span>
            </div>

            <dl class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div v-for="field in soapFields.filter(f => round[f.key])" :key="field.key">
                <dt class="font-bold text-default">
                  {{ field.label }}
                </dt>
                <dd class="text-toned mt-0.5 whitespace-pre-line">
                  {{ round[field.key] }}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </UCard>
    </template>

    <TransferBedModal v-model:open="isTransferModalOpen" :admission="admission" @transferred="fetchDetails" />
    <ChangeDoctorModal v-model:open="isDoctorModalOpen" :admission="admission" @changed="fetchDetails" />
    <DischargeModal v-model:open="isDischargeModalOpen" :admission="admission" @discharged="fetchDetails" />
    <AdmissionRoundModal v-model:open="isRoundModalOpen" :admission="admission" @saved="fetchRounds" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import TransferBedModal from '~/components/inpatient/TransferBedModal.vue'
import ChangeDoctorModal from '~/components/inpatient/ChangeDoctorModal.vue'
import DischargeModal from '~/components/inpatient/DischargeModal.vue'
import AdmissionRoundModal from '~/components/inpatient/AdmissionRoundModal.vue'

const route = useRoute()
const admissionId = String(route.params.id || '')
const notSet = 'មិនទាន់កំណត់ (Not set)'

const admission = ref<any>(null)
const rounds = ref<any[]>([])
const isLoading = ref(true)
const loadError = ref('')
const roundsError = ref('')

const isTransferModalOpen = ref(false)
const isDoctorModalOpen = ref(false)
const isDischargeModalOpen = ref(false)
const isRoundModalOpen = ref(false)

const soapFields = [
  { key: 'subjective', label: 'S - Subjective' },
  { key: 'objective', label: 'O - Objective' },
  { key: 'assessment', label: 'A - Assessment' },
  { key: 'plan', label: 'P - Plan' },
  { key: 'progressNote', label: 'Progress note' }
]

const ACTIVE_STATUSES = ['admitted', 'under_treatment', 'transferred', 'ready_for_discharge']
const isActive = computed(() => ACTIVE_STATUSES.includes(admission.value?.status))
const patientName = computed(() => admission.value?.patient?.nameKh || admission.value?.patient?.nameEn || admission.value?.patient?.name || '-')
const statusLabel = computed(() => String(admission.value?.status || '').replaceAll('_', ' '))
const statusColor = computed(() => {
  const status = admission.value?.status
  if (status === 'discharged') return 'neutral'
  if (status === 'ready_for_discharge') return 'warning'
  return 'primary'
})
const diagnosisLabel = computed(() => {
  const dx = admission.value?.primaryDiagnosis
  if (!dx) return ''
  return [dx.code, dx.nameKh || dx.nameEn].filter(Boolean).join(' • ')
})
const allergyLabel = computed(() => (admission.value?.patient?.allergies || [])
  .map((a: any) => typeof a === 'string' ? a : (a.allergen || a.name || a.substance))
  .filter(Boolean)
  .join(', '))

async function fetchRounds() {
  roundsError.value = ''
  try {
    const res: any = await $api(`/inpatient/admissions/${admissionId}/rounds`)
    rounds.value = res?.data || []
  } catch (err: any) {
    rounds.value = []
    roundsError.value = getApiErrorMessage(err, 'មិនអាចទាញយកការពិនិត្យជុំសាលបានទេ (Could not load rounds)')
  }
}

async function fetchDetails() {
  isLoading.value = true
  loadError.value = ''
  try {
    const res: any = await $api(`/inpatient/admissions/${admissionId}`)
    admission.value = res?.data || null
    await fetchRounds()
  } catch (err: any) {
    admission.value = null
    loadError.value = getApiErrorMessage(err, 'រកមិនឃើញការសម្រាកព្យាបាលនេះទេ (Admission not found)')
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchDetails)

function formatDate(d: any) {
  if (!d) return '-'
  const date = new Date(d)
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
}

function formatTime(d: any) {
  if (!d) return ''
  const date = new Date(d)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function openPrintDischarge() {
  window.open(`/print/discharge-summary/${admissionId}`, '_blank')
}
</script>

<style scoped>
.font-khmer {
  font-family: 'Battambang', 'Noto Sans Khmer', serif;
}
</style>
