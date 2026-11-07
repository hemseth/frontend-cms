<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const chat = useChat()
const realtime = useRealtime()

const draft = ref('')
const isSending = ref(false)
const scroller = ref<HTMLElement | null>(null)

const isNewOpen = ref(false)
const selectedContacts = ref<string[]>([])
const groupTitle = ref('')
const isCreating = ref(false)

const activeMessages = computed(() => (chat.activeId.value ? chat.messages.value[chat.activeId.value] ?? [] : []))
const contactItems = computed(() => chat.contacts.value.map(c => ({ label: c.username, value: c._id })))
const isGroup = computed(() => selectedContacts.value.length > 1)

function formatTime(value: string): string {
  return new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

async function scrollToBottom() {
  await nextTick()
  if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight
}

async function select(id: string) {
  await chat.open(id)
  // Keeps the open conversation in the URL, which is also where a notification link points.
  if (route.query.c !== id) router.replace({ query: { c: id } })
  await scrollToBottom()
}

async function send() {
  const body = draft.value.trim()
  if (!body || !chat.activeId.value || isSending.value) return
  isSending.value = true
  try {
    await chat.send(chat.activeId.value, body)
    draft.value = ''
    await scrollToBottom()
  } catch (error) {
    toast.add({ title: getApiErrorMessage(error, t('common.error')), color: 'error' })
  } finally {
    isSending.value = false
  }
}

function onKeydown(event: KeyboardEvent) {
  // Enter sends, Shift+Enter adds a line.
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    send()
  }
}

async function openNew() {
  selectedContacts.value = []
  groupTitle.value = ''
  isNewOpen.value = true
  if (!chat.contacts.value.length) await chat.loadContacts()
}

async function createConversation() {
  if (!selectedContacts.value.length || (isGroup.value && !groupTitle.value.trim())) return
  isCreating.value = true
  try {
    const id = isGroup.value
      ? await chat.createGroup(groupTitle.value.trim(), selectedContacts.value)
      : await chat.startDirect(selectedContacts.value[0]!)
    isNewOpen.value = false
    await select(id)
  } catch (error) {
    toast.add({ title: getApiErrorMessage(error, t('common.error')), color: 'error' })
  } finally {
    isCreating.value = false
  }
}

// New messages in the open conversation keep the view pinned to the bottom.
watch(() => activeMessages.value.length, scrollToBottom)

onMounted(async () => {
  await chat.loadConversations()
  const requested = typeof route.query.c === 'string' ? route.query.c : null
  if (requested && chat.conversations.value.some(c => c._id === requested)) await select(requested)
})

// Leaving the page must stop incoming messages from being marked read in the background.
onBeforeUnmount(() => {
  chat.activeId.value = null
})
</script>

