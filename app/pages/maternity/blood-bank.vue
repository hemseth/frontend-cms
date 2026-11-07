<script setup lang="ts">
import { ref, onMounted } from 'vue'

const { t } = useI18n()
const toast = useToast()

const requests = ref<any[]>([])
const loading = ref(false)
const selectedFilter = ref('')

const isRequestModalOpen = ref(false)
const isCrossMatchModalOpen = ref(false)
const isTransfusionModalOpen = ref(false)
const isReactionModalOpen = ref(false)

const selectedRequest = ref<any>(null)

// Form: Blood Request
const requestForm = ref({
  patientId: '',
  urgency: 'URGENT',
  productType: 'PACKED_RED_BLOOD_CELLS',
  unitsRequested: 2,
  bloodGroup: 'O',
  rhFactor: 'POSITIVE',
  clinicalIndication: 'POSTPARTUM_HEMORRHAGE',
  notes: ''
})

// Form: Tech Cross-Match
const crossMatchForm = ref({
  unitBarcode: '',
  bloodGroup: 'O' as 'A' | 'B' | 'AB' | 'O',
  rhFactor: 'POSITIVE' as 'POSITIVE' | 'NEGATIVE',
  crossMatchResult: 'COMPATIBLE' as 'COMPATIBLE' | 'INCOMPATIBLE',
  expiresAt: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  notes: ''
})

// Form: Bedside Two-Nurse Verification
const transfusionForm = ref({
  scannedPatientCode: '',
  scannedUnitBarcode: '',
  nurse1Id: '',
  nurse2Id: '',
  preVitals: {
    bloodPressure: '110/70',
    pulseBpm: 84,
    temperatureC: 36.7,
    respiratoryRate: 18
  }
})

// Form: Adverse Reaction
const reactionForm = ref({
  symptoms: ['FEVER', 'CHILLS'],
  severity: 'MODERATE',
  actionTaken: 'Transfusion stopped immediately, physician alerted',
  notes: ''
})

const patientsList = ref<any[]>([])
const staffList = ref<any[]>([])

const fetchPatients = async () => {
  try {
    const res = await $api('/patients', { query: { limit: 100 } })
    patientsList.value = res.data || []
  } catch (err) {}
}

const fetchStaff = async () => {
  try {
    const res = await $api('/staff', { query: { limit: 100 } })
    staffList.value = res.data || []
  } catch (err) {}
}

const fetchRequests = async () => {
  loading.value = true
  try {
    const query: any = { limit: 50 }
    if (selectedFilter.value) query.status = selectedFilter.value
    const res = await $api('/blood-bank', { query })
    requests.value = res.data || []
  } catch (err: any) {
    toast.add({ title: t('maternity.common.loadFailed'), description: err.message, color: 'error' })
  } finally {
    loading.value = false
  }
}

const handleCreateRequest = async () => {
  if (!requestForm.value.patientId) {
    toast.add({ title: t('maternity.common.selectPatientToast'), color: 'warning' })
    return
  }

  try {
    await $api('/blood-bank', {
      method: 'POST',
      body: requestForm.value
    })
    toast.add({ title: t('maternity.bloodBank.requestCreated'), color: 'success' })
    isRequestModalOpen.value = false
    fetchRequests()
  } catch (err: any) {
    toast.add({ title: t('maternity.common.error'), description: err.data?.message || err.message, color: 'error' })
  }
}

const openCrossMatch = (req: any) => {
  selectedRequest.value = req
  crossMatchForm.value.bloodGroup = req.bloodGroup || 'O'
  crossMatchForm.value.rhFactor = req.rhFactor || 'POSITIVE'
  crossMatchForm.value.unitBarcode = `BLD-${Date.now().toString().slice(-6)}`
  isCrossMatchModalOpen.value = true
}

const handleCompleteCrossMatch = async () => {
  try {
    await $api(`/blood-bank/${selectedRequest.value._id}/cross-match`, {
      method: 'POST',
      body: crossMatchForm.value
    })
    toast.add({ title: t('maternity.bloodBank.crossMatchDone'), color: 'success' })
    isCrossMatchModalOpen.value = false
    fetchRequests()
  } catch (err: any) {
    toast.add({ title: t('maternity.bloodBank.crossMatchError'), description: err.data?.message || err.message, color: 'error' })
  }
}

