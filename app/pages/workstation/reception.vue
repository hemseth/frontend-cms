<script setup lang="ts">
/**
 * Reception (docs/OPD_CLINIC_FLOW.md): find or register the patient, check them in for today
 * (doctor, room, priority, complaint), and print the queue ticket. Today's appointments can
 * be checked in directly. The queue on the left is the same day queue every workstation uses.
 */
import { computed, onMounted, reactive, ref } from 'vue'
import type { WorklistItem, WorkStatus } from '~/types/workstation'
import WorkstationLayout from '~/components/workstation/WorkstationLayout.vue'
import WorklistQueue from '~/components/workstation/WorklistQueue.vue'
import WorkstationState from '~/components/workstation/WorkstationState.vue'
import AddModal from '~/components/patients/AddModals.vue'

interface PatientRow { _id: string, pId?: number, nameKh?: string, nameEn?: string, phone?: string, dob?: string, gender?: number }
interface AppointmentRow { _id: string, patientId?: string | { _id: string }, patientName?: string, patientPhone?: string, appointmentDate: string, timeSlot?: string, reason?: string, status?: string, doctorId?: string | { _id: string } }

const { t } = useI18n()
const toast = useToast()
const auth = useAuth()
const allowed = computed(() => auth.can('visit', 'create'))
const canRegister = computed(() => auth.can('patient', 'create'))

const { triageQueue } = useDepartmentQueues()
const worklist = useWorklist(triageQueue)
const queueOpen = ref(false)
const STATUSES: WorkStatus[] = ['waiting', 'triaged', 'in_consultation', 'completed', 'cancelled']
const selectedItem = ref<WorklistItem | null>(null)

// ---- Find a patient -------------------------------------------------------------------------
const search = ref('')
const results = ref<PatientRow[]>([])
const isSearching = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | null = null
function onSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(runSearch, 300)
}
async function runSearch() {
  const text = search.value.trim()
  if (text.length < 2) {
    results.value = []
    return
  }
  isSearching.value = true
  try {
    const res = await $api<{ data?: PatientRow[] }>('/patients', { params: { search: text, limit: 10 } })
    results.value = res?.data ?? []
  } catch {
    results.value = []
  } finally {
    isSearching.value = false
  }
}
const isAddOpen = ref(false)

// ---- Check in ------------------------------------------------------------------------------
const patient = ref<PatientRow | null>(null)
const appointmentId = ref('')
const doctors = ref<Array<{ _id: string, nameEn?: string, nameKh?: string }>>([])
const ANY_DOCTOR = 'any'
const form = reactive({ doctorId: ANY_DOCTOR, consultRoom: '', triagePriority: 'NORMAL' as 'EMERGENCY' | 'URGENT' | 'NORMAL', chiefComplaint: '' })
const isCheckingIn = ref(false)
const doctorOptions = computed(() => [
  { label: t('workstation.reception.anyDoctor'), value: ANY_DOCTOR },
  ...doctors.value.map(d => ({ label: d.nameKh || d.nameEn || '-', value: String(d._id) }))
])
const priorityOptions = computed(() => (['EMERGENCY', 'URGENT', 'NORMAL'] as const).map(p => ({ label: t(`workstation.priority.${p}`), value: p })))

function pick(row: PatientRow, fromAppointment?: AppointmentRow) {
  patient.value = row
  appointmentId.value = fromAppointment?._id || ''
  const doctor = fromAppointment?.doctorId
  form.doctorId = doctor ? String(typeof doctor === 'object' ? doctor._id : doctor) : ANY_DOCTOR
  form.consultRoom = ''
  form.triagePriority = 'NORMAL'
  form.chiefComplaint = fromAppointment?.reason || ''
}

function printTicket(visitId: string) {
  window.open(`/print/queue-ticket/${visitId}`, '_blank', 'width=420,height=600')
}

