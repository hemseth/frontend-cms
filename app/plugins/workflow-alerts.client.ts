import { watch } from 'vue'
import { useAuth } from '~/composables/auth/useAuth'
import { startWorkflowAlertStream, type WorkflowAlert, type WorkflowAlertType } from '~/composables/shared/useWorkflowAlerts'

/**
 * Shows workflow alerts (docs/REALTIME_ALERTS.md) as toasts while someone is signed in. The server
 * decides who receives what; this only presents it: a title, the patient and queue number, a
 * short tone, and an "Open" button to the workstation that acts next.
 */
const SCREEN: Record<WorkflowAlertType, (alert: WorkflowAlert) => string> = {
  'visit.checked_in': () => '/workstation/triage',
  'visit.triaged': () => '/workstation/doctor',
  'lab.ordered': a => (a.data.category === 'imaging' ? '/workstation/echo' : '/workstation/lab'),
  'visit.results_ready': () => '/workstation/doctor',
  'visit.to_cashier': () => '/workstation/cashier',
  'prescription.to_prepare': () => '/workstation/pharmacy',
  'payment.paid': () => '/workstation/pharmacy'
}
const ICON: Record<WorkflowAlertType, string> = {
  'visit.checked_in': 'i-lucide-user-plus',
  'visit.triaged': 'i-lucide-stethoscope',
  'lab.ordered': 'i-lucide-flask-conical',
  'visit.results_ready': 'i-lucide-clipboard-check',
  'visit.to_cashier': 'i-lucide-wallet',
  'prescription.to_prepare': 'i-lucide-pill',
  'payment.paid': 'i-lucide-hand-coins'
}
const MUTE_KEY = 'alerts.muted'

function beep() {
  try {
    if (localStorage.getItem(MUTE_KEY) === '1') return
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.35)
    osc.onended = () => ctx.close()
  } catch {
    // No sound (blocked until the user interacts with the page, or no audio device).
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  const { accessToken } = useAuth()
  const toast = useToast()
  const i18n = nuxtApp.$i18n as { t: (key: string, params?: Record<string, unknown>) => string, locale: { value: string } }

  function show(alert: WorkflowAlert) {
    const km = i18n.locale.value === 'km'
    const d = alert.data
    const params = {
      name: (km ? d.patientNameKh || d.patientName : d.patientName || d.patientNameKh) || i18n.t('alerts.aPatient'),
      queue: d.queueNo ?? '-',
      service: (km ? d.serviceNameKh || d.serviceName : d.serviceName || d.serviceNameKh) || '',
      doctor: d.doctorName || ''
    }
    const to = SCREEN[alert.type]?.(alert)
    toast.add({
      id: alert.id,
      title: i18n.t(`alerts.${alert.type}.title`, params),
      description: i18n.t(`alerts.${alert.type}.body`, params),
      icon: ICON[alert.type] ?? 'i-lucide-bell',
      color: alert.type === 'visit.results_ready' || alert.type === 'payment.paid' ? 'success' : 'primary',
      duration: 10000,
      ...(to ? { actions: [{ label: i18n.t('alerts.open'), color: 'neutral' as const, variant: 'outline' as const, onClick: () => { navigateTo(to) } }] } : {})
    })
    beep()
  }

  let stream: { stop: () => void } | null = null
  watch(accessToken, (token) => {
    if (token && !stream) stream = startWorkflowAlertStream(show)
    if (!token && stream) {
      stream.stop()
      stream = null
    }
  }, { immediate: true })
})
