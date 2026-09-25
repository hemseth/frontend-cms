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
    toast.add({ title: 'បរាជ័យក្នុងការទាញទិន្នន័យ', description: err.message, color: 'error' })
  } finally {
    loading.value = false
  }
}

const handleCreateDelivery = async () => {
  if (!deliveryForm.value.patientId) {
    toast.add({ title: 'សូមជ្រើសរើសអ្នកជំងឺ', color: 'warning' })
    return
  }

  try {
    await $api('/maternity/deliveries', {
      method: 'POST',
      body: deliveryForm.value
    })
    toast.add({ title: 'បានកត់ត្រាការសម្រាលជោគជ័យ', color: 'success' })
    isDeliveryModalOpen.value = false
    fetchDeliveries()
  } catch (err: any) {
    toast.add({ title: 'កំហុស', description: err.data?.message || err.message, color: 'error' })
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
    toast.add({ title: 'បានកត់ត្រាចំណុច Partograph ជោគជ័យ', color: 'success' })
    // Refresh partograph
    const res = await $api(`/maternity/partograph/${selectedDelivery.value._id}`)
    selectedDelivery.value.partographEntries = res.data || []
  } catch (err: any) {
    toast.add({ title: 'កំហុស', description: err.data?.message || err.message, color: 'error' })
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
    toast.add({ title: `បានចុះបញ្ជីទារកទី ${newbornForm.value.birthOrder} ជោគជ័យ`, color: 'success' })
    isNewbornModalOpen.value = false
    fetchDeliveries()
    // Open birth slip for printing
    selectedNewborn.value = res.data
    isBirthSlipModalOpen.value = true
  } catch (err: any) {
    toast.add({ title: 'កំហុស', description: err.data?.message || err.message, color: 'error' })
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
          បន្ទប់សម្រាលកូន និងទារកទើបនឹងកើត (Labor &amp; Delivery Station)
        </h1>
        <p class="text-sm text-muted mt-1">
          ក្រាហ្វិកសម្រាល Partograph, ការសម្រាលកូន, គាំទ្រកូនភ្លោះ (Twin/Triplet), និងចេញលិខិតសំបុត្រកំណើត
        </p>
      </div>
      <div class="flex items-center gap-3">
        <UButton
          icon="i-lucide-plus"
          color="primary"
          @click="isDeliveryModalOpen = true"
        >
          កត់ត្រាការសម្រាលថ្មី (Record Delivery)
        </UButton>
      </div>
    </div>

    <!-- Deliveries Table -->
    <UCard>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-muted">
          <thead class="text-xs uppercase bg-muted text-default">
            <tr>
              <th class="px-4 py-3">លេខកូដសម្រាល</th>
              <th class="px-4 py-3">ឈ្មោះម្តាយ</th>
              <th class="px-4 py-3">វិធីសម្រាល</th>
              <th class="px-4 py-3">កូនភ្លោះ/ទោល</th>
              <th class="px-4 py-3">បរិមាណឈាមបាត់បង់</th>
              <th class="px-4 py-3">ទារកចុះបញ្ជី</th>
              <th class="px-4 py-3 text-right">សកម្មភាព</th>
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
                មិនមានកំណត់ត្រាសម្រាលកូនឡើយ
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
                  {{ del.newborns?.length || 0 }} ទារក
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
                    ចុះឈ្មោះទារក
                  </UButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <!-- Modal: Record Delivery -->
    <UModal v-model:open="isDeliveryModalOpen" title="កត់ត្រាការសម្រាលកូន (Record Delivery Event)">
      <template #body>
        <form class="space-y-4" @submit.prevent="handleCreateDelivery">
          <div>
            <label class="block text-xs font-semibold mb-1">ជ្រើសរើសអ្នកជំងឺ (ម្តាយ) *</label>
            <select
              v-model="deliveryForm.patientId"
              class="w-full rounded-lg border border-accented bg-default px-3 py-2 text-sm text-highlighted"
            >
              <option value="" disabled>-- ជ្រើសរើសអ្នកជំងឺ --</option>
              <option v-for="p in patientsList" :key="p._id" :value="p._id">
                {{ p.khmerName || p.englishName }} ({{ p.patientCode }})
              </option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold mb-1">វិធីសាស្ត្រសម្រាល (Mode)</label>
              <select
                v-model="deliveryForm.deliveryMode"
                class="w-full rounded-lg border border-accented bg-default px-3 py-2 text-sm text-highlighted"
              >
                <option value="SPONTANEOUS_VAGINAL">សម្រាលធម្មជាតិ (SVD)</option>
                <option value="CESAREAN">វះកាត់សម្រាល (C-Section)</option>
                <option value="VACUUM_EXTRACTION">បូមទាញក្បាល (Vacuum)</option>
                <option value="FORCEPS">ដង្កាប់ (Forceps)</option>
                <option value="BREECH_EXTRACTION">សម្រាលបញ្ច្រាស (Breech)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold mb-1">ចំនួនទារក (Plurality)</label>
              <select
                v-model="deliveryForm.plurality"
                class="w-full rounded-lg border border-accented bg-default px-3 py-2 text-sm text-highlighted"
              >
                <option value="SINGLETON">កូនទោល (Singleton)</option>
                <option value="TWIN">កូនភ្លោះពីរ (Twin)</option>
                <option value="TRIPLET">កូនភ្លោះបី (Triplet)</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold mb-1">ឈាមបាត់បង់ប៉ាន់ស្មាន (Blood Loss mL)</label>
              <UInput v-model.number="deliveryForm.estimatedBloodLossMl" type="number" step="10" />
              <span v-if="deliveryForm.estimatedBloodLossMl >= 500" class="text-xs text-red-500 font-bold">
                ⚠️ កម្រិតធ្លាក់ឈាមលើស 500ml នឹងត្រូវបានចាត់ជា PPH!
              </span>
            </div>
            <div>
              <label class="block text-xs font-semibold mb-1">ថ្នាំសម្រួលស្បូន (Uterotonic)</label>
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
            <UButton variant="ghost" color="neutral" @click="isDeliveryModalOpen = false">បោះបង់</UButton>
            <UButton type="submit" color="primary">កត់ត្រាការសម្រាល</UButton>
          </div>
        </form>
      </template>
    </UModal>

    <!-- Modal: Partograph Entry & Visual Graph -->
    <UModal v-model:open="isPartographModalOpen" title="ក្រាហ្វិកតាមដានការឈឺពោះសម្រាល Partograph" size="lg">
      <template #body>
        <div class="space-y-4">
          <div class="p-3 bg-pink-50 dark:bg-pink-950/30 rounded-lg text-xs flex justify-between items-center">
            <span class="font-bold text-pink-700 dark:text-pink-300">
              ម្តាយ: {{ selectedDelivery?.patientId?.khmerName || selectedDelivery?.patientId?.englishName }}
            </span>
            <span class="text-muted">សម្រាល: {{ selectedDelivery?.deliveryNumber }}</span>
          </div>

          <!-- Existing Partograph Records -->
          <div class="overflow-x-auto max-h-48 border rounded-lg">
            <table class="w-full text-xs text-left">
              <thead class="bg-elevated">
                <tr>
                  <th class="p-2">ម៉ោង</th>
                  <th class="p-2">មាត់ស្បូនបើក (Dilation cm)</th>
                  <th class="p-2">បេះដូងកូន (FHR bpm)</th>
                  <th class="p-2">ការកន្ត្រាក់/10mn</th>
                  <th class="p-2">ទឹកភ្លោះ</th>
                  <th class="p-2">BP ម្តាយ</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(p, i) in selectedDelivery?.partographEntries || []" :key="i" class="border-t">
                  <td class="p-2">{{ new Date(p.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }}</td>
                  <td class="p-2 font-bold" :class="p.isActionLineCrossed ? 'text-red-600' : 'text-primary-600'">
                    {{ p.cervicalDilationCm }} cm
                  </td>
                  <td class="p-2">{{ p.fetalHeartRateBpm }} bpm</td>
                  <td class="p-2">{{ p.contractionsPer10Min }} ដង</td>
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
                <label class="block text-[11px] font-semibold mb-1">មាត់ស្បូនបើក (cm)</label>
                <UInput v-model.number="partographForm.cervicalDilationCm" type="number" min="0" max="10" step="0.5" />
              </div>
              <div>
                <label class="block text-[11px] font-semibold mb-1">FHR (bpm)</label>
                <UInput v-model.number="partographForm.fetalHeartRateBpm" type="number" placeholder="110-160" />
              </div>
              <div>
                <label class="block text-[11px] font-semibold mb-1">កន្ត្រាក់/10mn</label>
                <UInput v-model.number="partographForm.contractionsPer10Min" type="number" min="0" max="5" />
              </div>
              <div>
                <label class="block text-[11px] font-semibold mb-1">ទឹកភ្លោះ</label>
                <select v-model="partographForm.amnioticFluidStatus" class="w-full rounded border p-1 text-xs bg-default">
                  <option value="CLEAR">ថ្លា (Clear)</option>
                  <option value="MECONIUM">លាមកព្រៃ (Meconium)</option>
                  <option value="BLOOD">ឈាម (Blood)</option>
                  <option value="INTACT">នៅស្រោម (Intact)</option>
                </select>
              </div>
            </div>

            <div class="flex justify-end gap-2">
              <UButton size="xs" variant="ghost" @click="isPartographModalOpen = false">បិទ</UButton>
              <UButton size="xs" type="submit" color="primary">កត់ត្រាចំណុច</UButton>
            </div>
          </form>
        </div>
      </template>
    </UModal>

    <!-- Modal: Register Newborn (Twin / Triplet Support) -->
    <UModal v-model:open="isNewbornModalOpen" title="ចុះបញ្ជីទារកទើបនឹងកើត (Register Newborn)">
      <template #body>
        <form class="space-y-4" @submit.prevent="handleRegisterNewborn">
          <div class="p-2.5 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-xs flex justify-between">
            <span class="font-bold text-blue-700 dark:text-blue-300">
              សម្រាល: {{ selectedDelivery?.deliveryNumber }} ({{ selectedDelivery?.plurality }})
            </span>
            <span class="font-bold text-pink-600">លំដាប់កូនទី (Birth Order): {{ newbornForm.birthOrder }}</span>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-semibold mb-1">លំដាប់កូនទី (Birth Order) *</label>
              <UInput v-model.number="newbornForm.birthOrder" type="number" min="1" max="10" />
            </div>
            <div>
              <label class="block text-xs font-semibold mb-1">ភេទ (Gender) *</label>
              <select v-model="newbornForm.gender" class="w-full rounded border px-2 py-1.5 text-xs bg-default">
                <option value="FEMALE">ស្រី (Female)</option>
                <option value="MALE">ប្រុស (Male)</option>
                <option value="AMBIGUOUS">មិនច្បាស់ (Ambiguous)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold mb-1">ទម្ងន់កំណើត (Weight Grams) *</label>
              <UInput v-model.number="newbornForm.weightGrams" type="number" placeholder="3000" />
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-semibold mb-1">ប្រវែង (Length cm)</label>
              <UInput v-model.number="newbornForm.lengthCm" type="number" step="0.5" />
            </div>
            <div>
              <label class="block text-xs font-semibold mb-1">ទំហំក្បាល (Head Circ cm)</label>
              <UInput v-model.number="newbornForm.headCircumferenceCm" type="number" step="0.5" />
            </div>
            <div>
              <label class="block text-xs font-semibold mb-1">ទំហំទ្រូង (Chest Circ cm)</label>
              <UInput v-model.number="newbornForm.chestCircumferenceCm" type="number" step="0.5" />
            </div>
          </div>

          <!-- APGAR Score 1 min and 5 min -->
          <div class="p-3 border rounded-xl space-y-2 bg-muted/50">
            <div class="font-semibold text-xs text-default">ពិន្ទុវាយតម្លៃ APGAR Score</div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] text-muted mb-1">APGAR នៅនាទីទី ១ (0 - 10)</label>
                <UInput v-model.number="newbornForm.apgar1Min.score" type="number" min="0" max="10" />
              </div>
              <div>
                <label class="block text-[11px] text-muted mb-1">APGAR នៅនាទីទី ៥ (0 - 10)</label>
                <UInput v-model.number="newbornForm.apgar5Min.score" type="number" min="0" max="10" />
              </div>
            </div>
          </div>

          <!-- Immediate Care Checklist -->
          <div class="grid grid-cols-2 gap-2 text-xs">
            <label class="flex items-center gap-1.5">
              <input v-model="newbornForm.immediateSkinToSkinContact" type="checkbox" class="rounded text-primary-600" />
              ស្បែកប៉ះស្បែក (Skin-to-Skin)
            </label>
            <label class="flex items-center gap-1.5">
              <input v-model="newbornForm.delayedCordClamping" type="checkbox" class="rounded text-primary-600" />
              ពន្យារកាត់ទងផ្ចិត (Delayed Clamping)
            </label>
            <label class="flex items-center gap-1.5">
              <input v-model="newbornForm.vitaminK1Administered" type="checkbox" class="rounded text-primary-600" />
              ចាក់វីតាមីន K1 (Vitamin K1)
            </label>
            <label class="flex items-center gap-1.5">
              <input v-model="newbornForm.tetracyclineEyeOintmentGiven" type="checkbox" class="rounded text-primary-600" />
              លាបថ្នាំភ្នែកតេត្រាស៊ីគ្លីន
            </label>
          </div>

          <div class="flex justify-end gap-2 pt-4">
            <UButton variant="ghost" color="neutral" @click="isNewbornModalOpen = false">បោះបង់</UButton>
            <UButton type="submit" color="primary">ចុះបញ្ជីទារក</UButton>
          </div>
        </form>
      </template>
    </UModal>

    <!-- Modal: Birth Slip Certificate with Verification Hash -->
    <UModal v-model:open="isBirthSlipModalOpen" title="លិខិតបញ្ជាក់កំណើត (Civil Registry Birth Slip)">
      <template #body>
        <div class="p-6 bg-default border rounded-2xl space-y-4 text-center">
          <div class="border-b pb-4">
            <div class="text-sm font-bold uppercase tracking-widest text-muted">ព្រះរាជាណាចក្រកម្ពុជា</div>
            <div class="text-xs text-dimmed">ជាតិ សាសនា ព្រះមហាក្សត្រ</div>
            <h2 class="text-lg font-bold text-pink-600 mt-2">លិខិតបញ្ជាក់កំណើតទារក (Birth Slip)</h2>
          </div>

          <div class="grid grid-cols-2 gap-4 text-left text-xs">
            <div><span class="text-dimmed">លេខកូដទារក:</span> <span class="font-bold">{{ selectedNewborn?.newbornCode }}</span></div>
            <div><span class="text-dimmed">លំដាប់កូនទី:</span> <span class="font-bold">កូនទី {{ selectedNewborn?.birthOrder }}</span></div>
            <div><span class="text-dimmed">ភេទ:</span> <span class="font-bold">{{ selectedNewborn?.gender }}</span></div>
            <div><span class="text-dimmed">ទម្ងន់:</span> <span class="font-bold">{{ selectedNewborn?.weightGrams }} ក្រាម</span></div>
            <div><span class="text-dimmed">APGAR (1/5):</span> <span class="font-bold">{{ selectedNewborn?.apgar1Min?.score }} / {{ selectedNewborn?.apgar5Min?.score }}</span></div>
            <div><span class="text-dimmed">កាលបរិច្ឆេទ:</span> <span class="font-bold">{{ new Date(selectedNewborn?.birthTime || Date.now()).toLocaleDateString() }}</span></div>
          </div>

          <!-- Civil Registry Phase 1 SHA-256 Hash Display -->
          <div class="p-3 bg-muted rounded-lg text-left text-[11px] font-mono break-all">
            <div class="text-[10px] text-dimmed uppercase font-sans font-bold mb-1">SHA-256 Civil Registry Verification Hash:</div>
            {{ selectedNewborn?.birthSlipQrHash }}
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <UButton variant="ghost" color="neutral" @click="isBirthSlipModalOpen = false">បិទ</UButton>
            <UButton color="primary" icon="i-lucide-printer" @click="window.print()">បោះពុម្ពលិខិត (Print)</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
