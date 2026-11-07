<script setup lang="ts">
import { formatTimeAgo } from '@vueuse/core'
import type { AppNotification } from '~/composables/communication/useNotifications'

const { t } = useI18n()
const router = useRouter()
const { isNotificationsSlideoverOpen } = useDashboard()
const notifications = useNotifications()

const icons: Record<string, string> = {
  'chat.group_added': 'i-lucide-users',
  'system': 'i-lucide-info'
}

async function openNotification(notification: AppNotification) {
  await notifications.markRead(notification).catch(() => {})
  if (notification.link) {
    isNotificationsSlideoverOpen.value = false
    await router.push(notification.link)
  }
}

// Re-sync when opened, in case the socket was down while something arrived.
watch(isNotificationsSlideoverOpen, (open) => {
  if (open) notifications.load().catch(() => {})
})
</script>

<template>
  <USlideover
    v-model:open="isNotificationsSlideoverOpen"
    :title="t('notifications.title')"
  >
    <template #body>
      <div v-if="notifications.unreadCount.value" class="flex justify-end -mt-2 mb-2">
        <UButton
          variant="ghost"
          size="xs"
          icon="i-lucide-check-check"
          @click="notifications.markAllRead()"
        >
          {{ t('notifications.markAllRead') }}
        </UButton>
      </div>

      <button
        v-for="notification in notifications.items.value"
        :key="notification._id"
        type="button"
        class="w-full text-left px-3 py-2.5 rounded-md hover:bg-elevated/50 flex items-start gap-3 -mx-3"
        @click="openNotification(notification)"
      >
        <UChip
          color="error"
          :show="!notification.readAt"
          inset
        >
          <UAvatar :icon="icons[notification.type] ?? 'i-lucide-bell'" size="md" />
        </UChip>

        <div class="text-sm flex-1 min-w-0">
          <p class="flex items-center justify-between gap-2">
            <span class="text-highlighted font-medium truncate">{{ notification.title }}</span>
            <time
              :datetime="notification.createdAt"
              class="text-muted text-xs shrink-0"
              v-text="formatTimeAgo(new Date(notification.createdAt))"
            />
          </p>
          <p v-if="notification.body" class="text-dimmed">
            {{ notification.body }}
          </p>
        </div>
      </button>

      <p v-if="!notifications.items.value.length" class="text-center text-muted py-8">
        {{ t('notifications.empty') }}
      </p>
    </template>
  </USlideover>
</template>
