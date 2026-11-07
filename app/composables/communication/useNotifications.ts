import { createSharedComposable } from '@vueuse/core'

export interface AppNotification {
  _id: string
  type: string
  title: string
  body?: string
  link?: string
  readAt: string | null
  createdAt: string
}

const _useNotifications = () => {
  const auth = useAuth()
  const realtime = useRealtime()
  const items = ref<AppNotification[]>([])
  const unreadCount = ref(0)
  const isLoading = ref(false)

  const enabled = computed(() => auth.can('notification'))

  async function load(): Promise<void> {
    if (!enabled.value) return
    isLoading.value = true
    try {
      const [list, count] = await Promise.all([
        $api<{ data: AppNotification[] }>('/notifications', { params: { limit: 30 } }),
        $api<{ data: { count: number } }>('/notifications/unread-count')
      ])
      items.value = list?.data ?? []
      unreadCount.value = count?.data?.count ?? 0
    } finally {
      isLoading.value = false
    }
  }

  async function markRead(notification: AppNotification): Promise<void> {
    if (notification.readAt) return
    await $api(`/notifications/${notification._id}/read`, { method: 'PATCH' })
    notification.readAt = new Date().toISOString()
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  }

  async function markAllRead(): Promise<void> {
    await $api('/notifications/read-all', { method: 'PATCH' })
    const now = new Date().toISOString()
    items.value.forEach((item) => {
      item.readAt ??= now
    })
    unreadCount.value = 0
  }

  const off = realtime.on('notification', (data) => {
    const notification = data as AppNotification
    if (items.value.some(item => item._id === notification._id)) return
    items.value.unshift(notification)
    if (!notification.readAt) unreadCount.value++
  })

  onScopeDispose(off)

  if (import.meta.client) {
    realtime.connect()
    load().catch(() => {})
  }

  return { items, unreadCount, isLoading, enabled, load, markRead, markAllRead }
}

export const useNotifications = createSharedComposable(_useNotifications)
