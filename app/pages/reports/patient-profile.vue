<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const exportUtils = useExport()
const branch = useBranch()

const patientId = computed(() => route.query.patientId as string || '')

const breadcrumbItems = computed(() => [
  { label: t('nav.home'), to: '/' },
  { label: t('report.title'), to: '/reports' },
  { label: t('report.patientProfile') }
])

const isLoading = ref(false)
const patientData = ref<any>(null)
const selectedPatientId = ref(patientId.value)

const patients = ref<any[]>([])
const searchPatient = ref('')

async function searchPatients(query: string) {
  if (!query || query.length < 2) {
    patients.value = []
    return
  }

  try {
    const res = await $api<any>('/patients', { params: { search: query, limit: 10 } })
    patients.value = res?.data || []
  } catch (e) {
    console.error('Failed to search patients:', e)
  }
}

watch(searchPatient, (val) => {
  if (val.length >= 2) {
    searchPatients(val)
  } else {
    patients.value = []
  }
})

async function fetchPatientProfile(id: string) {
  if (!id) return

  isLoading.value = true
  try {
    const res = await $api<any>(`/reports/patient/${id}`)
    patientData.value = res?.data
  } catch (e) {
    console.error('Failed to fetch patient profile:', e)
    patientData.value = null
  } finally {
    isLoading.value = false
  }
}

watch(selectedPatientId, (val) => {
  if (val) {
    fetchPatientProfile(val)
    navigateTo({ query: { patientId: val } }, { replace: true })
  }
})

onMounted(() => {
  if (patientId.value) {
    selectedPatientId.value = patientId.value
  }
})

const exportColumns = computed(() => [
  { key: 'date', label: 'Date' },
  { key: 'type', label: 'Type' },
  { key: 'department', label: 'Department' },
  { key: 'diagnosis', label: 'Diagnosis' },
  { key: 'status', label: 'Status' }
])

function exportCSV() {
  if (!patientData.value?.visits) return
  const data = patientData.value.visits.map((v: any) => ({
    date: new Date(v.date).toLocaleDateString(),
    type: v.type,
    department: v.department,
    diagnosis: v.diagnosis?.join(', ') || '',
    status: v.status
  }))
  exportUtils.exportToCSV(data, exportColumns.value, `patient-profile-${patientData.value.patient.pId || 'unknown'}`)
}

function exportExcel() {
  if (!patientData.value?.visits) return
  const data = patientData.value.visits.map((v: any) => ({
    date: new Date(v.date).toLocaleDateString(),
    type: v.type,
    department: v.department,
    diagnosis: v.diagnosis?.join(', ') || '',
    status: v.status
  }))
  exportUtils.exportToXLSX(data, exportColumns.value, `patient-profile-${patientData.value.patient.pId || 'unknown'}`, t('report.patientProfile'))
}

function printReport() {
  window.print()
}
</script>

