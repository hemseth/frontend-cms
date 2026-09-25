<script setup lang="ts">
import { ref, onMounted } from 'vue'

definePageMeta({
  title: 'Security & 2FA Settings',
  layout: 'default'
})

const toast = useToast()

// 2FA state
const is2FAEnabled = ref(false)
const remainingRecoveryCodes = ref(0)
const loadingStatus = ref(true)

// Setup dialog & state
const showSetupModal = ref(false)
const setupStep = ref<'qr' | 'codes'>('qr')
const setupSecret = ref('')
const setupOtpauth = ref('')
const verifyCode = ref('')
const enabling = ref(false)
const generatedCodes = ref<string[]>([])

// Disable modal
const showDisableModal = ref(false)
const disablePassword = ref('')
const disabling = ref(false)

// Telegram Test Alert state
const testingAlert = ref(false)

async function fetchStatus() {
  loadingStatus.value = true
  try {
    const res = await $api('/auth/2fa/status')
    is2FAEnabled.value = !!res.data?.enabled
    remainingRecoveryCodes.value = res.data?.remainingRecoveryCodes || 0
  } catch (err: any) {
    console.error('Failed to load 2FA status:', err)
  } finally {
    loadingStatus.value = false
  }
}

async function startSetup() {
  try {
    const res = await $api('/auth/2fa/setup', { method: 'POST' })
    setupSecret.value = res.data?.secret || ''
    setupOtpauth.value = res.data?.otpauthUrl || ''
    verifyCode.value = ''
    setupStep.value = 'qr'
    showSetupModal.value = true
  } catch (err: any) {
    toast.add({
      title: 'កំហុស',
      description: err.data?.message || 'មិនអាចបង្កើតទិន្នន័យ 2FA បានទេ',
      color: 'error'
    })
  }
}

async function confirmEnable2FA() {
  if (!verifyCode.value || verifyCode.value.trim().length !== 6) {
    toast.add({ title: 'Invalid Code', description: 'សូមបញ្ចូលលេខកូដ 6 ខ្ទង់ពី Authenticator', color: 'warning' })
    return
  }
  enabling.value = true
  try {
    const res = await $api('/auth/2fa/enable', {
      method: 'POST',
      body: {
        secret: setupSecret.value,
        code: verifyCode.value.trim()
      }
    })
    generatedCodes.value = res.recoveryCodes || []
    is2FAEnabled.value = true
    remainingRecoveryCodes.value = generatedCodes.value.length
    setupStep.value = 'codes'
    toast.add({ title: 'ជោគជ័យ', description: 'បានបើកប្រព័ន្ធ 2FA ដោយជោគជ័យ!', color: 'success' })
  } catch (err: any) {
    toast.add({
      title: 'ការផ្ទៀងផ្ទាត់មិនត្រឹមត្រូវ',
      description: err.data?.message || 'លេខកូដ Authenticator មិនត្រឹមត្រូវ។ សូមព្យាយាមម្តងទៀត',
      color: 'error'
    })
  } finally {
    enabling.value = false
  }
}

async function confirmDisable2FA() {
  disabling.value = true
  try {
    await $api('/auth/2fa/disable', {
      method: 'POST',
      body: { password: disablePassword.value }
    })
    is2FAEnabled.value = false
    remainingRecoveryCodes.value = 0
    showDisableModal.value = false
    disablePassword.value = ''
    toast.add({ title: '2FA បានបិទ', description: 'បានបិទប្រព័ន្ធ 2FA រួចរាល់', color: 'info' })
  } catch (err: any) {
    toast.add({
      title: 'កំហុស',
      description: err.data?.message || 'ពាក្យសម្ងាត់មិនត្រឹមត្រូវ',
      color: 'error'
    })
  } finally {
    disabling.value = false
  }
}

