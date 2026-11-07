<script setup lang="ts">
import { ref, onMounted } from 'vue'

const { t } = useI18n()
const toast = useToast()

const deliveries = ref<any[]>([])
const loading = ref(false)

const isDeliveryModalOpen = ref(false)
const isPartographModalOpen = ref(false)
const isNewbornModalOpen = ref(false)
const isBirthSlipModalOpen = ref(false)

const selectedDelivery = ref<any>(null)
const selectedNewborn = ref<any>(null)

// Form state for Delivery Record
const deliveryForm = ref({
  patientId: '',
  episodeId: '',
  deliveryDate: new Date().toISOString(),
  deliveryMode: 'SPONTANEOUS_VAGINAL',
  indicationForCesareanOrInstrumental: '',
  attendingDoctorId: '',
  attendingMidwifeId: '',
  plurality: 'SINGLETON',
  estimatedBloodLossMl: 250,
  uterotonicAdministered: 'OXYTOCIN_10IU',
  placentaRemovalMethod: 'CONTROLLED_CORD_TRACTION',
  perinealTearDegree: 'DEGREE_1',
  episiotomyPerformed: false,
  maternalOutcome: 'DISCHARGED_HEALTHY',
  notes: ''
})

// Form state for Partograph Entry
const partographForm = ref({
  deliveryId: '',
  recordedAt: new Date().toISOString(),
  cervicalDilationCm: 4,
  fetalHeartRateBpm: 140,
  fetalDescentStation: -2,
  contractionsPer10Min: 3,
  contractionDurationSeconds: 40,
  amnioticFluidStatus: 'CLEAR',
  maternalSystolicBp: 120,
  maternalDiastolicBp: 80,
  maternalPulseBpm: 82,
  maternalTemperatureC: 36.8,
  oxytocinUnitsPerLiter: 0,
  oxytocinDropsPerMin: 0,
  notes: ''
})

// Form state for Newborn Multi-Baby Registration (Twin/Triplet support!)
const newbornForm = ref({
  deliveryId: '',
  birthOrder: 1,
  birthTime: new Date().toISOString(),
  gender: 'FEMALE',
  weightGrams: 3100,
  lengthCm: 50,
  headCircumferenceCm: 34,
  chestCircumferenceCm: 33,
  apgar1Min: {
    heartRate: 2,
    respiratoryEffort: 2,
    muscleTone: 2,
    reflexIrritability: 2,
    color: 1,
    score: 9
  },
  apgar5Min: {
    heartRate: 2,
    respiratoryEffort: 2,
    muscleTone: 2,
    reflexIrritability: 2,
    color: 2,
    score: 10
  },
  immediateSkinToSkinContact: true,
  delayedCordClamping: true,
  vitaminK1Administered: true,
  tetracyclineEyeOintmentGiven: true,
  hepatitisBVaccineGiven: false,
  bcgVaccineGiven: false,
  resuscitationRequired: false,
  transferredToNicu: false,
  status: 'ALIVE',
  notes: ''
})

const patientsList = ref<any[]>([])

const fetchPatients = async () => {
  try {
    const res = await $api('/patients', { query: { limit: 100 } })
    patientsList.value = res.data || []
  } catch (err) {
    console.error('Failed to load patients:', err)
  }
}

const fetchDeliveries = async () => {
  loading.value = true
  try {
    const res = await $api('/maternity/deliveries', { query: { limit: 50 } })
    deliveries.value = res.data || []
  } catch (err: any) {
    toast.add({ title: t('maternity.common.loadFailed'), description: err.message, color: 'error' })
  } finally {
    loading.value = false
  }
}

const handleCreateDelivery = async () => {
  if (!deliveryForm.value.patientId) {
    toast.add({ title: t('maternity.common.selectPatientToast'), color: 'warning' })
    return
  }

  try {
    await $api('/maternity/deliveries', {
      method: 'POST',
      body: deliveryForm.value
    })
    toast.add({ title: t('maternity.delivery.recorded'), color: 'success' })
    isDeliveryModalOpen.value = false
    fetchDeliveries()
  } catch (err: any) {
    toast.add({ title: t('maternity.common.error'), description: err.data?.message || err.message, color: 'error' })
  }
}