<template>
  <div class="p-6 space-y-6">
    <UBreadcrumb :items="breadcrumbItems" />

    <div class="flex items-center justify-between no-print">
      <div>
        <h1 class="text-2xl font-bold">
          {{ t('report.patientProfile') }}
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">
          View patient details and visit history
        </p>
      </div>
    </div>

    <UCard class="no-print">
      <div class="flex items-center gap-4">
        <UInput
          v-model="searchPatient"
          :placeholder="t('report.selectPatient')"
          icon="i-lucide-search"
          class="w-80"
        />
        <USelect
          v-model="selectedPatientId"
          :options="patients.map(p => ({ label: `${p.nameKh} (${p.pId || p._id})`, value: p._id }))"
          :placeholder="t('report.selectPatient')"
          class="w-80"
        />
        <UButton
          v-if="patientData"
          icon="i-lucide-download"
          variant="outline"
          @click="exportExcel"
        >
          {{ t('report.exportExcel') }}
        </UButton>
        <UButton
          v-if="patientData"
          icon="i-lucide-printer"
          color="primary"
          @click="printReport"
        >
          {{ t('common.print') }}
        </UButton>
      </div>
    </UCard>

    <div v-if="isLoading" class="flex justify-center py-12">
      <ULoading size="lg" />
    </div>

    <template v-if="patientData">
      <PrintLayout :title="t('report.patientProfile')" :show-signature="true">
        <UCard>
          <template #header>
            <h3 class="font-semibold">
              Patient Information
            </h3>
          </template>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p class="text-sm text-gray-500">
                {{ t('patient.id') }}
              </p>
              <p class="font-medium">
                {{ patientData.patient.pId || 'N/A' }}
              </p>
            </div>
            <div>
              <p class="text-sm text-gray-500">
                {{ t('patient.nameKh') }}
              </p>
              <p class="font-medium">
                {{ patientData.patient.nameKh }}
              </p>
            </div>
            <div>
              <p class="text-sm text-gray-500">
                {{ t('patient.gender') }}
              </p>
              <p class="font-medium">
                {{ patientData.patient.gender }}
              </p>
            </div>
            <div>
              <p class="text-sm text-gray-500">
                {{ t('patient.age') }}
              </p>
              <p class="font-medium">
                {{ patientData.patient.age }} years
              </p>
            </div>
            <div>
              <p class="text-sm text-gray-500">
                {{ t('patient.phone') }}
              </p>
              <p class="font-medium">
                {{ patientData.patient.phone || 'N/A' }}
              </p>
            </div>
            <div>
              <p class="text-sm text-gray-500">
                {{ t('patient.dob') }}
              </p>
              <p class="font-medium">
                {{ new Date(patientData.patient.dob).toLocaleDateString() }}
              </p>
            </div>
            <div class="col-span-2">
              <p class="text-sm text-gray-500">
                Address
              </p>
              <p class="font-medium">
                {{ patientData.patient.address || 'N/A' }}
              </p>
            </div>
          </div>
        </UCard>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <UCard>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-500">
                  Total Visits
                </p>
                <p class="text-3xl font-bold mt-1">
                  {{ patientData.totalVisits }}
                </p>
              </div>
              <div class="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <UIcon name="i-lucide-stethoscope" class="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </UCard>
          <UCard>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-500">
                  Total Spent
                </p>
                <p class="text-3xl font-bold mt-1 text-green-600">
                  ${{ patientData.totalSpent.toFixed(2) }}
                </p>
              </div>
              <div class="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <UIcon name="i-lucide-dollar-sign" class="w-8 h-8 text-green-600" />
              </div>
            </div>
          </UCard>
          <UCard>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-500">
                  Last Visit
                </p>
                <p class="text-lg font-bold mt-1">
                  {{ new Date(patientData.lastVisit).toLocaleDateString() }}
                </p>
              </div>
              <div class="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <UIcon name="i-lucide-calendar" class="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </UCard>
          <UCard>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-500">
                  Diagnoses
                </p>
                <p class="text-3xl font-bold mt-1">
                  {{ patientData.diagnoses.length }}
                </p>
              </div>
              <div class="p-3 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
                <UIcon name="i-lucide-clipboard-list" class="w-8 h-8 text-amber-600" />
              </div>
            </div>
          </UCard>
        </div>

        <UCard>
          <template #header>
            <h3 class="font-semibold">
              Visit History
            </h3>
          </template>
          <UTable
            :data="patientData.visits"
            :columns="[
              { accessorKey: 'date', header: 'Date' },
              { accessorKey: 'type', header: 'Type' },
              { accessorKey: 'department', header: 'Department' },
              { accessorKey: 'diagnosis', header: 'Diagnosis' },
              { accessorKey: 'status', header: 'Status' }
            ]"
          >
            <template #date-cell="{ row }">
              {{ new Date(row.original.date).toLocaleDateString() }}
            </template>
            <template #diagnosis-cell="{ row }">
              {{ row.original.diagnosis?.join(', ') || 'N/A' }}
            </template>
            <template #status-cell="{ row }">
              <UBadge :color="row.original.status === 'completed' ? 'success' : row.original.status === 'cancelled' ? 'error' : 'warning'">
                {{ row.original.status }}
              </UBadge>
            </template>
          </UTable>
        </UCard>
      </PrintLayout>
    </template>

    <UCard v-else-if="!isLoading && !patientData" class="text-center py-12">
      <UIcon name="i-lucide-user-x" class="w-16 h-16 text-gray-300 mx-auto mb-4" />
      <p class="text-gray-500">
        {{ t('report.selectPatient') }}
      </p>
    </UCard>
  </div>
</template>

<style scoped>
@media print {
  :deep(.no-print) {
    display: none !important;
  }
}
</style>
