<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface Device {
  id: string
  deviceId: string
  deviceName: string
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown'
  os?: string
  osVersion?: string
  browser?: string
  browserVersion?: string
  ipAddress?: string
  lastActiveAt?: string
  lastLoginAt?: string
  status: 'active' | 'inactive' | 'blocked'
  isTrusted: boolean
  isCurrentDevice: boolean
  loginCount?: number
}

const { t } = useI18n()
const toast = useToast()

const devices = ref<Device[]>([])
const isLoading = ref(true)
const loadError = ref('')
const busyId = ref('')

const currentDevice = computed(() => devices.value.find(d => d.isCurrentDevice))
const otherDevices = computed(() => devices.value.filter(d => !d.isCurrentDevice))

const ICONS: Record<Device['deviceType'], string> = {
  mobile: 'i-lucide-smartphone',
  tablet: 'i-lucide-tablet',
  desktop: 'i-lucide-monitor',
  unknown: 'i-lucide-circle-help'
}

async function load() {
  isLoading.value = true
  loadError.value = ''
  try {
    const res: { data?: Device[] } = await $api('/devices')
    devices.value = res?.data ?? []
  } catch (err) {
    loadError.value = getApiErrorMessage(err, t('settings.devices.loadFailed'))
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

async function run(device: Device, request: () => Promise<unknown>, success: string) {
  busyId.value = device.deviceId
  try {
    await request()
    toast.add({ title: success, color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(err, t('common.saveFailed')), color: 'error' })
  } finally {
    busyId.value = ''
  }
}

function rename(device: Device) {
  const name = window.prompt(t('settings.devices.renamePrompt'), device.deviceName)?.trim()
  if (!name || name === device.deviceName) return
  run(device, () => $api(`/devices/${encodeURIComponent(device.deviceId)}`, { method: 'PATCH', body: { deviceName: name } }), t('common.saved'))
}

function toggleBlock(device: Device) {
  const action = device.status === 'blocked' ? 'unblock' : 'block'
  if (action === 'block' && !window.confirm(t('settings.devices.blockConfirm', { name: device.deviceName }))) return
  run(device, () => $api(`/devices/${encodeURIComponent(device.deviceId)}/${action}`, { method: 'POST' }), t(`settings.devices.${action}Done`))
}

function remove(device: Device) {
  if (!window.confirm(t('settings.devices.removeConfirm', { name: device.deviceName }))) return
  run(device, () => $api(`/devices/${encodeURIComponent(device.deviceId)}`, { method: 'DELETE' }), t('settings.devices.removed'))
}

async function removeOthers() {
  const current = currentDevice.value
  if (!current || !window.confirm(t('settings.devices.removeOthersConfirm'))) return
  await run(current, () => $api('/devices', { method: 'DELETE', params: { currentDeviceId: current.deviceId } }), t('settings.devices.removed'))
}

function describe(device: Device) {
  return [
    [device.os, device.osVersion].filter(Boolean).join(' '),
    [device.browser, device.browserVersion].filter(Boolean).join(' '),
    device.ipAddress
  ].filter(Boolean).join(' • ')
}

function formatDateTime(value?: string) {
  return value ? new Date(value).toLocaleString() : '-'
}
</script>

<template>
  <div class="p-4 space-y-4 max-w-4xl">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-bold flex items-center gap-2">
          <UIcon name="i-lucide-monitor-smartphone" class="w-6 h-6 text-primary" />
          {{ t('nav.deviceSessions') }}
        </h1>
        <p class="text-sm text-muted mt-1">
          {{ t('settings.devices.subtitle') }}
        </p>
      </div>
      <UButton
        v-if="currentDevice && otherDevices.length"
        :label="t('settings.devices.removeOthers')"
        icon="i-lucide-log-out"
        color="error"
        variant="soft"
        @click="removeOthers"
      />
    </div>

    <div v-if="isLoading" class="py-12 text-center">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto text-primary-500" />
    </div>

    <UAlert
      v-else-if="loadError"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="loadError"
      :actions="[{ label: t('common.refresh'), onClick: load }]"
    />

    <p v-else-if="devices.length === 0" class="text-sm text-muted py-8 text-center">
      {{ t('settings.devices.none') }}
    </p>

    <div v-else class="space-y-3">
      <UCard v-for="device in devices" :key="device.deviceId">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <UIcon :name="ICONS[device.deviceType] || ICONS.unknown" class="w-8 h-8 text-muted shrink-0" />
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-semibold truncate">{{ device.deviceName }}</span>
                <UBadge
                  v-if="device.isCurrentDevice"
                  color="primary"
                  variant="subtle"
                  size="sm"
                >
                  {{ t('settings.devices.thisDevice') }}
                </UBadge>
                <UBadge
                  v-if="device.status === 'blocked'"
                  color="error"
                  variant="subtle"
                  size="sm"
                >
                  {{ t('settings.devices.blocked') }}
                </UBadge>
                <UBadge
                  v-else-if="device.isTrusted"
                  color="success"
                  variant="subtle"
                  size="sm"
                >
                  {{ t('settings.devices.trusted') }}
                </UBadge>
              </div>
              <p class="text-xs text-muted truncate">
                {{ describe(device) }}
              </p>
              <p class="text-xs text-muted">
                {{ t('settings.devices.lastActive') }}: {{ formatDateTime(device.lastActiveAt) }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-1">
            <UButton
              icon="i-lucide-pencil"
              color="neutral"
              variant="ghost"
              size="sm"
              :aria-label="t('settings.devices.rename')"
              :loading="busyId === device.deviceId"
              @click="rename(device)"
            />
            <UButton
              v-if="!device.isCurrentDevice"
              :label="device.status === 'blocked' ? t('settings.devices.unblock') : t('settings.devices.block')"
              color="neutral"
              variant="outline"
              size="sm"
              :disabled="busyId === device.deviceId"
              @click="toggleBlock(device)"
            />
            <UButton
              v-if="!device.isCurrentDevice"
              icon="i-lucide-trash-2"
              color="error"
              variant="ghost"
              size="sm"
              :aria-label="t('common.remove')"
              :disabled="busyId === device.deviceId"
              @click="remove(device)"
            />
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
