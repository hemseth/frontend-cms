import { createSharedComposable } from '@vueuse/core'

export interface ChatUser {
  _id: string
  username: string
  role?: string
  avatar?: string
}

export interface ChatMessage {
  _id: string
  conversationId: string
  senderId: string
  body: string
  createdAt: string
}

export interface Conversation {
  _id: string
  type: 'direct' | 'group'
  title?: string
  memberIds: string[]
  members: ChatUser[]
  lastMessageAt?: string
  lastMessagePreview?: string
  unreadCount: number
}

const PAGE_SIZE = 50

const _useChat = () => {
  const auth = useAuth()
  const realtime = useRealtime()
  const conversations = ref<Conversation[]>([])
  const messages = ref<Record<string, ChatMessage[]>>({})
  const hasOlder = ref<Record<string, boolean>>({})
  const contacts = ref<ChatUser[]>([])
  const activeId = ref<string | null>(null)

  const enabled = computed(() => auth.can('chat'))
  const myId = computed(() => auth.user.value?.id ?? '')
  const totalUnread = computed(() => conversations.value.reduce((sum, c) => sum + (c.unreadCount || 0), 0))
  const active = computed(() => conversations.value.find(c => c._id === activeId.value) ?? null)

  /** What to call a conversation: the group title, or the other member's name for a direct chat. */
  function nameOf(conversation: Conversation): string {
    if (conversation.type === 'group') return conversation.title || ''
    return conversation.members.find(m => m._id !== myId.value)?.username ?? ''
  }

  function senderName(conversation: Conversation | null, senderId: string): string {
    return conversation?.members.find(m => m._id === senderId)?.username ?? ''
  }

  async function loadConversations(): Promise<void> {
    if (!enabled.value) return
    const res = await $api<{ data: Conversation[] }>('/conversations', { params: { limit: 100 } })
    conversations.value = res?.data ?? []
  }

  async function loadContacts(): Promise<void> {
    const res = await $api<{ data: ChatUser[] }>('/conversations/contacts')
    contacts.value = res?.data ?? []
  }

  async function loadMessages(conversationId: string, older = false): Promise<void> {
    const current = messages.value[conversationId] ?? []
    const before = older ? current[0]?.createdAt : undefined
    const res = await $api<{ data: ChatMessage[] }>(`/conversations/${conversationId}/messages`, {
      params: { limit: PAGE_SIZE, ...(before ? { before } : {}) }
    })
    const page = res?.data ?? []
    messages.value[conversationId] = older ? [...page, ...current] : page
    hasOlder.value[conversationId] = page.length === PAGE_SIZE
  }

  async function markRead(conversationId: string): Promise<void> {
    const conversation = conversations.value.find(c => c._id === conversationId)
    if (conversation) conversation.unreadCount = 0
    await $api(`/conversations/${conversationId}/read`, { method: 'PATCH' })
  }

  async function open(conversationId: string): Promise<void> {
    activeId.value = conversationId
    await loadMessages(conversationId)
    await markRead(conversationId)
  }

  async function send(conversationId: string, body: string): Promise<void> {
    const res = await $api<{ data: ChatMessage }>(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: { body }
    })
    // The socket echoes the message back too; addMessage ignores the duplicate.
    if (res?.data) addMessage(res.data)
  }

  async function startDirect(userId: string): Promise<string> {
    const res = await $api<{ data: Conversation }>('/conversations', { method: 'POST', body: { type: 'direct', memberId: userId } })
    await loadConversations()
    return String(res.data._id)
  }

  async function createGroup(title: string, memberIds: string[]): Promise<string> {
    const res = await $api<{ data: Conversation }>('/conversations', { method: 'POST', body: { type: 'group', title, memberIds } })
    await loadConversations()
    return String(res.data._id)
  }

  function addMessage(message: ChatMessage): void {
    const list = messages.value[message.conversationId]
    if (list && !list.some(m => m._id === message._id)) list.push(message)

    const conversation = conversations.value.find(c => c._id === message.conversationId)
    if (!conversation) {
      // A conversation someone else just started with us: fetch it with its members.
      loadConversations().catch(() => {})
      return
    }
    conversation.lastMessageAt = message.createdAt
    conversation.lastMessagePreview = message.body.slice(0, 140)
    conversations.value.sort((a, b) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? ''))

    if (message.senderId === myId.value) return
    if (message.conversationId === activeId.value && document.visibilityState === 'visible') {
      markRead(message.conversationId).catch(() => {})
    } else {
      conversation.unreadCount = (conversation.unreadCount || 0) + 1
    }
  }

  const offs = [
    realtime.on('chat.message', data => addMessage(data as ChatMessage)),
    realtime.on('chat.conversation', (data) => {
      const id = String((data as { _id: string })._id)
      if (!conversations.value.some(c => c._id === id)) loadConversations().catch(() => {})
    }),
    // Read in another tab or device of the same user.
    realtime.on('chat.read', (data) => {
      const conversation = conversations.value.find(c => c._id === (data as { conversationId: string }).conversationId)
      if (conversation) conversation.unreadCount = 0
    })
  ]
  onScopeDispose(() => offs.forEach(off => off()))

  if (import.meta.client) {
    realtime.connect()
    loadConversations().catch(() => {})
  }

  return {
    conversations, messages, hasOlder, contacts, activeId, active, enabled, myId, totalUnread,
    nameOf, senderName, loadConversations, loadContacts, loadMessages, open, send, markRead, startDirect, createGroup
  }
}

export const useChat = createSharedComposable(_useChat)
