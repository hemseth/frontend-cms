<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const { t } = useI18n()
const toast = useToast()

const episodes = ref<any[]>([])
const loading = ref(false)
const searchQuery = ref('')
const selectedStatus = ref('')

const isNewEpisodeModalOpen = ref(false)
const isAncModalOpen = ref(false)
const selectedEpisode = ref<any>(null)

// Form state for New Episode
const episodeForm = ref({
  patientId: '',
  gravida: 1,
  para: 0,
  abortus: 0,
  livingChildren: 0,
  lmp: '',
  edd: '',
  ultrasoundEdd: '',
  plurality: 'SINGLETON',
  isPacCase: false,
  pacMethod: undefined as string | undefined,
  isHighRisk: false,
  riskFactors: [] as string[],
  notes: ''
})

// Form state for ANC Visit
const ancForm = ref({
  visitNumber: 1,
  visitDate: new Date().toISOString().split('T')[0],
  gestationalAgeWeeks: 12,
  fundalHeightCm: 12,
  fetalHeartRateBpm: 140,
  presentation: 'CEPHALIC',
  maternalWeightKg: 55,
  systolicBp: 110,
  diastolicBp: 70,
  urineProtein: 'NEGATIVE',
  urineGlucose: 'NEGATIVE',
  hemoglobinGdl: 11.5,
  ironFolicAcidGiven: true,
  tetanusToxoidGiven: false,
  dangerSigns: [] as string[],
  nextVisitDate: '',
  notes: ''
})

// Auto calculate EDD based on LMP (Naegele's rule: +280 days)
const onLmpChange = () => {
  if (episodeForm.value.lmp) {
    const lmpDate = new Date(episodeForm.value.lmp)
    if (!isNaN(lmpDate.getTime())) {
      const eddDate = new Date(lmpDate.getTime() + 280 * 24 * 60 * 60 * 1000)
      episodeForm.value.edd = eddDate.toISOString().split('T')[0]
    }
  }
}

const patientsList = ref<any[]>([])
const fetchPatients = async () => {
  try {
    const res = await $api('/patients', { query: { limit: 100 } })
    patientsList.value = res.data || []
  } catch (err) {
    console.error('Failed to load patients:', err)
  }
}

const fetchEpisodes = async () => {
  loading.value = true
  try {
    const query: any = { limit: 100 }
    if (searchQuery.value) query.search = searchQuery.value
    if (selectedStatus.value) query.status = selectedStatus.value

    const res = await $api('/maternity/episodes', { query })
    episodes.value = res.data || []
  } catch (err: any) {
    toast.add({ title: t('maternity.common.loadFailed'), description: err.message, color: 'error' })
  } finally {
    loading.value = false
  }
}

const handleCreateEpisode = async () => {
  if (!episodeForm.value.patientId) {
    toast.add({ title: t('maternity.common.selectPatientToast'), color: 'warning' })
    return
  }

  try {
    await $api('/maternity/episodes', {
      method: 'POST',
      body: episodeForm.value
    })
    toast.add({ title: t('maternity.episodes.created'), color: 'success' })
    isNewEpisodeModalOpen.value = false
    fetchEpisodes()
  } catch (err: any) {
    toast.add({ title: t('maternity.common.error'), description: err.data?.message || err.message, color: 'error' })
  }
}

const openAncModal = (episode: any) => {
  selectedEpisode.value = episode
  ancForm.value.visitNumber = (episode.ancVisits?.length || 0) + 1
  isAncModalOpen.value = true
}

const handleRecordAnc = async () => {
  if (!selectedEpisode.value) return
  try {
    await $api('/maternity/anc', {
      method: 'POST',
      body: {
        ...ancForm.value,
        episodeId: selectedEpisode.value._id
      }
    })
    toast.add({ title: t('maternity.episodes.ancRecorded'), color: 'success' })
    isAncModalOpen.value = false
    fetchEpisodes()
  } catch (err: any) {
    toast.add({ title: t('maternity.common.error'), description: err.data?.message || err.message, color: 'error' })
  }
}