const openTransfusion = (req: any) => {
  selectedRequest.value = req
  transfusionForm.value.scannedPatientCode = req.patientId?.patientCode || ''
  transfusionForm.value.scannedUnitBarcode = req.unitBarcode || ''
  isTransfusionModalOpen.value = true
}

const handleStartTransfusion = async () => {
  try {
    await $api(`/blood-bank/${selectedRequest.value._id}/transfuse`, {
      method: 'POST',
      body: transfusionForm.value
    })
    toast.add({ title: t('maternity.bloodBank.transfusionStarted'), color: 'success' })
    isTransfusionModalOpen.value = false
    fetchRequests()
  } catch (err: any) {
    toast.add({ title: t('maternity.bloodBank.transfusionBlocked'), description: err.data?.message || err.message, color: 'error' })
  }
}

const openReaction = (req: any) => {
  selectedRequest.value = req
  isReactionModalOpen.value = true
}

const handleReportReaction = async () => {
  try {
    await $api(`/blood-bank/${selectedRequest.value._id}/reaction`, {
      method: 'POST',
      body: reactionForm.value
    })
    toast.add({ title: t('maternity.bloodBank.reactionReported'), color: 'error' })
    isReactionModalOpen.value = false
    fetchRequests()
  } catch (err: any) {
    toast.add({ title: t('maternity.common.error'), description: err.data?.message || err.message, color: 'error' })
  }
}

const handleCompleteTransfusion = async (req: any) => {
  try {
    await $api(`/blood-bank/${req._id}/complete`, {
      method: 'POST',
      body: { volumeTransfusedMl: 450 }
    })
    toast.add({ title: t('maternity.bloodBank.transfusionCompleted'), color: 'success' })
    fetchRequests()
  } catch (err: any) {
    toast.add({ title: t('maternity.common.error'), description: err.data?.message || err.message, color: 'error' })
  }
}

