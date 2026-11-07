<script setup lang="ts">
import { ref, onMounted } from 'vue'

const { t } = useI18n()
const toast = useToast()

const facilities = ref<any[]>([])
const loading = ref(false)
const selectedType = ref('')

const isCreateModalOpen = ref(false)
const isDedupModalOpen = ref(false)
const isMerging = ref(false)

const facilityForm = ref({
  code: '',
  nameKm: '',
  nameEn: '',
  type: 'REFERRAL_HOSPITAL',
  province: 'Phnom Penh',
  district: 'Daun Penh',
  commune: 'Phsar Kandal',
  contactPhone: '',
  contactEmail: '',
  address: '',
  isActive: true
})

// Deduplication tool state
const dedupQuery = ref({
  name: '',
  dateOfBirth: '',
  nssfCardNumber: '',
  idPoorCardNumber: '',
  phone: ''
})
const duplicateCandidates = ref<any[]>([])
const dedupSearched = ref(false)

const cambodianProvinces = [
  'Phnom Penh', 'Kandal', 'Kampong Cham', 'Siem Reap', 'Battambang',
  'Takeo', 'Prey Veng', 'Kampot', 'Kampong Chhnang', 'Kampong Speu',
  'Kampong Thom', 'Banteay Meanchey', 'Svay Rieng', 'Pursat', 'Koh Kong',
  'Kratie', 'Preah Sihanouk', 'Stung Treng', 'Mondulkiri', 'Ratanakiri',
  'Pailin', 'Kep', 'Oddar Meanchey', 'Preah Vihear', 'Tboung Khmum'
]

const fetchFacilities = async () => {
  loading.value = true
  try {
    const query: any = {}
    if (selectedType.value) query.facilityType = selectedType.value
    const res = await $api('/maternity/facilities', { query })
    facilities.value = res.data || []
  } catch (err: any) {
    toast.add({ title: t('maternity.facilities.loadError'), description: err.message, color: 'error' })
  } finally {
    loading.value = false
  }
}

const openCreateModal = () => {
  facilityForm.value = {
    code: `FAC-${Date.now().toString().slice(-4)}`,
    nameKm: '',
    nameEn: '',
    type: 'REFERRAL_HOSPITAL',
    province: 'Phnom Penh',
    district: '',
    commune: '',
    contactPhone: '',
    contactEmail: '',
    address: '',
    isActive: true
  }
  isCreateModalOpen.value = true
}

const submitFacility = async () => {
  if (!facilityForm.value.code || !facilityForm.value.nameKm || !facilityForm.value.nameEn) {
    toast.add({ title: t('maternity.common.validationError'), description: t('maternity.facilities.requiredFields'), color: 'error' })
    return
  }
  try {
    await $api('/maternity/facilities', {
      method: 'POST',
      body: facilityForm.value
    })
    toast.add({ title: t('maternity.facilities.createdTitle'), description: t('maternity.facilities.created'), color: 'success' })
    isCreateModalOpen.value = false
    fetchFacilities()
  } catch (err: any) {
    toast.add({ title: t('maternity.common.error'), description: err.message, color: 'error' })
  }
}

