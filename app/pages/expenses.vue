<script setup lang="ts">
import { ref, computed, h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import ExpenseAddModal from '~/components/expenses/AddModal.vue'

const { t } = useI18n()
const toast = useToast()

const searchQuery = ref('')
const selectedCategory = ref<string | undefined>()
const startDate = ref('')
const endDate = ref('')
const page = ref(1)
const limit = ref(20)

const categoryOptions = [
  { label: 'Purchase', value: 'purchase' },
  { label: 'Salary', value: 'salary' },
  { label: 'Utility', value: 'utility' },
  { label: 'Rent', value: 'rent' },
  { label: 'Equipment', value: 'equipment' },
  { label: 'Other', value: 'other' }
]

const { data: result, status, refresh } = await useAsyncData('expenses', () =>
  $api('/expenses', {
    params: {
      category: selectedCategory.value,
      startDate: startDate.value,
      endDate: endDate.value,
      limit: limit.value,
      skip: (page.value - 1) * limit.value
    }
  }), {
  watch: [selectedCategory, startDate, endDate, page, limit],
  default: () => ({ data: [] })
}
)

const expenses = computed(() => (result.value as any)?.data || [])
const total = computed(() => (result.value as any)?.total || expenses.value.length)
const hasNextPage = computed(() => total.value > page.value * limit.value)
const hasPrevPage = computed(() => page.value > 1)

const { data: summaryResult, refresh: refreshSummary } = await useAsyncData('expenses-summary', () =>
  $api('/expenses/summary', {
    params: {
      startDate: startDate.value,
      endDate: endDate.value
    }
  }), {
  watch: [startDate, endDate],
  default: () => ({ data: { grandTotal: 0, byCategory: [] } })
}
)

const grandTotal = computed(() => (summaryResult.value as any)?.data?.grandTotal || 0)

const columns: TableColumn<any>[] = [
  {
    accessorKey: 'no',
    header: t('common.number'),
    cell: ({ row }) => (page.value - 1) * limit.value + row.index + 1
  },
  {
    accessorKey: 'date',
    header: t('expense.date'),
    cell: ({ row }) => row.original.date ? new Date(row.original.date).toLocaleDateString() : '-'
  },
  {
    accessorKey: 'amount',
    header: () => h('div', { class: 'text-right' }, t('expense.amount')),
    cell: ({ row }) => h('div', { class: 'text-right font-medium' }, `$${Number(row.original.amount || 0).toFixed(2)}`)
  },
  {
    accessorKey: 'category',
    header: t('expense.category'),
    cell: ({ row }) => {
      const colors: Record<string, any> = {
        purchase: 'info',
        salary: 'success',
        utility: 'warning',
        rent: 'primary',
        equipment: 'secondary',
        other: 'neutral'
      }
      return h(resolveComponent('UBadge'), {
        label: row.original.category || 'other',
        color: colors[row.original.category] || 'neutral',
        variant: 'subtle'
      })
    }
  },
  {
    accessorKey: 'description',
    header: t('expense.description')
  },
  {
    accessorKey: 'paymentMethod',
    header: t('expense.paymentMethod')
  },
  {
    accessorKey: 'referenceId',
    header: t('expense.reference')
  },
  {
    id: 'actions',
    header: () => h('div', { class: 'text-right' }, t('common.actions')),
    cell: ({ row }) => {
      const items = [
        {
          label: 'Edit',
          icon: 'i-lucide-pencil',
          onSelect: () => editExpense(row.original)
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

const isAddModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const isDeleting = ref(false)
const selectedExpense = ref<any>(null)

function editExpense(expense: any) {
  selectedExpense.value = expense
  isAddModalOpen.value = true
}

function confirmDelete(expense: any) {
  selectedExpense.value = expense
  isDeleteModalOpen.value = true
}

async function handleDelete() {
  if (!selectedExpense.value) return
  isDeleting.value = true
  try {
    await $api(`/expenses/${selectedExpense.value._id}`, { method: 'DELETE' })
    toast.add({ title: 'Success', description: 'Expense deleted successfully', color: 'success' })
    refresh()
    refreshSummary()
    isDeleteModalOpen.value = false
  } catch (error: any) {
    toast.add({ title: 'Error', description: error.data?.message || 'Failed to delete expense', color: 'error' })
  } finally {
    isDeleting.value = false
    selectedExpense.value = null
  }
}

function openAddModal() {
  selectedExpense.value = null
  isAddModalOpen.value = true
}

function handleSuccess() {
  refresh()
  refreshSummary()
}

function onAddModalClose(open: boolean) {
  if (!open) {
    selectedExpense.value = null
  }
}

function resetFilters() {
  selectedCategory.value = undefined
  startDate.value = ''
  endDate.value = ''
}

watch([selectedCategory, startDate, endDate], () => {
  page.value = 1
})

const fileInput = ref<HTMLInputElement | null>(null)

async function exportToExcelFile() {
  if (!import.meta.client) return

  const allResult = await $api<{ data: any[] }>('/expenses', {
    params: {
      category: selectedCategory.value,
      startDate: startDate.value,
      endDate: endDate.value,
      limit: 100000,
      skip: 0
    }
  })
  const allExpenses = allResult?.data || []

  const headers = [
    { header: 'ID', key: 'id', width: 25 },
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Amount', key: 'amount', width: 15 },
    { header: 'Category', key: 'category', width: 15 },
    { header: 'Description', key: 'description', width: 30 },
    { header: 'Payment Method', key: 'paymentMethod', width: 20 },
    { header: 'Reference', key: 'referenceId', width: 20 },
    { header: 'Notes', key: 'notes', width: 30 }
  ]

  const data = allExpenses.map((e: any) => ({
    id: e._id || '',
    date: e.date ? new Date(e.date).toISOString().split('T')[0] : '',
    amount: e.amount || 0,
    category: e.category || 'other',
    description: e.description || '',
    paymentMethod: e.paymentMethod || '',
    referenceId: e.referenceId || '',
    notes: e.notes || ''
  }))

  const XLSX = await import('xlsx')
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Expenses')
  XLSX.writeFile(workbook, 'Expenses_Export.xlsx')
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

      const payload = {
        date: rowData['Date'] ? new Date(rowData['Date']) : new Date(),
        amount: Number(rowData['Amount'] || 0),
        category: rowData['Category'] || 'other',
        description: rowData['Description'] || '',
        paymentMethod: rowData['Payment Method'] || '',
        referenceId: rowData['Reference'] || '',
        notes: rowData['Notes'] || ''
      }

      if (existingId) {
        await $api(`/expenses/${existingId}`, { method: 'PUT', body: payload })
      } else {
        await $api('/expenses', { method: 'POST', body: payload })
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
  refreshSummary()
  if (fileInput.value) fileInput.value.value = ''
}

function printReport() {
  const query = new URLSearchParams()
  if (selectedCategory.value) query.append('category', selectedCategory.value)
  if (startDate.value) query.append('startDate', startDate.value)
  if (endDate.value) query.append('endDate', endDate.value)
  if (searchQuery.value) query.append('q', searchQuery.value)

  window.open(`/print/expense-report?${query.toString()}`, '_blank')
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <UBreadcrumb :items="[{ label: t('nav.home'), to: '/' }, { label: t('expense.title') }]" />
      <UButton
        icon="i-lucide-plus"
        :label="t('common.addNew')"
        color="primary"
        @click="openAddModal"
      />
    </div>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <UCard>
        <template #header>
          <h3 class="text-sm font-medium text-gray-500">
            {{ t('expense.grandTotal') }}
          </h3>
        </template>
        <p class="text-2xl font-bold text-red-600">
          ${{ grandTotal.toFixed(2) }}
        </p>
      </UCard>
    </div>

    <UCard>
      <template #header>
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold">
              {{ t('expense.list') }}
            </h2>
          </div>
          <div class="flex items-center gap-2">
            <UInput
              v-model="searchQuery"
              :placeholder="t('expense.search')"
              icon="i-lucide-search"
              class="flex-1"
            />
            <USelectMenu
              v-model="selectedCategory"
              :items="categoryOptions"
              value-key="value"
              class="w-40"
              :placeholder="t('expense.category')"
              clearable
            />
            <UInput
              v-model="startDate"
              type="date"
              class="w-40"
              :placeholder="t('common.startDate')"
            />
            <UInput
              v-model="endDate"
              type="date"
              class="w-40"
              :placeholder="t('common.endDate')"
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
              <UButton
                icon="i-lucide-printer"
                :label="t('common.print')"
                color="neutral"
                variant="outline"
                @click="printReport"
              />
            </div>
          </div>
        </div>
      </template>

      <div class="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-lg">
        <UTable
          :columns="columns"
          :data="expenses"
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

    <ExpenseAddModal v-model:open="isAddModalOpen" :expense="selectedExpense" @success="handleSuccess" />
    <UModal v-model:open="isDeleteModalOpen" title="Confirm Delete">
      <template #body>
        <p>Are you sure you want to delete this expense record?</p>
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