async function testTelegramSOCAlert() {
  testingAlert.value = true
  try {
    await $api('/audit-logs/test-alert', { method: 'POST' })
    toast.add({
      title: 'Telegram Alert Sent',
      description: 'សារ Security Alert ត្រូវបានផ្ញើទៅ Telegram Admin SOC ដោយជោគជ័យ!',
      color: 'success'
    })
  } catch (err: any) {
    toast.add({
      title: 'កំហុស Telegram',
      description: err.data?.message || 'មិនអាចផ្ញើសារ Alert បានទេ',
      color: 'error'
    })
  } finally {
    testingAlert.value = false
  }
}

function copyToClipboard(text: string, label = 'ចម្លងបានជោគជ័យ') {
  navigator.clipboard.writeText(text)
  toast.add({ title: label, color: 'success' })
}

// Devices / active sessions
interface DeviceRow {
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
  loginCount: number
}

const devices = ref<DeviceRow[]>([])
const loadingDevices = ref(true)
const deviceActionId = ref('')

const deviceTypeIcons: Record<string, string> = {
  mobile: 'i-lucide-smartphone',
  tablet: 'i-lucide-tablet',
  desktop: 'i-lucide-monitor',
  unknown: 'i-lucide-help-circle'
}

async function fetchDevices() {
  loadingDevices.value = true
  try {
    const res = await $api('/devices')
    devices.value = res.data || []
  } catch (err: unknown) {
    toast.add({
      title: 'កំហុស',
      description: getApiErrorMessage(err, 'មិនអាចទាញយកបញ្ជីឧបករណ៍បានទេ'),
      color: 'error'
    })
  } finally {
    loadingDevices.value = false
  }
}

async function toggleBlockDevice(device: DeviceRow) {
  deviceActionId.value = device.deviceId
  try {
    const blocking = device.status !== 'blocked'
    await $api(`/devices/${device.deviceId}/${blocking ? 'block' : 'unblock'}`, { method: 'POST' })
    device.status = blocking ? 'blocked' : 'active'
    toast.add({
      title: blocking ? 'ឧបករណ៍ត្រូវបានទប់ស្កាត់' : 'ឧបករណ៍ត្រូវបានដោះការទប់ស្កាត់',
      color: blocking ? 'warning' : 'success'
    })
  } catch (err: unknown) {
    toast.add({ title: 'កំហុស', description: getApiErrorMessage(err, 'មិនអាចផ្លាស់ប្តូរស្ថានភាពឧបករណ៍បានទេ'), color: 'error' })
  } finally {
    deviceActionId.value = ''
  }
}

const renameTarget = ref<DeviceRow | null>(null)
const renameValue = ref('')
const renaming = ref(false)

function openRenameModal(device: DeviceRow) {
  renameTarget.value = device
  renameValue.value = device.deviceName
}

async function confirmRenameDevice() {
  if (!renameTarget.value || !renameValue.value.trim()) return
  renaming.value = true
  try {
    await $api(`/devices/${renameTarget.value.deviceId}`, {
      method: 'PATCH',
      body: { deviceName: renameValue.value.trim() }
    })
    renameTarget.value.deviceName = renameValue.value.trim()
    toast.add({ title: 'បានប្តូរឈ្មោះឧបករណ៍', color: 'success' })
    renameTarget.value = null
  } catch (err: unknown) {
    toast.add({ title: 'កំហុស', description: getApiErrorMessage(err, 'មិនអាចប្តូរឈ្មោះឧបករណ៍បានទេ'), color: 'error' })
  } finally {
    renaming.value = false
  }
}

const removeTarget = ref<DeviceRow | null>(null)
const removing = ref(false)

async function confirmRemoveDevice() {
  if (!removeTarget.value) return
  removing.value = true
  try {
    await $api(`/devices/${removeTarget.value.deviceId}`, { method: 'DELETE' })
    devices.value = devices.value.filter(d => d.deviceId !== removeTarget.value?.deviceId)
    toast.add({ title: 'ឧបករណ៍ត្រូវបានដកចេញ', color: 'success' })
    removeTarget.value = null
  } catch (err: unknown) {
    toast.add({ title: 'កំហុស', description: getApiErrorMessage(err, 'មិនអាចដកឧបករណ៍ចេញបានទេ'), color: 'error' })
  } finally {
    removing.value = false
  }
}

const removingOthers = ref(false)