const checkDuplicates = async () => {
  if (!dedupQuery.value.name && !dedupQuery.value.phone && !dedupQuery.value.nssfCardNumber && !dedupQuery.value.idPoorCardNumber) {
    toast.add({ title: t('maternity.facilities.inputRequired'), description: t('maternity.facilities.dedupInputRequired'), color: 'warning' })
    return
  }
  loading.value = true
  try {
    const res = await $api('/maternity/facilities/deduplicate-check', {
      method: 'POST',
      body: dedupQuery.value
    })
    duplicateCandidates.value = res.data?.matches || []
    dedupSearched.value = true
  } catch (err: any) {
    toast.add({ title: t('maternity.common.error'), description: err.message, color: 'error' })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchFacilities()
})
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-default p-6 rounded-2xl shadow-sm border border-default">
      <div class="flex items-center gap-3">
        <div class="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
          <UIcon name="i-lucide-building-2" class="w-6 h-6" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-highlighted">{{ t('maternity.facilities.title') }}</h1>
          <p class="text-sm text-muted">{{ t('maternity.facilities.subtitle') }}</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <UButton
          icon="i-lucide-user-check"
          color="neutral"
          variant="soft"
          class="rounded-xl px-4 py-2 font-medium"
          @click="isDedupModalOpen = true"
        >
          {{ t('maternity.facilities.checkDuplicates') }}
        </UButton>
        <UButton
          icon="i-lucide-plus"
          color="primary"
          class="rounded-xl px-4 py-2 font-medium"
          @click="openCreateModal"
        >
          {{ t('maternity.facilities.addFacility') }}
        </UButton>
      </div>
    </div>

    <!-- Multi-facility Architecture Banner -->
    <div class="p-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-indigo-500 text-white rounded-lg">
          <UIcon name="i-lucide-shield-alert" class="w-5 h-5" />
        </div>
        <div>
          <div class="text-sm font-bold text-highlighted">{{ t('maternity.facilities.isolationTitle') }}</div>
          <div class="text-xs text-muted">
            {{ t('maternity.facilities.isolationText') }}
          </div>
        </div>
      </div>
      <UBadge color="info" variant="subtle" class="font-bold">{{ t('maternity.facilities.activeIsolation') }}</UBadge>
    </div>

    <!-- Filters Bar -->
    <div class="flex flex-wrap items-center justify-between gap-4 bg-default p-4 rounded-xl border border-default">
      <div class="flex items-center gap-3">
        <select
          v-model="selectedType"
          class="text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
          @change="fetchFacilities"
        >
          <option value="">{{ t('maternity.facilities.allTypes') }}</option>
          <option value="NATIONAL_HOSPITAL">{{ t('maternity.facilities.nationalHospital') }}</option>
          <option value="REFERRAL_HOSPITAL">{{ t('maternity.facilities.referralHospital') }}</option>
          <option value="HEALTH_CENTER">{{ t('maternity.facilities.healthCenter') }}</option>
          <option value="PRIVATE_CLINIC">{{ t('maternity.facilities.privateClinic') }}</option>
        </select>
      </div>

      <UButton icon="i-lucide-refresh-cw" color="neutral" variant="ghost" size="sm" :loading="loading" @click="fetchFacilities">
        {{ t('maternity.common.refresh') }}
      </UButton>
    </div>

    <!-- Table -->
    <div class="bg-default rounded-2xl shadow-sm border border-default overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-toned">
          <thead class="bg-muted text-xs uppercase font-semibold text-muted border-b border-default">
            <tr>
              <th class="px-6 py-4">{{ t('maternity.facilities.colCode') }}</th>
              <th class="px-6 py-4">{{ t('maternity.facilities.colKhmerName') }}</th>
              <th class="px-6 py-4">{{ t('maternity.facilities.colEnglishName') }}</th>
              <th class="px-6 py-4">{{ t('maternity.facilities.colType') }}</th>
              <th class="px-6 py-4">{{ t('maternity.facilities.colLocation') }}</th>
              <th class="px-6 py-4">{{ t('maternity.facilities.colContact') }}</th>
              <th class="px-6 py-4 text-right">{{ t('maternity.common.status') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr v-if="facilities.length === 0" class="text-center py-8">
              <td colspan="7" class="py-8 text-dimmed">
                <UIcon name="i-lucide-building" class="w-8 h-8 mx-auto mb-2 opacity-50" />
                {{ t('maternity.facilities.empty') }}
              </td>
            </tr>
            <tr v-for="f in facilities" :key="f._id" class="hover:bg-muted/50 transition">
              <td class="px-6 py-4 font-mono font-bold text-highlighted">
                {{ f.code }}
              </td>
              <td class="px-6 py-4 font-semibold text-highlighted">
                {{ f.nameKm }}
              </td>
              <td class="px-6 py-4 text-toned">
                {{ f.nameEn }}
              </td>
              <td class="px-6 py-4">
                <UBadge
                  :color="f.type === 'NATIONAL_HOSPITAL' ? 'primary' : f.type === 'REFERRAL_HOSPITAL' ? 'info' : 'neutral'"
                  variant="subtle"
                  class="font-bold text-xs"
                >
                  {{ f.type }}
                </UBadge>
              </td>
              <td class="px-6 py-4 text-xs">
                <div class="font-medium text-highlighted">{{ f.province }}</div>
                <div class="text-dimmed">{{ f.district }} {{ f.commune ? ', ' + f.commune : '' }}</div>
              </td>
              <td class="px-6 py-4 text-xs font-mono text-muted">
                {{ f.contactPhone || 'N/A' }}
              </td>
              <td class="px-6 py-4 text-right">
                <UBadge :color="f.isActive ? 'success' : 'neutral'" class="font-bold text-xs">
                  {{ f.isActive ? t('maternity.facilities.active') : t('maternity.facilities.inactive') }}
                </UBadge>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create Facility Modal -->
    <UModal v-model:open="isCreateModalOpen" :ui="{ content: 'max-w-2xl' }">
      <template #content>
        <div class="p-6 space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-default">
            <h3 class="text-lg font-bold text-highlighted">{{ t('maternity.facilities.registerTitle') }}</h3>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="xs" @click="isCreateModalOpen = false" />
          </div>

          <div class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">{{ t('maternity.facilities.codeRequired') }}</label>
                <input
                  v-model="facilityForm.code"
                  type="text"
                  :placeholder="t('maternity.facilities.codePlaceholder')"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted font-mono"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">{{ t('maternity.facilities.type') }}</label>
                <select
                  v-model="facilityForm.type"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                >
                  <option value="NATIONAL_HOSPITAL">{{ t('maternity.facilities.nationalHospital') }}</option>
                  <option value="REFERRAL_HOSPITAL">{{ t('maternity.facilities.referralHospital') }}</option>
                  <option value="HEALTH_CENTER">{{ t('maternity.facilities.healthCenter') }}</option>
                  <option value="PRIVATE_CLINIC">{{ t('maternity.facilities.privateClinic') }}</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">{{ t('maternity.facilities.khmerNameRequired') }}</label>
                <input
                  v-model="facilityForm.nameKm"
                  type="text"
                  :placeholder="t('maternity.facilities.khmerNamePlaceholder')"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">{{ t('maternity.facilities.englishNameRequired') }}</label>
                <input
                  v-model="facilityForm.nameEn"
                  type="text"
                  :placeholder="t('maternity.facilities.englishNamePlaceholder')"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                />
              </div>
            </div>

            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">{{ t('maternity.facilities.province') }}</label>
                <select
                  v-model="facilityForm.province"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                >
                  <option v-for="prov in cambodianProvinces" :key="prov" :value="prov">{{ prov }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">{{ t('maternity.facilities.district') }}</label>
                <input
                  v-model="facilityForm.district"
                  type="text"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">{{ t('maternity.facilities.phone') }}</label>
                <input
                  v-model="facilityForm.contactPhone"
                  type="text"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                />
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t border-default">
            <UButton color="neutral" variant="ghost" @click="isCreateModalOpen = false">{{ t('maternity.common.cancel') }}</UButton>
            <UButton color="primary" @click="submitFacility">{{ t('maternity.facilities.saveFacility') }}</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Patient Deduplication Modal -->
    <UModal v-model:open="isDedupModalOpen" :ui="{ content: 'max-w-3xl' }">
      <template #content>
        <div class="p-6 space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-default">
            <div>
              <h3 class="text-lg font-bold text-highlighted">{{ t('maternity.facilities.dedupTitle') }}</h3>
              <p class="text-xs text-muted">{{ t('maternity.facilities.dedupSubtitle') }}</p>
            </div>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="xs" @click="isDedupModalOpen = false" />
          </div>

          <div class="p-4 bg-muted rounded-xl border border-default space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">{{ t('maternity.facilities.fullName') }}</label>
                <input
                  v-model="dedupQuery.name"
                  type="text"
                  :placeholder="t('maternity.facilities.fullNamePlaceholder')"
                  class="w-full text-sm p-2 rounded border border-accented"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">{{ t('maternity.facilities.phoneNumber') }}</label>
                <input
                  v-model="dedupQuery.phone"
                  type="text"
                  :placeholder="t('maternity.facilities.phonePlaceholder')"
                  class="w-full text-sm p-2 rounded border border-accented"
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">{{ t('maternity.facilities.nssfCard') }}</label>
                <input
                  v-model="dedupQuery.nssfCardNumber"
                  type="text"
                  :placeholder="t('maternity.facilities.nssfPlaceholder')"
                  class="w-full text-sm p-2 rounded border border-accented font-mono"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">{{ t('maternity.facilities.idPoorCard') }}</label>
                <input
                  v-model="dedupQuery.idPoorCardNumber"
                  type="text"
                  :placeholder="t('maternity.facilities.idPoorPlaceholder')"
                  class="w-full text-sm p-2 rounded border border-accented font-mono"
                />
              </div>
            </div>

            <div class="flex justify-end pt-1">
              <UButton icon="i-lucide-search" color="primary" size="sm" :loading="loading" @click="checkDuplicates">
                {{ t('maternity.facilities.scan') }}
              </UButton>
            </div>
          </div>

          <!-- Results -->
          <div v-if="dedupSearched" class="space-y-2">
            <div class="text-xs font-bold text-default uppercase">
              {{ t('maternity.facilities.candidates', { count: duplicateCandidates.length }) }}
            </div>

            <div v-if="duplicateCandidates.length === 0" class="p-6 text-center text-xs text-dimmed bg-muted rounded-xl">
              <UIcon name="i-lucide-check-circle-2" class="w-8 h-8 mx-auto mb-1 text-emerald-500" />
              {{ t('maternity.facilities.noDuplicates') }}
            </div>

            <div v-else class="space-y-2 max-h-60 overflow-y-auto">
              <div
                v-for="c in duplicateCandidates"
                :key="c._id"
                class="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl flex items-center justify-between text-xs"
              >
                <div>
                  <div class="font-bold text-highlighted">{{ c.fullName }} ({{ c.patientCode }})</div>
                  <div class="text-muted">{{ t('maternity.facilities.phoneValue', { phone: c.phone }) }} | {{ t('maternity.facilities.nssfValue', { nssf: c.nssfCardNumber || 'N/A' }) }}</div>
                  <div class="text-amber-700 font-semibold mt-0.5">{{ t('maternity.facilities.matchedOn', { reason: c.matchReason || t('maternity.facilities.identifierOverlap') }) }}</div>
                </div>
                <UBadge color="warning" class="font-bold">{{ t('maternity.facilities.duplicateWarning') }}</UBadge>
              </div>
            </div>
          </div>

          <div class="flex justify-end pt-3 border-t border-default">
            <UButton color="neutral" variant="ghost" @click="isDedupModalOpen = false">{{ t('maternity.common.close') }}</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
