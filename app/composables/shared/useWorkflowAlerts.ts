import { useCookie, useRuntimeConfig, useState } from '#app'
import { useAuth, authCookieOptions } from '~/composables/auth/useAuth'

/**
 * Workflow alerts from GET /api/events/stream (Server-Sent Events, docs/REALTIME_ALERTS.md).
 *
 * EventSource cannot send the Authorization header, so the stream is read with fetch. One stream
 * per tab, opened by plugins/workflow-alerts.client.ts while someone is signed in. The server ends
 * the stream when the access token expires; a failed or expired stream is re-opened after the
 * token is refreshed through $api, with a growing delay while the server cannot be reached.
 */
export type WorkflowAlertType
  = | 'visit.checked_in'
    | 'visit.triaged'
    | 'lab.ordered'
    | 'visit.results_ready'
    | 'visit.to_cashier'
    | 'prescription.to_prepare'
    | 'payment.paid'

export interface WorkflowAlert {
  id: string
  type: WorkflowAlertType
  at: string
  data: {
    visitId?: string
    patientId?: string
    patientName?: string
    patientNameKh?: string
    queueNo?: number
    doctorId?: string
    doctorName?: string
    serviceName?: string
    serviceNameKh?: string
    category?: string
  }
}

const RETRY_MS = [1000, 2000, 5000, 10000, 30000]

export function useWorkflowAlerts() {
  // `seq` changes on every alert, so screens can watch it and reload their queue.
  const state = useState('workflow-alerts', () => ({ connected: false, seq: 0, last: null as WorkflowAlert | null }))
  return { state }
}

/** Runs the stream until `stop()`; `onAlert` is called for every workflow event. */
export function startWorkflowAlertStream(onAlert: (alert: WorkflowAlert) => void) {
  const config = useRuntimeConfig()
  const { accessToken, refreshToken, user } = useAuth()
  const selectedClinicId = useCookie<string | null>('developer_clinic_id', authCookieOptions())
  const { state } = useWorkflowAlerts()

  let controller: AbortController | null = null
  let stopped = false
  let attempt = 0

  async function refreshToken401() {
    // Any $api call refreshes an expired access token (utils/api.ts); /auth/me is the cheapest.
    await $api('/auth/me').catch(() => undefined)
  }

  async function connectOnce(): Promise<'expired' | 'closed' | 'unauthorized' | 'failed'> {
    if (!accessToken.value) return 'unauthorized'
    controller = new AbortController()
    const headers: Record<string, string> = {
      Accept: 'text/event-stream',
      Authorization: `Bearer ${accessToken.value}`
    }
    // Same rule as $api: only a developer selects a clinic with X-Clinic-Id.
    if (user.value?.role === 'developer' && selectedClinicId.value) headers['X-Clinic-Id'] = selectedClinicId.value

    const res = await fetch(`${config.public.apiBase}/events/stream`, { headers, signal: controller.signal, cache: 'no-store' })
    if (res.status === 401) return 'unauthorized'
    if (!res.ok || !res.body) return 'failed'

    state.value.connected = true
    attempt = 0
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    try {
      while (!stopped) {
        const { value, done } = await reader.read()
        if (done) return 'closed'
        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')
        let cut
        while ((cut = buffer.indexOf('\n\n')) >= 0) {
          const block = buffer.slice(0, cut)
          buffer = buffer.slice(cut + 2)
          const event = /^event: ?(.*)$/m.exec(block)?.[1]
          const data = block.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).replace(/^ /, '')).join('\n')
          if (event === 'expired') return 'expired'
          if (event === 'workflow' && data) {
            try {
              const alert = JSON.parse(data) as WorkflowAlert
              state.value.last = alert
              state.value.seq++
              onAlert(alert)
            } catch {
              // A malformed event is skipped; the stream stays open.
            }
          }
        }
      }
      return 'closed'
    } finally {
      state.value.connected = false
      reader.cancel().catch(() => undefined)
    }
  }

  async function run() {
    while (!stopped) {
      let outcome: Awaited<ReturnType<typeof connectOnce>>
      try {
        outcome = await connectOnce()
      } catch {
        outcome = 'failed'
      }
      if (stopped) break
      if (outcome === 'unauthorized' || outcome === 'expired') {
        if (!refreshToken.value) break // signed out
        await refreshToken401()
        if (outcome === 'expired') continue
      }
      const wait = RETRY_MS[Math.min(attempt++, RETRY_MS.length - 1)]!
      await new Promise(resolve => setTimeout(resolve, wait))
    }
  }

  void run()
  return {
    stop() {
      stopped = true
      controller?.abort()
      state.value.connected = false
    }
  }
}