onMounted(() => {
  fetchEpisodes()
  fetchPatients()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-highlighted flex items-center gap-2">
          <UIcon name="i-lucide-heart-pulse" class="w-7 h-7 text-pink-500" />
          {{ t('maternity.episodes.title') }}
        </h1>
        <p class="text-sm text-muted mt-1">
          {{ t('maternity.episodes.subtitle') }}
        </p>
      </div>
      <div class="flex items-center gap-3">
        <UButton
          icon="i-lucide-plus"
          color="primary"
          @click="isNewEpisodeModalOpen = true"
        >
          {{ t('maternity.episodes.newEpisode') }}
        </UButton>
      </div>
    </div>

    <!-- Filters & Search -->
    <UCard>
      <div class="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div class="w-full sm:w-80">
          <UInput
            v-model="searchQuery"
            icon="i-lucide-search"
            :placeholder="t('maternity.episodes.searchPlaceholder')"
            @update:model-value="fetchEpisodes"
          />
        </div>
        <div class="flex items-center gap-3 w-full sm:w-auto">
          <USelect
            v-model="selectedStatus"
            :items="[
              { label: t('maternity.episodes.statusAll'), value: '' },
              { label: t('maternity.episodes.statusActive'), value: 'ACTIVE' },
              { label: t('maternity.episodes.statusDelivered'), value: 'DELIVERED' },
              { label: t('maternity.episodes.statusClosed'), value: 'CLOSED' },
            ]"
            @update:model-value="fetchEpisodes"
          />
        </div>
      </div>
    </UCard>

    <!-- Episodes Table -->
    <UCard>
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-muted">
          <thead class="text-xs uppercase bg-muted text-default">
            <tr>
              <th class="px-4 py-3">{{ t('maternity.episodes.colEpisodeCode') }}</th>
              <th class="px-4 py-3">{{ t('maternity.episodes.colPatientName') }}</th>
              <th class="px-4 py-3">GPAL (G-P-A-L)</th>
              <th class="px-4 py-3">{{ t('maternity.episodes.colLmpEdd') }}</th>
              <th class="px-4 py-3">{{ t('maternity.episodes.colPlurality') }}</th>
              <th class="px-4 py-3">{{ t('maternity.episodes.colRisk') }}</th>
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
            <tr v-else-if="episodes.length === 0">
              <td colspan="8" class="text-center py-8 text-dimmed">
                {{ t('maternity.episodes.empty') }}
              </td>
            </tr>
            <tr v-for="ep in episodes" :key="ep._id" class="hover:bg-muted">
              <td class="px-4 py-3 font-semibold text-highlighted">
                {{ ep.episodeNumber }}
              </td>
              <td class="px-4 py-3">
                <div class="font-medium text-highlighted">{{ ep.patientId?.khmerName || ep.patientId?.englishName || 'N/A' }}</div>
                <div class="text-xs text-dimmed">{{ ep.patientId?.patientCode }} | {{ t('maternity.episodes.ageYears', { age: ep.patientId?.age || '?' }) }}</div>
              </td>
              <td class="px-4 py-3 font-medium text-indigo-600 dark:text-indigo-400">
                G{{ ep.gravida }} P{{ ep.para }} A{{ ep.abortus }} L{{ ep.livingChildren }}
              </td>
              <td class="px-4 py-3 text-xs">
                <div>LMP: {{ ep.lmp ? new Date(ep.lmp).toLocaleDateString() : 'N/A' }}</div>
                <div class="font-semibold text-pink-600">EDD: {{ ep.edd ? new Date(ep.edd).toLocaleDateString() : 'N/A' }}</div>
              </td>
              <td class="px-4 py-3 text-xs">
                <UBadge :color="ep.plurality === 'SINGLETON' ? 'neutral' : 'primary'" variant="subtle">
                  {{ ep.plurality }}
                </UBadge>
              </td>
              <td class="px-4 py-3">
                <UBadge v-if="ep.isHighRisk" color="error" variant="subtle" size="sm">
                  {{ t('maternity.episodes.highRisk') }}
                </UBadge>
                <UBadge v-else color="success" variant="subtle" size="sm">
                  {{ t('maternity.episodes.normalRisk') }}
                </UBadge>
              </td>
              <td class="px-4 py-3">
                <UBadge :color="ep.status === 'ACTIVE' ? 'primary' : 'neutral'" variant="subtle" size="sm">
                  {{ ep.status }}
                </UBadge>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-2">
                  <UButton
                    size="xs"
                    color="secondary"
                    variant="soft"
                    icon="i-lucide-stethoscope"
                    @click="openAncModal(ep)"
                  >
                    {{ t('maternity.episodes.ancButton') }}
                  </UButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <!-- Modal: Create New Episode -->
    <UModal v-model:open="isNewEpisodeModalOpen" :title="t('maternity.episodes.newEpisodeModalTitle')">
      <template #body>
        <form class="space-y-4" @submit.prevent="handleCreateEpisode">
          <div>
            <label class="block text-xs font-semibold text-default mb-1">{{ t('maternity.episodes.patientLabel') }}</label>
            <select
              v-model="episodeForm.patientId"
              class="w-full rounded-lg border border-accented bg-default px-3 py-2 text-sm text-highlighted"
            >
              <option value="" disabled>{{ t('maternity.common.choosePatientOption') }}</option>
              <option v-for="p in patientsList" :key="p._id" :value="p._id">
                {{ p.khmerName || p.englishName }} ({{ p.patientCode }})
              </option>
            </select>
          </div>

          <!-- GPAL inputs -->
          <div>
            <label class="block text-xs font-semibold text-default mb-1">{{ t('maternity.episodes.gpalHistory') }}</label>
            <div class="grid grid-cols-4 gap-2">
              <div>
                <span class="text-[10px] text-dimmed">{{ t('maternity.episodes.gravida') }}</span>
                <UInput v-model.number="episodeForm.gravida" type="number" min="1" />
              </div>
              <div>
                <span class="text-[10px] text-dimmed">{{ t('maternity.episodes.para') }}</span>
                <UInput v-model.number="episodeForm.para" type="number" min="0" />
              </div>
              <div>
                <span class="text-[10px] text-dimmed">{{ t('maternity.episodes.abortus') }}</span>
                <UInput v-model.number="episodeForm.abortus" type="number" min="0" />
              </div>
              <div>
                <span class="text-[10px] text-dimmed">{{ t('maternity.episodes.living') }}</span>
                <UInput v-model.number="episodeForm.livingChildren" type="number" min="0" />
              </div>
            </div>
          </div>

          <!-- LMP and Calculated EDD -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-default mb-1">{{ t('maternity.episodes.lmp') }}</label>
              <UInput v-model="episodeForm.lmp" type="date" @change="onLmpChange" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-default mb-1">{{ t('maternity.episodes.edd') }}</label>
              <UInput v-model="episodeForm.edd" type="date" />
            </div>
          </div>

          <!-- Plurality & PAC -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-default mb-1">{{ t('maternity.episodes.plurality') }}</label>
              <select
                v-model="episodeForm.plurality"
                class="w-full rounded-lg border border-accented bg-default px-3 py-2 text-sm text-highlighted"
              >
                <option value="SINGLETON">{{ t('maternity.episodes.singleton') }}</option>
                <option value="TWIN">{{ t('maternity.episodes.twin') }}</option>
                <option value="TRIPLET">{{ t('maternity.episodes.triplet') }}</option>
                <option value="HIGHER_ORDER">{{ t('maternity.episodes.higherOrder') }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-default mb-1">{{ t('maternity.episodes.pacCaseLabel') }}</label>
              <div class="flex items-center gap-2 pt-2">
                <input v-model="episodeForm.isPacCase" type="checkbox" id="pacCheck" class="rounded text-primary-600" />
                <label for="pacCheck" class="text-sm">{{ t('maternity.episodes.pacCase') }}</label>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 pt-2">
            <input v-model="episodeForm.isHighRisk" type="checkbox" id="highRiskCheck" class="rounded text-red-600" />
            <label for="highRiskCheck" class="text-sm font-semibold text-red-600">{{ t('maternity.episodes.highRiskPregnancy') }}</label>
          </div>

          <div class="flex justify-end gap-2 pt-4">
            <UButton variant="ghost" color="neutral" @click="isNewEpisodeModalOpen = false">{{ t('maternity.common.cancel') }}</UButton>
            <UButton type="submit" color="primary">{{ t('maternity.common.save') }}</UButton>
          </div>
        </form>
      </template>
    </UModal>

    <!-- Modal: Record ANC Visit -->
    <UModal v-model:open="isAncModalOpen" :title="t('maternity.episodes.ancModalTitle')">
      <template #body>
        <form class="space-y-4" @submit.prevent="handleRecordAnc">
          <div class="p-3 bg-pink-50 dark:bg-pink-950/30 rounded-lg text-xs flex justify-between items-center">
            <span class="font-bold text-pink-700 dark:text-pink-300">
              {{ t('maternity.episodes.patientValue', { name: selectedEpisode?.patientId?.khmerName || selectedEpisode?.patientId?.englishName }) }}
            </span>
            <span class="text-muted">{{ t('maternity.episodes.episodeValue', { code: selectedEpisode?.episodeNumber }) }}</span>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-medium mb-1">{{ t('maternity.episodes.visitNumber') }}</label>
              <UInput v-model.number="ancForm.visitNumber" type="number" min="1" />
            </div>
            <div>
              <label class="block text-xs font-medium mb-1">{{ t('maternity.episodes.gaWeeks') }}</label>
              <UInput v-model.number="ancForm.gestationalAgeWeeks" type="number" min="1" max="44" />
            </div>
            <div>
              <label class="block text-xs font-medium mb-1">{{ t('maternity.episodes.fundalHeight') }}</label>
              <UInput v-model.number="ancForm.fundalHeightCm" type="number" min="0" />
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-medium mb-1">{{ t('maternity.episodes.fhr') }}</label>
              <UInput v-model.number="ancForm.fetalHeartRateBpm" type="number" placeholder="110-160" />
            </div>
            <div>
              <label class="block text-xs font-medium mb-1">{{ t('maternity.episodes.maternalWeight') }}</label>
              <UInput v-model.number="ancForm.maternalWeightKg" type="number" step="0.1" />
            </div>
            <div>
              <label class="block text-xs font-medium mb-1">{{ t('maternity.episodes.bloodPressure') }}</label>
              <div class="flex items-center gap-1">
                <UInput v-model.number="ancForm.systolicBp" type="number" placeholder="120" />
                <span>/</span>
                <UInput v-model.number="ancForm.diastolicBp" type="number" placeholder="80" />
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium mb-1">{{ t('maternity.episodes.urineProtein') }}</label>
              <select v-model="ancForm.urineProtein" class="w-full rounded border px-2 py-1.5 text-xs bg-default">
                <option value="NEGATIVE">{{ t('maternity.episodes.negative') }}</option>
                <option value="TRACE">{{ t('maternity.episodes.trace') }}</option>
                <option value="1_PLUS">1+ (30 mg/dL)</option>
                <option value="2_PLUS">2+ (100 mg/dL)</option>
                <option value="3_PLUS">{{ t('maternity.episodes.proteinPreeclampsia') }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium mb-1">{{ t('maternity.episodes.urineGlucose') }}</label>
              <select v-model="ancForm.urineGlucose" class="w-full rounded border px-2 py-1.5 text-xs bg-default">
                <option value="NEGATIVE">{{ t('maternity.episodes.negative') }}</option>
                <option value="TRACE">{{ t('maternity.episodes.trace') }}</option>
                <option value="1_PLUS">1+</option>
                <option value="2_PLUS">2+</option>
              </select>
            </div>
          </div>

          <div class="flex items-center gap-4 text-xs font-medium pt-2">
            <label class="flex items-center gap-1.5">
              <input v-model="ancForm.ironFolicAcidGiven" type="checkbox" class="rounded text-primary-600" />
              {{ t('maternity.episodes.ironFolic') }}
            </label>
            <label class="flex items-center gap-1.5">
              <input v-model="ancForm.tetanusToxoidGiven" type="checkbox" class="rounded text-primary-600" />
              {{ t('maternity.episodes.tetanusToxoid') }}
            </label>
          </div>

          <div>
            <label class="block text-xs font-medium mb-1">{{ t('maternity.episodes.nextVisitDate') }}</label>
            <UInput v-model="ancForm.nextVisitDate" type="date" />
          </div>

          <div class="flex justify-end gap-2 pt-4">
            <UButton variant="ghost" color="neutral" @click="isAncModalOpen = false">{{ t('maternity.common.cancel') }}</UButton>
            <UButton type="submit" color="primary">{{ t('maternity.episodes.recordVisit') }}</UButton>
          </div>
        </form>
      </template>
    </UModal>
  </div>
</template>
