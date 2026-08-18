<script setup lang="ts">
import OpdPage from '~/components/opd/OpdPage.vue'

const route = useRoute()
const { t } = useI18n()

const department = computed(() => route.params.department as string)

const departmentConfig = computed(() => {
  const configs: Record<string, any> = {
    opd: {
      title: 'OPD (Outpatient Department)',
      icon: 'i-lucide-stethoscope',
      color: 'primary',
      description: 'Manage outpatient consultations and treatments'
    },
    ipd: {
      title: 'IPD (Inpatient Department)',
      icon: 'i-lucide-bed',
      color: 'success',
      description: 'Manage admitted patients and ward services'
    },
    laboratory: {
      title: 'Laboratory',
      icon: 'i-lucide-flask-conical',
      color: 'warning',
      description: 'Blood tests, urine analysis, and diagnostic services'
    },
    pharmacy: {
      title: 'Pharmacy',
      icon: 'i-lucide-pill',
      color: 'error',
      description: 'Medicine dispensing and inventory management'
    }
  }
  return configs[department.value] || configs.opd
})

const { data: visits, status, refresh } = await useAsyncData(`${department.value}-visits`, () =>
  $api<{ data: any[] }>('/visits', {
    params: { department: department.value, limit: 50 }
  })
)

const { data: todayVisits } = await useAsyncData(`${department.value}-today`, () =>
  $api<{ data: any[] }>('/visits/today', {
    params: { department: department.value }
  })
)

const columns = [
  { accessorKey: 'no', header: t('common.number'), cell: ({ row }: any) => row.index + 1 },
  { accessorKey: 'patientName', header: 'Patient Name' },
  { accessorKey: 'dateIn', header: 'Date', cell: ({ row }: any) => new Date(row.original.dateIn).toLocaleDateString() },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'diagnosis', header: 'Diagnosis', cell: ({ row }: any) => row.original.diagnosis?.join(', ') || '-' }
]
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <UBreadcrumb
          :items="[{ label: t('nav.home'), to: '/' }, { label: 'Departments', to: '/' }, { label: departmentConfig.title }]"
        />
        <div class="flex items-center gap-3 mt-4">
          <div
            :class="`p-3 rounded-lg bg-${departmentConfig.color}-100 dark:bg-${departmentConfig.color}-900/20`"
          >
            <UIcon
              :name="departmentConfig.icon"
              :class="`text-${departmentConfig.color}-600 dark:text-${departmentConfig.color}-400`"
              class="w-8 h-8"
            />
          </div>
          <div>
            <h1 class="text-3xl font-bold">
              {{ departmentConfig.title }}
            </h1>
            <p class="text-gray-600 dark:text-gray-400">
              {{ departmentConfig.description }}
            </p>
          </div>
        </div>
      </div>
      <UButton
        icon="i-lucide-refresh-cw"
        color="neutral"
        variant="outline"
        label="Refresh"
        @click="refresh()"
      />
    </div>

    <div v-if="department === 'opd' || department === 'ipd'">
      <OpdPage :dept="department.toUpperCase()" />
    </div>
    <div v-else>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <UCard>
          <div class="text-center">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Today's Visits
            </p>
            <p class="text-3xl font-bold mt-2">
              {{ (todayVisits as any)?.data?.length || 0 }}
            </p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Total Visits
            </p>
            <p class="text-3xl font-bold mt-2">
              {{ (visits as any)?.data?.length || 0 }}
            </p>
          </div>
        </UCard>
        <UCard>
          <div class="text-center">
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Active Patients
            </p>
            <p class="text-3xl font-bold mt-2">
              {{ (visits as any)?.data?.filter((v: any) => v.status
                === 'in-progress').length || 0 }}
            </p>
          </div>
        </UCard>
      </div>

      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold">
            Today's Visits
          </h2>
        </template>
        <div v-if="todayVisits?.data?.length" class="space-y-3">
          <div
            v-for="visit in todayVisits.data"
            :key="visit._id"
            class="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer"
            @click="navigateTo(`/departments/${department}?visitId=${visit._id}&patientId=${visit.patientId}`)"
          >
            <div class="flex items-center gap-3">
              <UAvatar :alt="visit.patientName" size="md" />
              <div>
                <p class="font-medium">
                  {{ visit.patientName }}
                </p>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  {{ visit.diagnosis?.join(', ')
                    || 'No diagnosis' }}
                </p>
              </div>
            </div>
            <UBadge :color="visit.status === 'completed' ? 'success' : 'warning'" variant="subtle">
              {{
                visit.status }}
            </UBadge>
          </div>
        </div>
        <div v-else class="text-center py-8 text-gray-500">
          <UIcon :name="departmentConfig.icon" class="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No visits for today</p>
        </div>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold">
            All Visits
          </h2>
        </template>
        <div class="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-lg">
          <UTable
            :columns="columns"
            :data="(visits as any)?.data || []"
            :loading="status === 'pending'"
            class="w-full"
            :ui="{ td: 'py-3 px-4 text-sm', th: 'py-2 px-4 font-semibold text-sm bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 text-left' }"
          />
        </div>
      </UCard>
    </div>
  </div>
</template>
