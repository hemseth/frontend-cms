<script setup lang="ts">
import { ref, computed, h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import PayrollAddModal from '~/components/payrolls/AddModal.vue'

const { t } = useI18n()
const toast = useToast()

const searchQuery = ref('')
const selectedPeriod = ref('')
const selectedStatus = ref<string | undefined>()
const page = ref(1)
const limit = ref(20)

// Generate period options (last 12 months)
const periodOptions = computed(() => {
  const periods = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    periods.push({ label, value })
  }
  return periods
})

// Default to current month
selectedPeriod.value = periodOptions.value[0]?.value || ''

const { data: staffResponse, status } = await useAsyncData('payroll-staff-list', () =>
  $api<{ data: { data: any[], total: number } }>('/staff', {
    params: {
      limit: limit.value,
      skip: (page.value - 1) * limit.value,
      search: searchQuery.value
    }
  }), { watch: [page, limit, searchQuery], default: () => ({ data: { data: [], total: 0 } }) }
)

const staffList = computed(() => staffResponse.value?.data?.data || [])
const total = computed(() => staffResponse.value?.data?.total || 0)
const hasNextPage = computed(() => total.value > page.value * limit.value)
const hasPrevPage = computed(() => page.value > 1)

const { data: periodPayrollsData, refresh: refreshPeriodPayrolls } = await useAsyncData('period-payrolls', () =>
  $api<{ data: any[] }>('/payrolls', {
    params: {
      period: selectedPeriod.value,
      limit: 1000
    }
  }), { watch: [selectedPeriod], default: () => ({ data: [] }) }
)

const periodPayrolls = computed(() => (periodPayrollsData.value as any)?.data || [])

const payrolls = computed(() => {
  return staffList.value.map((staff: any) => {
    const existing = periodPayrolls.value.find((p: any) =>
      p.staffId === staff._id
      || (p.staff && p.staff._id === staff._id)
      || p.staff === staff._id
    )

    if (existing) return existing

    const name = staff.nameEn || staff.nameKh || staff.name
    return {
      _id: null,
      staffId: staff._id,
      staffName: name,
      baseSalary: staff.baseSalary || 0,
      positionAllowance: staff.positionAllowance || 0,
      transportAllowance: staff.transportAllowance || 0,
      housingAllowance: staff.housingAllowance || 0,
      otherAllowances: staff.otherAllowances || 0,
      overtime: 0,
      bonus: 0,
      grossSalary: staff.baseSalary || 0,
      taxAmount: 0,
      totalDeductions: 0,
      netSalary: staff.baseSalary || 0,
      status: 'unpaid'
    }
  })
})

function refresh() {
  refreshPeriodPayrolls()
}

const { data: summaryResult, refresh: refreshSummary } = await useAsyncData('payrolls-summary', () =>
  $api('/payrolls/summary', {
    params: { period: selectedPeriod.value }
  }), {
  watch: [selectedPeriod],
  default: () => ({ data: {} })
}
)

const totalNet = computed(() => {
  const summary = (summaryResult.value as any)?.data || {}
  const paid = summary.paid || {}
  return paid.totalNet || 0
})

