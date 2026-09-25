<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

definePageMeta({
  title: 'Platform Console'
})

interface TenantSubscription {
  status?: 'trialing' | 'active' | 'past_due' | 'suspended' | 'cancelled'
  billingCycle?: 'monthly' | 'yearly'
  currentPeriodEnd?: string
  trialEndsAt?: string
}

interface Tenant {
  _id: string
  name: string
  nameKh?: string
  slug?: string
  email?: string
  phone?: string
  isActive: boolean
  createdAt: string
  subscriptionId?: TenantSubscription | null
}

interface PlatformMetrics {
  overview: {
    totalClinics: number
    activeClinics: number
    mrrUsd: number
    arrUsd: number
  }
  subscriptions: {
    trialing: number
    active: number
    pastDue: number
    suspended: number
  }
}

const auth = useAuth()
const toast = useToast()
const router = useRouter()

const metrics = ref<PlatformMetrics | null>(null)
const tenants = ref<Tenant[]>([])
const loading = ref(true)
const actioningId = ref('')
const searchQuery = ref('')

const statusColors: Record<string, string> = {
  trialing: 'info',
  active: 'success',
  past_due: 'warning',
  suspended: 'error',
  cancelled: 'neutral'
}

const filteredTenants = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return tenants.value
  return tenants.value.filter(t =>
    t.name?.toLowerCase().includes(q)
    || t.nameKh?.toLowerCase().includes(q)
    || t.slug?.toLowerCase().includes(q)
    || t.email?.toLowerCase().includes(q)
  )
})

async function fetchData() {
  loading.value = true
  try {
    const [metricsRes, tenantsRes] = await Promise.all([
      $api<{ data: PlatformMetrics }>('/saas/admin/metrics'),
      $api<{ data: Tenant[] }>('/saas/admin/tenants')
    ])
    metrics.value = metricsRes.data
    tenants.value = tenantsRes.data || []
  } catch (err: unknown) {
    toast.add({ title: 'Error', description: getApiErrorMessage(err, 'Failed to load platform data'), color: 'error' })
  } finally {
    loading.value = false
  }
}

async function toggleTenantStatus(tenant: Tenant) {
  actioningId.value = tenant._id
  try {
    const activating = !tenant.isActive
    const res = await $api<{ message?: string }>(`/saas/admin/tenants/${tenant._id}/status`, {
      method: 'PATCH',
      body: { isActive: activating }
    })
    tenant.isActive = activating
    toast.add({ title: res?.message || (activating ? 'Clinic activated' : 'Clinic suspended'), color: activating ? 'success' : 'warning' })
  } catch (err: unknown) {
    toast.add({ title: 'Error', description: getApiErrorMessage(err, 'Failed to update clinic status'), color: 'error' })
  } finally {
    actioningId.value = ''
  }
}

function formatDate(value?: string) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString()
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0)
}

onMounted(() => {
  if (auth.user.value?.role !== 'developer') {
    router.replace('/access-denied')
    return
  }
  fetchData()
})
</script>

<template>
  <div v-if="auth.user.value?.role === 'developer'" class="space-y-6 max-w-6xl mx-auto py-6 px-4">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-default pb-5">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-highlighted flex items-center gap-2">
          <UIcon name="i-lucide-server-cog" class="text-primary w-7 h-7" />
          Platform Console
        </h1>
        <p class="text-sm text-muted mt-1">
          Cross-tenant metrics and clinic status, developer role only
        </p>
      </div>
      <UButton
        icon="i-lucide-refresh-cw"
        color="neutral"
        variant="outline"
        :loading="loading"
        @click="fetchData"
      >
        Refresh
      </UButton>
    </div>

    <!-- Overview metrics -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <UCard>
        <p class="text-xs text-muted">
          Total Clinics
        </p>
        <p class="text-2xl font-bold text-highlighted mt-1">
          {{ metrics?.overview.totalClinics ?? '-' }}
        </p>
      </UCard>
      <UCard>
        <p class="text-xs text-muted">
          Active Clinics
        </p>
        <p class="text-2xl font-bold text-highlighted mt-1">
          {{ metrics?.overview.activeClinics ?? '-' }}
        </p>
      </UCard>
      <UCard>
        <p class="text-xs text-muted">
          MRR
        </p>
        <p class="text-2xl font-bold text-highlighted mt-1">
          {{ metrics ? formatCurrency(metrics.overview.mrrUsd) : '-' }}
        </p>
      </UCard>
      <UCard>
        <p class="text-xs text-muted">
          ARR
        </p>
        <p class="text-2xl font-bold text-highlighted mt-1">
          {{ metrics ? formatCurrency(metrics.overview.arrUsd) : '-' }}
        </p>
      </UCard>
    </div>

    <!-- Subscription breakdown -->
    <div v-if="metrics" class="flex flex-wrap items-center gap-3">
      <UBadge color="info" variant="subtle">
        Trialing: {{ metrics.subscriptions.trialing }}
      </UBadge>
      <UBadge color="success" variant="subtle">
        Active: {{ metrics.subscriptions.active }}
      </UBadge>
      <UBadge color="warning" variant="subtle">
        Past Due: {{ metrics.subscriptions.pastDue }}
      </UBadge>
      <UBadge color="error" variant="subtle">
        Suspended: {{ metrics.subscriptions.suspended }}
      </UBadge>
    </div>

    <!-- Tenants table -->
    <UCard>
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h3 class="font-bold text-base text-highlighted">
            Tenants ({{ filteredTenants.length }})
          </h3>
          <UInput
            v-model="searchQuery"
            placeholder="Search by name, slug or email"
            icon="i-lucide-search"
            class="w-64"
          />
        </div>
      </template>

      <div v-if="loading" class="py-8 text-center text-sm text-muted">
        <UIcon name="i-lucide-loader-2" class="w-5 h-5 animate-spin mx-auto mb-2" />
        Loading tenants...
      </div>

      <div v-else-if="filteredTenants.length === 0" class="py-8 text-center text-sm text-muted">
        No tenants found
      </div>

      <div v-else class="divide-y divide-default">
        <div
          v-for="tenant in filteredTenants"
          :key="tenant._id"
          class="py-3 flex flex-wrap items-center justify-between gap-3"
        >
          <div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-semibold text-sm text-highlighted truncate">{{ tenant.name }}</span>
              <span v-if="tenant.slug" class="text-xs text-dimmed font-mono">{{ tenant.slug }}</span>
              <UBadge
                v-if="!tenant.isActive"
                color="error"
                variant="subtle"
                size="sm"
              >
                Suspended
              </UBadge>
              <UBadge
                v-if="tenant.subscriptionId?.status"
                :color="(statusColors[tenant.subscriptionId.status] as any) || 'neutral'"
                variant="subtle"
                size="sm"
              >
                {{ tenant.subscriptionId.status }}
              </UBadge>
            </div>
            <p class="text-xs text-muted truncate">
              {{ tenant.email || 'no email' }} · joined {{ formatDate(tenant.createdAt) }}
            </p>
          </div>

          <UButton
            size="xs"
            variant="soft"
            :color="tenant.isActive ? 'error' : 'success'"
            :icon="tenant.isActive ? 'i-lucide-ban' : 'i-lucide-check-circle'"
            :loading="actioningId === tenant._id"
            @click="toggleTenantStatus(tenant)"
          >
            {{ tenant.isActive ? 'Suspend' : 'Reactivate' }}
          </UButton>
        </div>
      </div>
    </UCard>
  </div>
</template>
