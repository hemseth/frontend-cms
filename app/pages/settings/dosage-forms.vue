<script setup lang="ts">
import { ref, computed, h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'

const { t } = useI18n()
const toast = useToast()
const searchQuery = ref('')
const isModalOpen = ref(false)
const selectedItem = ref<any>(null)
const isDeleting = ref(false)
const isDeleteModalOpen = ref(false)
const page = ref(1)
const limit = ref(20)

const { data: result, status, refresh } = await useAsyncData('dosage-forms', () =>
  $api<{ data: any[], total: number }>('/dosage-forms', {
    params: {
      search: searchQuery.value,
      limit: limit.value,
      skip: (page.value - 1) * limit.value
    }
  }), {
  watch: [searchQuery, page, limit],
  default: () => ({ data: [], total: 0 })
})

const items = computed(() => (result.value as any)?.data || [])
const total = computed(() => (result.value as any)?.total || 0)
const hasNextPage = computed(() => total.value > page.value * limit.value)
const hasPrevPage = computed(() => page.value > 1)

watch([searchQuery, limit], () => {
  page.value = 1
})

const columns: TableColumn<any>[] = [
  {
    accessorKey: 'no',
    header: 'No.',
    cell: ({ row }) => (page.value - 1) * limit.value + row.index + 1
  },
  {
    accessorKey: 'key',
    header: 'Key'
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
    header: 'Status',
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
    header: 'Actions',
    cell: ({ row }) => {
      const actions = [
        {
          label: 'Edit',
          icon: 'i-lucide-pencil',
          onSelect: () => editItem(row.original)
        },
        {
          type: 'separator'
        },
        {
          label: 'Delete',
          icon: 'i-lucide-trash',
          color: 'error' as const,
          onSelect: () => confirmDeleteItem(row.original)
        }
      ]

      return h(resolveComponent('UDropdownMenu'), {
        items: [actions],
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

function editItem(item: any) {
  selectedItem.value = item
  isModalOpen.value = true
}

function openAddModal() {
  selectedItem.value = null
  isModalOpen.value = true
}

function confirmDeleteItem(item: any) {
  selectedItem.value = item
  isDeleteModalOpen.value = true
}

async function handleDeleteItem() {
  if (!selectedItem.value) return
  isDeleting.value = true
  try {
    await $api(`/dosage-forms/${selectedItem.value._id}`, { method: 'DELETE' })
    toast.add({ title: 'Success', description: 'Dosage form deleted', color: 'success' })
    refresh()
    isDeleteModalOpen.value = false
  } catch (error: any) {
    toast.add({ title: 'Error', description: error.data?.message || 'Failed to delete', color: 'error' })
  } finally {
    isDeleting.value = false
    selectedItem.value = null
  }
}

function resetFilters() {
  searchQuery.value = ''
}

const fileInput = ref<HTMLInputElement | null>(null)

function triggerImport() {
  fileInput.value?.click()
}

async function exportToExcel() {
  if (!import.meta.client) return
  const allResult = await $api<{ data: any[] }>('/dosage-forms', {
    params: { search: searchQuery.value, limit: 100000, skip: 0 }
  })
  const allItems = allResult?.data || []
  const data = allItems.map((d: any) => ({
    id: d._id || '',
    key: d.key || '',
    nameEn: d.nameEn || '',
    nameKh: d.nameKh || '',
    status: d.status || 'active'
  }))

  const XLSX = await import('xlsx')
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'DosageForms')
  XLSX.writeFile(workbook, 'DosageForms_Export.xlsx')
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
        key: rowData['Key'] || rowData['key'] || '',
        nameEn: rowData['Name (EN)'] || rowData['nameEn'] || '',
        nameKh: rowData['Name (KH)'] || rowData['nameKh'] || '',
        status: rowData['Status'] || rowData['status'] || 'active'
      }

      const existingId = rowData['ID'] || rowData['id'] ? String(rowData['ID'] || rowData['id']).trim() : ''
      if (existingId) {
        await $api(`/dosage-forms/${existingId}`, { method: 'PUT', body: payload })
      } else {
        await $api('/dosage-forms', { method: 'POST', body: payload })
      }
      successCount++
    } catch (err) {
      console.error('Import error:', err)
      errorCount++
    }
  }

  toast.add({
    title: 'Import Result',
    description: `Successfully imported ${successCount} dosage forms.${errorCount ? ` ${errorCount} failed.` : ''}`,
    color: errorCount ? 'warning' : 'success'
  })
  refresh()
  if (fileInput.value) fileInput.value.value = ''
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <UBreadcrumb :items="[{ label: t('nav.home'), to: '/' }, { label: 'Settings' }, { label: 'Dosage Forms' }]" />
      <UButton
        icon="i-lucide-plus"
        label="Add Dosage Form"
        color="primary"
        @click="openAddModal"
      />
    </div>

    <UCard>
      <template #header>
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold">
              Dosage Forms
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
              color="neutral"
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
              @click="exportToExcel"
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
          :data="items"
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

    <SettingsDosageFormModal v-model:open="isModalOpen" :dosage-form="selectedItem" @success="refresh" />

    <UModal v-model:open="isDeleteModalOpen" title="Confirm Delete">
      <template #body>
        <p>Are you sure you want to delete <strong>{{ selectedItem?.nameEn }}</strong>?</p>
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
            @click="handleDeleteItem"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