<template>
  <div class="p-4 lg:p-6 h-[calc(100vh-5rem)] flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">
        {{ t('chat.title') }}
      </h1>
      <div class="flex items-center gap-3">
        <UBadge
          v-if="realtime.status.value !== 'open'"
          color="warning"
          variant="subtle"
          icon="i-lucide-wifi-off"
        >
          {{ t('chat.offline') }}
        </UBadge>
        <UButton icon="i-lucide-plus" @click="openNew">
          {{ t('chat.newConversation') }}
        </UButton>
      </div>
    </div>

    <div class="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[18rem_1fr] gap-4">
      <!-- Conversation list -->
      <UCard class="min-h-0 overflow-hidden" :ui="{ body: 'p-0 sm:p-0 h-full overflow-y-auto' }">
        <button
          v-for="conversation in chat.conversations.value"
          :key="conversation._id"
          type="button"
          class="w-full text-left px-4 py-3 border-b border-default flex items-start gap-3 hover:bg-elevated/50"
          :class="{ 'bg-elevated': conversation._id === chat.activeId.value }"
          @click="select(conversation._id)"
        >
          <UAvatar
            :icon="conversation.type === 'group' ? 'i-lucide-users' : 'i-lucide-user'"
            size="md"
          />
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2">
              <span class="font-medium truncate">{{ chat.nameOf(conversation) }}</span>
              <UBadge
                v-if="conversation.unreadCount"
                color="error"
                size="sm"
              >
                {{ conversation.unreadCount }}
              </UBadge>
            </div>
            <p class="text-sm text-muted truncate">
              {{ conversation.lastMessagePreview || '' }}
            </p>
          </div>
        </button>
        <p v-if="!chat.conversations.value.length" class="p-6 text-center text-muted">
          {{ t('chat.noConversations') }}
        </p>
      </UCard>

      <!-- Messages -->
      <UCard class="min-h-0 flex flex-col overflow-hidden" :ui="{ body: 'p-0 sm:p-0 flex-1 min-h-0 flex flex-col' }">
        <template v-if="chat.active.value">
          <div class="px-4 py-3 border-b border-default">
            <p class="font-semibold">
              {{ chat.nameOf(chat.active.value) }}
            </p>
            <p v-if="chat.active.value.type === 'group'" class="text-xs text-muted">
              {{ chat.active.value.members.map(m => m.username).join(', ') }}
            </p>
          </div>

          <div ref="scroller" class="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
            <div v-if="chat.hasOlder.value[chat.active.value._id]" class="text-center">
              <UButton
                variant="ghost"
                size="xs"
                @click="chat.loadMessages(chat.active.value._id, true)"
              >
                {{ t('chat.loadOlder') }}
              </UButton>
            </div>
            <div
              v-for="message in activeMessages"
              :key="message._id"
              class="flex"
              :class="message.senderId === chat.myId.value ? 'justify-end' : 'justify-start'"
            >
              <div
                class="max-w-[75%] rounded-lg px-3 py-2"
                :class="message.senderId === chat.myId.value ? 'bg-primary text-inverted' : 'bg-elevated'"
              >
                <p
                  v-if="chat.active.value.type === 'group' && message.senderId !== chat.myId.value"
                  class="text-xs font-semibold mb-0.5"
                >
                  {{ chat.senderName(chat.active.value, message.senderId) }}
                </p>
                <p class="whitespace-pre-wrap break-words">
                  {{ message.body }}
                </p>
                <p class="text-[10px] opacity-70 mt-1 text-right">
                  {{ formatTime(message.createdAt) }}
                </p>
              </div>
            </div>
          </div>

          <div class="border-t border-default p-3 flex items-end gap-2">
            <UTextarea
              v-model="draft"
              :placeholder="t('chat.typeMessage')"
              :rows="1"
              autoresize
              :maxrows="5"
              :maxlength="4000"
              class="flex-1"
              @keydown="onKeydown"
            />
            <UButton
              icon="i-lucide-send"
              :loading="isSending"
              :disabled="!draft.trim()"
              @click="send"
            >
              {{ t('chat.send') }}
            </UButton>
          </div>
        </template>
        <div v-else class="flex-1 flex items-center justify-center text-muted p-6">
          {{ t('chat.selectConversation') }}
        </div>
      </UCard>
    </div>

    <UModal v-model:open="isNewOpen">
      <template #header>
        <h3 class="font-semibold">
          {{ t('chat.newConversation') }}
        </h3>
      </template>
      <template #body>
        <div class="space-y-4">
          <UFormField :label="t('chat.members')">
            <USelectMenu
              v-model="selectedContacts"
              :items="contactItems"
              value-key="value"
              label-key="label"
              multiple
              class="w-full"
            />
          </UFormField>
          <UFormField v-if="isGroup" :label="t('chat.groupName')">
            <UInput v-model="groupTitle" :maxlength="100" class="w-full" />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" @click="isNewOpen = false">
              {{ t('common.cancel') }}
            </UButton>
            <UButton
              :loading="isCreating"
              :disabled="!selectedContacts.length || (isGroup && !groupTitle.trim())"
              @click="createConversation"
            >
              {{ t('chat.start') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