async function removeAllOtherDevices() {
  const current = devices.value.find(d => d.isCurrentDevice)
  if (!current) return
  removingOthers.value = true
  try {
    const res = await $api<{ message?: string }>(`/devices?currentDeviceId=${encodeURIComponent(current.deviceId)}`, { method: 'DELETE' })
    devices.value = devices.value.filter(d => d.isCurrentDevice)
    toast.add({ title: res?.message || 'ឧបករណ៍ផ្សេងទៀតត្រូវបានចាកចេញ', color: 'success' })
  } catch (err: unknown) {
    toast.add({ title: 'កំហុស', description: getApiErrorMessage(err, 'មិនអាចចាកចេញពីឧបករណ៍ផ្សេងទៀតបានទេ'), color: 'error' })
  } finally {
    removingOthers.value = false
  }
}

function formatDeviceTime(value?: string) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

onMounted(() => {
  fetchStatus()
  fetchDevices()
})
</script>

<template>
  <div class="space-y-6 max-w-5xl mx-auto py-6 px-4">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-default pb-5">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-highlighted flex items-center gap-2">
          <UIcon name="i-lucide-shield-check" class="text-primary w-7 h-7" />
          ប្រព័ន្ធសុវត្ថិភាពគ្លីនិក (Clinic Security & SOC)
        </h1>
        <p class="text-sm text-muted mt-1">
          គ្រប់គ្រងការផ្ទៀងផ្ទាត់ពីរកត្តា (2FA), ការពារទិន្នន័យ Multi-Tenant និងតាមដាន Telegram SOC Alert
        </p>
      </div>

      <UButton
        variant="soft"
        color="primary"
        icon="i-lucide-clipboard-list"
        to="/settings/audit-logs"
      >
        មើលកំណត់ត្រាសវនកម្ម (Audit Trail)
      </UButton>
    </div>

    <!-- Security Rings Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Feature 2: Two-Factor Authentication (2FA) -->
      <UCard class="border border-default shadow-sm">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-950/60 flex items-center justify-center text-primary">
                <UIcon name="i-lucide-smartphone" class="w-6 h-6" />
              </div>
              <div>
                <h3 class="font-bold text-base text-highlighted">
                  ការផ្ទៀងផ្ទាត់ពីរកត្តា (2FA TOTP)
                </h3>
                <p class="text-xs text-muted">
                  Google / Microsoft Authenticator (RFC 6238)
                </p>
              </div>
            </div>

            <UBadge
              :color="is2FAEnabled ? 'success' : 'neutral'"
              variant="subtle"
              class="font-medium"
            >
              {{ is2FAEnabled ? 'សកម្ម (Active)' : 'មិនទាន់បើក (Inactive)' }}
            </UBadge>
          </div>
        </template>

        <div class="space-y-4 text-sm">
          <p class="text-toned">
            ការបើក 2FA ជួយការពារគណនីរបស់អ្នកពីការលួចចូលដោយតម្រូវឱ្យបញ្ចូលលេខកូដ 6 ខ្ទង់រាល់ពេល Login បន្ទាប់ពីបញ្ចូលពាក្យសម្ងាត់។
          </p>

          <div v-if="is2FAEnabled" class="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800/40 text-xs text-green-800 dark:text-green-300 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-check-circle" class="w-4 h-4 text-green-600 dark:text-green-400" />
              <span>គណនីត្រូវបានការពារដោយ 2FA TOTP</span>
            </div>
            <span class="font-mono font-bold">{{ remainingRecoveryCodes }} Recovery Codes នៅសល់</span>
          </div>

          <div class="flex items-center gap-3 pt-2">
            <UButton
              v-if="!is2FAEnabled"
              color="primary"
              icon="i-lucide-shield-plus"
              :loading="loadingStatus"
              @click="startSetup"
            >
              រៀបចំបើក 2FA ឥឡូវនេះ
            </UButton>

            <template v-else>
              <UButton
                color="error"
                variant="soft"
                icon="i-lucide-shield-alert"
                @click="showDisableModal = true"
              >
                បិទដំណើរការ 2FA
              </UButton>
            </template>
          </div>
        </div>
      </UCard>

      <!-- Feature 1: Telegram SOC Real-time Bot -->
      <UCard class="border border-default shadow-sm">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <UIcon name="i-lucide-bell-ring" class="w-6 h-6" />
              </div>
              <div>
                <h3 class="font-bold text-base text-highlighted">
                  Telegram Real-time Security Bot
                </h3>
                <p class="text-xs text-muted">
                  ការជូនដំណឹងបន្ទាន់ទៅកាន់ Admin SOC
                </p>
              </div>
            </div>

            <UBadge color="primary" variant="subtle">
              SOC Monitored
            </UBadge>
          </div>
        </template>

        <div class="space-y-4 text-sm">
          <ul class="space-y-2 text-xs text-toned">
            <li class="flex items-center gap-2">
              <UIcon name="i-lucide-shield-check" class="text-green-500 w-4 h-4 shrink-0" />
              <span><strong>Brute Force Shield:</strong> រាយការណ៍ភ្លាមៗពេលមានការវាយប្រហារ Login ច្រើនដង</span>
            </li>
            <li class="flex items-center gap-2">
              <UIcon name="i-lucide-shield-check" class="text-green-500 w-4 h-4 shrink-0" />
              <span><strong>Cross-Clinic Guard:</strong> ទប់ស្កាត់ និងផ្ញើសារ Alert ពេលមានការលួចឆ្លងគ្លីនិក</span>
            </li>
            <li class="flex items-center gap-2">
              <UIcon name="i-lucide-shield-check" class="text-green-500 w-4 h-4 shrink-0" />
              <span><strong>Medical Data Guard:</strong> ជូនដំណឹងពេលមានការលុប ឬកែប្រែទិន្នន័យវេជ្ជសាស្ត្រសំខាន់</span>
            </li>
          </ul>

          <div class="pt-2">
            <UButton
              color="primary"
              variant="outline"
              icon="i-lucide-send"
              :loading="testingAlert"
              @click="testTelegramSOCAlert"
            >
              ផ្ញើសារសាកល្បងទៅ Telegram SOC
            </UButton>
          </div>
        </div>
      </UCard>

      <!-- Feature 3: Multi-Tenant Clinic Isolation -->
      <UCard class="border border-default shadow-sm">
        <template #header>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <UIcon name="i-lucide-building" class="w-6 h-6" />
            </div>
            <div>
              <h3 class="font-bold text-base text-highlighted">
                Multi-Tenant Data Isolation
              </h3>
              <p class="text-xs text-muted">
                ការបំបែកទិន្នន័យរវាងគ្លីនិកនីមួយៗដាច់ដោយឡែក
              </p>
            </div>
          </div>
        </template>

        <div class="space-y-3 text-xs text-toned">
          <p>
            រាល់សំណើទាំងអស់ត្រូវបានត្រួតពិនិត្យដោយ <strong>Tenant Isolation Middleware</strong> ដើម្បីធានាថាបុគ្គលិកនៃគ្លីនិក A មិនអាចអាន កែប្រែ ឬលុបទិន្នន័យអ្នកជំងឺ ឬថ្នាំរបស់គ្លីនិក B បានឡើយ។
          </p>
          <div class="p-3 bg-purple-50/60 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800/40">
            <span class="font-semibold text-purple-900 dark:text-purple-300">ស្ថានភាព៖</span> ការពារកម្រិត 31 Integration Tests ជាមួយ Real-time Tamper Detection។
          </div>
        </div>
      </UCard>

      <!-- Feature 4: Forensic Medical Audit Trail -->
      <UCard class="border border-default shadow-sm">
        <template #header>
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <UIcon name="i-lucide-file-clock" class="w-6 h-6" />
            </div>
            <div>
              <h3 class="font-bold text-base text-highlighted">
                Forensic Medical Audit Trail
              </h3>
              <p class="text-xs text-muted">
                កំណត់ត្រាសវនកម្មមិនអាចកែបន្លំបាន (Immutable Log)
              </p>
            </div>
          </div>
        </template>

        <div class="space-y-3 text-xs text-toned">
          <p>
            កត់ត្រារាល់សកម្មភាពវេជ្ជសាស្ត្រទាំងអស់រួមមាន ការបង្កើតវេជ្ជបញ្ជា, ការបញ្ចូលអ្នកជំងឺ, ការទូទាត់, និងការលុប ដោយភ្ជាប់ជាមួយ IP Address, ឈ្មោះគណនី, និងពេលវេលាជាក់ស្តែងនៅកម្ពុជា។
          </p>
          <div class="pt-2">
            <UButton
              color="neutral"
              variant="soft"
              size="sm"
              icon="i-lucide-arrow-right"
              to="/settings/audit-logs"
            >
              ចូលទៅកាន់ Audit Logs Console
            </UButton>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Devices / Active Sessions -->
    <UCard class="border border-default shadow-sm">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-950/60 flex items-center justify-center text-primary">
              <UIcon name="i-lucide-laptop-2" class="w-6 h-6" />
            </div>
            <div>
              <h3 class="font-bold text-base text-highlighted">
                ឧបករណ៍ដែលបានចូលប្រើ (Active Devices / Sessions)
              </h3>
              <p class="text-xs text-muted">
                មើល ទប់ស្កាត់ ប្តូរឈ្មោះ ឬដកឧបករណ៍ដែលបានភ្ជាប់ជាមួយគណនីរបស់អ្នក
              </p>
            </div>
          </div>

          <UButton
            v-if="devices.length > 1"
            color="error"
            variant="soft"
            size="sm"
            icon="i-lucide-log-out"
            :loading="removingOthers"
            @click="removeAllOtherDevices"
          >
            ចាកចេញពីឧបករណ៍ផ្សេងទៀតទាំងអស់
          </UButton>
        </div>
      </template>

      <div v-if="loadingDevices" class="py-8 text-center text-sm text-muted">
        <UIcon name="i-lucide-loader-2" class="w-5 h-5 animate-spin mx-auto mb-2" />
        កំពុងផ្ទុកបញ្ជីឧបករណ៍...
      </div>

      <div v-else-if="devices.length === 0" class="py-8 text-center text-sm text-muted">
        មិនទាន់មានឧបករណ៍ណាមួយត្រូវបានចុះឈ្មោះនៅឡើយទេ
      </div>

      <div v-else class="divide-y divide-default">
        <div
          v-for="device in devices"
          :key="device.deviceId"
          class="py-3 flex flex-wrap items-center justify-between gap-3"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div
              class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              :class="device.status === 'blocked' ? 'bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400' : 'bg-elevated text-toned'"
            >
              <UIcon :name="deviceTypeIcons[device.deviceType] || 'i-lucide-help-circle'" class="w-5 h-5" />
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-semibold text-sm text-highlighted truncate">{{ device.deviceName }}</span>
                <UBadge
                  v-if="device.isCurrentDevice"
                  color="primary"
                  variant="subtle"
                  size="sm"
                >
                  ឧបករណ៍បច្ចុប្បន្ន
                </UBadge>
                <UBadge
                  v-if="device.status === 'blocked'"
                  color="error"
                  variant="subtle"
                  size="sm"
                >
                  ត្រូវបានទប់ស្កាត់
                </UBadge>
                <UBadge
                  v-else-if="device.isTrusted"
                  color="success"
                  variant="subtle"
                  size="sm"
                >
                  ជឿទុកចិត្ត
                </UBadge>
              </div>
              <p class="text-xs text-muted truncate">
                {{ [device.browser, device.os].filter(Boolean).join(' · ') || 'Unknown' }}
                <span v-if="device.ipAddress"> · {{ device.ipAddress }}</span>
                · សកម្មចុងក្រោយ: {{ formatDeviceTime(device.lastActiveAt) }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-1 shrink-0">
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              icon="i-lucide-pencil"
              :disabled="deviceActionId === device.deviceId"
              @click="openRenameModal(device)"
            >
              ប្តូរឈ្មោះ
            </UButton>
            <UButton
              size="xs"
              variant="ghost"
              :color="device.status === 'blocked' ? 'success' : 'warning'"
              :icon="device.status === 'blocked' ? 'i-lucide-shield-check' : 'i-lucide-shield-off'"
              :loading="deviceActionId === device.deviceId"
              @click="toggleBlockDevice(device)"
            >
              {{ device.status === 'blocked' ? 'ដោះទប់ស្កាត់' : 'ទប់ស្កាត់' }}
            </UButton>
            <UButton
              v-if="!device.isCurrentDevice"
              size="xs"
              variant="ghost"
              color="error"
              icon="i-lucide-trash-2"
              @click="removeTarget = device"
            >
              ដកចេញ
            </UButton>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Modal: Rename Device -->
    <UModal :open="!!renameTarget" @update:open="(v) => { if (!v) renameTarget = null }">
      <template #content>
        <UCard v-if="renameTarget" class="max-w-md w-full">
          <template #header>
            <h3 class="text-base font-bold text-highlighted flex items-center gap-2">
              <UIcon name="i-lucide-pencil" class="text-primary-500 w-5 h-5" />
              ប្តូរឈ្មោះឧបករណ៍
            </h3>
          </template>

          <div class="space-y-4">
            <UInput
              v-model="renameValue"
              placeholder="ឈ្មោះឧបករណ៍"
              autofocus
              @keyup.enter="confirmRenameDevice"
            />

            <div class="flex justify-end gap-2 pt-2">
              <UButton variant="ghost" color="neutral" @click="renameTarget = null">
                បោះបង់
              </UButton>
              <UButton
                color="primary"
                :loading="renaming"
                :disabled="!renameValue.trim() || renaming"
                @click="confirmRenameDevice"
              >
                រក្សាទុក
              </UButton>
            </div>
          </div>
        </UCard>
      </template>
    </UModal>

    <!-- Modal: Remove Device -->
    <UModal :open="!!removeTarget" @update:open="(v) => { if (!v) removeTarget = null }">
      <template #content>
        <UCard v-if="removeTarget" class="max-w-md w-full">
          <template #header>
            <h3 class="text-base font-bold text-highlighted flex items-center gap-2">
              <UIcon name="i-lucide-trash-2" class="text-error-500 w-5 h-5" />
              ដកឧបករណ៍ចេញ
            </h3>
          </template>

          <div class="space-y-4">
            <p class="text-xs text-toned">
              តើអ្នកពិតជាចង់ដកឧបករណ៍ <strong>{{ removeTarget.deviceName }}</strong> ចេញមែនទេ? ឧបករណ៍នេះនឹងត្រូវចាកចេញពីគណនីភ្លាមៗ។
            </p>

            <div class="flex justify-end gap-2 pt-2">
              <UButton variant="ghost" color="neutral" @click="removeTarget = null">
                បោះបង់
              </UButton>
              <UButton
                color="error"
                :loading="removing"
                @click="confirmRemoveDevice"
              >
                ដកចេញ
              </UButton>
            </div>
          </div>
        </UCard>
      </template>
    </UModal>

    <!-- Modal: Setup 2FA -->
    <UModal v-model:open="showSetupModal">
      <template #content>
        <UCard class="max-w-lg w-full">
          <template #header>
            <h3 class="text-lg font-bold text-highlighted flex items-center gap-2">
              <UIcon name="i-lucide-key-round" class="text-primary-600 w-5 h-5" />
              {{ setupStep === 'qr' ? 'រៀបចំ 2FA Authenticator' : 'លេខកូដសង្គ្រោះ (Backup Recovery Codes)' }}
            </h3>
          </template>

          <!-- Step 1: Scan / Enter Key -->
          <div v-if="setupStep === 'qr'" class="space-y-4">
            <p class="text-xs text-toned">
              ១. បើកកម្មវិធី Google Authenticator ឬ Microsoft Authenticator នៅលើទូរស័ព្ទរបស់អ្នក រួចជ្រើសរើស "Add Account" &rarr; "Enter a setup key"។
            </p>

            <div class="p-3 bg-elevated rounded-lg">
              <span class="block text-xs font-semibold text-muted mb-1">Setup Key (Secret):</span>
              <div class="flex items-center justify-between">
                <code class="font-mono text-sm font-bold text-primary tracking-wider">{{ setupSecret }}</code>
                <UButton
                  size="xs"
                  variant="ghost"
                  icon="i-lucide-copy"
                  @click="copyToClipboard(setupSecret, 'បានចម្លង Secret Key')"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-default mb-1">
                ២. បញ្ចូលលេខកូដ 6 ខ្ទង់ដែលបង្ហាញក្នុង Authenticator App៖
              </label>
              <UInput
                v-model="verifyCode"
                type="text"
                maxlength="6"
                placeholder="000000"
                class="text-center font-mono text-xl tracking-widest"
                autofocus
                @keyup.enter="confirmEnable2FA"
              />
            </div>

            <div class="flex justify-end gap-2 pt-2">
              <UButton variant="ghost" color="neutral" @click="showSetupModal = false">
                បោះបង់
              </UButton>
              <UButton
                color="primary"
                :loading="enabling"
                :disabled="verifyCode.length !== 6 || enabling"
                @click="confirmEnable2FA"
              >
                ផ្ទៀងផ្ទាត់ និងបើក 2FA
              </UButton>
            </div>
          </div>

          <!-- Step 2: Show Recovery Codes -->
          <div v-else class="space-y-4">
            <div class="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800/50 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <UIcon name="i-lucide-alert-triangle" class="w-5 h-5 shrink-0 text-amber-600" />
              <span>សូមរក្សាទុកលេខកូដសង្គ្រោះទាំងនេះនៅកន្លែងមានសុវត្ថិភាព។ លេខកូដនីមួយៗអាចប្រើបានតែម្តងគត់ ប្រសិនបើអ្នកបាត់ទូរស័ព្ទ។</span>
            </div>

            <div class="grid grid-cols-2 gap-2 p-3 bg-muted rounded-lg border border-default font-mono text-sm text-center">
              <div
                v-for="(code, idx) in generatedCodes"
                :key="idx"
                class="p-2 bg-default rounded border border-default font-bold"
              >
                {{ code }}
              </div>
            </div>

            <div class="flex items-center justify-between pt-2">
              <UButton
                variant="outline"
                size="sm"
                icon="i-lucide-copy"
                @click="copyToClipboard(generatedCodes.join('\n'), 'បានចម្លង Recovery Codes')"
              >
                ចម្លងលេខកូដទាំងអស់
              </UButton>

              <UButton
                color="primary"
                @click="showSetupModal = false"
              >
                រួចរាល់ (Finish)
              </UButton>
            </div>
          </div>
        </UCard>
      </template>
    </UModal>

    <!-- Modal: Disable 2FA -->
    <UModal v-model:open="showDisableModal">
      <template #content>
        <UCard class="max-w-md w-full">
          <template #header>
            <h3 class="text-base font-bold text-highlighted flex items-center gap-2">
              <UIcon name="i-lucide-shield-alert" class="text-error-500 w-5 h-5" />
              បញ្ជាក់ការបិទ 2FA
            </h3>
          </template>

          <div class="space-y-4">
            <p class="text-xs text-toned">
              តើអ្នកពិតជាចង់បិទការផ្ទៀងផ្ទាត់ពីរកត្តា (2FA) មែនទេ? សូមបញ្ចូលពាក្យសម្ងាត់របស់អ្នកដើម្បីបញ្ជាក់៖
            </p>

            <UInput
              v-model="disablePassword"
              type="password"
              placeholder="បញ្ចូលពាក្យសម្ងាត់របស់អ្នក"
              autocomplete="current-password"
            />

            <div class="flex justify-end gap-2 pt-2">
              <UButton variant="ghost" color="neutral" @click="showDisableModal = false">
                បោះបង់
              </UButton>
              <UButton
                color="error"
                :loading="disabling"
                :disabled="!disablePassword || disabling"
                @click="confirmDisable2FA"
              >
                បិទ 2FA ឥឡូវនេះ
              </UButton>
            </div>
          </div>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
