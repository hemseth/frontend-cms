<script setup lang="ts">
const { isLoggedIn } = useAuth()
const { t } = useI18n()

onMounted(() => {
  if (!isLoggedIn.value) {
    navigateTo('/login')
  }
})

// Fetch dashboard statistics
const { data: stats } = await useAsyncData('dashboard-stats', async () => {
  const [patients, visits, payments] = await Promise.all([
    $api<{ total: number }>('/patients/stats'),
    $api<{ total: number, today: number, byDepartment: any, todayByDepartment: any }>('/visits/stats'),
    $api<{ totalBilled: number, totalPaid: number, balanceDue: number }>('/payments/stats')
  ])
  return {
    patients: patients?.total || 0,
    visits: visits?.total || 0,
    visitsToday: visits?.today || 0,
    totalBilled: payments?.totalBilled || 0,
    totalPaid: payments?.totalPaid || 0,
    balanceDue: payments?.balanceDue || 0
  }
})

const statCards = computed(() => [
  {
    title: 'Total Patients',
    value: stats.value?.patients || 0,
    icon: 'i-lucide-users',
    color: 'primary',
    link: '/patients'
  },
  {
    title: 'Today\'s Visits',
    value: stats.value?.visitsToday || 0,
    icon: 'i-lucide-calendar-check',
    color: 'success',
    link: '/visits'
  },
  {
    title: 'Total Billed',
    value: `$${(stats.value?.totalBilled || 0).toFixed(2)}`,
    icon: 'i-lucide-dollar-sign',
    color: 'warning',
    link: '/payments'
  },
  {
    title: 'Balance Due',
    value: `$${(stats.value?.balanceDue || 0).toFixed(2)}`,
    icon: 'i-lucide-alert-circle',
    color: 'error',
    link: '/payments'
  }
])

const quickActions = computed(() => [
  {
    title: t('patient.addNew'),
    icon: 'i-lucide-user-plus',
    color: 'primary',
    link: '/patients'
  },
  {
    title: t('nav.opd'),
    icon: 'i-lucide-stethoscope',
    color: 'success',
    link: '/opd'
  },
  {
    title: t('nav.ipd'),
    icon: 'i-lucide-bed',
    color: 'info',
    link: '/ipd'
  },
  {
    title: t('nav.lab'),
    icon: 'i-lucide-flask-conical',
    color: 'warning',
    link: '/lab'
  },
  {
    title: t('nav.echo'),
    icon: 'i-lucide-activity',
    color: 'secondary',
    link: '/echo'
  },
  {
    title: t('nav.pharmacy'),
    icon: 'i-lucide-shopping-cart',
    color: 'error',
    link: '/pharmacy'
  }
])
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold">
          {{ t('nav.home') }}
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">
          Dashboard Overview
        </p>
      </div>
      <UButton
        icon="i-lucide-refresh-cw"
        color="neutral"
        variant="outline"
        label="Refresh"
        @click="refreshNuxtData()"
      />
    </div>

    <!-- Statistics Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <UCard
        v-for="stat in statCards"
        :key="stat.title"
        class="hover:shadow-lg transition-shadow cursor-pointer"
        @click="navigateTo(stat.link)"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              {{ stat.title }}
            </p>
            <p class="text-2xl font-bold mt-1">
              {{ stat.value }}
            </p>
          </div>
          <div :class="`p-3 rounded-lg bg-${stat.color}-100 dark:bg-${stat.color}-900/20`">
            <UIcon :name="stat.icon" :class="`text-${stat.color}-600 dark:text-${stat.color}-400`" class="w-6 h-6" />
          </div>
        </div>
      </UCard>
    </div>

    <!-- Quick Actions -->
    <UCard>
      <template #header>
        <h2 class="text-xl font-semibold">
          {{ t('nav.quickActions') }}
        </h2>
      </template>
      <div class="grid grid-cols-3 md:grid-cols-6 gap-4">
        <div
          v-for="action in quickActions"
          :key="action.title"
          class="flex flex-col items-center justify-center p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors cursor-pointer"
          @click="navigateTo(action.link)"
        >
          <div :class="`p-3 rounded-full bg-${action.color}-100 dark:bg-${action.color}-900/20 mb-2`">
            <UIcon :name="action.icon" :class="`text-${action.color}-600 dark:text-${action.color}-400`" class="w-6 h-6" />
          </div>
          <span class="text-sm font-medium text-center">{{ action.title }}</span>
        </div>
      </div>
    </UCard>
  </div>
</template>
