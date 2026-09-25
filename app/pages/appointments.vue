<template>
  <div class="space-y-6 font-khmer p-4">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <UIcon name="i-lucide-calendar-days" class="text-primary-500" />
          <span>កាលវិភាគណាត់ជួប & តាមដានជំងឺ (Appointments & Follow-up)</span>
        </h1>
        <p class="text-xs text-muted mt-1">
          គ្រប់គ្រងការណាត់ជួបគ្រូពេទ្យ និងតាមដានការណាត់អ្នកជំងឺ
        </p>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          label="ណាត់ជួបថ្មី (New Appointment)"
          icon="i-lucide-plus"
          color="primary"
          @click="openNewAppointmentModal"
        />
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="outline"
          :loading="isLoading"
          @click="fetchAppointments"
        />
      </div>
    </div>

    <!-- Summary Metrics -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="p-4 rounded-xl bg-default border border-default shadow-xs flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-950 text-primary-600 flex items-center justify-center font-bold">
          <UIcon name="i-lucide-calendar" class="w-6 h-6" />
        </div>
        <div>
          <span class="text-xs text-muted">ណាត់សរុប (Total)</span>
          <p class="text-xl font-bold text-highlighted">
            {{ appointments.length }}
          </p>
        </div>
      </div>

      <div class="p-4 rounded-xl bg-default border border-default shadow-xs flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-600 flex items-center justify-center font-bold">
          <UIcon name="i-lucide-clock" class="w-6 h-6" />
        </div>
        <div>
          <span class="text-xs text-muted">បានណាត់ (Scheduled)</span>
          <p class="text-xl font-bold text-sky-600">
            {{ scheduledCount }}
          </p>
        </div>
      </div>

      <div class="p-4 rounded-xl bg-default border border-default shadow-xs flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center font-bold">
          <UIcon name="i-lucide-user-check" class="w-6 h-6" />
        </div>
        <div>
          <span class="text-xs text-muted">បានមកដល់ (Arrived)</span>
          <p class="text-xl font-bold text-amber-600">
            {{ arrivedCount }}
          </p>
        </div>
      </div>

      <div class="p-4 rounded-xl bg-default border border-default shadow-xs flex items-center gap-3">
        <div class="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
          <UIcon name="i-lucide-check-circle" class="w-6 h-6" />
        </div>
        <div>
          <span class="text-xs text-muted">បានពិនិត្យរួច (Completed)</span>
          <p class="text-xl font-bold text-emerald-600">
            {{ completedCount }}
          </p>
        </div>
      </div>
    </div>

    <!-- Filters & Table -->
    <UCard>
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <!-- Search -->
          <div class="w-full md:w-72">
            <UInput
              v-model="searchQuery"
              icon="i-lucide-search"
              placeholder="ស្វែងរកតាមឈ្មោះ ឬលេខទូរស័ព្ទ..."
              size="sm"
            />
          </div>

          <!-- Status Filters -->
          <div class="flex items-center gap-1.5 p-1 bg-elevated rounded-lg">
            <button
              v-for="st in statusTabs"
              :key="st.value"
              type="button"
              class="px-3 py-1 text-xs font-semibold rounded-md transition-all"
              :class="selectedStatus === st.value
                ? 'bg-primary-500 text-white shadow-xs font-bold'
                : 'text-toned hover:text-highlighted'"
              @click="selectedStatus = st.value"
            >
              {{ st.label }}
            </button>
          </div>
        </div>
      </template>

      <!-- Table List -->
      <div v-if="isLoading" class="py-12 text-center text-dimmed">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto mb-2 text-primary-500" />
        <span class="text-sm">កំពុងទាញយកទិន្នន័យការណាត់ជួប...</span>
      </div>

      <UAlert
        v-else-if="loadError"
        color="error"
        variant="subtle"
        icon="i-lucide-circle-alert"
        :title="loadError"
        :actions="[{ label: 'Retry', onClick: fetchAppointments }]"
      />

      <div v-else-if="filteredAppointments.length === 0" class="py-12 text-center text-dimmed">
        <UIcon name="i-lucide-calendar-x" class="w-10 h-10 mx-auto mb-2 text-dimmed" />
        <p class="text-sm font-medium">
          មិនមានការណាត់ជួបស្របតាមលក្ខខណ្ឌស្វែងរកទេ
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
                លេខទូរស័ព្ទ (Phone)
              </th>
              <th class="p-3">
                កាលបរិច្ឆេទ & ម៉ោងណាត់
              </th>
              <th class="p-3">
                គ្រូពេទ្យទទួលបន្ទុក
              </th>
              <th class="p-3">
                មូលហេតុណាត់
              </th>
              <th class="p-3 text-center">
                ស្ថានភាព
              </th>
              <th class="p-3 text-right">
                សកម្មភាព
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr
              v-for="apt in filteredAppointments"
              :key="apt._id"
              class="hover:bg-muted/60 transition-colors"
            >
              <td class="p-3">
                <div class="flex items-center gap-2">
                  <span class="font-bold text-highlighted">{{ apt.patientName }}</span>
                  <span
                    v-if="apt.patientId && (apt.patientId.patientCode || apt.patientId.pId)"
                    class="px-1.5 py-0.5 text-[10px] rounded bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-300 font-mono font-semibold"
                  >
                    {{ apt.patientId.patientCode || `P-${String(apt.patientId.pId).padStart(6, '0')}` }}
                  </span>
                </div>
              </td>
              <td class="p-3 text-toned">
                {{ apt.patientPhone || '-' }}
              </td>
              <td class="p-3">
                <span class="font-bold">{{ formatDate(apt.appointmentDate) }}</span>
                <span class="ml-2 px-1.5 py-0.5 rounded bg-elevated text-[11px] text-toned">
                  {{ apt.timeSlot || '09:00 AM' }}
                </span>
              </td>
              <td class="p-3 font-medium text-default">
                {{ apt.doctorName || apt.doctorId?.nameKh || apt.doctorId?.nameEn || '-' }}
              </td>
              <td class="p-3 text-toned max-w-xs truncate">
                {{ apt.reason || '-' }}
              </td>
              <td class="p-3 text-center">
                <UBadge
                  :color="getStatusColor(apt.status)"
                  variant="subtle"
                  size="xs"
                >
                  {{ apt.status || 'scheduled' }}
                </UBadge>
              </td>
              <td class="p-3 text-right">
                <div class="flex items-center justify-end gap-1">
                  <UButton
                    v-if="apt.status === 'scheduled'"
                    icon="i-lucide-check"
                    color="success"
                    variant="ghost"
                    size="xs"
                    label="Arrived"
                    @click="updateStatus(apt, 'arrived')"
                  />
                  <UButton
                    v-if="apt.status === 'arrived'"
                    icon="i-lucide-stethoscope"
                    color="primary"
                    variant="soft"
                    size="xs"
                    label="Start OPD"
                    @click="startConsultation(apt)"
                  />
                  <UButton
                    icon="i-lucide-pencil"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    @click="editAppointment(apt)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <!-- Appointment Modal -->
    <AppointmentModal
      v-model:open="isModalOpen"
      :appointment="selectedAppointment"
      @saved="fetchAppointments"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppointmentModal from '~/components/appointments/AppointmentModal.vue'

