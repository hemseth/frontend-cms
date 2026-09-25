<template>
  <div class="space-y-6 font-khmer p-4">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <UIcon name="i-lucide-bed" class="text-primary-500" />
          <span>អ្នកជំងឺកំពុងសម្រាកព្យាបាល (Current Inpatients Dashboard)</span>
        </h1>
        <p class="text-xs text-muted mt-1">
          គ្រប់គ្រងការសម្រាកព្យាបាល ទីតាំងសាល/បន្ទប់/គ្រែ គ្រូពេទ្យទទួលខុសត្រូវ និងការពិនិត្យជុំសាល
        </p>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          label="ផ្ទាំងគ្រែ (Bed Board)"
          icon="i-lucide-layout-grid"
          color="neutral"
          variant="outline"
          to="/inpatient/bed-board"
        />
        <UButton
          label="គ្រប់គ្រងសាល (Wards)"
          icon="i-lucide-hospital"
          color="neutral"
          variant="outline"
          to="/ipd/wards"
        />
        <UButton
          label="បញ្ចូលអ្នកជំងឺសម្រាក (New Admission)"
          icon="i-lucide-user-plus"
          color="primary"
          @click="isAdmissionModalOpen = true"
        />
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="ghost"
          :loading="isLoading"
          @click="fetchInpatients"
        />
      </div>
    </div>

    <!-- Metrics Summary -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="p-4 rounded-xl bg-default border border-default shadow-xs flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center font-bold">
          <UIcon name="i-lucide-users" class="w-6 h-6" />
        </div>
        <div>
          <span class="text-xs text-muted">អ្នកជំងឺសម្រាកសរុប</span>
          <p class="text-xl font-bold text-highlighted">
            {{ inpatients.length }} នាក់
          </p>
        </div>
      </div>

      <div class="p-4 rounded-xl bg-default border border-default shadow-xs flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
          <UIcon name="i-lucide-bed-double" class="w-6 h-6" />
        </div>
        <div>
          <span class="text-xs text-muted">គ្រែទំនេរ (Available)</span>
          <p class="text-xl font-bold text-emerald-600">
            {{ bedCount('available') }} គ្រែ
          </p>
        </div>
      </div>

      <div class="p-4 rounded-xl bg-default border border-default shadow-xs flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-600 flex items-center justify-center font-bold">
          <UIcon name="i-lucide-sparkles" class="w-6 h-6" />
        </div>
        <div>
          <span class="text-xs text-muted">កំពុងសម្អាត (Cleaning)</span>
          <p class="text-xl font-bold text-sky-600">
            {{ bedCount('cleaning') }} គ្រែ
          </p>
        </div>
      </div>

      <div class="p-4 rounded-xl bg-default border border-default shadow-xs flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center font-bold">
          <UIcon name="i-lucide-clock" class="w-6 h-6" />
        </div>
        <div>
          <span class="text-xs text-muted">ស្នាក់នៅជាមធ្យម</span>
          <p class="text-xl font-bold text-amber-600">
            {{ averageStay }} ថ្ងៃ
          </p>
        </div>
      </div>
    </div>

    <!-- Filters & Table List -->
    <UCard>
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <!-- Search Input -->
          <div class="w-full md:w-80">
            <UInput
              v-model="searchQuery"
              icon="i-lucide-search"
              placeholder="ស្វែងរកតាមឈ្មោះ, លេខកូដ, រោគវិនិច្ឆ័យ..."
              size="sm"
            />
          </div>

          <!-- Ward Filter -->
          <div class="flex items-center gap-2">
            <span class="text-xs text-muted font-semibold">សាល៖</span>
            <select
              v-model="selectedWard"
              class="p-1.5 border border-default rounded-lg bg-default text-xs font-medium"
            >
              <option value="ALL">
                ទាំងអស់ (All Wards)
              </option>
              <option v-for="ward in wardOptions" :key="ward.id" :value="ward.id">
                {{ ward.name }}
              </option>
            </select>
          </div>
        </div>
      </template>

      <!-- Table Content -->
      <div v-if="isLoading" class="py-16 text-center text-dimmed">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto mb-2 text-primary-500" />
        <span class="text-sm">កំពុងទាញយកបញ្ជីអ្នកជំងឺសម្រាកព្យាបាល...</span>
      </div>

      <UAlert
        v-else-if="loadError"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :title="loadError"
        :actions="[{ label: 'Retry', onClick: fetchInpatients }]"
      />

      <div v-else-if="filteredInpatients.length === 0" class="py-16 text-center text-dimmed">
        <UIcon name="i-lucide-folder-open" class="w-10 h-10 mx-auto mb-2 text-dimmed" />
        <p class="text-sm font-medium">
          មិនមានអ្នកជំងឺសម្រាកស្របតាមលក្ខខណ្ឌស្វែងរកទេ
        </p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full text-xs text-left">
          <thead class="bg-muted text-toned font-semibold border-b border-default">
            <tr>
              <th class="p-3">
                អ្នកជំងឺ (Patient)
              </th>
              <th class="p-3">
                កូដសម្រាក
              </th>
              <th class="p-3">
                ថ្ងៃចូលសម្រាក
              </th>
              <th class="p-3">
                រយៈពេលស្នាក់នៅ
              </th>
              <th class="p-3">
                សាល & គ្រែ
              </th>
              <th class="p-3">
                វេជ្ជបណ្ឌិតទទួលបន្ទុក
              </th>
              <th class="p-3">
                រោគវិនិច្ឆ័យ
              </th>
              <th class="p-3 text-center">
                ស្ថានភាព
              </th>
              <th class="p-3 text-right">
                សកម្មភាព (Actions)
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr
              v-for="adm in filteredInpatients"
              :key="adm.admissionId"
              class="hover:bg-muted/60 transition-colors"
            >
              <!-- Patient Info -->
              <td class="p-3 font-bold text-highlighted">
                <div>{{ adm.patient?.nameKh || adm.patient?.nameEn || adm.patient?.name }}</div>
                <div class="text-[11px] font-normal text-muted">
                  ID: P-{{ String(adm.patient?.pId || '').padStart(6, '0') }} • {{ adm.patient?.gender == 2 ? 'ស្រី' : 'ប្រុស' }}
                </div>
              </td>

              <!-- Admission No -->
              <td class="p-3 font-medium text-primary">
                {{ adm.admissionNumber }}
              </td>

              <!-- Admission Date -->
              <td class="p-3 text-toned">
                {{ formatDate(adm.admittedAt) }}
              </td>

              <!-- Length of Stay -->
              <td class="p-3 font-bold text-rose-600 dark:text-rose-400">
                {{ adm.lengthOfStayDays }} ថ្ងៃ
              </td>

              <!-- Location (Ward & Bed) -->
              <td class="p-3">
                <div class="font-bold text-highlighted">
                  {{ adm.location?.wardNameKh || 'សាលទូទៅ' }}
                </div>
                <div class="text-[11px] text-muted">
                  បន្ទប់ {{ adm.location?.roomCode }} • <span class="font-bold text-primary-600">គ្រែ {{ adm.location?.bedCode }}</span>
                </div>
              </td>

              <!-- Attending Doctor -->
              <td class="p-3 font-medium text-default">
                👨‍⚕️ {{ adm.attendingDoctor?.name || adm.attendingDoctor?.nameKh || '-' }}
              </td>

              <!-- Diagnosis -->
              <td class="p-3 text-toned max-w-xs truncate">
                {{ adm.primaryDiagnosis?.nameKh || adm.primaryDiagnosis?.nameEn || adm.admissionReason || '-' }}
              </td>

              <!-- Status -->
              <td class="p-3 text-center">
                <UBadge
                  :color="adm.status === 'ready_for_discharge' ? 'warning' : 'primary'"
                  variant="subtle"
                  size="xs"
                >
                  {{ adm.status === 'ready_for_discharge' ? 'Ready Discharge' : 'Admitted' }}
                </UBadge>
              </td>

              <!-- Action Menu -->
              <td class="p-3 text-right">
                <div class="flex items-center justify-end gap-1">
                  <UButton
                    icon="i-lucide-eye"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    label="View"
                    :to="`/inpatient/${adm.admissionId}`"
                  />
                  <UButton
                    icon="i-lucide-arrow-left-right"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    label="Transfer"
                    @click="openTransferModal(adm)"
                  />
                  <UButton
                    icon="i-lucide-user-cog"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    label="Doctor"
                    @click="openChangeDoctorModal(adm)"
                  />
                  <UButton
                    icon="i-lucide-log-out"
                    color="error"
                    variant="soft"
                    size="xs"
                    label="Discharge"
                    @click="openDischargeModal(adm)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <!-- Modals -->
    <TransferBedModal
      v-model:open="isTransferModalOpen"
      :admission="selectedAdmission"
      @transferred="fetchInpatients"
    />

    <ChangeDoctorModal
      v-model:open="isDoctorModalOpen"
      :admission="selectedAdmission"
      @changed="fetchInpatients"
    />

    <DischargeModal
      v-model:open="isDischargeModalOpen"
      :admission="selectedAdmission"
      @discharged="fetchInpatients"
    />

    <BedAdmissionModal
      v-model:open="isAdmissionModalOpen"
      @admitted="fetchInpatients"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import TransferBedModal from '~/components/inpatient/TransferBedModal.vue'