const openPartograph = async (delivery: any) => {
  selectedDelivery.value = delivery
  partographForm.value.deliveryId = delivery._id
  try {
    const res = await $api(`/maternity/partograph/${delivery._id}`)
    selectedDelivery.value.partographEntries = res.data || []
  } catch (err) {}
  isPartographModalOpen.value = true
}

const handleRecordPartograph = async () => {
  try {
    await $api('/maternity/partograph', {
      method: 'POST',
      body: partographForm.value
    })
    toast.add({ title: t('maternity.delivery.partographRecorded'), color: 'success' })
    // Refresh partograph
    const res = await $api(`/maternity/partograph/${selectedDelivery.value._id}`)
    selectedDelivery.value.partographEntries = res.data || []
  } catch (err: any) {
    toast.add({ title: t('maternity.common.error'), description: err.data?.message || err.message, color: 'error' })
  }
}

const openNewbornModal = async (delivery: any) => {
  selectedDelivery.value = delivery
  newbornForm.value.deliveryId = delivery._id
  // Auto increment birth order for twins / triplets
  const existingCount = delivery.newborns?.length || 0
  newbornForm.value.birthOrder = existingCount + 1
  isNewbornModalOpen.value = true
}

const handleRegisterNewborn = async () => {
  try {
    const res = await $api('/maternity/newborns', {
      method: 'POST',
      body: newbornForm.value
    })
    toast.add({ title: t('maternity.delivery.newbornRegistered', { order: newbornForm.value.birthOrder }), color: 'success' })
    isNewbornModalOpen.value = false
    fetchDeliveries()
    // Open birth slip for printing
    selectedNewborn.value = res.data
    isBirthSlipModalOpen.value = true
  } catch (err: any) {
    toast.add({ title: t('maternity.common.error'), description: err.data?.message || err.message, color: 'error' })
  }
}

