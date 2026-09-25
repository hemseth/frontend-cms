import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import type { WorklistItem, WorkStatus } from '~/types/workstation'

const POLL_MS = 15_000

/**
 * A department queue that reloads every 15 s (no websockets: the server is small). Polling
 * pauses while the browser tab is hidden and resumes, with an immediate reload, when it is shown.
 * Filtering by status and search happens here; `load` receives the chosen day.
 */
export function useWorklist(load: (day: string) => Promise<WorklistItem[]>) {
  const items = ref<WorklistItem[]>([])
  const isLoading = ref(true)
  const error = ref('')
  const lastUpdated = ref<Date | null>(null)
  const now = ref(Date.now())

  const day = ref(todayLocal())
  const statusFilter = ref<WorkStatus | 'all'>('all')
  const search = ref('')

  let timer: ReturnType<typeof setInterval> | null = null
  let inFlight = false

  async function refresh(showSpinner = false) {
    if (inFlight) return
    inFlight = true
    if (showSpinner) isLoading.value = true
    try {
      items.value = await load(day.value)
      error.value = ''
      lastUpdated.value = new Date()
    } catch (err) {
      // Keep the last good list on a failed poll; show the error above it.
      error.value = getApiErrorMessage(err, 'Could not load the queue')
    } finally {
      now.value = Date.now()
      isLoading.value = false
      inFlight = false
    }
  }

  function start() {
    stop()
    timer = setInterval(() => refresh(), POLL_MS)
  }
  function stop() {
    if (timer) clearInterval(timer)
    timer = null
  }
  function onVisibility() {
    if (document.hidden) stop()
    else {
      refresh()
      start()
    }
  }

  onMounted(() => {
    refresh(true)
    start()
    document.addEventListener('visibilitychange', onVisibility)
  })
  onBeforeUnmount(() => {
    stop()
    document.removeEventListener('visibilitychange', onVisibility)
  })
  watch(day, () => refresh(true))

  const filtered = computed(() => {
    const q = search.value.trim().toLowerCase()
    return items.value.filter((item) => {
      if (statusFilter.value !== 'all' && item.status !== statusFilter.value) return false
      if (!q) return true
      const p = item.patient
      return [p.nameKh, p.nameEn, p.phone, patientCode(p), p.code, item.subtitle]
        .some(v => String(v || '').toLowerCase().includes(q))
    })
  })

  return { items, filtered, isLoading, error, lastUpdated, now, day, statusFilter, search, refresh }
}
