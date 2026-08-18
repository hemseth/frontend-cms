<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const exportUtils = useExport()

const patientId = computed(() => route.query.patientId as string || '')

const breadcrumbItems = computed(() => [
  { label: t('nav.home'), to: '/' },
  { label: t('report.title'), to: '/reports' },
  { label: t('report.historyReport') }
])

const isLoading = ref(false)
const historyData = ref<any>(null)
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

async function fetchPatientHistory(id: string) {
  if (!id) return

  isLoading.value = true
  try {
    const res = await $api<any>(`/reports/patient/${id}/history`)
    historyData.value = res?.data
  } catch (e) {
    console.error('Failed to fetch patient history:', e)
    historyData.value = null
  } finally {
    isLoading.value = false
  }
}

watch(selectedPatientId, (val) => {
  if (val) {
    fetchPatientHistory(val)
  }
})

onMounted(() => {
  if (patientId.value) {
    selectedPatientId.value = patientId.value
  }
})

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
          {{ t('report.historyReport') }}
        </h1>
        <p class="text-gray-600 dark:text-gray-400 mt-1">
          Complete patient medical history
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
          v-if="historyData"
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

    <template v-if="historyData">
      <PrintLayout :title="t('report.historyReport')" :show-signature="true">
        <UCard>
          <template #header>
            <h3 class="font-semibold">
              Patient: {{ historyData.patient?.nameKh }}
            </h3>
          </template>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p class="text-sm text-gray-500">
                Patient ID
              </p>
              <p class="font-medium">
                {{ historyData.patient?.pId || 'N/A' }}
              </p>
            </div>
            <div>
              <p class="text-sm text-gray-500">
                {{ t('patient.gender') }}
              </p>
              <p class="font-medium">
                {{ historyData.patient?.gender === 1 ? 'Male' : 'Female' }}
              </p>
            </div>
            <div>
              <p class="text-sm text-gray-500">
                {{ t('patient.age') }}
              </p>
              <p class="font-medium">
                {{ historyData.patient?.age || 'N/A' }}
              </p>
            </div>
            <div>
              <p class="text-sm text-gray-500">
                {{ t('patient.phone') }}
              </p>
              <p class="font-medium">
                {{ historyData.patient?.phone || 'N/A' }}
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
                <p class="text-2xl font-bold">
                  {{ historyData.summary?.totalVisits || 0 }}
                </p>
              </div>
              <UIcon name="i-lucide-stethoscope" class="w-6 h-6 text-blue-600" />
            </div>
          </UCard>
          <UCard>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-500">
                  Prescriptions
                </p>
                <p class="text-2xl font-bold">
                  {{ historyData.summary?.totalPrescriptions || 0 }}
                </p>
              </div>
              <UIcon name="i-lucide-pill" class="w-6 h-6 text-green-600" />
            </div>
          </UCard>
          <UCard>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-500">
                  Lab Requests
                </p>
                <p class="text-2xl font-bold">
                  {{ historyData.summary?.totalLabRequests || 0 }}
                </p>
              </div>
              <UIcon name="i-lucide-test-tube" class="w-6 h-6 text-purple-600" />
            </div>
          </UCard>
          <UCard>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-500">
                  Total Payments
                </p>
                <p class="text-2xl font-bold text-green-600">
                  ${{ (historyData.summary?.totalPayments || 0).toFixed(2) }}
                </p>
              </div>
              <UIcon name="i-lucide-dollar-sign" class="w-6 h-6 text-green-600" />
            </div>
          </UCard>
        </div>

        <UCard>
          <template #header>
            <h3 class="font-semibold">
              Timeline
            </h3>
          </template>
          <div class="space-y-4">
            <div
              v-for="(item, index) in historyData.timeline?.slice(0, 50)"
              :key="index"
              class="flex gap-4 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <div class="flex-shrink-0">
                <div
                  :class="[
                    'w-10 h-10 rounded-full flex items-center justify-center',
                    item.type === 'visit' ? 'bg-blue-100 text-blue-600'
                    : item.type === 'prescription' ? 'bg-green-100 text-green-600'
                      : item.type === 'lab' ? 'bg-purple-100 text-purple-600'
                        : 'bg-amber-100 text-amber-600'
                  ]"
                >
                  <UIcon
                    :name="item.type === 'visit' ? 'i-lucide-stethoscope'
                      : item.type === 'prescription' ? 'i-lucide-pill'
                        : item.type === 'lab' ? 'i-lucide-test-tube'
                          : 'i-lucide-dollar-sign'"
                    class="w-5 h-5"
                  />
                </div>
              </div>
              <div class="flex-1">
                <div class="flex items-center justify-between">
                  <span class="font-medium capitalize">{{ item.type }}</span>
                  <span class="text-sm text-gray-500">{{ new Date(item.date).toLocaleString() }}</span>
                </div>
                <div class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  <template v-if="item.type === 'visit'">
                    <p>Type: {{ item.data.type }} | Department: {{ item.data.department }}</p>
                    <p v-if="item.data.diagnosis?.length">
                      Diagnosis: {{ item.data.diagnosis.map((d: any) => d.nameEn || d.nameKh).join(', ') }}
                    </p>
                  </template>
                  <template v-else-if="item.type === 'prescription'">
                    <p>Medication: {{ item.data.medication }}</p>
                    <p v-if="item.data.dose">
                      Dose: {{ item.data.dose }}
                    </p>
                  </template>
                  <template v-else-if="item.type === 'lab'">
                    <p>Service: {{ item.data.serviceName }}</p>
                    <p>Status: {{ item.data.status }}</p>
                  </template>
                  <template v-else-if="item.type === 'payment'">
                    <p>Amount: ${{ (item.data.totalReceived || 0).toFixed(2) }} | Method: {{ item.data.method }}</p>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </PrintLayout>
    </template>

    <UCard v-else-if="!isLoading && !historyData" class="text-center py-12">
      <UIcon name="i-lucide-history" class="w-16 h-16 text-gray-300 mx-auto mb-4" />
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