const toast = useToast()
const isLoading = ref(false)
const appointments = ref<any[]>([])
const loadError = ref('')

const searchQuery = ref('')
const selectedStatus = ref('ALL')

const isModalOpen = ref(false)
const selectedAppointment = ref<any>(null)

const statusTabs = [
  { label: 'All', value: 'ALL' },
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'Arrived', value: 'arrived' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' }
]

async function fetchAppointments() {
  isLoading.value = true
  loadError.value = ''
  try {
    const res: any = await $api('/appointments')
    appointments.value = res?.data || []
  } catch (err: any) {
    appointments.value = []
    loadError.value = getApiErrorMessage(err, 'មិនអាចទាញយកការណាត់ជួបបានទេ (Could not load appointments)')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchAppointments()
})

const scheduledCount = computed(() => appointments.value.filter(a => a.status === 'scheduled').length)
const arrivedCount = computed(() => appointments.value.filter(a => a.status === 'arrived').length)
const completedCount = computed(() => appointments.value.filter(a => a.status === 'completed').length)

const filteredAppointments = computed(() => {
  return appointments.value.filter((a) => {
    if (selectedStatus.value !== 'ALL' && a.status !== selectedStatus.value) return false
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase()
      const pName = (a.patientName || '').toLowerCase()
      const phone = (a.patientPhone || '').toLowerCase()
      if (!pName.includes(q) && !phone.includes(q)) return false
    }
    return true
  })
})

function getStatusColor(status: string) {
  if (status === 'arrived') return 'warning'
  if (status === 'completed') return 'success'
  if (status === 'cancelled') return 'error'
  return 'info'
}

function formatDate(d: any) {
  if (!d) return '-'
  const date = new Date(d)
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
}

function openNewAppointmentModal() {
  selectedAppointment.value = null
  isModalOpen.value = true
}

function editAppointment(apt: any) {
  selectedAppointment.value = apt
  isModalOpen.value = true
}

async function updateStatus(apt: any, status: string) {
  apt.status = status
  toast.add({ title: 'Updated', description: `ស្ថានភាពត្រូវបានផ្លាស់ប្តូរទៅជា ${status}`, color: 'success' })
}

function startConsultation(apt: any) {
  const pId = apt.patientId?._id || apt.patientId
  if (pId) {
    navigateTo(`/opd?patientId=${pId}&patientName=${encodeURIComponent(apt.patientName)}`)
  } else {
    navigateTo(`/opd?patientName=${encodeURIComponent(apt.patientName)}`)
  }
}
</script>

<style scoped>
.font-khmer {
  font-family: 'Battambang', 'Noto Sans Khmer', serif;
}
</style>
