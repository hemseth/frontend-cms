<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import type { LabAttachment, LabOrder } from '~/types/workstation'

/**
 * Result files on a lab or imaging order: echo / x-ray images, or a photo or PDF of an analyser
 * printout. The files are private patient records, so they are fetched with the login token
 * (GET /labs/:id/attachments/:fileId) and shown from in-memory blob URLs, never from a public URL.
 * Upload and remove need laboratory:update and stop once the result is verified.
 */
const props = defineProps<{ order: LabOrder, editable?: boolean }>()
const emit = defineEmits<{ changed: [] }>()

const { t } = useI18n()
const toast = useToast()

const MAX_BYTES = 10 * 1024 * 1024
const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf'
const input = ref<HTMLInputElement | null>(null)
const isUploading = ref(false)
const removing = ref('')
/** fileId -> blob URL, for thumbnails and opening. */
const urls = ref<Record<string, string>>({})

const isImage = (a: LabAttachment) => (a.mimeType || '').startsWith('image/')
const path = (a: LabAttachment) => `/labs/${props.order._id}/attachments/${a.fileId}`

async function fetchUrl(a: LabAttachment): Promise<string> {
  const cached = urls.value[a.fileId]
  if (cached) return cached
  const blob = await $api<Blob>(path(a), { responseType: 'blob' })
  const url = URL.createObjectURL(blob)
  urls.value = { ...urls.value, [a.fileId]: url }
  return url
}

function releaseAll() {
  for (const url of Object.values(urls.value)) URL.revokeObjectURL(url)
  urls.value = {}
}

async function loadThumbnails() {
  const keep = new Set((props.order.attachments || []).map(a => a.fileId))
  for (const [id, url] of Object.entries(urls.value)) {
    if (!keep.has(id)) {
      URL.revokeObjectURL(url)
      const { [id]: _removed, ...rest } = urls.value
      urls.value = rest
    }
  }
  for (const a of props.order.attachments || []) {
    if (isImage(a)) await fetchUrl(a).catch(() => undefined)
  }
}

async function open(a: LabAttachment) {
  // Opened synchronously so the popup is not blocked, then pointed at the file.
  const win = window.open('', '_blank')
  try {
    const url = await fetchUrl(a)
    if (win) win.location.href = url
    else window.location.assign(url)
  } catch (err) {
    win?.close()
    toast.add({ title: t('common.error'), description: getApiErrorMessage(err, t('workstation.attachments.openFailed')), color: 'error' })
  }
}

async function upload(event: Event) {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files || [])
  target.value = ''
  if (!files.length) return
  isUploading.value = true
  let added = 0
  try {
    for (const file of files) {
      if (file.size > MAX_BYTES) {
        toast.add({ title: t('workstation.attachments.tooLarge', { name: file.name }), color: 'warning' })
        continue
      }
      const form = new FormData()
      form.append('file', file)
      try {
        await $api(`/labs/${props.order._id}/attachments`, { method: 'PUT', body: form })
        added++
      } catch (err) {
        toast.add({ title: file.name, description: getApiErrorMessage(err, t('workstation.attachments.uploadFailed')), color: 'error' })
      }
    }
  } finally {
    isUploading.value = false
  }
  if (added) {
    toast.add({ title: t('workstation.attachments.uploaded', { n: added }), color: 'success' })
    emit('changed')
  }
}

async function remove(a: LabAttachment) {
  if (!window.confirm(t('workstation.attachments.removeConfirm', { name: a.originalName || a.fileId }))) return
  removing.value = a.fileId
  try {
    await $api(`${path(a)}/remove`, { method: 'PUT' })
    emit('changed')
  } catch (err) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(err, t('common.saveFailed')), color: 'error' })
  } finally {
    removing.value = ''
  }
}

watch(() => [props.order._id, (props.order.attachments || []).map(a => a.fileId).join(',')], (now, before) => {
  if (before && now[0] !== before[0]) releaseAll()
  loadThumbnails()
}, { immediate: true })
onBeforeUnmount(releaseAll)
</script>

<template>
  <div v-if="editable || order.attachments?.length" class="space-y-2">
    <div class="flex flex-wrap items-center gap-2">
      <span class="text-sm font-medium">{{ t('workstation.attachments.title') }}</span>
      <span class="text-xs text-muted">{{ t('workstation.attachments.hint') }}</span>
      <template v-if="editable">
        <input
          ref="input"
          type="file"
          class="hidden"
          :accept="ACCEPT"
          multiple
          @change="upload"
        >
        <UButton
          class="ml-auto"
          size="sm"
          variant="outline"
          icon="i-lucide-upload"
          :label="t('workstation.attachments.upload')"
          :loading="isUploading"
          @click="input?.click()"
        />
      </template>
    </div>

    <p v-if="!order.attachments?.length" class="text-sm text-muted">
      {{ t('workstation.attachments.none') }}
    </p>
    <ul v-else class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      <li
        v-for="a in order.attachments"
        :key="a.fileId"
        class="group relative overflow-hidden rounded-lg border border-default"
      >
        <button
          type="button"
          class="block w-full text-left"
          :title="t('workstation.attachments.open')"
          @click="open(a)"
        >
          <img
            v-if="isImage(a) && urls[a.fileId]"
            :src="urls[a.fileId]"
            :alt="a.originalName || ''"
            class="h-28 w-full bg-elevated object-contain"
          >
          <div v-else class="flex h-28 w-full items-center justify-center bg-elevated">
            <UIcon :name="isImage(a) ? 'i-lucide-image' : 'i-lucide-file-text'" class="size-8 text-muted" />
          </div>
          <p class="truncate px-2 py-1 text-xs">
            {{ a.originalName || a.fileId }}
          </p>
        </button>
        <UButton
          v-if="editable"
          icon="i-lucide-x"
          size="xs"
          color="error"
          variant="solid"
          class="absolute right-1 top-1"
          :aria-label="t('workstation.attachments.remove')"
          :loading="removing === a.fileId"
          @click="remove(a)"
        />
      </li>
    </ul>
  </div>
</template>
