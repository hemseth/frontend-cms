<script setup lang="ts">
import { useAsyncData } from '#app'
import type { TableColumn } from '@nuxt/ui'
import { h, resolveComponent } from 'vue'
import OpdRoundHistoryTable from '~/components/opd/partials/OpdRoundHistoryTable.vue'

const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const { t } = useI18n()
const toast = useToast()

const searchQuery = ref('')
const filters = ref({
  proCode: '',
  disCode: '',
  comCode: '',
  vilCode: '',
  clinicId: ''
})

const page = ref(1)
const limit = ref(20)

// Location Data for Filters
const provinces = ref<any[]>([])
const districts = ref<any[]>([])
const communes = ref<any[]>([])
const villages = ref<any[]>([])

const fetchProvinces = async () => {
  try {
    const res: any = await $api('/locations/provinces')
    provinces.value = res.data || []
  } catch (e) {
    console.error('Failed to fetch provinces', e)
  }
}

const fetchDistricts = async (proCode: string) => {
  if (!proCode) {
    districts.value = []
    return
  }
  try {
    const res: any = await $api(`/locations/districts/byProCode/${proCode}`)
    districts.value = res.data || []
  } catch (e) {
    console.error('Failed to fetch districts', e)
  }
}

const fetchCommunes = async (disCode: string) => {
  if (!disCode) {
    communes.value = []
    return
  }
  try {
    const res: any = await $api(`/locations/communes/byDisCode/${disCode}`)
    communes.value = res.data || []
  } catch (e) {
    console.error('Failed to fetch communes', e)
  }
}

const fetchVillages = async (comCode: string) => {
  if (!comCode) {
    villages.value = []
    return
  }
  try {
    const res: any = await $api(`/locations/villages/byComCode/${comCode}`)
    villages.value = res.data || []
  } catch (e) {
    console.error('Failed to fetch villages', e)
  }
}

onMounted(() => {
  fetchProvinces()
})

watch(() => filters.value.proCode, (val) => {
  filters.value.disCode = ''
  filters.value.comCode = ''
  filters.value.vilCode = ''
  fetchDistricts(val)
})

watch(() => filters.value.disCode, (val) => {
  filters.value.comCode = ''
  filters.value.vilCode = ''
  fetchCommunes(val)
})

watch(() => filters.value.comCode, (val) => {
  filters.value.vilCode = ''
  fetchVillages(val)
})

const queryParams = computed(() => {
  const params: Record<string, any> = {
    limit: limit.value,
    skip: (page.value - 1) * limit.value
  }
  if (searchQuery.value) params.search = searchQuery.value
  if (filters.value.proCode) params.proCode = filters.value.proCode
  if (filters.value.disCode) params.disCode = filters.value.disCode
  if (filters.value.comCode) params.comCode = filters.value.comCode
  if (filters.value.vilCode) params.vilCode = filters.value.vilCode
  if (filters.value.clinicId) params.clinicId = filters.value.clinicId
  return params
})

const { data, status, refresh } = await useAsyncData('patients', () =>
  $api('/patients', {
    params: {
      limit: limit.value,
      skip: (page.value - 1) * limit.value,
      search: searchQuery.value || undefined,
      proCode: filters.value.proCode || undefined,
      disCode: filters.value.disCode || undefined,
      comCode: filters.value.comCode || undefined,
      vilCode: filters.value.vilCode || undefined,
      clinicId: filters.value.clinicId || undefined
    }
  }), {
  watch: [searchQuery, page, limit, filters],
  default: () => ({ data: [], total: 0 })
})

const patients = computed(() => {
  if (!data.value) return []
  // Handle direct array: { data: [...], total: 1 }
  if (Array.isArray(data.value.data)) return data.value.data
  // Handle nested structure (old): { data: { data: [...], total: 1 } }
  if (data.value.data?.data && Array.isArray(data.value.data.data)) {
    return data.value.data.data
  }
  return []
})
const total = computed(() => {
  if (!data.value) return 0
  // Handle direct total: { data: [...], total: 1 }
  if (typeof data.value.total === 'number') return data.value.total
  // Handle nested structure (old)
  if (typeof data.value.data?.total === 'number') return data.value.data.total
  if (Array.isArray(data.value?.data)) return data.value.data.length
  return 0
})
const hasNextPage = computed(() => total.value > page.value * limit.value)
const hasPrevPage = computed(() => page.value > 1)

