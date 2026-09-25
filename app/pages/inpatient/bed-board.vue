<template>
  <div class="space-y-6 font-khmer p-4">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <UIcon name="i-lucide-layout-grid" class="text-primary-500" />
          <span>ផ្ទាំងគ្រែ និងសាលសម្រាក (Ward & Bed Board)</span>
        </h1>
        <p class="text-xs text-muted mt-1">
          រចនាសម្ព័ន្ធឋានានុក្រម៖ សាល (Ward) ➔ បន្ទប់ (Room) ➔ គ្រែ (Bed)
        </p>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          label="បញ្ជីអ្នកជំងឺ (Inpatients List)"
          icon="i-lucide-list"
          color="neutral"
          variant="outline"
          to="/inpatient"
        />
        <UButton
          label="គ្រប់គ្រងសាល (Wards)"
          icon="i-lucide-hospital"
          color="neutral"
          variant="outline"
          to="/ipd/wards"
        />
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="ghost"
          :loading="isLoading"
          @click="fetchBedBoard"
        />
      </div>
    </div>

    <!-- Status Legend -->
    <div class="flex flex-wrap items-center gap-4 p-3 rounded-xl bg-default border border-default text-xs">
      <span class="font-bold text-toned">ស្ថានភាពគ្រែ៖</span>
      <div class="flex items-center gap-1.5">
        <span class="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
        <span>ទំនេរ (Available)</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-3 h-3 rounded-full bg-rose-500 inline-block" />
        <span>មានអ្នកជំងឺ (Occupied)</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-3 h-3 rounded-full bg-sky-500 inline-block" />
        <span>កំពុងសម្អាត (Cleaning)</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-3 h-3 rounded-full bg-amber-500 inline-block" />
        <span>កក់ទុក (Reserved)</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="w-3 h-3 rounded-full bg-gray-400 inline-block" />
        <span>ជួសជុល (Maintenance)</span>
      </div>
    </div>

    <!-- Wards and Rooms Grid -->
    <div v-if="isLoading" class="py-16 text-center text-dimmed">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto mb-2 text-primary-500" />
      <span class="text-sm">កំពុងទាញយកទិន្នន័យផ្ទាំងគ្រែ...</span>
    </div>

    <UAlert
      v-else-if="loadError"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="loadError"
      :actions="[{ label: 'Retry', onClick: fetchBedBoard }]"
    />

    <div v-else-if="bedBoard.length === 0" class="py-16 text-center text-muted space-y-3">
      <UIcon name="i-lucide-bed" class="w-10 h-10 mx-auto text-dimmed" />
      <p class="text-sm">
        មិនទាន់មានសាល បន្ទប់ ឬគ្រែនៅឡើយទេ (No wards, rooms or beds are set up yet)
      </p>
      <UButton label="រៀបចំសាល បន្ទប់ និងគ្រែ (Set up wards)" icon="i-lucide-settings" to="/ipd/wards" />
    </div>

    <div v-else class="space-y-6">
      <div
        v-for="ward in bedBoard"
        :key="ward.wardId"
        class="bg-default border border-default rounded-2xl p-5 shadow-xs space-y-4"
      >
        <!-- Ward Header -->
        <div class="flex items-center justify-between pb-3 border-b border-default">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-950 text-primary-600 flex items-center justify-center font-bold text-sm">
              <UIcon name="i-lucide-hospital" class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-base font-bold text-highlighted">
                {{ ward.nameKh }} ({{ ward.wardCode }})
              </h2>
              <span class="text-xs text-muted">
                ជាន់ទី {{ ward.floor || 1 }} • ចំណុះ {{ ward.capacity || 10 }} គ្រែ
              </span>
            </div>
          </div>
          <UBadge color="primary" variant="subtle" size="sm">
            {{ ward.category || 'GENERAL' }}
          </UBadge>
        </div>

        <!-- Rooms within this Ward -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="room in ward.rooms"
            :key="room.roomId"
            class="p-4 rounded-xl bg-muted/70 border border-default/80 space-y-3"
          >
            <!-- Room Code & Name -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <UIcon name="i-lucide-door-open" class="text-muted w-4 h-4" />
                <span class="font-bold text-xs text-highlighted">
                  បន្ទប់ {{ room.roomCode }}
                </span>
              </div>
              <span class="text-[11px] text-muted">{{ room.roomType || 'General' }}</span>
            </div>

            <!-- Beds Matrix inside Room -->
            <div class="grid grid-cols-2 gap-2">
              <div
                v-for="bed in room.beds"
                :key="bed.bedId"
                class="p-2.5 rounded-lg border text-xs transition-all cursor-pointer"
                :class="getBedCardClass(bed.status)"
                @click="onBedClick(bed)"
              >
                <!-- Bed Header -->
                <div class="flex items-center justify-between mb-1">
                  <span class="font-bold">គ្រែ {{ bed.bedCode }}</span>
                  <span
                    class="w-2 h-2 rounded-full"
                    :class="getBedDotClass(bed.status)"
                  />
                </div>

                <!-- Bed Occupant or State -->
                <div v-if="bed.occupant" class="space-y-0.5">
                  <p class="font-bold text-[11px] truncate text-highlighted">
                    👤 {{ bed.occupant.patientName }}
                  </p>
                  <p class="text-[10px] text-muted truncate">
                    👨‍⚕️ {{ bed.occupant.doctorName || '-' }}
                  </p>
                  <p class="text-[9px] text-rose-600 font-semibold truncate">
                    {{ bed.occupant.reason }}
                  </p>
                </div>

                <div v-else class="text-[11px] font-medium opacity-80 pt-1">
                  {{ getStatusText(bed.status) }}
                </div>

                <!-- Quick Action for Cleaning Beds -->
                <div v-if="String(bed.status).toLowerCase() === 'cleaning'" class="mt-2 pt-1 border-t border-sky-200/50">
                  <button
                    class="w-full py-0.5 text-[10px] font-bold text-sky-700 bg-sky-100 hover:bg-sky-200 rounded text-center transition"
                    @click.stop="completeCleaning(bed.bedId)"
                  >
                    ✨ សម្អាតរួច (Set Available)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <BedAdmissionModal
      v-model:open="isAdmissionModalOpen"
      :bed="bedToAdmit"
      :patient-id="admitPatientId"
      @admitted="fetchBedBoard"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import BedAdmissionModal from '~/components/ipd/BedAdmissionModal.vue'