import ChangeDoctorModal from '~/components/inpatient/ChangeDoctorModal.vue'
import DischargeModal from '~/components/inpatient/DischargeModal.vue'
import BedAdmissionModal from '~/components/ipd/BedAdmissionModal.vue'

const isLoading = ref(false)
const inpatients = ref<any[]>([])
const loadError = ref('')
const beds = ref<any[]>([])
const bedCount = (status: string) => beds.value.filter(b => String(b.status).toLowerCase() === status).length
const averageStay = computed(() => inpatients.value.length
  ? (inpatients.value.reduce((sum, adm) => sum + (adm.lengthOfStayDays || 0), 0) / inpatients.value.length).toFixed(1)
  : '-')

const searchQuery = ref('')
const selectedWard = ref('ALL')
// Built from the admissions themselves so the filter only offers wards that exist in this clinic.
const wardOptions = computed(() => {
  const wards = new Map<string, string>()
  for (const adm of inpatients.value) {
    if (adm.location?.wardId) wards.set(String(adm.location.wardId), adm.location.wardNameKh || adm.location.wardNameEn || String(adm.location.wardId))
  }
  return [...wards].map(([id, name]) => ({ id, name }))
})

const isTransferModalOpen = ref(false)
const isDoctorModalOpen = ref(false)
const isDischargeModalOpen = ref(false)
const isAdmissionModalOpen = ref(false)
const selectedAdmission = ref<any>(null)

