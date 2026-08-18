<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { usePositions } from '~/composables/usePositions'
import * as z from 'zod'
import type { TableColumn } from '@nuxt/ui'

const { positions, total, isLoading, fetchPositions, createPosition, updatePosition, deletePosition } = usePositions()
const { t } = useI18n()
const toast = useToast()

const search = ref('')
const page = ref(1)
const limit = ref(10)

// Fetch data when filters/pagination change
watch([search, page, limit], () => {
  fetchPositions(search.value, page.value, limit.value)
})

async function handleDelete(id: string) {
  if (confirm(t('position.deleteConfirm') || 'Are you sure you want to delete this position?')) {
    await deletePosition(id)
    toast.add({ title: 'Success', description: 'Deleted successfully', color: 'success' })
    fetchPositions(search.value, page.value, limit.value)
  }
}

const columns = computed<TableColumn<any>[]>(() => [{
  accessorKey: 'nameKh',
  header: t('common.nameKh'),
  sortable: true
}, {
  accessorKey: 'nameEn',
  header: t('common.nameEn'),
  sortable: true
}, {
  accessorKey: 'description',
  header: t('common.description')
}, {
  accessorKey: 'status',
  header: t('medicine.status'),
  sortable: true
}, {
  id: 'actions',
  header: t('common.actions')
}])

const isModalOpen = ref(false)
const isEditMode = ref(false)
const state = ref({
  _id: '',
  nameEn: '',
  nameKh: '',
  description: '',
  status: 'active' as 'active' | 'inactive'
})

const schema = z.object({
  nameEn: z.string().min(1, 'Name (EN) is required'),
  nameKh: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active')
})

const statusOptions = [
  { label: t('common.active') || 'Active', value: 'active' },
  { label: t('common.inactive') || 'Inactive', value: 'inactive' }
]

onMounted(() => {
  fetchPositions(search.value, page.value, limit.value)
})

function openCreateModal() {
  state.value = {
    _id: '',
    nameEn: '',
    nameKh: '',
    description: '',
    status: 'active'
  }
  isEditMode.value = false
  isModalOpen.value = true
}

function openEditModal(row: any) {
  state.value = { ...row }
  isEditMode.value = true
  isModalOpen.value = true
}

async function handleSave(event: any) {
  try {
    const payload = event.data || state.value
    if (isEditMode.value) {
      await updatePosition(state.value._id, payload)
      toast.add({ title: 'Success', description: 'Updated successfully', color: 'success' })
    } else {
      const { _id, ...createData } = payload
      await createPosition(createData)
      toast.add({ title: 'Success', description: 'Created successfully', color: 'success' })
    }
    isModalOpen.value = false
    fetchPositions(search.value, page.value, limit.value)
  } catch (e: any) {
    toast.add({ title: 'Error', description: e.data?.message || 'Failed to save', color: 'error' })
    console.error(e)
  }
}

const fileInput = ref<HTMLInputElement | null>(null)

function triggerImport() {
  fileInput.value?.click()
}

async function exportToExcelFile() {
  if (!import.meta.client) return

  const allResult = await $api<{ data: any[] }>(`/positions?search=${encodeURIComponent(search.value)}&offset=0&limit=100000`)
  const allPositions = allResult?.data || []

  const headers = [
    { header: 'ID', key: 'id', width: 25 },
    { header: 'Name Kh', key: 'nameKh', width: 20 },
    { header: 'Name En', key: 'nameEn', width: 20 },
    { header: 'Description', key: 'description', width: 30 },
    { header: 'Status', key: 'status', width: 10 }
  ]

  const data = allPositions.map((p: any) => ({
    id: p._id || '',
    nameKh: p.nameKh || '',
    nameEn: p.nameEn || '',
    description: p.description || '',
    status: p.status || 'active'
  }))

  const XLSX = await import('xlsx')
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Positions')
  XLSX.writeFile(workbook, 'Positions_Export.xlsx')
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
        nameKh: rowData['Name Kh'] || '',
        nameEn: rowData['Name En'] || '',
        description: rowData['Description'] || '',
        status: rowData['Status'] || 'active'
      }

      const existingId = rowData['ID'] ? String(rowData['ID']).trim() : ''
      if (existingId) {
        await updatePosition(existingId, payload)
      } else {
        await createPosition(payload)
      }
      successCount++
    } catch (err) {
      console.error('Import error:', err)
      errorCount++
    }
  }

  toast.add({
    title: 'Import Result',
    description: `Successfully imported ${successCount} positions.${errorCount ? ` ${errorCount} failed.` : ''}`,
    color: errorCount ? 'warning' : 'success'
  })
  fetchPositions(search.value, page.value, limit.value)
  if (fileInput.value) fileInput.value.value = ''
}
</script>

<template>
  <div class="p-4 h-full flex flex-col">
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-2xl font-bold">
        {{ t('position.title') }}
      </h1>
      <UButton
        icon="i-lucide-plus"
        :label="t('common.addNew')"
        color="primary"
        @click="openCreateModal"
      />
    </div>

    <UCard class="flex-1 flex flex-col pt-0">
      <template #header>
        <div class="flex justify-between items-center w-full">
          <UInput
            v-model="search"
            icon="i-lucide-search"
            :placeholder="t('common.search')"
            class="w-64"
          />
          <div class="flex items-center gap-2">
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
      <UTable
        :data="positions"
        :columns="columns"
        :loading="isLoading"
        class="flex-1"
      >
        <template #actions-cell="{ row }">
          <div class="flex gap-2">
            <UButton
              icon="i-lucide-edit"
              size="xs"
              color="neutral"
              variant="ghost"
              @click="openEditModal(row.original)"
            />
            <UButton
              icon="i-lucide-trash-2"
              size="xs"
              color="error"
              variant="ghost"
              @click="handleDelete(row.original._id)"
            />
          </div>
        </template>
      </UTable>

      <template #footer>
        <div class="flex justify-between items-center w-full">
          <div class="text-sm text-gray-500">
            Showing {{ (page - 1) * limit + 1 }} to {{ Math.min(page * limit, total) }} of {{ total }}
            entries
          </div>
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2 text-sm">
              <span class="text-gray-500">Per page</span>
              <USelectMenu v-model="limit" :items="[10, 20, 50, 100]" class="w-20" />
            </div>
            <UPagination v-model:page="page" :total="total" :items-per-page="limit" />
          </div>
        </div>
      </template>
    </UCard>

    <UModal v-model:open="isModalOpen" :title="isEditMode ? t('position.edit') : t('position.add')">
      <template #body>
        <UForm
          :schema="schema"
          :state="state"
          class="space-y-4"
          @submit="handleSave"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <UFormField :label="t('common.nameEn')" name="nameEn">
              <UInput v-model="state.nameEn" class="w-full" />
            </UFormField>
            <UFormField :label="t('common.nameKh')" name="nameKh">
              <UInput v-model="state.nameKh" class="w-full" />
            </UFormField>
          </div>

          <UFormField :label="t('common.description')" name="description">
            <UTextarea v-model="state.description" class="w-full" :rows="3" />
          </UFormField>

          <UFormField :label="t('common.status')" name="status">
            <USelectMenu
              v-model="state.status"
              :items="statusOptions"
              value-key="value"
              label-key="label"
              class="w-full"
            />
          </UFormField>

          <div class="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-800">
            <UButton
              :label="t('common.cancel')"
              color="neutral"
              variant="ghost"
              @click="isModalOpen = false"
            />
            <UButton type="submit" :label="t('common.save')" color="primary" />
          </div>
        </UForm>
      </template>
    </UModal>
  </div>
</template>
