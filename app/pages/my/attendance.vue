<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

/**
 * Self-service attendance: the signed-in staff member clocks in and out and takes breaks
 * (POST /my/attendance/...). The server records its own time, so the browser clock does not matter.
 */
interface Shift { nameEn: string, nameKh?: string, startTime: string, endTime: string }
interface AttendanceBreak { type: string, start: string, end?: string }
interface AttendanceRecord {
  date: string
  clockIn?: string
  clockOut?: string
  breaks: AttendanceBreak[]
  status: string
  workedMinutes: number
  lateMinutes: number
  overtimeMinutes: number
}
interface MyToday { staff: { nameEn?: string, nameKh?: string, employeeCode?: string }, shift: Shift | null, record: AttendanceRecord | null, today: string }

const { t, locale } = useI18n()
const toast = useToast()
const data = ref<MyToday | null>(null)
const error = ref('')
const busy = ref(false)
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | undefined

async function load() {
  try {
    const res = await $api<{ data: MyToday }>('/my/attendance')
    data.value = res.data
    error.value = ''
  } catch (err) {
    error.value = getApiErrorMessage(err, t('messages.errorOccurred'))
  }
}
onMounted(() => {
  load()
  timer = setInterval(() => {
    now.value = Date.now()
  }, 30_000)
})
onBeforeUnmount(() => clearInterval(timer))

const record = computed(() => data.value?.record ?? null)
const onBreak = computed(() => !!record.value?.breaks?.some(b => !b.end))
const state = computed<'out' | 'in' | 'break' | 'done'>(() => {
  const r = record.value
  if (!r?.clockIn) return 'out'
  if (r.clockOut) return 'done'
  return onBreak.value ? 'break' : 'in'
})
/** Time since clock-in minus finished breaks, while still working. */
const runningMinutes = computed(() => {
  const r = record.value
  if (!r?.clockIn || r.clockOut) return r?.workedMinutes ?? 0
  const breaks = r.breaks.reduce((sum, b) => sum + ((b.end ? new Date(b.end).getTime() : now.value) - new Date(b.start).getTime()), 0)
  return Math.max(0, Math.round((now.value - new Date(r.clockIn).getTime() - breaks) / 60_000))
})

async function act(action: 'clock-in' | 'clock-out' | 'break-start' | 'break-end') {
  if (action === 'clock-out' && !window.confirm(t('hr.my.clockOutConfirm'))) return
  busy.value = true
  try {
    await $api(`/my/attendance/${action}`, { method: 'POST' })
    toast.add({ title: t(`hr.my.done.${action}`), color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(err, t('messages.errorOccurred')), color: 'error' })
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-xl space-y-4">
    <UBreadcrumb :items="[{ label: t('nav.home'), to: '/' }, { label: t('hr.my.attendanceTitle') }]" />
    <UAlert
      v-if="error"
      color="warning"
      variant="subtle"
      icon="i-lucide-info"
      :description="error"
    />
    <UCard v-else-if="data">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p class="font-semibold">
              {{ (locale === 'km' ? data.staff.nameKh || data.staff.nameEn : data.staff.nameEn || data.staff.nameKh) }}
            </p>
            <p class="text-sm text-muted">
              {{ [data.staff.employeeCode, data.today].filter(Boolean).join(' · ') }}
            </p>
          </div>
          <UBadge v-if="data.shift" color="neutral" variant="subtle">
            {{ (locale === 'km' ? data.shift.nameKh || data.shift.nameEn : data.shift.nameEn) }} {{ data.shift.startTime }}–{{ data.shift.endTime }}
          </UBadge>
          <UBadge v-else color="neutral" variant="outline">
            {{ t('hr.my.noShift') }}
          </UBadge>
        </div>
      </template>

      <div class="space-y-4 text-center">
        <p class="text-4xl font-bold tabular-nums">
          {{ formatMinutes(runningMinutes) }}
        </p>
        <p class="text-sm text-muted">
          {{ t(`hr.my.state.${state}`) }}
        </p>
        <div class="flex flex-wrap justify-center gap-2">
          <UButton
            v-if="state === 'out'"
            size="xl"
            icon="i-lucide-log-in"
            :loading="busy"
            :label="t('hr.my.clockIn')"
            @click="act('clock-in')"
          />
          <template v-if="state === 'in'">
            <UButton
              size="xl"
              variant="soft"
              icon="i-lucide-coffee"
              :loading="busy"
              :label="t('hr.my.breakStart')"
              @click="act('break-start')"
            />
            <UButton
              size="xl"
              color="neutral"
              icon="i-lucide-log-out"
              :loading="busy"
              :label="t('hr.my.clockOut')"
              @click="act('clock-out')"
            />
          </template>
          <UButton
            v-if="state === 'break'"
            size="xl"
            icon="i-lucide-play"
            :loading="busy"
            :label="t('hr.my.breakEnd')"
            @click="act('break-end')"
          />
        </div>
      </div>

      <template v-if="record" #footer>
        <dl class="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <div>
            <dt class="text-muted">
              {{ t('hr.attendance.clockIn') }}
            </dt>
            <dd class="font-medium">
              {{ clinicHm(record.clockIn) || '–' }}
            </dd>
          </div>
          <div>
            <dt class="text-muted">
              {{ t('hr.attendance.clockOut') }}
            </dt>
            <dd class="font-medium">
              {{ clinicHm(record.clockOut) || '–' }}
            </dd>
          </div>
          <div>
            <dt class="text-muted">
              {{ t('hr.attendance.late') }}
            </dt>
            <dd class="font-medium">
              {{ formatMinutes(record.lateMinutes) }}
            </dd>
          </div>
          <div>
            <dt class="text-muted">
              {{ t('hr.attendance.breaks') }}
            </dt>
            <dd class="font-medium">
              {{ record.breaks.map(b => `${clinicHm(b.start)}–${clinicHm(b.end) || '…'}`).join(', ') || '–' }}
            </dd>
          </div>
        </dl>
      </template>
    </UCard>
  </div>
</template>
