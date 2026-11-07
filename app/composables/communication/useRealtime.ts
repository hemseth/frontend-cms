import { createSharedComposable } from '@vueuse/core'

export type RealtimeEventType = 'ready' | 'chat.message' | 'chat.conversation' | 'chat.read' | 'notification'
type Handler = (data: unknown) => void

// Close codes sent by cms/src/services/communication/socket.server.ts.
const CLOSE_UNAUTHORIZED = 4401
const CLOSE_FORBIDDEN = 4403
const CLOSE_TOO_MANY = 4429
const MAX_BACKOFF_MS = 30_000

/**
 * One WebSocket per tab, shared by chat and notifications. The socket only receives; every write
 * goes through $api. The server closes it when the access token expires, so on that close we make
 * one authenticated call, which lets $api refresh the token (or log out), then reconnect.
 */
const _useRealtime = () => {
  const config = useRuntimeConfig()
  const { accessToken } = useAuth()
  const status = ref<'idle' | 'connecting' | 'open' | 'closed'>('idle')
  const handlers = new Map<RealtimeEventType, Set<Handler>>()

  let socket: WebSocket | null = null
  let retry = 0
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  let stopped = true

  function socketUrl(): string {
    const url = new URL(String(config.public.apiBase), window.location.origin)
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
    url.pathname = `${url.pathname.replace(/\/$/, '')}/ws`
    url.search = ''
    return url.toString()
  }

  function on(type: RealtimeEventType, handler: Handler): () => void {
    const set = handlers.get(type) ?? new Set<Handler>()
    set.add(handler)
    handlers.set(type, set)
    return () => set.delete(handler)
  }

  function connect(): void {
    if (!import.meta.client || socket || !accessToken.value) return
    stopped = false
    clearTimeout(retryTimer)
    status.value = 'connecting'
    const ws = new WebSocket(socketUrl())
    socket = ws

    ws.onopen = () => ws.send(JSON.stringify({ type: 'auth', token: accessToken.value }))
    ws.onmessage = (message) => {
      let event: { type?: RealtimeEventType, data?: unknown }
      try {
        event = JSON.parse(String(message.data))
      } catch {
        return
      }
      if (!event.type) return
      if (event.type === 'ready') {
        status.value = 'open'
        retry = 0
      }
      handlers.get(event.type)?.forEach(handler => handler(event.data))
    }
    ws.onclose = (event) => {
      if (socket === ws) socket = null
      status.value = 'closed'
      // A user without chat or notification permission will never be let in; do not retry.
      if (stopped || event.code === CLOSE_FORBIDDEN) return
      scheduleReconnect(event.code)
    }
  }

  function scheduleReconnect(code: number): void {
    const delay = code === CLOSE_TOO_MANY
      ? 60_000
      : Math.min(MAX_BACKOFF_MS, 1000 * 2 ** retry) + Math.random() * 500
    retry++
    retryTimer = setTimeout(async () => {
      if (stopped) return
      if (code === CLOSE_UNAUTHORIZED) {
        try {
          await $api('/notifications/unread-count')
        } catch {
          return
        }
      }
      connect()
    }, delay)
  }

  function disconnect(): void {
    stopped = true
    clearTimeout(retryTimer)
    socket?.close(1000)
    socket = null
    status.value = 'idle'
  }

  // The shared state is dropped when its last consumer unmounts (logout switches layout); close
  // the socket with it, or the next login would open a second one.
  onScopeDispose(disconnect)

  return { status, on, connect, disconnect }
}

export const useRealtime = createSharedComposable(_useRealtime)
