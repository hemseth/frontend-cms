<script setup lang="ts">
const props = defineProps<{
  title: string
  subtitle?: string
  dateRange?: { start: string, end: string }
  showPatientSelect?: boolean
}>()

const emit = defineEmits<{
  refresh: []
  dateChange: [range: { start: string, end: string }]
  patientChange: [patientId: string]
}>()

const { t } = useI18n()
const exportUtils = useExport()

const dateStart = ref(props.dateRange?.start || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0] || '')
const dateEnd = ref(props.dateRange?.end || new Date().toISOString().split('T')[0] || '')

const selectedPatientId = ref('')
const patients = ref<any[]>([])
const isLoadingPatients = ref(false)
const searchPatient = ref('')

async function searchPatients(query: string) {
  if (!query || query.length < 2) {
    patients.value = []
    return
  }

  isLoadingPatients.value = true
  try {
    const res = await $api<any>('/patients', { params: { search: query, limit: 10 } })
    patients.value = res?.data || []
  } catch (e) {
    console.error('Failed to search patients:', e)
  } finally {
    isLoadingPatients.value = false
  }
}

watch(searchPatient, (val) => {
  if (val.length >= 2) {
    searchPatients(val)
  } else {
    patients.value = []
  }
})

function onDateChange() {
  emit('dateChange', { start: dateStart.value, end: dateEnd.value })
}

function onPatientChange(patientId: string) {
  selectedPatientId.value = patientId
  emit('patientChange', patientId)
}

const showExportMenu = ref(false)

function handleExportPDF() {
  showExportMenu.value = false
}

function handleExportExcel() {
  showExportMenu.value = false
}

function handleExportCSV() {
  showExportMenu.value = false
}

function printReport() {
  window.print()
}
</script>

<template>
  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 no-print">
    <div>
      <h1 class="text-2xl font-bold">
        {{ title }}
      </h1>
      <p v-if="subtitle" class="text-gray-600 dark:text-gray-400 mt-1">
        {{ subtitle }}
      </p>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <div v-if="showPatientSelect" class="relative">
        <USelect
          v-model="selectedPatientId"
          :options="patients.map(p => ({ label: `${p.nameKh} (${p.pId || p._id})`, value: p._id }))"
          :placeholder="t('report.selectPatient')"
          searchable
          class="w-48"
          @update:model-value="(value) => onPatientChange(value as string)"
        />
      </div>

      <div class="flex items-center gap-2">
        <UInput
          v-model="dateStart"
          type="date"
          class="w-36"
          @change="onDateChange"
        />
        <span class="text-gray-500">-</span>
        <UInput
          v-model="dateEnd"
          type="date"
          class="w-36"
          @change="onDateChange"
        />
      </div>

      <UButton icon="i-lucide-refresh-cw" variant="outline" @click="emit('refresh')">
        {{ t('common.refresh') }}
      </UButton>

      <UDropdown
        v-model:open="showExportMenu"
        :items="[
          [
            { label: t('report.exportPdf'), icon: 'i-lucide-file-text', click: handleExportPDF },
            { label: t('report.exportExcel'), icon: 'i-lucide-file-spreadsheet', click: handleExportExcel },
            { label: t('report.exportCsv'), icon: 'i-lucide-file-type', click: handleExportCSV }
          ]
        ]"
      >
        <UButton icon="i-lucide-download" color="primary" variant="outline">
          {{ t('common.export') || 'Export' }}
        </UButton>
      </UDropdown>

      <UButton icon="i-lucide-printer" color="primary" @click="printReport">
        {{ t('common.print') }}
      </UButton>
    </div>
  </div>
</template>

<style scoped>
@media print {
  :deep(.no-print) {
    display: none !important;
  }

  .p-6 {
    padding: 0 !important;
  }
}
</style>