function getRowItems(row: any) {
  return [
    {
      type: 'label',
      label: 'Actions'
    },
    {
      label: 'ប្រវត្តិចូលពេទ្យ (Medical History)',
      icon: 'i-lucide-history',
      onSelect: () => viewHistory(row)
    },
    {
      label: 'View Details',
      icon: 'i-lucide-eye',
      onSelect: () => viewPatient(row)
    },
    {
      label: 'Edit',
      icon: 'i-lucide-pencil',
      onSelect: () => editPatient(row)
    },
    {
      type: 'separator'
    },
    {
      label: 'Delete',
      icon: 'i-lucide-trash',
      color: 'error',
      onSelect: () => deletePatient(row)
    }
  ]
}

const isAddModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const isHistoryModalOpen = ref(false)
const historyPatientId = ref<string>('')
const historyPatientName = ref<string>('')
const selectedPatient = ref<any>(null)

function viewHistory(row: any) {
  historyPatientId.value = row._id || row.id
  historyPatientName.value = row.nameKh || row.nameEn || row.name || ''
  isHistoryModalOpen.value = true
}

function openAddModal() {
  selectedPatient.value = null
  isAddModalOpen.value = true
}

const columns: TableColumn<any>[] = [
  {
    accessorKey: 'no',
    header: t('common.number') || '#',
    cell: ({ row }) => (page.value - 1) * limit.value + row.index + 1
  },
  {
    accessorKey: 'nameKh',
    header: t('patient.nameKh') || 'Name'
  },
  {
    accessorKey: 'dob',
    header: t('patient.dob') || 'Date of Birth',
    cell: ({ row }) => {
      const val = row.original.dob
      if (!val) return 'N/A'
      const date = new Date(val)
      return isNaN(date.getTime()) ? val : date.toLocaleDateString()
    }
  },
  {
    accessorKey: 'gender',
    header: t('patient.gender') || 'Gender',
    cell: ({ row }) => row.original.gender === '1' ? t('patient.male') : t('patient.female')
  },
  {
    accessorKey: 'phone',
    header: t('patient.phone') || 'Phone'
  },
  {
    accessorKey: 'address',
    header: t('patient.address') || 'Address',
    cell: ({ row }) => {
      const parts = [
        row.original.villageName,
        row.original.communeName,
        row.original.districtName,
        row.original.provinceName
      ].filter(Boolean)
      return parts.join(', ') || row.original.address || 'N/A'
    }
  },
  {
    id: 'actions',
    header: t('common.actions') || 'Actions',
    cell: ({ row }) => {
      return h(
        'div',
        { class: 'text-right' },
        h(
          UDropdownMenu,
          {
            content: { align: 'end' },
            items: [getRowItems(row.original)]
          },
          () =>
            h(UButton, {
              icon: 'i-lucide-more-vertical',
              color: 'neutral',
              variant: 'ghost',
              class: 'ml-auto'
            })
        )
      )
    }
  }
]

function viewPatient(patient: any) {
  navigateTo(`/patients/${patient._id}`)
}

function editPatient(patient: any) {
  selectedPatient.value = patient
  isAddModalOpen.value = true
}

function deletePatient(patient: any) {
  selectedPatient.value = patient
  isDeleteModalOpen.value = true
}

function handleSave() {
  refresh()
}

function clearFilters() {
  searchQuery.value = ''
  filters.value = {
    proCode: '',
    disCode: '',
    comCode: '',
    vilCode: '',
    clinicId: ''
  }
}

watch(searchQuery, () => {
  page.value = 1
})
watch(filters, () => {
  page.value = 1
}, { deep: true })

const hasFilters = computed(() => {
  return searchQuery.value || filters.value.proCode || filters.value.disCode || filters.value.comCode || filters.value.vilCode || filters.value.clinicId
})

const fileInput = ref<HTMLInputElement | null>(null)
const isExporting = ref(false)

function triggerImport() {
  fileInput.value?.click()
}

