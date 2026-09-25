<script setup lang="ts">
/**
 * Lab and imaging requests from the admission. They go to the lab and echo workstations like
 * OPD requests; the price and result template come from the service price list.
 */
import { computed, onMounted, ref } from 'vue'
import type { IpdLabRequest } from '~/types/ipd'

const props = defineProps<{
  admissionId: string
  active: boolean
}>()

interface ServiceRow { _id: string, nameEn: string, nameKh?: string, price?: number, categoryId?: string }
interface CategoryRow { _id: string, group?: string }

const { t } = useI18n()
const toast = useToast()
const auth = useAuth()
const ipd = useIpd(props.admissionId)

const labs = ref<IpdLabRequest[]>([])
const services = ref<ServiceRow[]>([])
const categories = ref<CategoryRow[]>([])
const selected = ref<Set<string>>(new Set())
const search = ref('')
const isLoading = ref(false)
const isSaving = ref(false)
const loadError = ref('')
const canOrder = computed(() => props.active && auth.can('admission', 'update'))

const groupOf = computed(() => new Map(categories.value.map(c => [String(c._id), c.group])))
const orderable = computed(() => services.value
  .filter(s => ['laboratory', 'imaging'].includes(String(groupOf.value.get(String(s.categoryId)))))
  .filter(s => !search.value || `${s.nameEn} ${s.nameKh || ''}`.toLowerCase().includes(search.value.toLowerCase())))

async function load() {
  isLoading.value = true
  loadError.value = ''
  try {
    labs.value = await ipd.listLabs()
    if (canOrder.value && !services.value.length) {
      const [svc, cat] = await Promise.all([
        $api<{ data?: ServiceRow[] }>('/services', { params: { limit: 1000 } }),
        $api<{ data?: CategoryRow[] }>('/service-categories')
      ])
      services.value = svc?.data ?? []
      categories.value = cat?.data ?? []
    }
  } catch (e) {
    loadError.value = getApiErrorMessage(e, t('ipd.loadFailed'))
  } finally {
    isLoading.value = false
  }
}

function toggle(id: string) {
  const next = new Set(selected.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selected.value = next
}

async function order() {
  if (!selected.value.size) return
  isSaving.value = true
  try {
    await ipd.orderLabs([...selected.value])
    selected.value = new Set()
    toast.add({ title: t('ipd.labs.ordered'), color: 'success' })
    await load()
  } catch (e) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(e, t('common.saveFailed')), color: 'error' })
  } finally {
    isSaving.value = false
  }
}

async function cancel(lab: IpdLabRequest) {
  const reason = window.prompt(t('ipd.labs.cancelReason'))?.trim()
  if (!reason) return
  try {
    await ipd.cancelLab(lab._id, reason)
    await load()
  } catch (e) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(e, t('common.saveFailed')), color: 'error' })
  }
}

const statusColor = (s: string) => (s === 'completed' ? 'success' : s === 'cancelled' ? 'neutral' : s === 'in-progress' ? 'warning' : 'primary')
const fmt = (value?: string) => (value ? new Date(value).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '')

onMounted(load)
defineExpose({ load })
</script>

<template>
  <div class="space-y-4 pt-3">
    <UCard v-if="canOrder">
      <template #header>
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <h4 class="font-semibold text-sm">
            {{ t('ipd.labs.orderTitle') }}
          </h4>
          <UInput
            v-model="search"
            size="sm"
            icon="i-lucide-search"
            :placeholder="t('common.search')"
            class="w-56"
          />
        </div>
      </template>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 max-h-64 overflow-y-auto">
        <label v-for="s in orderable" :key="s._id" class="flex items-center gap-2 text-sm p-1.5 rounded hover:bg-muted cursor-pointer">
          <UCheckbox :model-value="selected.has(s._id)" @update:model-value="toggle(s._id)" />
          <span class="flex-1">{{ s.nameKh || s.nameEn }}</span>
          <span class="text-xs text-muted tabular-nums">${{ s.price ?? 0 }}</span>
        </label>
      </div>
      <template #footer>
        <div class="flex justify-end">
          <UButton
            :label="t('ipd.labs.order', { count: selected.size })"
            icon="i-lucide-flask-conical"
            size="sm"
            :loading="isSaving"
            :disabled="!selected.size"
            @click="order"
          />
        </div>
      </template>
    </UCard>

    <div v-if="isLoading" class="space-y-2">
      <USkeleton v-for="i in 3" :key="i" class="h-12 w-full" />
    </div>
    <UAlert
      v-else-if="loadError"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="loadError"
    />
    <p v-else-if="!labs.length" class="text-sm text-muted text-center py-6">
      {{ t('ipd.labs.empty') }}
    </p>
    <div v-else class="space-y-2">
      <div v-for="lab in labs" :key="lab._id" class="p-3 rounded-lg border border-default text-sm">
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <span class="font-medium">{{ lab.serviceNameKh || lab.serviceName }}</span>
            <span class="text-xs text-muted"> · {{ fmt(lab.requestedAt) }}</span>
          </div>
          <div class="flex items-center gap-2">
            <UBadge :color="statusColor(lab.status)" variant="subtle" size="sm">
              {{ t(`ipd.labs.status.${lab.status}`) }}
            </UBadge>
            <UButton
              v-if="canOrder && lab.status === 'pending'"
              :label="t('common.cancel')"
              size="xs"
              color="neutral"
              variant="ghost"
              @click="cancel(lab)"
            />
          </div>
        </div>
        <table v-if="lab.parameters?.some(p => p.value)" class="mt-2 w-full text-xs">
          <tr v-for="(p, i) in lab.parameters.filter(p => p.value)" :key="i" class="border-b border-default last:border-b-0">
            <td class="py-1">
              {{ p.labelKh || p.labelEn }}
            </td>
            <td class="py-1 font-semibold">
              {{ p.value }} {{ p.unit }}
            </td>
            <td class="py-1 text-muted">
              {{ p.refRange }}
            </td>
          </tr>
        </table>
        <p v-if="lab.result" class="mt-2 text-xs whitespace-pre-line">
          {{ lab.result }}
        </p>
      </div>
    </div>
  </div>
</template>