async function fetchInpatients() {
  isLoading.value = true
  loadError.value = ''
  try {
    const [res, bedRes]: any = await Promise.all([$api('/inpatient/inpatients'), $api('/beds')])
    inpatients.value = res?.data || []
    beds.value = bedRes?.data || []
  } catch (err: any) {
    inpatients.value = []
    beds.value = []
    loadError.value = getApiErrorMessage(err, 'មិនអាចទាញយកបញ្ជីអ្នកជំងឺសម្រាកបានទេ (Could not load inpatients)')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchInpatients()
})

const filteredInpatients = computed(() => {
  return inpatients.value.filter((adm: any) => {
    if (selectedWard.value !== 'ALL' && String(adm.location?.wardId) !== selectedWard.value) return false
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      const pName = (adm.patient?.nameKh || adm.patient?.nameEn || adm.patient?.name || '').toLowerCase()
      const code = (adm.admissionNumber || '').toLowerCase()
      const reason = (adm.admissionReason || '').toLowerCase()
      const doctor = (adm.attendingDoctor?.name || '').toLowerCase()
      if (!pName.includes(q) && !code.includes(q) && !reason.includes(q) && !doctor.includes(q)) return false
    }
    return true
  })
})

function formatDate(d: any) {
  if (!d) return '-'
  const date = new Date(d)
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
}

function openTransferModal(adm: any) {
  selectedAdmission.value = adm
  isTransferModalOpen.value = true
}

function openChangeDoctorModal(adm: any) {
  selectedAdmission.value = adm
  isDoctorModalOpen.value = true
}

function openDischargeModal(adm: any) {
  selectedAdmission.value = adm
  isDischargeModalOpen.value = true
}
</script>

<style scoped>
.font-khmer {
  font-family: 'Battambang', 'Noto Sans Khmer', serif;
}
</style>