onMounted(() => {
  fetchRequests()
  fetchPatients()
  fetchStaff()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-highlighted flex items-center gap-2">
          <UIcon name="i-lucide-droplets" class="w-7 h-7 text-red-500" />
          {{ t('maternity.bloodBank.title') }}
        </h1>
        <p class="text-sm text-muted mt-1">
          {{ t('maternity.bloodBank.subtitle') }}
        </p>
      </div>
      <div class="flex items-center gap-3">
        <UButton
          icon="i-lucide-plus"
          color="error"
          @click="isRequestModalOpen = true"
        >
          {{ t('maternity.bloodBank.newRequest') }}
        </UButton>
      </div>
    </div>

    <!-- Requests Table -->
    <UCard>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-muted">
          <thead class="text-xs uppercase bg-muted text-default">
            <tr>
              <th class="px-4 py-3">{{ t('maternity.bloodBank.colRequestCode') }}</th>
              <th class="px-4 py-3">{{ t('maternity.common.patient') }}</th>
              <th class="px-4 py-3">{{ t('maternity.bloodBank.colUrgency') }}</th>
              <th class="px-4 py-3">{{ t('maternity.bloodBank.colProduct') }}</th>
              <th class="px-4 py-3">{{ t('maternity.bloodBank.colBloodGroup') }}</th>
              <th class="px-4 py-3">Cross-Match</th>
              <th class="px-4 py-3">{{ t('maternity.common.status') }}</th>
              <th class="px-4 py-3 text-right">{{ t('maternity.common.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr v-if="loading">
              <td colspan="8" class="text-center py-8">
                <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin mx-auto text-primary-500" />
              </td>
            </tr>
            <tr v-else-if="requests.length === 0">
              <td colspan="8" class="text-center py-8 text-dimmed">
                {{ t('maternity.bloodBank.empty') }}
              </td>
            </tr>
            <tr v-for="req in requests" :key="req._id" class="hover:bg-muted">
              <td class="px-4 py-3 font-semibold text-highlighted">
                {{ req.requestNumber }}
                <div class="text-[11px] text-dimmed">{{ new Date(req.createdAt).toLocaleString() }}</div>
              </td>
              <td class="px-4 py-3">
                <div class="font-medium text-highlighted">{{ req.patientId?.khmerName || req.patientId?.englishName || 'N/A' }}</div>
                <div class="text-xs text-dimmed">{{ req.patientId?.patientCode }}</div>
              </td>
              <td class="px-4 py-3 font-bold">
                <UBadge
                  :color="req.urgency === 'EMERGENCY' ? 'error' : req.urgency === 'URGENT' ? 'warning' : 'neutral'"
                  variant="subtle"
                  size="sm"
                >
                  {{ req.urgency }}
                </UBadge>
              </td>
              <td class="px-4 py-3 text-xs">
                <div class="font-medium text-highlighted">{{ req.productType }}</div>
                <div class="text-dimmed">{{ t('maternity.bloodBank.unitsCount', { count: req.unitsRequested }) }}</div>
              </td>
              <td class="px-4 py-3 font-bold text-red-600">
                {{ req.bloodGroup }} {{ req.rhFactor === 'POSITIVE' ? '(Rh+)' : '(Rh-)' }}
              </td>
              <td class="px-4 py-3">
                <UBadge :color="req.crossMatchStatus === 'COMPATIBLE' ? 'success' : 'neutral'" variant="subtle" size="xs">
                  {{ req.crossMatchStatus }}
                </UBadge>
              </td>
              <td class="px-4 py-3">
                <UBadge
                  :color="req.status === 'TRANSFUSED' ? 'success' : req.status === 'IN_TRANSFUSION' ? 'warning' : req.status === 'REACTION_REPORTED' ? 'error' : 'primary'"
                  variant="subtle"
                  size="sm"
                >
                  {{ req.status }}
                </UBadge>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-1.5">
                  <UButton
                    v-if="req.status === 'REQUESTED' || req.status === 'CROSS_MATCHING'"
                    size="xs"
                    color="primary"
                    variant="soft"
                    @click="openCrossMatch(req)"
                  >
                    Cross-Match
                  </UButton>
                  <UButton
                    v-if="req.status === 'READY'"
                    size="xs"
                    color="error"
                    variant="solid"
                    icon="i-lucide-check-circle-2"
                    @click="openTransfusion(req)"
                  >
                    {{ t('maternity.bloodBank.verifyTransfuse') }}
                  </UButton>
                  <UButton
                    v-if="req.status === 'IN_TRANSFUSION'"
                    size="xs"
                    color="error"
                    variant="outline"
                    @click="openReaction(req)"
                  >
                    {{ t('maternity.bloodBank.reportReaction') }}
                  </UButton>
                  <UButton
                    v-if="req.status === 'IN_TRANSFUSION'"
                    size="xs"
                    color="success"
                    variant="soft"
                    @click="handleCompleteTransfusion(req)"
                  >
                    {{ t('maternity.bloodBank.complete') }}
                  </UButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <!-- Modal: New Blood Request -->
    <UModal v-model:open="isRequestModalOpen" :title="t('maternity.bloodBank.requestModalTitle')">
      <template #body>
        <form class="space-y-4" @submit.prevent="handleCreateRequest">
          <div>
            <label class="block text-xs font-semibold mb-1">{{ t('maternity.common.selectPatientRequired') }}</label>
            <select
              v-model="requestForm.patientId"
              class="w-full rounded-lg border border-accented bg-default px-3 py-2 text-sm text-highlighted"
            >
              <option value="" disabled>{{ t('maternity.common.choosePatientOption') }}</option>
              <option v-for="p in patientsList" :key="p._id" :value="p._id">
                {{ p.khmerName || p.englishName }} ({{ p.patientCode }})
              </option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold mb-1">{{ t('maternity.bloodBank.urgency') }}</label>
              <select v-model="requestForm.urgency" class="w-full rounded border px-2 py-1.5 text-xs bg-default">
                <option value="ROUTINE">{{ t('maternity.bloodBank.urgencyRoutine') }}</option>
                <option value="URGENT">{{ t('maternity.bloodBank.urgencyUrgent') }}</option>
                <option value="EMERGENCY">{{ t('maternity.bloodBank.urgencyEmergency') }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold mb-1">{{ t('maternity.bloodBank.productType') }}</label>
              <select v-model="requestForm.productType" class="w-full rounded border px-2 py-1.5 text-xs bg-default">
                <option value="PACKED_RED_BLOOD_CELLS">{{ t('maternity.bloodBank.productPrbc') }}</option>
                <option value="FRESH_FROZEN_PLASMA">{{ t('maternity.bloodBank.productFfp') }}</option>
                <option value="PLATELETS">{{ t('maternity.bloodBank.productPlatelets') }}</option>
                <option value="WHOLE_BLOOD">{{ t('maternity.bloodBank.productWholeBlood') }}</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-semibold mb-1">{{ t('maternity.bloodBank.units') }}</label>
              <UInput v-model.number="requestForm.unitsRequested" type="number" min="1" max="20" />
            </div>
            <div>
              <label class="block text-xs font-semibold mb-1">{{ t('maternity.bloodBank.aboGroup') }}</label>
              <select v-model="requestForm.bloodGroup" class="w-full rounded border px-2 py-1.5 text-xs bg-default">
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="AB">AB</option>
                <option value="O">O</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold mb-1">{{ t('maternity.bloodBank.rhFactor') }}</label>
              <select v-model="requestForm.rhFactor" class="w-full rounded border px-2 py-1.5 text-xs bg-default">
                <option value="POSITIVE">{{ t('maternity.bloodBank.rhPositive') }}</option>
                <option value="NEGATIVE">{{ t('maternity.bloodBank.rhNegative') }}</option>
              </select>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-4">
            <UButton variant="ghost" color="neutral" @click="isRequestModalOpen = false">{{ t('maternity.common.cancel') }}</UButton>
            <UButton type="submit" color="error">{{ t('maternity.bloodBank.submitRequest') }}</UButton>
          </div>
        </form>
      </template>
    </UModal>

    <!-- Modal: Cross-Match (Tech) -->
    <UModal v-model:open="isCrossMatchModalOpen" :title="t('maternity.bloodBank.crossMatchModalTitle')">
      <template #body>
        <form class="space-y-4" @submit.prevent="handleCompleteCrossMatch">
          <div class="p-2.5 bg-muted rounded-lg text-xs">
            <div class="font-bold">{{ t('maternity.bloodBank.patientValue', { name: selectedRequest?.patientId?.khmerName }) }}</div>
            <div class="text-dimmed">{{ t('maternity.bloodBank.requestValue', { code: selectedRequest?.requestNumber, units: selectedRequest?.unitsRequested }) }}</div>
          </div>

          <div>
            <label class="block text-xs font-semibold mb-1">{{ t('maternity.bloodBank.unitBarcode') }}</label>
            <UInput v-model="crossMatchForm.unitBarcode" placeholder="BLD-XXXXXX" required />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold mb-1">{{ t('maternity.bloodBank.unitBloodGroup') }}</label>
              <select v-model="crossMatchForm.bloodGroup" class="w-full rounded border px-2 py-1.5 text-xs bg-default">
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="AB">AB</option>
                <option value="O">O</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold mb-1">{{ t('maternity.bloodBank.crossMatchResult') }}</label>
              <select v-model="crossMatchForm.crossMatchResult" class="w-full rounded border px-2 py-1.5 text-xs bg-default">
                <option value="COMPATIBLE">{{ t('maternity.bloodBank.compatible') }}</option>
                <option value="INCOMPATIBLE">{{ t('maternity.bloodBank.incompatible') }}</option>
              </select>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-4">
            <UButton variant="ghost" color="neutral" @click="isCrossMatchModalOpen = false">{{ t('maternity.common.cancel') }}</UButton>
            <UButton type="submit" color="primary">{{ t('maternity.bloodBank.confirmIssue') }}</UButton>
          </div>
        </form>
      </template>
    </UModal>

    <!-- Modal: Bedside Two-Nurse Verification -->
    <UModal v-model:open="isTransfusionModalOpen" :title="t('maternity.bloodBank.transfusionModalTitle')" size="lg">
      <template #body>
        <form class="space-y-4" @submit.prevent="handleStartTransfusion">
          <div class="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl space-y-2 text-xs">
            <div class="font-bold text-red-700 dark:text-red-400 flex items-center gap-1.5">
              <UIcon name="i-lucide-shield-alert" class="w-5 h-5 text-red-500" />
              {{ t('maternity.bloodBank.safetyRule') }}
            </div>
            <div class="text-toned">
              {{ t('maternity.bloodBank.bloodUnit') }} <span class="font-bold text-red-600">{{ selectedRequest?.unitBarcode }}</span>
              ({{ selectedRequest?.bloodGroup }} {{ selectedRequest?.rhFactor }})
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold mb-1">{{ t('maternity.bloodBank.wristbandCode') }}</label>
              <UInput v-model="transfusionForm.scannedPatientCode" :placeholder="t('maternity.bloodBank.scanWristband')" required />
            </div>
            <div>
              <label class="block text-xs font-semibold mb-1">{{ t('maternity.bloodBank.bloodBarcode') }}</label>
              <UInput v-model="transfusionForm.scannedUnitBarcode" :placeholder="t('maternity.bloodBank.scanBloodUnit')" required />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3 p-3 bg-muted rounded-xl">
            <div>
              <label class="block text-xs font-bold text-default mb-1">{{ t('maternity.bloodBank.nurse1') }}</label>
              <select v-model="transfusionForm.nurse1Id" class="w-full rounded border px-2 py-1.5 text-xs bg-default" required>
                <option value="" disabled>{{ t('maternity.bloodBank.nurse1Option') }}</option>
                <option v-for="s in staffList" :key="s._id" :value="s._id">{{ s.nameKh || s.nameEn }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-default mb-1">{{ t('maternity.bloodBank.nurse2') }}</label>
              <select v-model="transfusionForm.nurse2Id" class="w-full rounded border px-2 py-1.5 text-xs bg-default" required>
                <option value="" disabled>{{ t('maternity.bloodBank.nurse2Option') }}</option>
                <option v-for="s in staffList" :key="s._id" :value="s._id">{{ s.nameKh || s.nameEn }}</option>
              </select>
            </div>
            <div v-if="transfusionForm.nurse1Id && transfusionForm.nurse2Id && transfusionForm.nurse1Id === transfusionForm.nurse2Id" class="col-span-2 text-xs text-red-600 font-bold">
              {{ t('maternity.bloodBank.sameNurseWarning') }}
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-4">
            <UButton variant="ghost" color="neutral" @click="isTransfusionModalOpen = false">{{ t('maternity.common.cancel') }}</UButton>
            <UButton type="submit" color="error" :disabled="transfusionForm.nurse1Id === transfusionForm.nurse2Id">
              {{ t('maternity.bloodBank.confirmStart') }}
            </UButton>
          </div>
        </form>
      </template>
    </UModal>

    <!-- Modal: Adverse Reaction -->
    <UModal v-model:open="isReactionModalOpen" :title="t('maternity.bloodBank.reactionModalTitle')">
      <template #body>
        <form class="space-y-4" @submit.prevent="handleReportReaction">
          <div class="p-3 bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 rounded-lg text-xs font-bold">
            {{ t('maternity.bloodBank.stopWarning') }}
          </div>

          <div>
            <label class="block text-xs font-semibold mb-1">{{ t('maternity.bloodBank.severity') }}</label>
            <select v-model="reactionForm.severity" class="w-full rounded border px-2 py-1.5 text-xs bg-default">
              <option value="MILD">{{ t('maternity.bloodBank.severityMild') }}</option>
              <option value="MODERATE">{{ t('maternity.bloodBank.severityModerate') }}</option>
              <option value="SEVERE">{{ t('maternity.bloodBank.severitySevere') }}</option>
              <option value="FATAL">{{ t('maternity.bloodBank.severityFatal') }}</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold mb-1">{{ t('maternity.bloodBank.actionTaken') }}</label>
            <UInput v-model="reactionForm.actionTaken" />
          </div>

          <div class="flex justify-end gap-2 pt-4">
            <UButton variant="ghost" color="neutral" @click="isReactionModalOpen = false">{{ t('maternity.common.cancel') }}</UButton>
            <UButton type="submit" color="error">{{ t('maternity.bloodBank.submitReaction') }}</UButton>
          </div>
        </form>
      </template>
    </UModal>
  </div>
</template>
