<script setup lang="ts">
import { ref, computed, h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'

const { t } = useI18n()
const toast = useToast()
const router = useRouter()

const searchQuery = ref('')
const selectedStatus = ref<string | undefined>()
const selectedSupplier = ref<string | undefined>()
const page = ref(1)
const limit = ref(20)

const { data: suppliersResult } = await useAsyncData('suppliers-list', () => $api('/suppliers'), {
  default: () => ({ data: [] })
})

const supplierOptions = computed(() => {
  return ((suppliersResult.value as any)?.data || []).map((s: any) => ({
    label: s.name,
    value: s._id
  }))
})

const statusOptions = [
  { label: 'Pending', value: 'pending' },
  { label: 'Ordered', value: 'ordered' },
  { label: 'Received', value: 'received' },
  { label: 'Cancelled', value: 'cancelled' }
]

const { data: result, status, refresh } = await useAsyncData('purchases', () =>
  $api('/purchases', {
    params: {
      search: searchQuery.value,
      status: selectedStatus.value,
      supplierId: selectedSupplier.value,
      limit: limit.value,
      skip: (page.value - 1) * limit.value
    }
  }), {
  watch: [searchQuery, selectedStatus, selectedSupplier, page, limit],
  default: () => ({ data: [] })
}
)

const purchases = computed(() => (result.value as any)?.data || [])
const total = computed(() => (result.value as any)?.total || purchases.value.length)
const hasNextPage = computed(() => total.value > page.value * limit.value)
const hasPrevPage = computed(() => page.value > 1)

const columns: TableColumn<any>[] = [
  {
    accessorKey: 'no',
    header: t('common.number'),
    cell: ({ row }) => (page.value - 1) * limit.value + row.index + 1
  },
  {
    accessorKey: 'invoiceNumber',
    header: t('purchase.invoiceNumber')
  },
  {
    accessorKey: 'supplierName',
    header: t('supplier.title')
  },
  {
    accessorKey: 'date',
    header: t('purchase.date'),
    cell: ({ row }) => row.original.date ? new Date(row.original.date).toLocaleDateString() : '-'
  },
  {
    accessorKey: 'totalAmount',
    header: () => h('div', { class: 'text-right' }, t('purchase.totalAmount')),
    cell: ({ row }) => h('div', { class: 'text-right' }, `$${Number(row.original.totalAmount || 0).toFixed(2)}`)
  },
  {
    accessorKey: 'discount',
    header: () => h('div', { class: 'text-right' }, t('purchase.discount')),
    cell: ({ row }) => h('div', { class: 'text-right' }, `$${Number(row.original.discount || 0).toFixed(2)}`)
  },
  {
    accessorKey: 'grandTotal',
    header: () => h('div', { class: 'text-right' }, t('purchase.grandTotal')),
    cell: ({ row }) => h('div', { class: 'text-right font-bold text-primary-600' }, `$${Number(row.original.grandTotal || 0).toFixed(2)}`)
  },
  {
    accessorKey: 'paymentStatus',
    header: t('purchase.paymentStatus'),
    cell: ({ row }) => {
      const colors: Record<string, any> = {
        unpaid: 'error',
        partial: 'warning',
        paid: 'success'
      }
      return h(resolveComponent('UBadge'), {
        label: row.original.paymentStatus,
        color: colors[row.original.paymentStatus] || 'neutral',
        variant: 'subtle'
      })
    }
  },
  {
    accessorKey: 'status',
    header: t('common.status'),
    cell: ({ row }) => {
      const colors: Record<string, any> = {
        pending: 'warning',
        ordered: 'info',
        received: 'success',
        cancelled: 'neutral'
      }
      return h(resolveComponent('UBadge'), {
        label: row.original.status,
        color: colors[row.original.status] || 'neutral',
        variant: 'subtle'
      })
    }
  },
  {
    id: 'actions',
    header: () => h('div', { class: 'text-right' }, t('common.actions')),
    cell: ({ row }) => {
      const items = [
        {
          label: 'View',
          icon: 'i-lucide-eye',
          onSelect: () => viewPurchase(row.original)
        },
        {
          label: 'Edit',
          icon: 'i-lucide-pencil',
          onSelect: () => editPurchase(row.original)
        },
        {
          type: 'separator'
        },
        {
          label: 'Mark Received',
          icon: 'i-lucide-check-circle',
          onSelect: () => markReceived(row.original)
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

      return h('div', { class: 'text-right' }, h(resolveComponent('UDropdownMenu'), {
        items: [items],
        onSelect: (item: any) => item.onSelect?.()
      }, {
        default: () => h(resolveComponent('UButton'), {
          icon: 'i-lucide-more-vertical',
          color: 'neutral',
          variant: 'ghost'
        })
      }))
    }
  }
]

const isDeleteModalOpen = ref(false)
const isDeleting = ref(false)
const selectedPurchase = ref<any>(null)

function viewPurchase(purchase: any) {
  router.push(`/purchases/${purchase._id}`)
}

function editPurchase(purchase: any) {
  router.push(`/purchases/${purchase._id}`)
}

function confirmDelete(purchase: any) {
  selectedPurchase.value = purchase
  isDeleteModalOpen.value = true
}

async function handleDelete() {
  if (!selectedPurchase.value) return
  isDeleting.value = true
  try {
    await $api(`/purchases/${selectedPurchase.value._id}`, { method: 'DELETE' })
    toast.add({ title: 'Success', description: 'Purchase deleted successfully', color: 'success' })
    refresh()
    isDeleteModalOpen.value = false
  } catch (error: any) {
    toast.add({ title: 'Error', description: error.data?.message || 'Failed to delete purchase', color: 'error' })
  } finally {
    isDeleting.value = false
    selectedPurchase.value = null
  }
}

async function markReceived(purchase: any) {
  try {
    await $api(`/purchases/${purchase._id}/status`, {
      method: 'PATCH',
      body: { status: 'received' }
    })
    toast.add({ title: 'Success', description: 'Purchase marked as received', color: 'success' })
    refresh()
  } catch (error: any) {
    toast.add({ title: 'Error', description: error.data?.message || 'Failed to update status', color: 'error' })
  }
}

function openAddModal() {
  router.push('/purchases/new')
}

function resetFilters() {
  searchQuery.value = ''
  selectedStatus.value = undefined
  selectedSupplier.value = undefined
}

watch([searchQuery, selectedStatus, selectedSupplier], () => {
  page.value = 1
})

const fileInput = ref<HTMLInputElement | null>(null)

async function exportToExcelFile() {
  if (!import.meta.client) return

  const allResult = await $api<{ data: any[] }>('/purchases', {
    params: {
      search: searchQuery.value,
      status: selectedStatus.value,
      supplierId: selectedSupplier.value,
      limit: 100000,
      skip: 0
    }
  })
  const allPurchases = allResult?.data || []

  const headers = [
    { header: 'ID', key: 'id', width: 25 },
    { header: 'Invoice Number', key: 'invoiceNumber', width: 18 },
    { header: 'Supplier ID', key: 'supplierId', width: 25 },
    { header: 'Supplier Name', key: 'supplierName', width: 25 },
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Total Amount', key: 'totalAmount', width: 15 },
    { header: 'Discount', key: 'discount', width: 12 },
    { header: 'Tax', key: 'tax', width: 10 },
    { header: 'Grand Total', key: 'grandTotal', width: 15 },
    { header: 'Payment Status', key: 'paymentStatus', width: 15 },
    { header: 'Payment Method', key: 'paymentMethod', width: 15 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Notes', key: 'notes', width: 30 }
  ]

  const data = allPurchases.map((p: any) => ({
    id: p._id || '',
    invoiceNumber: p.invoiceNumber || '',
    supplierId: p.supplierId || p.supplier?._id || '',
    supplierName: p.supplierName || p.supplier?.name || '',
    date: p.date ? new Date(p.date).toISOString().split('T')[0] : '',
    totalAmount: p.totalAmount || 0,
    discount: p.discount || 0,
    tax: p.tax || 0,
    grandTotal: p.grandTotal || 0,
    paymentStatus: p.paymentStatus || 'unpaid',
    paymentMethod: p.paymentMethod || '',
    status: p.status || 'pending',
    notes: p.notes || ''
  }))

  const XLSX = await import('xlsx')
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Purchases')
  XLSX.writeFile(workbook, 'Purchases_Export.xlsx')
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
      const existingId = rowData['ID'] ? String(rowData['ID']).trim() : ''

      const payload: any = {
        invoiceNumber: rowData['Invoice Number'] || '',
        supplierId: rowData['Supplier ID'] || '',
        supplierName: rowData['Supplier Name'] || '',
        date: rowData['Date'] ? new Date(rowData['Date']) : new Date(),
        totalAmount: Number(rowData['Total Amount'] || 0),
        discount: Number(rowData['Discount'] || 0),
        tax: Number(rowData['Tax'] || 0),
        grandTotal: Number(rowData['Grand Total'] || 0),
        paymentStatus: rowData['Payment Status'] || 'unpaid',
        paymentMethod: rowData['Payment Method'] || '',
        status: rowData['Status'] || 'pending',
        notes: rowData['Notes'] || '',
        items: []
      }

      if (existingId) {
        await $api(`/purchases/${existingId}`, { method: 'PUT', body: payload })
      } else {
        await $api('/purchases', { method: 'POST', body: payload })
      }
      successCount++
    } catch (err) {
      console.error('Import error:', err)
      errorCount++
    }
  }

  toast.add({
    title: 'Import Result',
    description: `Successfully imported ${successCount} records.${errorCount ? ` ${errorCount} failed.` : ''}`,
    color: errorCount ? 'warning' : 'success'
  })
  refresh()
  if (fileInput.value) fileInput.value.value = ''
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <UBreadcrumb :items="[{ label: t('nav.home'), to: '/' }, { label: t('purchase.title') }]" />
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
              {{ t('purchase.list') }}
            </h2>
          </div>
          <div class="flex items-center gap-2">
            <UInput
              v-model="searchQuery"
              :placeholder="t('purchase.search')"
              icon="i-lucide-search"
              class="flex-1"
            />
            <USelectMenu
              v-model="selectedStatus"
              :items="statusOptions"
              value-key="value"
              class="w-40"
              :placeholder="t('common.status')"
              clearable
            />
            <USelectMenu
              v-model="selectedSupplier"
              :items="supplierOptions"
              value-key="value"
              class="w-48"
              :placeholder="t('supplier.title')"
              clearable
            />

            <div class="ml-auto flex items-center gap-2">
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
        </div>
      </template>

      <div class="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-lg">
        <UTable
          :columns="columns"
          :data="purchases"
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

    <UModal v-model:open="isDeleteModalOpen" title="Confirm Delete">
      <template #body>
        <p>Are you sure you want to delete this purchase?</p>
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
