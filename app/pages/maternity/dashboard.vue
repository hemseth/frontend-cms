<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const { t } = useI18n()
const toast = useToast()

const loading = ref(true)
const dashboardData = ref<any>({
  wardStatus: {
    activeAncCount: 0,
    activeLaborCount: 0,
    activePncCount: 0,
    totalBeds: 0,
    occupiedBeds: 0,
    bedOccupancyRate: 0
  },
  dailyKpis: {
    totalDeliveriesToday: 0,
    liveBirthsToday: 0,
    cSectionToday: 0,
    cSectionRate: 0,
    pphToday: 0,
    lowApgarToday: 0
  },
  activeAlerts: [],
  financial: {
    cashRevenue: 0,
    nssfClaims: 0,
    hefClaims: 0
  },
  trend12Months: []
})

const lastRefreshed = ref(new Date())
let refreshTimer: any = null

const fetchDashboard = async () => {
  try {
    const res = await $api('/maternal-dashboard')
    if (res) {
      dashboardData.value = res
      lastRefreshed.value = new Date()
    }
  } catch (err: any) {
    console.error('Failed to load maternal dashboard:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchDashboard()
  // Refresh every 60 seconds (Hospital Director requirement)
  refreshTimer = setInterval(fetchDashboard, 60000)
})

onUnmounted(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header with Live Pulse & Refresh -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-blue-500/10 p-6 rounded-2xl border border-pink-200 dark:border-pink-900/30">
      <div>
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-bold text-highlighted flex items-center gap-2">
            <UIcon name="i-lucide-activity" class="w-7 h-7 text-pink-500 animate-pulse" />
            ផ្ទាំងគ្រប់គ្រងសម្ភព (Hospital Director Maternal Dashboard)
          </h1>
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            ផ្សាយផ្ទាល់ (Live 60s)
          </span>
        </div>
        <p class="text-sm text-muted mt-1">
          តាមដានស្ថានភាពបន្ទប់សម្ភព ទារកទើបនឹងកើត និងសូចនាករគ្លីនិកប្រចាំថ្ងៃ
        </p>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-xs text-dimmed">
          បានកែប្រែចុងក្រោយ: {{ lastRefreshed.toLocaleTimeString() }}
        </span>
        <UButton
          icon="i-lucide-refresh-cw"
          color="primary"
          variant="outline"
          :loading="loading"
          @click="fetchDashboard"
        >
          ធ្វើបច្ចុប្បន្នភាព
        </UButton>
      </div>
    </div>

    <!-- Active Emergency Alerts Banner -->
    <div v-if="dashboardData.activeAlerts?.length > 0" class="space-y-2">
      <div
        v-for="(alert, idx) in dashboardData.activeAlerts"
        :key="idx"
        class="flex items-center justify-between p-4 rounded-xl border bg-red-500/10 border-red-300 dark:border-red-900 text-red-700 dark:text-red-400 animate-pulse"
      >
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-alert-triangle" class="w-6 h-6 text-red-500 shrink-0" />
          <div>
            <div class="font-bold text-sm">{{ alert.messageKh }}</div>
            <div class="text-xs opacity-80">{{ alert.messageEn }}</div>
          </div>
        </div>
        <UBadge color="error" variant="subtle" size="sm">
          {{ alert.severity }}
        </UBadge>
      </div>
    </div>

    <!-- 1. Current Ward Status -->
    <div>
      <h2 class="text-lg font-semibold text-highlighted mb-3 flex items-center gap-2">
        <UIcon name="i-lucide-bed" class="w-5 h-5 text-indigo-500" />
        ស្ថានភាពបន្ទប់ និងអ្នកជំងឺសម្រាក (Current Ward Status)
      </h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <UCard class="border border-pink-100 dark:border-gray-800">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xs font-medium text-muted uppercase tracking-wider">អ្នកជំងឺ ANC សកម្ម</div>
              <div class="text-3xl font-extrabold text-pink-600 mt-1">{{ dashboardData.wardStatus.activeAncCount }}</div>
            </div>
            <div class="p-3 bg-pink-500/10 rounded-xl">
              <UIcon name="i-lucide-heart-pulse" class="w-6 h-6 text-pink-500" />
            </div>
          </div>
        </UCard>

        <UCard class="border border-amber-100 dark:border-gray-800">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xs font-medium text-muted uppercase tracking-wider">កំពុងសម្រាល (In Labor)</div>
              <div class="text-3xl font-extrabold text-amber-600 mt-1">{{ dashboardData.wardStatus.activeLaborCount }}</div>
            </div>
            <div class="p-3 bg-amber-500/10 rounded-xl">
              <UIcon name="i-lucide-baby" class="w-6 h-6 text-amber-500" />
            </div>
          </div>
        </UCard>

        <UCard class="border border-emerald-100 dark:border-gray-800">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xs font-medium text-muted uppercase tracking-wider">សម្រាកក្រោយសម្រាល PNC</div>
              <div class="text-3xl font-extrabold text-emerald-600 mt-1">{{ dashboardData.wardStatus.activePncCount }}</div>
            </div>
            <div class="p-3 bg-emerald-500/10 rounded-xl">
              <UIcon name="i-lucide-smile" class="w-6 h-6 text-emerald-500" />
            </div>
          </div>
        </UCard>

        <UCard class="border border-blue-100 dark:border-gray-800">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-xs font-medium text-muted uppercase tracking-wider">អត្រាប្រើប្រាស់គ្រែ (Bed Occupancy)</div>
              <div class="text-3xl font-extrabold text-blue-600 mt-1">{{ dashboardData.wardStatus.bedOccupancyRate }}%</div>
              <div class="text-xs text-dimmed mt-0.5">
                {{ dashboardData.wardStatus.occupiedBeds }} / {{ dashboardData.wardStatus.totalBeds }} គ្រែ
              </div>
            </div>
            <div class="p-3 bg-blue-500/10 rounded-xl">
              <UIcon name="i-lucide-bed-double" class="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <!-- 2. Daily Clinical KPIs -->
    <div>
      <h2 class="text-lg font-semibold text-highlighted mb-3 flex items-center gap-2">
        <UIcon name="i-lucide-award" class="w-5 h-5 text-purple-500" />
        សូចនាករគ្លីនិកថ្ងៃនេះ (Daily Clinical KPIs)
      </h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <UCard>
          <div class="text-xs font-medium text-muted">សម្រាលសរុបថ្ងៃនេះ</div>
          <div class="text-2xl font-bold text-highlighted mt-1">{{ dashboardData.dailyKpis.totalDeliveriesToday }}</div>
          <div class="text-xs text-emerald-500 mt-1 flex items-center gap-1">
            <UIcon name="i-lucide-check-circle" class="w-3.5 h-3.5" />
            ទារករស់: {{ dashboardData.dailyKpis.liveBirthsToday }}
          </div>
        </UCard>

        <UCard>
          <div class="text-xs font-medium text-muted">អត្រាវះកាត់ C-Section</div>
          <div class="text-2xl font-bold mt-1" :class="dashboardData.dailyKpis.cSectionRate > 25 ? 'text-amber-600' : 'text-highlighted'">
            {{ dashboardData.dailyKpis.cSectionRate }}%
          </div>
          <div class="text-xs text-dimmed mt-1">
            ចំនួន: {{ dashboardData.dailyKpis.cSectionToday }} ករណី (WHO standard &lt;20-25%)
          </div>
        </UCard>

        <UCard :class="dashboardData.dailyKpis.pphToday > 0 ? 'bg-red-500/5 border-red-300 dark:border-red-900' : ''">
          <div class="text-xs font-medium text-muted">ករណីធ្លាក់ឈាម PPH (&ge;500ml)</div>
          <div class="text-2xl font-bold mt-1" :class="dashboardData.dailyKpis.pphToday > 0 ? 'text-red-600' : 'text-emerald-600'">
            {{ dashboardData.dailyKpis.pphToday }}
          </div>
          <div class="text-xs text-dimmed mt-1">
            {{ dashboardData.dailyKpis.pphToday > 0 ? 'តម្រូវការតាមដានបន្ទាន់' : 'គ្មានករណីធ្ងន់ធ្ងរ' }}
          </div>
        </UCard>

        <UCard :class="dashboardData.dailyKpis.lowApgarToday > 0 ? 'bg-amber-500/5 border-amber-300' : ''">
          <div class="text-xs font-medium text-muted">ពិន្ទុ APGAR ទាប (&lt;7)</div>
          <div class="text-2xl font-bold mt-1" :class="dashboardData.dailyKpis.lowApgarToday > 0 ? 'text-amber-600' : 'text-highlighted'">
            {{ dashboardData.dailyKpis.lowApgarToday }}
          </div>
          <div class="text-xs text-dimmed mt-1">
            ទារកត្រូវការថែទាំពិសេស
          </div>
        </UCard>

        <UCard>
          <div class="text-xs font-medium text-muted">ចំណូលសរុប (Revenues)</div>
          <div class="text-2xl font-bold text-emerald-600 mt-1">${{ dashboardData.financial.cashRevenue.toLocaleString() }}</div>
          <div class="text-xs text-dimmed mt-1">
            NSSF: ${{ dashboardData.financial.nssfClaims }} | HEF: ${{ dashboardData.financial.hefClaims }}
          </div>
        </UCard>
      </div>
    </div>

    <!-- 3. 12-Month Deliveries Trend -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-base font-semibold text-highlighted flex items-center gap-2">
            <UIcon name="i-lucide-line-chart" class="w-5 h-5 text-primary-500" />
            និន្នាការសម្រាលកូន ១២ ខែចុងក្រោយ (12-Month Delivery Trends: SVD vs C-Section)
          </h2>
          <div class="flex items-center gap-4 text-xs font-medium">
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> សម្រាលធម្មតា (SVD)</span>
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-purple-500 inline-block" /> វះកាត់ (C-Section)</span>
          </div>
        </div>
      </template>

      <div class="grid grid-cols-12 gap-2 pt-4 pb-2 items-end h-48 border-b dark:border-gray-800">
        <div
          v-for="item in dashboardData.trend12Months"
          :key="item.month"
          class="flex flex-col items-center gap-1 h-full justify-end group relative"
        >
          <!-- Tooltip -->
          <div class="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-gray-900 text-white text-[10px] px-2 py-0.5 rounded pointer-events-none whitespace-nowrap z-10">
            SVD: {{ item.svd }} | CS: {{ item.cs }}
          </div>
          <!-- Bars -->
          <div class="w-full flex items-end justify-center gap-0.5 h-36">
            <div
              class="w-3 bg-emerald-500 rounded-t transition-all hover:brightness-110"
              :style="{ height: `${Math.min(100, (item.svd / (item.total || 1)) * 100)}%` }"
            />
            <div
              class="w-3 bg-purple-500 rounded-t transition-all hover:brightness-110"
              :style="{ height: `${Math.min(100, (item.cs / (item.total || 1)) * 100)}%` }"
            />
          </div>
          <span class="text-[10px] text-dimmed truncate w-full text-center">
            {{ item.month.split('-')[1] }}
          </span>
        </div>
      </div>
    </UCard>
  </div>
</template>
