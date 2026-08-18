<script setup lang="ts">
import { ref, computed, h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import SupplierAddModal from '~/components/suppliers/AddModal.vue'

const { t } = useI18n()
const toast = useToast()

const searchQuery = ref('')
const page = ref(1)
const limit = ref(20)

const { data: result, status, refresh } = await useAsyncData('suppliers', () =>
  $api('/suppliers', {
    params: {
      search: searchQuery.value,
      limit: limit.value,
      skip: (page.value - 1) * limit.value
    }
  }), {
  watch: [searchQuery, page, limit],
  default: () => ({ data: [] })
}
)

const suppliers = computed(() => (result.value as any)?.data || [])
const total = computed(() => (result.value as any)?.total || suppliers.value.length)
const hasNextPage = computed(() => total.value > page.value * limit.value)
const hasPrevPage = computed(() => page.value > 1)

const columns: TableColumn<any>[] = [
  {
    accessorKey: 'no',
    header: t('common.number'),
    cell: ({ row }) => (page.value - 1) * limit.value + row.index + 1
  },
  {
    accessorKey: 'name',
    header: t('supplier.name')
  },
  {
    accessorKey: 'code',
    header: t('supplier.code')
  },
  {
    accessorKey: 'contactPerson',
    header: t('supplier.contactPerson')
  },
  {
    accessorKey: 'phone',
    header: t('supplier.phone')
  },
  {
    accessorKey: 'email',
    header: t('supplier.email')
  },
  {
    accessorKey: 'address',
    header: t('supplier.address')
  },
  {
    accessorKey: 'status',
    header: t('common.status'),
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
          label: 'Edit',
          icon: 'i-lucide-pencil',
          onSelect: () => editSupplier(row.original)
        },
        {
          type: 'separator'
        },
        {
          label: 'Delete',
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

const isAddModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const isDeleting = ref(false)
const selectedSupplier = ref<any>(null)

function editSupplier(supplier: any) {
  selectedSupplier.value = supplier
  isAddModalOpen.value = true
}

function confirmDelete(supplier: any) {
  selectedSupplier.value = supplier
  isDeleteModalOpen.value = true
}

async function handleDelete() {
  if (!selectedSupplier.value) return
  isDeleting.value = true
  try {
    await $api(`/suppliers/${selectedSupplier.value._id}`, { method: 'DELETE' })
    toast.add({ title: 'Success', description: 'Supplier deleted successfully', color: 'success' })
    refresh()
    isDeleteModalOpen.value = false
  } catch (error: any) {
    toast.add({ title: 'Error', description: error.data?.message || 'Failed to delete supplier', color: 'error' })
  } finally {
    isDeleting.value = false
    selectedSupplier.value = null
  }
}

function openAddModal() {
  selectedSupplier.value = null
  isAddModalOpen.value = true
}

function handleSuccess() {
  refresh()
}

function onAddModalClose(open: boolean) {
  if (!open) {
    selectedSupplier.value = null
  }
}

watch(searchQuery, () => {
  page.value = 1
})

const fileInput = ref<HTMLInputElement | null>(null)

async function exportToExcelFile() {
  if (!import.meta.client) return

  const allResult = await $api<{ data: any[] }>('/suppliers', {
    params: { search: searchQuery.value, limit: 100000, skip: 0 }
  })
  const allSuppliers = allResult?.data || []

  const headers = [
    { header: 'ID', key: 'id', width: 25 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Code', key: 'code', width: 15 },
    { header: 'Contact Person', key: 'contactPerson', width: 20 },
    { header: 'Phone', key: 'phone', width: 15 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Address', key: 'address', width: 30 },
    { header: 'City', key: 'city', width: 15 },
    { header: 'Country', key: 'country', width: 15 },
    { header: 'Tax Number', key: 'taxNumber', width: 15 },
    { header: 'Payment Terms', key: 'paymentTerms', width: 20 },
    { header: 'Notes', key: 'notes', width: 30 },
    { header: 'Status', key: 'status', width: 10 }
  ]

  const data = allSuppliers.map((s: any) => ({
    id: s._id || '',
    name: s.name,
    code: s.code || '',
    contactPerson: s.contactPerson || '',
    phone: s.phone || '',
    email: s.email || '',
    address: s.address || '',
    city: s.city || '',
    country: s.country || 'Cambodia',
    taxNumber: s.taxNumber || '',
    paymentTerms: s.paymentTerms || '',
    notes: s.notes || '',
    status: s.status || 'active'
  }))

  const XLSX = await import('xlsx')
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Suppliers')
  XLSX.writeFile(workbook, 'Suppliers_Export.xlsx')
}

function triggerImport() {
  fileInput.value?.click()
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
        name: rowData['Name'],
        code: rowData['Code'] || '',
        contactPerson: rowData['Contact Person'] || '',
        phone: rowData['Phone'] || '',
        email: rowData['Email'] || '',
        address: rowData['Address'] || '',
        city: rowData['City'] || '',
        country: rowData['Country'] || 'Cambodia',
        taxNumber: rowData['Tax Number'] || '',
        paymentTerms: rowData['Payment Terms'] || '',
        notes: rowData['Notes'] || '',
        status: rowData['Status'] || 'active'
      }

      const existingId = rowData['ID'] ? String(rowData['ID']).trim() : ''
      if (existingId) {
        await $api(`/suppliers/${existingId}`, { method: 'PUT', body: payload })
      } else {
        await $api('/suppliers', { method: 'POST', body: payload })
      }
      successCount++
    } catch (err) {
      console.error('Import error:', err)
      errorCount++
    }
  }

  toast.add({
    title: 'Import Result',
    description: `Successfully imported ${successCount} suppliers.${errorCount ? ` ${errorCount} failed.` : ''}`,
    color: errorCount ? 'warning' : 'success'
  })
  refresh()
  if (fileInput.value) fileInput.value.value = ''
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <UBreadcrumb :items="[{ label: t('nav.home'), to: '/' }, { label: t('supplier.title') }]" />
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
              {{ t('supplier.list') }}
            </h2>
          </div>
          <div class="flex items-center gap-2">
            <UInput
              v-model="searchQuery"
              :placeholder="t('supplier.search')"
              icon="i-lucide-search"
              class="flex-1"
            />
            <div class="ml-auto flex items-center gap-2">
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
        </div>
      </template>

      <div class="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-lg">
        <UTable
          :columns="columns"
          :data="suppliers"
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
            <span class="text-sm text-gray-500">
              {{ t('pagination.total') || 'Total' }}: {{ total }}
            </span>
          </div>
          <div class="flex gap-2">
            <UButton
              :label="t('pagination.prev') || 'Back'"
              icon="i-lucide-chevron-left"
              :disabled="!hasPrevPage"
              color="success"
              @click="page--"
            />
            <UButton
              :label="t('pagination.next') || 'Next'"
              trailing-icon="i-lucide-chevron-right"
              :disabled="!hasNextPage"
              color="success"
              @click="page++"
            />
          </div>
        </div>
      </template>
    </UCard>

    <SupplierAddModal v-model:open="isAddModalOpen" :supplier="selectedSupplier" @success="handleSuccess" />

    <UModal v-model:open="isDeleteModalOpen" title="Confirm Delete">
      <template #body>
        <p>Are you sure you want to delete supplier <strong>{{ selectedSupplier?.name }}</strong>?</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
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
