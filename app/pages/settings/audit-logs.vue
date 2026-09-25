<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

definePageMeta({
  title: 'Forensic Medical Audit Logs',
  layout: 'default'
})

interface AuditItem {
  _id: string
  userId?: string
  username?: string
  clinicId?: string
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ' | 'LOGIN' | 'LOGOUT' | 'ERROR'
  resource: string
  resourceId?: string
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  status: 'success' | 'failure'
  timestamp: string
}

const logs = ref<AuditItem[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const limit = ref(20)

// Filters
const selectedAction = ref<string>('')
const selectedResource = ref<string>('')
const selectedLog = ref<AuditItem | null>(null)
const showDetailsModal = ref(false)

const actionOptions = [
  { label: 'ទាំងអស់ (All Actions)', value: '' },
  { label: 'CREATE (បង្កើត)', value: 'CREATE' },
  { label: 'UPDATE (កែប្រែ)', value: 'UPDATE' },
  { label: 'DELETE (លុប)', value: 'DELETE' },
  { label: 'READ (អាន)', value: 'READ' },
]

const resourceOptions = [
  { label: 'គ្រប់ផ្នែក (All Resources)', value: '' },
  { label: 'Patient (អ្នកជំងឺ)', value: 'patient' },
  { label: 'Prescription (វេជ្ជបញ្ជា)', value: 'prescription' },
  { label: 'Visit (ការពិនិត្យ)', value: 'visit' },
  { label: 'Payment (ការទូទាត់)', value: 'payment' },
  { label: 'Pharmacy (ឱសថស្ថាន)', value: 'pharmacy' },
  { label: 'User (គណនី)', value: 'user' },
  { label: 'Admission (សម្រាកព្យាបាល)', value: 'admission' },
]

async function fetchLogs() {
  loading.value = true
  try {
    const params: Record<string, any> = {
      page: page.value,
      limit: limit.value,
    }
    if (selectedAction.value) params.action = selectedAction.value
    if (selectedResource.value) params.resource = selectedResource.value

    const res = await $api('/audit-logs', { params })
    logs.value = res.data || []
    total.value = res.pagination?.total || 0
  } catch (err: any) {
    console.error('Failed to fetch audit logs:', err)
  } finally {
    loading.value = false
  }
}

function getActionColor(action: string) {
  switch (action) {
    case 'CREATE': return 'success'
    case 'UPDATE': return 'info'
    case 'DELETE': return 'error'
    case 'READ': return 'neutral'
    default: return 'warning'
  }
}

function formatDate(iso: string) {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleString('km-KH', {
      timeZone: 'Asia/Phnom_Penh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return iso
  }
}

function openDetails(item: AuditItem) {
  selectedLog.value = item
  showDetailsModal.value = true
}

watch([page, selectedAction, selectedResource], () => {
  fetchLogs()
})

onMounted(() => {
  fetchLogs()
})
</script>

<template>
  <div class="space-y-6 max-w-7xl mx-auto py-6 px-4">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-default pb-5">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-highlighted flex items-center gap-2">
          <UIcon name="i-lucide-file-clock" class="text-primary w-7 h-7" />
          កំណត់ត្រាសវនកម្មវេជ្ជសាស្ត្រ (Medical Audit Trail)
        </h1>
        <p class="text-sm text-muted mt-1">
          Forensic Audit Log កត់ត្រារាល់សកម្មភាពវេជ្ជសាស្ត្រ និងការកែប្រែទិន្នន័យដោយស្វ័យប្រវត្តិ
        </p>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          variant="outline"
          color="neutral"
          icon="i-lucide-shield-check"
          to="/settings/security"
        >
          Security Dashboard
        </UButton>
        <UButton
          color="primary"
          icon="i-lucide-rotate-cw"
          :loading="loading"
          @click="fetchLogs"
        >
          ផ្ទុកទិន្នន័យឡើងវិញ
        </UButton>
      </div>
    </div>

    <!-- Filters Bar -->
    <UCard class="border border-default shadow-sm p-4">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label class="block text-xs font-semibold text-toned mb-1">
            ប្រភេទសកម្មភាព (Action)
          </label>
          <USelect
            v-model="selectedAction"
            :items="actionOptions"
            placeholder="ជ្រើសរើស Action"
            class="w-full"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-toned mb-1">
            ផ្នែកទិន្នន័យ (Resource)
          </label>
          <USelect
            v-model="selectedResource"
            :items="resourceOptions"
            placeholder="ជ្រើសរើស Resource"
            class="w-full"
          />
        </div>

        <div class="flex items-end">
          <div class="text-xs text-muted">
            សរុបមាន៖ <strong class="text-highlighted font-mono text-sm">{{ total }}</strong> កំណត់ត្រា
          </div>
        </div>
      </div>
    </UCard>

    <!-- Table -->
    <UCard class="border border-default shadow-sm overflow-hidden" :ui="{ body: 'p-0' }">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-muted text-xs text-muted border-b border-default">
            <tr>
              <th class="py-3 px-4">កាលបរិច្ឆេទ (Time)</th>
              <th class="py-3 px-4">គណនី (User)</th>
              <th class="py-3 px-4">សកម្មភាព (Action)</th>
              <th class="py-3 px-4">ផ្នែក (Resource)</th>
              <th class="py-3 px-4">IP Address</th>
              <th class="py-3 px-4">ស្ថានភាព</th>
              <th class="py-3 px-4 text-right">ព័ត៌មានលម្អិត</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr v-if="loading" class="text-center">
              <td colspan="7" class="py-8 text-muted">
                <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin mx-auto text-primary-500" />
                <span class="mt-2 block text-xs">កំពុងទាញយកទិន្នន័យ...</span>
              </td>
            </tr>
            <tr v-else-if="logs.length === 0" class="text-center">
              <td colspan="7" class="py-8 text-dimmed text-xs">
                មិនមានកំណត់ត្រាសវនកម្មក្នុងលក្ខខណ្ឌនេះទេ
              </td>
            </tr>
            <tr
              v-for="log in logs"
              v-else
              :key="log._id"
              class="hover:bg-muted/70 transition-colors"
            >
              <td class="py-3 px-4 font-mono text-xs whitespace-nowrap text-toned">
                {{ formatDate(log.timestamp) }}
              </td>
              <td class="py-3 px-4 font-semibold text-highlighted">
                {{ log.username || 'System' }}
              </td>
              <td class="py-3 px-4">
                <UBadge :color="getActionColor(log.action)" variant="subtle" size="xs">
                  {{ log.action }}
                </UBadge>
              </td>
              <td class="py-3 px-4 capitalize text-default">
                {{ log.resource }}
              </td>
              <td class="py-3 px-4 font-mono text-xs text-muted">
                {{ log.ipAddress || '-' }}
              </td>
              <td class="py-3 px-4">
                <UBadge :color="log.status === 'success' ? 'success' : 'error'" variant="soft" size="xs">
                  {{ log.status }}
                </UBadge>
              </td>
              <td class="py-3 px-4 text-right">
                <UButton
                  size="xs"
                  variant="ghost"
                  icon="i-lucide-eye"
                  @click="openDetails(log)"
                >
                  មើល
                </UButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="total > limit" class="p-4 border-t border-default flex justify-between items-center text-xs">
        <span class="text-muted">ទំព័រទី {{ page }} នៃ {{ Math.ceil(total / limit) }}</span>
        <div class="flex gap-1">
          <UButton
            size="xs"
            variant="soft"
            :disabled="page <= 1"
            @click="page--"
          >
            មុន
          </UButton>
          <UButton
            size="xs"
            variant="soft"
            :disabled="page * limit >= total"
            @click="page++"
          >
            បន្ទាប់
          </UButton>
        </div>
      </div>
    </UCard>

    <!-- Details Modal -->
    <UModal v-model:open="showDetailsModal">
      <template #content>
        <UCard class="max-w-lg w-full">
          <template #header>
            <h3 class="font-bold text-base text-highlighted flex items-center gap-2">
              <UIcon name="i-lucide-info" class="text-primary-600 w-5 h-5" />
              ព័ត៌មានលម្អិតនៃសកម្មភាព
            </h3>
          </template>

          <div v-if="selectedLog" class="space-y-3 text-xs">
            <div class="grid grid-cols-2 gap-2 p-3 bg-muted rounded-lg">
              <div>
                <span class="text-muted block">កាលបរិច្ឆេទ៖</span>
                <span class="font-semibold">{{ formatDate(selectedLog.timestamp) }}</span>
              </div>
              <div>
                <span class="text-muted block">គណនីប្រតិបត្តិ៖</span>
                <span class="font-semibold">{{ selectedLog.username || 'System' }}</span>
              </div>
              <div>
                <span class="text-muted block">ផ្នែក (Resource)៖</span>
                <span class="font-semibold capitalize">{{ selectedLog.resource }}</span>
              </div>
              <div>
                <span class="text-muted block">Resource ID៖</span>
                <code class="font-mono text-xs">{{ selectedLog.resourceId || '-' }}</code>
              </div>
            </div>

            <div>
              <span class="text-muted block mb-1 font-semibold">Details Payload:</span>
              <pre class="p-3 bg-gray-950 text-gray-100 rounded-lg font-mono text-xs overflow-x-auto">{{ JSON.stringify(selectedLog.details, null, 2) }}</pre>
            </div>

            <div class="flex justify-end pt-2">
              <UButton color="neutral" variant="ghost" @click="showDetailsModal = false">
                បិទ
              </UButton>
            </div>
          </div>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