async function checkIn() {
  if (!patient.value) return
  isCheckingIn.value = true
  try {
    const res = await $api<{ data?: { _id: string, queueNo?: number } }>(`/patients/${patient.value._id}/visits/check-in`, {
      method: 'POST',
      body: {
        tzOffset: new Date().getTimezoneOffset(),
        ...(form.doctorId && form.doctorId !== ANY_DOCTOR ? { doctorId: form.doctorId } : {}),
        ...(form.consultRoom.trim() ? { consultRoom: form.consultRoom.trim() } : {}),
        triagePriority: form.triagePriority,
        ...(form.chiefComplaint.trim() ? { chiefComplaint: form.chiefComplaint.trim() } : {}),
        ...(appointmentId.value ? { appointmentId: appointmentId.value } : {})
      }
    })
    toast.add({ title: t('workstation.reception.checkedIn', { no: res?.data?.queueNo ?? '-' }), color: 'success' })
    if (res?.data?._id) printTicket(res.data._id)
    patient.value = null
    search.value = ''
    results.value = []
    await Promise.all([worklist.refresh(), loadAppointments()])
  } catch (e) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(e, t('common.saveFailed')), color: 'error' })
  } finally {
    isCheckingIn.value = false
  }
}

// ---- Today's appointments --------------------------------------------------------------------
const appointments = ref<AppointmentRow[]>([])
async function loadAppointments() {
  if (!auth.can('appointment', 'read')) return
  try {
    const res = await $api<{ data?: AppointmentRow[] | { data?: AppointmentRow[] } }>('/appointments', { params: { date: todayLocal(), limit: 100 } })
    const list = Array.isArray(res?.data) ? res.data : (res?.data as { data?: AppointmentRow[] })?.data ?? []
    appointments.value = list.filter((a: AppointmentRow) => a.status === 'scheduled' || a.status === 'arrived')
  } catch {
    appointments.value = []
  }
}
async function checkInAppointment(a: AppointmentRow) {
  const pid = a.patientId ? String(typeof a.patientId === 'object' ? a.patientId._id : a.patientId) : ''
  if (!pid) {
    // Booked by name only: find the patient (or register them) first.
    search.value = a.patientName || ''
    await runSearch()
    toast.add({ title: t('workstation.reception.findFirst'), color: 'info' })
    return
  }
  try {
    const res = await $api<{ data?: PatientRow }>(`/patients/${pid}`)
    if (res?.data) pick(res.data, a)
  } catch (e) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(e, ''), color: 'error' })
  }
}

onMounted(async () => {
  loadAppointments()
  try {
    doctors.value = ((await $api('/visits/doctors')) as { data?: typeof doctors.value })?.data ?? []
  } catch {
    doctors.value = []
  }
})

const patientLabel = (p: PatientRow) => [p.pId ? `P-${String(p.pId).padStart(6, '0')}` : '', p.nameKh || p.nameEn, p.phone].filter(Boolean).join(' · ')
</script>

