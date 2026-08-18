<script setup lang="ts">
import { ref, computed, h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'

const { t } = useI18n()
const toast = useToast()
const searchQuery = ref('')
const isModalOpen = ref(false)
const selectedType = ref<any>(null)
const isDeleting = ref(false)
const isDeleteModalOpen = ref(false)
const page = ref(1)
const limit = ref(20)

const { data: result, status, refresh } = await useAsyncData('medicine-types', () =>
  $api<{ data: any[], total: number }>('/medicine-types', {
    params: {
      search: searchQuery.value,
      limit: limit.value,
      skip: (page.value - 1) * limit.value
    }
  }), {
  watch: [searchQuery, page, limit],
  default: () => ({ data: [], total: 0 })
})

const medicineTypes = computed(() => (result.value as any)?.data || [])
const total = computed(() => (result.value as any)?.total || 0)
const hasNextPage = computed(() => total.value > page.value * limit.value)
const hasPrevPage = computed(() => page.value > 1)

watch([searchQuery, limit], () => {
  page.value = 1
})

const columns: TableColumn<any>[] = [
  {
    accessorKey: 'no',
    header: t('common.number'),
    cell: ({ row }) => (page.value - 1) * limit.value + row.index + 1
  },
  {
    accessorKey: 'nameEn',
    header: 'Name (EN)'
  },
  {
    accessorKey: 'nameKh',
    header: 'Name (KH)'
  },
  {
    accessorKey: 'status',
    header: t('medicine.status'),
    cell: ({ row }) => {
      return h(resolveComponent('UBadge'), {
        label: row.original.status,
        color: row.original.status === 'active' ? 'success' : 'neutral',
        variant: 'subtle'
      })
    }
  },
  {
    id: 'actions',
    header: t('common.actions'),
    cell: ({ row }) => {
      const items = [
        {
          label: t('common.edit'),
          icon: 'i-lucide-pencil',
          onSelect: () => editType(row.original)
        },
        {
          type: 'separator'
        },
        {
          label: t('common.delete'),
          icon: 'i-lucide-trash',
          color: 'error' as const,
          onSelect: () => confirmDelete(row.original)
        }
      ]

      return h(resolveComponent('UDropdownMenu'), {
        items: [items],
        onSelect: (item: any) => item.onSelect?.()
      }, {
        default: () => h(resolveComponent('UButton'), {
          icon: 'i-lucide-more-vertical',
          color: 'neutral',
          variant: 'ghost'
        })
      })
    }
  }
]

function editType(type: any) {
  selectedType.value = type
  isModalOpen.value = true
}

function confirmDelete(type: any) {
  selectedType.value = type
  isDeleteModalOpen.value = true
}

async function handleDelete() {
  if (!selectedType.value) return
  isDeleting.value = true
  try {
    await $api(`/medicine-types/${selectedType.value._id}`, { method: 'DELETE' })
    toast.add({ title: 'Success', description: 'Medicine type deleted', color: 'success' })
    refresh()
    isDeleteModalOpen.value = false
  } catch (error: any) {
    toast.add({ title: 'Error', description: error.data?.message || 'Failed to delete', color: 'error' })
  } finally {
    isDeleting.value = false
    selectedType.value = null
  }
}

function openAddModal() {
  selectedType.value = null
  isModalOpen.value = true
}

function handleSuccess() {
  refresh()
  isModalOpen.value = false
}

function onAddModalClose(open: boolean) {
  if (!open) {
    selectedType.value = null
  }
}

function resetFilters() {
  searchQuery.value = ''
}

const fileInput = ref<HTMLInputElement | null>(null)

function triggerImport() {
  fileInput.value?.click()
}

async function exportToExcelFile() {
  if (!import.meta.client) return

  const allResult = await $api<{ data: any[] }>('/medicine-types', {
    params: { search: searchQuery.value, limit: 100000, skip: 0 }
  })
  const allTypes = allResult?.data || []

  const headers = [
    { header: 'ID', key: 'id', width: 25 },
    { header: 'Name (EN)', key: 'nameEn', width: 20 },
    { header: 'Name (KH)', key: 'nameKh', width: 20 },
    { header: 'Status', key: 'status', width: 10 }
  ]

  const data = allTypes.map((d: any) => ({
    id: d._id || '',
    nameEn: d.nameEn || '',
    nameKh: d.nameKh || '',
    status: d.status || 'active'
  }))

  const XLSX = await import('xlsx')
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'MedicineTypes')
  XLSX.writeFile(workbook, 'MedicineTypes_Export.xlsx')
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
      const payload = {
        nameEn: rowData['Name (EN)'] || '',
        nameKh: rowData['Name (KH)'] || '',
        status: rowData['Status'] || 'active'
      }

      const existingId = rowData['ID'] ? String(rowData['ID']).trim() : ''
      if (existingId) {
        await $api(`/medicine-types/${existingId}`, { method: 'PUT', body: payload })
      } else {
        await $api('/medicine-types', { method: 'POST', body: payload })
      }
      successCount++
    } catch (err) {
      console.error('Import error:', err)
      errorCount++
    }
  }

  toast.add({
    title: 'Import Result',
    description: `Successfully imported ${successCount} medicine types.${errorCount ? ` ${errorCount} failed.` : ''}`,
    color: errorCount ? 'warning' : 'success'
  })
  refresh()
  if (fileInput.value) fileInput.value.value = ''
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <UBreadcrumb
        :items="[{ label: t('nav.home'), to: '/' }, { label: t('settings.title'), to: '/settings' }, { label: t('settings.medicineType') }]"
      />
      <UButton
        icon="i-lucide-plus"
        :label="t('common.add')"
        @click="openAddModal"
      />
    </div>
    <UCard>
      <template #header>
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold">
              {{ t('settings.medicineType') }}
            </h2>
          </div>

          <div class="flex items-center gap-2">
            <UInput
              v-model="searchQuery"
              :placeholder="t('common.search')"
              icon="i-lucide-search"
              class="flex-1"
            />
            <UButton
              color="error"
              variant="outline"
              icon="i-lucide-rotate-ccw"
              :label="t('common.reset')"
              @click="resetFilters"
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
      </template>

      <div class="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-lg">
        <UTable
          :columns="columns"
          :data="medicineTypes"
          :loading="status === 'pending'"
          class="w-full"
          :ui="{
            td: 'py-1 px-4 text-sm',
            th: 'py-1.5 px-4 font-semibold text-sm bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 text-left'
          }"
        />
      </div>

      <template #footer>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2 text-sm text-gray-500">
              {{ t('pagination.perPage') }}:
              <USelectMenu v-model="limit" :items="[10, 20, 50, 100]" class="w-20" />
            </div>
            <span class="text-sm text-gray-500">Total: {{ total }}</span>
          </div>
          <div class="flex gap-2">
            <UButton
              label="Back"
              icon="i-lucide-chevron-left"
              :disabled="!hasPrevPage"
              @click="page--"
            />
            <UButton
              label="Next"
              trailing-icon="i-lucide-chevron-right"
              :disabled="!hasNextPage"
              @click="page++"
            />
          </div>
        </div>
      </template>
    </UCard>

    <SettingsMedicineTypeModal v-model:open="isModalOpen" :medicine-type="selectedType" @success="refresh" />

    <UModal v-model:open="isDeleteModalOpen" title="Confirm Delete">
      <template #body>
        <p>Are you sure you want to delete <strong>{{ selectedType?.nameEn }}</strong>?</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            @click="isDeleteModalOpen = false"
          />
          <UButton
            label="Delete"
            color="error"
            :loading="isDeleting"
            @click="handleDelete"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