const columns: TableColumn<any>[] = [
  {
    accessorKey: 'no',
    header: t('common.number'),
    cell: ({ row }) => (page.value - 1) * limit.value + row.index + 1
  },
  {
    accessorKey: 'staffName',
    header: t('payroll.staffName')
  },
  {
    accessorKey: 'baseSalary',
    header: t('payroll.baseSalary'),
    cell: ({ row }) => `$${Number(row.original.baseSalary || 0).toFixed(2)}`
  },
  {
    accessorKey: 'allowances',
    header: t('payroll.allowances'),
    cell: ({ row: r }) => {
      const total = (r.original.positionAllowance || 0) + (r.original.transportAllowance || 0) + (r.original.housingAllowance || 0) + (r.original.otherAllowances || 0)
      return `$${total.toFixed(2)}`
    }
  },
  {
    accessorKey: 'bonus',
    header: t('payroll.bonus'),
    cell: ({ row }) => `$${Number(row.original.bonus || 0).toFixed(2)}`
  },
  {
    accessorKey: 'grossSalary',
    header: t('payroll.grossSalary'),
    cell: ({ row }) => `$${Number(row.original.grossSalary || 0).toFixed(2)}`
  },
  {
    accessorKey: 'taxAmount',
    header: t('payroll.tax'),
    cell: ({ row }) => `$${Number(row.original.taxAmount || 0).toFixed(2)}`
  },
  {
    accessorKey: 'deductions',
    header: t('payroll.deductions'),
    cell: ({ row }) => `$${Number(row.original.totalDeductions || 0).toFixed(2)}`
  },
  {
    accessorKey: 'netSalary',
    header: t('payroll.netSalary'),
    cell: ({ row }) => {
      const net = Number(row.original.netSalary || 0)
      return h('span', { class: 'font-semibold text-green-600' }, `$${net.toFixed(2)}`)
    }
  },
  {
    accessorKey: 'status',
    header: t('common.status'),
    cell: ({ row }) => {
      const colors: Record<string, any> = {
        unpaid: 'neutral',
        draft: 'neutral',
        calculated: 'info',
        approved: 'warning',
        paid: 'success'
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
    header: t('common.actions'),
    cell: ({ row }) => {
      const isUnpaid = !row.original._id

      if (isUnpaid) {
        return h(resolveComponent('UButton'), {
          label: t('payroll.addSalary') || 'Add Salary',
          size: 'xs',
          color: 'primary',
          variant: 'soft',
          icon: 'i-lucide-plus',
          onClick: () => editPayroll(row.original)
        })
      }

      const items = [
        {
          label: 'Edit',
          icon: 'i-lucide-pencil',
          onSelect: () => editPayroll(row.original)
        },
        {
          type: 'separator'
        },
        {
          label: 'Approve',
          icon: 'i-lucide-check-circle',
          onSelect: () => updateStatus(row.original, 'approved')
        },
        {
          label: 'Mark Paid',
          icon: 'i-lucide-credit-card',
          onSelect: () => markPaid(row.original)
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
const isPayModalOpen = ref(false)
const selectedPayroll = ref<any>(null)

function editPayroll(payroll: any) {
  selectedPayroll.value = payroll
  isAddModalOpen.value = true
}

function confirmDelete(payroll: any) {
  selectedPayroll.value = payroll
  isDeleteModalOpen.value = true
}

function markPaid(payroll: any) {
  selectedPayroll.value = payroll
  isPayModalOpen.value = true
}

async function handleDelete() {
  if (!selectedPayroll.value) return
  isDeleting.value = true
  try {
    await $api(`/payrolls/${selectedPayroll.value._id}`, { method: 'DELETE' })
    toast.add({ title: 'Success', description: 'Payroll deleted successfully', color: 'success' })
    refresh()
    refreshSummary()
    isDeleteModalOpen.value = false
  } catch (error: any) {
    toast.add({ title: 'Error', description: error.data?.message || 'Failed to delete payroll', color: 'error' })
  } finally {
    isDeleting.value = false
    selectedPayroll.value = null
  }
}

async function updateStatus(payroll: any, status: string) {
  try {
    await $api(`/payrolls/${payroll._id}/status`, {
      method: 'PATCH',
      body: { status }
    })
    toast.add({ title: 'Success', description: `Payroll ${status} successfully`, color: 'success' })
    refresh()
    refreshSummary()
  } catch (error: any) {
    toast.add({ title: 'Error', description: error.data?.message || 'Failed to update status', color: 'error' })
  }
}

async function handlePay() {
  if (!selectedPayroll.value) return
  try {
    await $api(`/payrolls/${selectedPayroll.value._id}/status`, {
      method: 'PATCH',
      body: {
        status: 'paid',
        paymentDate: new Date().toISOString(),
        paymentMethod: 'bank_transfer'
      }
    })
    toast.add({ title: 'Success', description: 'Marked as paid', color: 'success' })
    refresh()
    refreshSummary()
    isPayModalOpen.value = false
  } catch (error: any) {
    toast.add({ title: 'Error', description: error.data?.message || 'Failed to process payment', color: 'error' })
  }
}

function openAddModal() {
  selectedPayroll.value = null
  isAddModalOpen.value = true
}

function handleSuccess() {
  refresh()
  refreshSummary()
}

watch([selectedPeriod, selectedStatus, searchQuery], () => {
  page.value = 1
})

const fileInput = ref<HTMLInputElement | null>(null)

async function exportToExcelFile() {
  if (!import.meta.client) return

  const [year, month] = selectedPeriod.value.split('-').map(Number)

  const allStaffResult = await $api<{ data: { data: any[] } }>('/staff', {
    params: { limit: 100000, skip: 0, search: searchQuery.value }
  })
  const allStaff = allStaffResult?.data?.data || []
  const allPayrolls = allStaff.map((staff: any) => {
    const existing = periodPayrolls.value.find((p: any) =>
      p.staffId === staff._id
      || (p.staff && p.staff._id === staff._id)
      || p.staff === staff._id
    )
    if (existing) return existing
    const name = staff.nameEn || staff.nameKh || staff.name
    return {
      _id: null,
      staffId: staff._id,
      staffName: name,
      baseSalary: staff.baseSalary || 0,
      positionAllowance: staff.positionAllowance || 0,
      transportAllowance: staff.transportAllowance || 0,
      housingAllowance: staff.housingAllowance || 0,
      otherAllowances: staff.otherAllowances || 0,
      overtime: 0,
      bonus: 0
    }
  })

  const headers = [
    { header: 'ID', key: 'id', width: 25 },
    { header: 'Staff ID', key: 'staffId', width: 25 },
    { header: 'Staff Name', key: 'staffName', width: 25 },
    { header: 'Period', key: 'period', width: 15 },
    { header: 'Year', key: 'year', width: 10 },
    { header: 'Month', key: 'month', width: 10 },
    { header: 'Base Salary', key: 'baseSalary', width: 15 },
    { header: 'Position Allowance', key: 'positionAllowance', width: 18 },
    { header: 'Transport Allowance', key: 'transportAllowance', width: 18 },
    { header: 'Housing Allowance', key: 'housingAllowance', width: 18 },
    { header: 'Other Allowances', key: 'otherAllowances', width: 18 },
    { header: 'Overtime', key: 'overtime', width: 10 },
    { header: 'Bonus', key: 'bonus', width: 10 },
    { header: 'Absence Deduction', key: 'absenceDeduction', width: 18 },
    { header: 'Late Deduction', key: 'lateDeduction', width: 15 },
    { header: 'Other Deductions', key: 'otherDeductions', width: 18 },
    { header: 'Notes', key: 'notes', width: 30 }
  ]

  const data = allPayrolls.map((p: any) => ({
    id: p._id || '',
    staffId: p.staffId,
    staffName: p.staffName,
    period: selectedPeriod.value,
    year: p.year || year,
    month: p.month || month,
    baseSalary: p.baseSalary,
    positionAllowance: p.positionAllowance,
    transportAllowance: p.transportAllowance,
    housingAllowance: p.housingAllowance,
    otherAllowances: p.otherAllowances,
    overtime: p.overtime,
    bonus: p.bonus,
    absenceDeduction: p.absenceDeduction || 0,
    lateDeduction: p.lateDeduction || 0,
    otherDeductions: p.otherDeductions || 0,
    notes: p.notes || ''
  }))

  const XLSX = await import('xlsx')
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Payroll')
  XLSX.writeFile(workbook, `Payroll_${selectedPeriod.value}.xlsx`)
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
      const periodStr = rowData['Period'] || selectedPeriod.value
      const [year, month] = periodStr.split('-').map(Number)

      const payload = {
        staffId: rowData['Staff ID'],
        period: periodStr,
        year,
        month,
        baseSalary: Number(rowData['Base Salary'] || 0),
        positionAllowance: Number(rowData['Position Allowance'] || 0),
        transportAllowance: Number(rowData['Transport Allowance'] || 0),
        housingAllowance: Number(rowData['Housing Allowance'] || 0),
        otherAllowances: Number(rowData['Other Allowances'] || 0),
        overtime: Number(rowData['Overtime'] || 0),
        bonus: Number(rowData['Bonus'] || 0),
        absenceDeduction: Number(rowData['Absence Deduction'] || 0),
        lateDeduction: Number(rowData['Late Deduction'] || 0),
        otherDeductions: Number(rowData['Other Deductions'] || 0),
        notes: rowData['Notes'] || ''
      }

      const existingId = rowData['ID'] ? String(rowData['ID']).trim() : ''
      if (existingId) {
        await $api(`/payrolls/${existingId}`, { method: 'PUT', body: payload })
      } else {
        await $api('/payrolls', { method: 'POST', body: payload })
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
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <UBreadcrumb :items="[{ label: t('nav.home'), to: '/' }, { label: t('payroll.title') }]" />
      <UButton icon="i-lucide-plus" :label="t('common.addNew')" @click="openAddModal" />
    </div>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <UCard>
        <template #header>
          <h3 class="text-sm font-medium text-gray-500">
            {{ t('payroll.totalPaid') }}
          </h3>
        </template>
        <p class="text-2xl font-bold text-green-600">
          ${{ totalNet.toFixed(2) }}
        </p>
      </UCard>
    </div>

    <UCard>
      <template #header>
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold">
              {{ t('payroll.list') }}
            </h2>
          </div>
          <div class="flex items-center gap-2">
            <UInput
              v-model="searchQuery"
              :placeholder="t('common.search')"
              icon="i-lucide-search"
              class="flex-1"
            />
            <USelectMenu
              v-model="selectedPeriod"
              :items="periodOptions"
              value-key="value"
              class="w-40"
              :placeholder="t('payroll.period')"
            />
            <div class="flex gap-2">
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
          :data="payrolls"
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

    <PayrollAddModal
      v-model:open="isAddModalOpen"
      :payroll="selectedPayroll"
      :period="selectedPeriod"
      @success="handleSuccess"
    />

    <UModal v-model:open="isDeleteModalOpen" title="Confirm Delete">
      <template #body>
        <p>Are you sure you want to delete payroll record for <strong>{{ selectedPayroll?.staffName }}</strong>?</p>
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

    <UModal v-model:open="isPayModalOpen" title="Confirm Payment">
      <template #body>
        <p>Mark this payroll as paid via bank transfer?</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            @click="isPayModalOpen = false"
          />
          <UButton label="Confirm Payment" color="success" @click="handlePay" />
        </div>
      </template>
    </UModal>
  </div>
</template>