<template>
  <WorkstationLayout v-model:queue-open="queueOpen" :title="t('workstation.pages.reception')" icon="i-lucide-concierge-bell">
    <template #queue>
      <WorklistQueue
        v-model:day="worklist.day.value"
        v-model:status="worklist.statusFilter.value"
        v-model:search="worklist.search.value"
        :items="worklist.filtered.value"
        :selected-id="selectedItem?.id"
        :loading="worklist.isLoading.value"
        :error="worklist.error.value"
        :last-updated="worklist.lastUpdated.value"
        :now="worklist.now.value"
        :statuses="STATUSES"
        @select="selectedItem = $event"
        @refresh="worklist.refresh(true)"
      />
    </template>

    <WorkstationState v-if="!allowed" state="denied" />
    <div v-else class="space-y-4 p-4">
      <UAlert
        v-if="selectedItem"
        color="neutral"
        variant="outline"
        icon="i-lucide-ticket"
        :title="t('workstation.reception.selected', { no: selectedItem.queueNo, name: selectedItem.patient.nameKh || selectedItem.patient.nameEn || '-' })"
      >
        <template #actions>
          <UButton
            :label="t('workstation.reception.printTicket')"
            icon="i-lucide-printer"
            size="xs"
            @click="printTicket(selectedItem.visitId)"
          />
          <UButton
            icon="i-lucide-x"
            size="xs"
            color="neutral"
            variant="ghost"
            @click="selectedItem = null"
          />
        </template>
      </UAlert>

      <!-- 1. Find or register -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between gap-2 flex-wrap">
            <h2 class="font-semibold">
              {{ t('workstation.reception.findPatient') }}
            </h2>
            <UButton
              v-if="canRegister"
              :label="t('workstation.reception.register')"
              icon="i-lucide-user-plus"
              size="sm"
              @click="isAddOpen = true"
            />
          </div>
        </template>
        <UInput
          v-model="search"
          icon="i-lucide-search"
          class="w-full"
          :loading="isSearching"
          :placeholder="t('workstation.reception.searchPlaceholder')"
          @update:model-value="onSearch"
        />
        <ul v-if="results.length" class="mt-2 divide-y divide-default">
          <li v-for="row in results" :key="row._id" class="flex items-center justify-between gap-2 py-2 text-sm">
            <span>{{ patientLabel(row) }}</span>
            <UButton
              :label="t('workstation.reception.checkIn')"
              size="xs"
              variant="soft"
              @click="pick(row)"
            />
          </li>
        </ul>
        <p v-else-if="search.trim().length >= 2 && !isSearching" class="mt-2 text-sm text-muted">
          {{ t('workstation.reception.noMatch') }}
        </p>
      </UCard>

      <!-- 2. Check in -->
      <UCard v-if="patient">
        <template #header>
          <h2 class="font-semibold">
            {{ t('workstation.reception.checkInTitle', { name: patient.nameKh || patient.nameEn || '-' }) }}
          </h2>
        </template>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <UFormField :label="t('workstation.reception.doctor')">
            <USelect
              v-model="form.doctorId"
              :items="doctorOptions"
              value-key="value"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('workstation.reception.room')">
            <UInput v-model="form.consultRoom" class="w-full" :maxlength="50" />
          </UFormField>
          <UFormField :label="t('workstation.priority.label')">
            <USelect
              v-model="form.triagePriority"
              :items="priorityOptions"
              value-key="value"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('workstation.triage.chiefComplaint')" class="md:col-span-3">
            <UInput v-model="form.chiefComplaint" class="w-full" :maxlength="500" />
          </UFormField>
        </div>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              :label="t('common.cancel')"
              color="neutral"
              variant="outline"
              @click="patient = null"
            />
            <UButton
              :label="t('workstation.reception.checkInPrint')"
              icon="i-lucide-ticket"
              :loading="isCheckingIn"
              @click="checkIn"
            />
          </div>
        </template>
      </UCard>

      <!-- 3. Today's appointments -->
      <UCard v-if="appointments.length">
        <template #header>
          <h2 class="font-semibold">
            {{ t('workstation.reception.appointments') }}
          </h2>
        </template>
        <ul class="divide-y divide-default">
          <li v-for="a in appointments" :key="a._id" class="flex items-center justify-between gap-2 py-2 text-sm">
            <span>
              <span class="font-medium">{{ a.timeSlot || new Date(a.appointmentDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) }}</span>
              · {{ a.patientName }} <span class="text-muted">{{ a.reason }}</span>
            </span>
            <UButton
              :label="t('workstation.reception.checkIn')"
              size="xs"
              variant="soft"
              @click="checkInAppointment(a)"
            />
          </li>
        </ul>
      </UCard>
    </div>

    <AddModal v-model:open="isAddOpen" hide-button @success="(p: any) => pick(p as PatientRow)" />
  </WorkstationLayout>
</template>