async function exportToExcelFile() {
  if (!import.meta.client || isExporting.value) return

  isExporting.value = true
  try {
    const batchSize = 1000
    const allPatients: any[] = []
    let skip = 0
    let total = 0

    do {
      const result = await $api<{ data: any[], total: number }>('/patients', {
        params: {
          limit: batchSize,
          skip,
          search: searchQuery.value || undefined,
          proCode: filters.value.proCode || undefined,
          disCode: filters.value.disCode || undefined,
          comCode: filters.value.comCode || undefined,
          vilCode: filters.value.vilCode || undefined,
          clinicId: filters.value.clinicId || undefined
        }
      })
      const batch = Array.isArray(result?.data) ? result.data : (result?.data as any)?.data || []
      total = Number(result?.total ?? (result?.data as any)?.total ?? batch.length)
      allPatients.push(...batch)
      skip += batch.length
      if (batch.length === 0) break
    } while (skip < total)

    if (allPatients.length === 0) {
      toast.add({ title: 'No patients to export', color: 'warning' })
      return
    }

    const formatDate = (value: unknown) => {
      if (!value) return ''
      const date = new Date(value as any)
      return Number.isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0]
    }

    const headers = [
      { header: 'ID', key: 'id', width: 25 },
      { header: 'Patient No.', key: 'pId', width: 12 },
      { header: 'Name Kh', key: 'nameKh', width: 20 },
      { header: 'Name En', key: 'nameEn', width: 20 },
      { header: 'Date of Birth', key: 'dob', width: 15 },
      { header: 'Gender', key: 'gender', width: 10 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Address', key: 'address', width: 30 },
      { header: 'Province Code', key: 'proCode', width: 14 },
      { header: 'District Code', key: 'disCode', width: 14 },
      { header: 'Commune Code', key: 'comCode', width: 14 },
      { header: 'Village Code', key: 'vilCode', width: 14 }
    ]

    const rows = allPatients.map((p: any) => ({
      id: p._id || '',
      pId: p.pId || '',
      nameKh: p.nameKh || '',
      nameEn: p.nameEn || '',
      dob: formatDate(p.dob),
      gender: p.gender === 1 || p.gender === '1' ? 'Male' : 'Female',
      phone: p.phone || '',
      email: p.email || '',
      address: p.address || '',
      proCode: p.proCode || '',
      disCode: p.disCode || '',
      comCode: p.comCode || '',
      vilCode: p.vilCode || ''
    }))

    const XLSX = await import('xlsx')
    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Patients')
    XLSX.writeFile(workbook, `Patients_Export_${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast.add({ title: `Exported ${allPatients.length} patients`, color: 'success' })
  } catch (error: any) {
    console.error('Patient export failed:', error)
    toast.add({
      title: 'Patient export failed',
      description: error?.data?.message || error?.message || 'Unable to create the Excel file',
      color: 'error'
    })
  } finally {
    isExporting.value = false
  }
}

async function handleImport(event: Event) {
  if (!import.meta.client) return

  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  const XLSX = await import('xlsx')
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer)
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return
  const worksheet = workbook.Sheets[sheetName]
  if (!worksheet) return
  const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet)


  let successCount = 0
  let errorCount = 0

  for (const rowData of jsonData) {
    try {
      const genderRaw = String(rowData['Gender'] || '').trim().toLowerCase()
      const payload = {
        nameKh: rowData['Name Kh'] || '',
        nameEn: rowData['Name En'] || '',
        dob: rowData['Date of Birth'] || undefined,
        gender: genderRaw === 'male' || genderRaw === '1' ? 1 : 2,
        phone: rowData['Phone'] || '',
        email: rowData['Email'] || '',
        address: rowData['Address'] || '',
        proCode: rowData['Province Code'] || undefined,
        disCode: rowData['District Code'] || undefined,
        comCode: rowData['Commune Code'] || undefined,
        vilCode: rowData['Village Code'] || undefined
      }

      const existingId = rowData['ID'] ? String(rowData['ID']).trim() : ''
      if (existingId) {
        await $api(`/patients/${existingId}`, { method: 'PUT', body: payload })
      } else {
        await $api('/patients', { method: 'POST', body: payload })
      }
      successCount++
    } catch (err) {
      console.error('Import error:', err)
      errorCount++
    }
  }

  toast.add({
    title: 'Import Result',
    description: `Successfully imported ${successCount} patients.${errorCount ? ` ${errorCount} failed.` : ''}`,
    color: errorCount ? 'warning' : 'success'
  })
  refresh()
  if (fileInput.value) fileInput.value.value = ''
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <UBreadcrumb :items="[{ label: t('nav.home'), to: '/' }, { label: t('patient.title') }]" />
      <UButton
        icon="i-lucide-plus"
        :label="t('common.addNew')"
        color="primary"
        @click="openAddModal"
      />
    </div>

    <UCard>
      <template #header>
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold">
              {{ t('patient.list') }}
            </h2>
          </div>
          <div class="flex items-center gap-2">
            <USelectMenu
              v-model="filters.proCode"
              :items="provinces"
              value-key="proCode"
              label-key="nameKh"
              class="w-full"
              :placeholder="t('patient.province')"
              :searchable="false"
              clearable
            />
            <USelectMenu
              v-model="filters.disCode"
              :items="districts"
              value-key="disCode"
              label-key="nameKh"
              class="w-full"
              :placeholder="t('patient.district')"
              :disabled="!filters.proCode"
              :searchable="false"
              clearable
            />
            <USelectMenu
              v-model="filters.comCode"
              :items="communes"
              value-key="comCode"
              label-key="nameKh"
              class="w-full"
              :placeholder="t('patient.commune')"
              :disabled="!filters.disCode"
              :searchable="false"
              clearable
            />
            <USelectMenu
              v-model="filters.vilCode"
              :items="villages"
              value-key="vilCode"
              label-key="nameKh"
              class="w-full"
              :placeholder="t('patient.village')"
              :disabled="!filters.comCode"
              :searchable="false"
              clearable
            />
          </div>
        </div>
      </template>

      <!-- Filter Row -->
      <div class="flex items-center">
        <UInput
          v-model="searchQuery"
          :placeholder="t('patient.search')"
          icon="i-lucide-search"
          class="flex-1"
        />

        <div class="flex items-center gap-2">
          <UButton
            icon="i-lucide-refresh-cw"
            variant="ghost"
            color="neutral"
            :loading="status === 'pending'"
            @click="refresh"
          />
          <UButton
            v-if="hasFilters"
            icon="i-lucide-filter-x"
            label="Clear"
            color="error"
            variant="ghost"
            size="sm"
            @click="clearFilters"
          />
          <input
            ref="fileInput"
            type="file"
            accept=".xlsx,.xls"
            class="hidden"
            @change="handleImport"
          />
          <UButton
            icon="i-lucide-download"
            :label="t('common.export')"
            :loading="isExporting"
            :disabled="isExporting"
            color="neutral"
            variant="outline"
            @click="exportToExcelFile"
          />
          <UButton
            icon="i-lucide-upload"
            :label="t('common.import')"
            color="neutral"
            variant="outline"
            @click="triggerImport"
          />
        </div>
      </div>

      <UTable
        :columns="columns"
        :data="patients"
        :loading="status === 'pending'"
        :ui="{
          td: 'py-2 px-4 text-sm',
          th: 'py-2 px-4 font-semibold text-sm bg-elevated border-b border-default text-left'
        }"
      >
        <template #emptystate>
          <div class="text-center py-8 text-muted">
            No patients found
          </div>
        </template>
      </UTable>

      <template #footer>
        <div class="flex items-center justify-between gap-3 border-t border-default pt-4 mt-4">
          <div class="text-sm text-muted">
            Total: {{ total }}
          </div>

          <div class="flex items-center gap-2">
            <UButton
              label="Previous"
              icon="i-lucide-chevron-left"
              :disabled="!hasPrevPage"
              variant="outline"
              size="sm"
              @click="page--"
            />
            <span class="text-sm px-2">Page {{ page }}</span>
            <UButton
              label="Next"
              trailing-icon="i-lucide-chevron-right"
              :disabled="!hasNextPage"
              variant="outline"
              size="sm"
              @click="page++"
            />
          </div>
        </div>
      </template>
    </UCard>
  </div>

  <PatientsAddModals
    v-model:open="isAddModalOpen"
    :patient="selectedPatient"
    hide-button
    @save="handleSave"
  />

  <PatientsDeleteModal v-model:open="isDeleteModalOpen" :patient="selectedPatient" @delete="refresh" />

  <!-- Patient Medical History Quick Modal -->
  <UModal
    v-model:open="isHistoryModalOpen"
    :ui="{
      content: 'sm:max-w-4xl'
    }"
  >
    <template #content>
      <div class="h-[720px] flex flex-col bg-white dark:bg-gray-900 rounded-xl overflow-hidden">
        <OpdRoundHistoryTable
          :patient-id="historyPatientId"
          show-close-button
          @close="isHistoryModalOpen = false"
        />
      </div>
    </template>
  </UModal>
</template>