onMounted(() => {
  fetchDeliveries()
  fetchPatients()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-highlighted flex items-center gap-2">
          <UIcon name="i-lucide-baby" class="w-7 h-7 text-pink-500" />
          {{ t('maternity.delivery.title') }}
        </h1>
        <p class="text-sm text-muted mt-1">
          {{ t('maternity.delivery.subtitle') }}
        </p>
      </div>
      <div class="flex items-center gap-3">
        <UButton
          icon="i-lucide-plus"
          color="primary"
          @click="isDeliveryModalOpen = true"
        >
          {{ t('maternity.delivery.recordDelivery') }}
        </UButton>
      </div>
    </div>

    <!-- Deliveries Table -->
    <UCard>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-muted">
          <thead class="text-xs uppercase bg-muted text-default">
            <tr>
              <th class="px-4 py-3">{{ t('maternity.delivery.colDeliveryCode') }}</th>
              <th class="px-4 py-3">{{ t('maternity.delivery.colMotherName') }}</th>
              <th class="px-4 py-3">{{ t('maternity.delivery.colMode') }}</th>
              <th class="px-4 py-3">{{ t('maternity.delivery.colPlurality') }}</th>
              <th class="px-4 py-3">{{ t('maternity.delivery.colBloodLoss') }}</th>
              <th class="px-4 py-3">{{ t('maternity.delivery.colNewborns') }}</th>
              <th class="px-4 py-3 text-right">{{ t('maternity.common.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr v-if="loading">
              <td colspan="7" class="text-center py-8">
                <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin mx-auto text-primary-500" />
              </td>
            </tr>
            <tr v-else-if="deliveries.length === 0">
              <td colspan="7" class="text-center py-8 text-dimmed">
                {{ t('maternity.delivery.empty') }}
              </td>
            </tr>
            <tr v-for="del in deliveries" :key="del._id" class="hover:bg-muted">
              <td class="px-4 py-3 font-semibold text-highlighted">
                {{ del.deliveryNumber }}
                <div class="text-[11px] text-dimmed">{{ new Date(del.deliveryDate).toLocaleString() }}</div>
              </td>
              <td class="px-4 py-3">
                <div class="font-medium text-highlighted">{{ del.patientId?.khmerName || del.patientId?.englishName || 'N/A' }}</div>
                <div class="text-xs text-dimmed">{{ del.patientId?.patientCode }}</div>
              </td>
              <td class="px-4 py-3 font-medium">
                <UBadge :color="del.deliveryMode === 'CESAREAN' ? 'primary' : 'success'" variant="subtle" size="sm">
                  {{ del.deliveryMode }}
                </UBadge>
              </td>
              <td class="px-4 py-3">
                <UBadge :color="del.plurality === 'SINGLETON' ? 'neutral' : 'warning'" variant="subtle" size="sm">
                  {{ del.plurality }}
                </UBadge>
              </td>
              <td class="px-4 py-3">
                <div :class="del.isPph || del.estimatedBloodLossMl >= 500 ? 'font-bold text-red-600' : 'text-default'">
                  {{ del.estimatedBloodLossMl }} mL
                  <UBadge v-if="del.isPph || del.estimatedBloodLossMl >= 500" color="error" variant="subtle" size="xs" class="ml-1">
                    PPH
                  </UBadge>
                </div>
              </td>
              <td class="px-4 py-3">
                <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300">
                  {{ t('maternity.delivery.babiesCount', { count: del.newborns?.length || 0 }) }}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-2">
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="outline"
                    icon="i-lucide-activity"
                    @click="openPartograph(del)"
                  >
                    Partograph
                  </UButton>
                  <UButton
                    size="xs"
                    color="secondary"
                    variant="soft"
                    icon="i-lucide-baby"
                    @click="openNewbornModal(del)"
                  >
                    {{ t('maternity.delivery.registerBaby') }}
                  </UButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <!-- Modal: Record Delivery -->
    <UModal v-model:open="isDeliveryModalOpen" :title="t('maternity.delivery.recordModalTitle')">
      <template #body>
        <form class="space-y-4" @submit.prevent="handleCreateDelivery">
          <div>
            <label class="block text-xs font-semibold mb-1">{{ t('maternity.delivery.selectMother') }}</label>
            <select
              v-model="deliveryForm.patientId"
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
              <label class="block text-xs font-semibold mb-1">{{ t('maternity.delivery.mode') }}</label>
              <select
                v-model="deliveryForm.deliveryMode"
                class="w-full rounded-lg border border-accented bg-default px-3 py-2 text-sm text-highlighted"
              >
                <option value="SPONTANEOUS_VAGINAL">{{ t('maternity.delivery.modeSvd') }}</option>
                <option value="CESAREAN">{{ t('maternity.delivery.modeCesarean') }}</option>
                <option value="VACUUM_EXTRACTION">{{ t('maternity.delivery.modeVacuum') }}</option>
                <option value="FORCEPS">{{ t('maternity.delivery.modeForceps') }}</option>
                <option value="BREECH_EXTRACTION">{{ t('maternity.delivery.modeBreech') }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold mb-1">{{ t('maternity.delivery.plurality') }}</label>
              <select
                v-model="deliveryForm.plurality"
                class="w-full rounded-lg border border-accented bg-default px-3 py-2 text-sm text-highlighted"
              >
                <option value="SINGLETON">{{ t('maternity.delivery.singleton') }}</option>
                <option value="TWIN">{{ t('maternity.delivery.twin') }}</option>
                <option value="TRIPLET">{{ t('maternity.delivery.triplet') }}</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold mb-1">{{ t('maternity.delivery.bloodLoss') }}</label>
              <UInput v-model.number="deliveryForm.estimatedBloodLossMl" type="number" step="10" />
              <span v-if="deliveryForm.estimatedBloodLossMl >= 500" class="text-xs text-red-500 font-bold">
                {{ t('maternity.delivery.pphWarning') }}
              </span>
            </div>
            <div>
              <label class="block text-xs font-semibold mb-1">{{ t('maternity.delivery.uterotonic') }}</label>
              <select
                v-model="deliveryForm.uterotonicAdministered"
                class="w-full rounded-lg border border-accented bg-default px-3 py-2 text-sm text-highlighted"
              >
                <option value="OXYTOCIN_10IU">Oxytocin 10 IU IM</option>
                <option value="MISOPROSTOL_600MCG">Misoprostol 600 mcg</option>
                <option value="ERGOMETRINE">Ergometrine 0.2 mg</option>
                <option value="CARBETOCIN">Carbetocin 100 mcg</option>
              </select>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-4">
            <UButton variant="ghost" color="neutral" @click="isDeliveryModalOpen = false">{{ t('maternity.common.cancel') }}</UButton>
            <UButton type="submit" color="primary">{{ t('maternity.delivery.submitDelivery') }}</UButton>
          </div>
        </form>
      </template>
    </UModal>

    <!-- Modal: Partograph Entry & Visual Graph -->
    <UModal v-model:open="isPartographModalOpen" :title="t('maternity.delivery.partographModalTitle')" size="lg">
      <template #body>
        <div class="space-y-4">
          <div class="p-3 bg-pink-50 dark:bg-pink-950/30 rounded-lg text-xs flex justify-between items-center">
            <span class="font-bold text-pink-700 dark:text-pink-300">
              {{ t('maternity.delivery.motherValue', { name: selectedDelivery?.patientId?.khmerName || selectedDelivery?.patientId?.englishName }) }}
            </span>
            <span class="text-muted">{{ t('maternity.delivery.deliveryValue', { code: selectedDelivery?.deliveryNumber }) }}</span>
          </div>

          <!-- Existing Partograph Records -->
          <div class="overflow-x-auto max-h-48 border rounded-lg">
            <table class="w-full text-xs text-left">
              <thead class="bg-elevated">
                <tr>
                  <th class="p-2">{{ t('maternity.delivery.colTime') }}</th>
                  <th class="p-2">{{ t('maternity.delivery.colDilation') }}</th>
                  <th class="p-2">{{ t('maternity.delivery.colFhr') }}</th>
                  <th class="p-2">{{ t('maternity.delivery.colContractions') }}</th>
                  <th class="p-2">{{ t('maternity.delivery.colAmnioticFluid') }}</th>
                  <th class="p-2">{{ t('maternity.delivery.colMaternalBp') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(p, i) in selectedDelivery?.partographEntries || []" :key="i" class="border-t">
                  <td class="p-2">{{ new Date(p.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}</td>
                  <td class="p-2 font-bold" :class="p.isActionLineCrossed ? 'text-red-600' : 'text-primary-600'">
                    {{ p.cervicalDilationCm }} cm
                  </td>
                  <td class="p-2">{{ p.fetalHeartRateBpm }} bpm</td>
                  <td class="p-2">{{ t('maternity.delivery.contractionsTimes', { count: p.contractionsPer10Min }) }}</td>
                  <td class="p-2">{{ p.amnioticFluidStatus }}</td>
                  <td class="p-2">{{ p.maternalSystolicBp }}/{{ p.maternalDiastolicBp }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Add New Point Form -->
          <form class="space-y-3 pt-2 border-t" @submit.prevent="handleRecordPartograph">
            <div class="grid grid-cols-4 gap-2">
              <div>
                <label class="block text-[11px] font-semibold mb-1">{{ t('maternity.delivery.dilationCm') }}</label>
                <UInput v-model.number="partographForm.cervicalDilationCm" type="number" min="0" max="10" step="0.5" />
              </div>
              <div>
                <label class="block text-[11px] font-semibold mb-1">FHR (bpm)</label>
                <UInput v-model.number="partographForm.fetalHeartRateBpm" type="number" placeholder="110-160" />
              </div>
              <div>
                <label class="block text-[11px] font-semibold mb-1">{{ t('maternity.delivery.contractions') }}</label>
                <UInput v-model.number="partographForm.contractionsPer10Min" type="number" min="0" max="5" />
              </div>
              <div>
                <label class="block text-[11px] font-semibold mb-1">{{ t('maternity.delivery.amnioticFluid') }}</label>
                <select v-model="partographForm.amnioticFluidStatus" class="w-full rounded border p-1 text-xs bg-default">
                  <option value="CLEAR">{{ t('maternity.delivery.fluidClear') }}</option>
                  <option value="MECONIUM">{{ t('maternity.delivery.fluidMeconium') }}</option>
                  <option value="BLOOD">{{ t('maternity.delivery.fluidBlood') }}</option>
                  <option value="INTACT">{{ t('maternity.delivery.fluidIntact') }}</option>
                </select>
              </div>
            </div>

            <div class="flex justify-end gap-2">
              <UButton size="xs" variant="ghost" @click="isPartographModalOpen = false">{{ t('maternity.common.close') }}</UButton>
              <UButton size="xs" type="submit" color="primary">{{ t('maternity.delivery.recordPoint') }}</UButton>
            </div>
          </form>
        </div>
      </template>
    </UModal>

    <!-- Modal: Register Newborn (Twin / Triplet Support) -->
    <UModal v-model:open="isNewbornModalOpen" :title="t('maternity.delivery.newbornModalTitle')">
      <template #body>
        <form class="space-y-4" @submit.prevent="handleRegisterNewborn">
          <div class="p-2.5 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-xs flex justify-between">
            <span class="font-bold text-blue-700 dark:text-blue-300">
              {{ t('maternity.delivery.deliveryValue', { code: selectedDelivery?.deliveryNumber }) }} ({{ selectedDelivery?.plurality }})
            </span>
            <span class="font-bold text-pink-600">{{ t('maternity.delivery.birthOrderValue', { order: newbornForm.birthOrder }) }}</span>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-semibold mb-1">{{ t('maternity.delivery.birthOrder') }}</label>
              <UInput v-model.number="newbornForm.birthOrder" type="number" min="1" max="10" />
            </div>
            <div>
              <label class="block text-xs font-semibold mb-1">{{ t('maternity.delivery.gender') }}</label>
              <select v-model="newbornForm.gender" class="w-full rounded border px-2 py-1.5 text-xs bg-default">
                <option value="FEMALE">{{ t('maternity.delivery.female') }}</option>
                <option value="MALE">{{ t('maternity.delivery.male') }}</option>
                <option value="AMBIGUOUS">{{ t('maternity.delivery.ambiguous') }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold mb-1">{{ t('maternity.delivery.birthWeight') }}</label>
              <UInput v-model.number="newbornForm.weightGrams" type="number" placeholder="3000" />
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-semibold mb-1">{{ t('maternity.delivery.length') }}</label>
              <UInput v-model.number="newbornForm.lengthCm" type="number" step="0.5" />
            </div>
            <div>
              <label class="block text-xs font-semibold mb-1">{{ t('maternity.delivery.headCirc') }}</label>
              <UInput v-model.number="newbornForm.headCircumferenceCm" type="number" step="0.5" />
            </div>
            <div>
              <label class="block text-xs font-semibold mb-1">{{ t('maternity.delivery.chestCirc') }}</label>
              <UInput v-model.number="newbornForm.chestCircumferenceCm" type="number" step="0.5" />
            </div>
          </div>

          <!-- APGAR Score 1 min and 5 min -->
          <div class="p-3 border rounded-xl space-y-2 bg-muted/50">
            <div class="font-semibold text-xs text-default">{{ t('maternity.delivery.apgarScore') }}</div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] text-muted mb-1">{{ t('maternity.delivery.apgar1') }}</label>
                <UInput v-model.number="newbornForm.apgar1Min.score" type="number" min="0" max="10" />
              </div>
              <div>
                <label class="block text-[11px] text-muted mb-1">{{ t('maternity.delivery.apgar5') }}</label>
                <UInput v-model.number="newbornForm.apgar5Min.score" type="number" min="0" max="10" />
              </div>
            </div>
          </div>

          <!-- Immediate Care Checklist -->
          <div class="grid grid-cols-2 gap-2 text-xs">
            <label class="flex items-center gap-1.5">
              <input v-model="newbornForm.immediateSkinToSkinContact" type="checkbox" class="rounded text-primary-600" />
              {{ t('maternity.delivery.skinToSkin') }}
            </label>
            <label class="flex items-center gap-1.5">
              <input v-model="newbornForm.delayedCordClamping" type="checkbox" class="rounded text-primary-600" />
              {{ t('maternity.delivery.delayedClamping') }}
            </label>
            <label class="flex items-center gap-1.5">
              <input v-model="newbornForm.vitaminK1Administered" type="checkbox" class="rounded text-primary-600" />
              {{ t('maternity.delivery.vitaminK1') }}
            </label>
            <label class="flex items-center gap-1.5">
              <input v-model="newbornForm.tetracyclineEyeOintmentGiven" type="checkbox" class="rounded text-primary-600" />
              {{ t('maternity.delivery.tetracycline') }}
            </label>
          </div>

          <div class="flex justify-end gap-2 pt-4">
            <UButton variant="ghost" color="neutral" @click="isNewbornModalOpen = false">{{ t('maternity.common.cancel') }}</UButton>
            <UButton type="submit" color="primary">{{ t('maternity.delivery.submitNewborn') }}</UButton>
          </div>
        </form>
      </template>
    </UModal>

    <!-- Modal: Birth Slip Certificate with Verification Hash -->
    <UModal v-model:open="isBirthSlipModalOpen" :title="t('maternity.delivery.birthSlipModalTitle')">
      <template #body>
        <div class="p-6 bg-default border rounded-2xl space-y-4 text-center">
          <div class="border-b pb-4">
            <div class="text-sm font-bold uppercase tracking-widest text-muted">{{ t('maternity.common.kingdomOfCambodia') }}</div>
            <div class="text-xs text-dimmed">{{ t('maternity.delivery.nationalMotto') }}</div>
            <h2 class="text-lg font-bold text-pink-600 mt-2">{{ t('maternity.delivery.birthSlipHeading') }}</h2>
          </div>

          <div class="grid grid-cols-2 gap-4 text-left text-xs">
            <div><span class="text-dimmed">{{ t('maternity.delivery.slipNewbornCode') }}</span> <span class="font-bold">{{ selectedNewborn?.newbornCode }}</span></div>
            <div><span class="text-dimmed">{{ t('maternity.delivery.slipBirthOrder') }}</span> <span class="font-bold">{{ t('maternity.delivery.slipBirthOrderValue', { order: selectedNewborn?.birthOrder }) }}</span></div>
            <div><span class="text-dimmed">{{ t('maternity.delivery.slipGender') }}</span> <span class="font-bold">{{ selectedNewborn?.gender }}</span></div>
            <div><span class="text-dimmed">{{ t('maternity.delivery.slipWeight') }}</span> <span class="font-bold">{{ t('maternity.delivery.slipWeightValue', { grams: selectedNewborn?.weightGrams }) }}</span></div>
            <div><span class="text-dimmed">APGAR (1/5):</span> <span class="font-bold">{{ selectedNewborn?.apgar1Min?.score }} / {{ selectedNewborn?.apgar5Min?.score }}</span></div>
            <div><span class="text-dimmed">{{ t('maternity.delivery.slipDate') }}</span> <span class="font-bold">{{ new Date(selectedNewborn?.birthTime || Date.now()).toLocaleDateString() }}</span></div>
          </div>

          <!-- Civil Registry Phase 1 SHA-256 Hash Display -->
          <div class="p-3 bg-muted rounded-lg text-left text-[11px] font-mono break-all">
            <div class="text-[10px] text-dimmed uppercase font-sans font-bold mb-1">{{ t('maternity.delivery.verificationHash') }}</div>
            {{ selectedNewborn?.birthSlipQrHash }}
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <UButton variant="ghost" color="neutral" @click="isBirthSlipModalOpen = false">{{ t('maternity.common.close') }}</UButton>
            <UButton color="primary" icon="i-lucide-printer" @click="window.print()">{{ t('maternity.delivery.printSlip') }}</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