const toast = useToast()
const isLoading = ref(false)
const bedBoard = ref<any[]>([])
const loadError = ref('')
const route = useRoute()

// Arriving from OPD with ?patientId= preselects that patient in the admission form.
const admitPatientId = computed(() => (route.query.patientId as string) || '')
const isAdmissionModalOpen = ref(false)
const bedToAdmit = ref<any>(null)

async function fetchBedBoard() {
  isLoading.value = true
  loadError.value = ''
  try {
    const res: any = await $api('/inpatient/bed-board')
    bedBoard.value = res?.data || []
  } catch (err: any) {
    // Show the fault instead of an empty board, which reads as "no wards configured".
    bedBoard.value = []
    loadError.value = getApiErrorMessage(err, 'មិនអាចទាញយកផ្ទាំងគ្រែបានទេ (Could not load the bed board)')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchBedBoard()
})

function getBedCardClass(status: string) {
  const s = String(status || '').toLowerCase()
  if (s === 'available') return 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
  if (s === 'occupied') return 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300'
  if (s === 'cleaning') return 'bg-sky-50/50 dark:bg-sky-950/20 border-sky-300 dark:border-sky-800 text-sky-800 dark:text-sky-300'
  if (s === 'reserved') return 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300'
  return 'bg-muted border-accented text-default'
}

function getBedDotClass(status: string) {
  const s = String(status || '').toLowerCase()
  if (s === 'available') return 'bg-emerald-500'
  if (s === 'occupied') return 'bg-rose-500'
  if (s === 'cleaning') return 'bg-sky-500'
  if (s === 'reserved') return 'bg-amber-500'
  return 'bg-gray-400'
}

function getStatusText(status: string) {
  const s = String(status || '').toLowerCase()
  if (s === 'available') return '🟢 ទំនេរ'
  if (s === 'occupied') return '🔴 កំពុងសម្រាក'
  if (s === 'cleaning') return '🧹 កំពុងសម្អាត'
  if (s === 'reserved') return '🟡 កក់ទុក'
  return '⚪ ជួសជុល'
}

function onBedClick(bed: any) {
  if (bed.occupant?.admissionId) {
    navigateTo(`/inpatient/${bed.occupant.admissionId}`)
  } else if (String(bed.status).toLowerCase() === 'available') {
    bedToAdmit.value = bed
    isAdmissionModalOpen.value = true
  }
}

async function completeCleaning(bedId: string) {
  try {
    await $api(`/inpatient/beds/${bedId}/cleaning/complete`, { method: 'POST' })
    toast.add({ title: 'Success', description: 'គ្រែត្រូវបានសម្អាតរួចរាល់ និងដាក់ឱ្យប្រើប្រាស់វិញ', color: 'success' })
    fetchBedBoard()
  } catch (err: any) {
    toast.add({ title: 'Error', description: getApiErrorMessage(err, 'មិនអាចកំណត់គ្រែថាសម្អាតរួចបានទេ (Could not mark the bed clean)'), color: 'error' })
  }
}
</script>

<style scoped>
.font-khmer {
  font-family: 'Battambang', 'Noto Sans Khmer', serif;
}
</style>
