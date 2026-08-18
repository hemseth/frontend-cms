<script setup lang="ts">
import { ref, computed, h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'

const { t } = useI18n()
const toast = useToast()
const searchQuery = ref('')
const isModalOpen = ref(false)
const selectedBranch = ref<any>(null)
const isDeleting = ref(false)
const isDeleteModalOpen = ref(false)
const page = ref(1)
const limit = ref(20)

// Get user's clinic ID
const { clinicId, user } = useAuth()
const isDeveloper = computed(() => user.value?.role === 'developer')
const selectedClinicId = ref<string | null>(clinicId.value || null)
const { data: clinicsResult } = await useAsyncData('developer-clinics', () =>
  isDeveloper.value ? $api('/clinics', { params: { limit: 100, skip: 0 } }) : Promise.resolve({ data: [] })
)
const clinicOptions = computed(() => ((clinicsResult.value as any)?.data || []).map((clinic: any) => ({
  label: clinic.nameKh || clinic.name,
  value: clinic._id
})))
const modalClinicId = computed(() => {
  const branchClinic = selectedBranch.value?.clinicId
  return (typeof branchClinic === 'object' ? branchClinic?._id : branchClinic) || selectedClinicId.value || clinicId.value
})

const { data: result, status, refresh } = await useAsyncData('branches', () =>
  $api<{ data: any[], total: number }>(selectedClinicId.value ? `/branches/clinic/${selectedClinicId.value}` : '/branches', {
    params: {
      search: searchQuery.value,
      limit: limit.value,
      skip: (page.value - 1) * limit.value
    }
  }), {
  watch: [searchQuery, selectedClinicId, page, limit],
  default: () => ({ data: [], total: 0 })
})

const branches = computed(() => (result.value as any)?.data || [])
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
    accessorKey: 'code',
    header: 'Code'
  },
  {
    accessorKey: 'name',
    header: 'Name (EN)'
  },
  {
    accessorKey: 'nameKh',
    header: 'Name (KH)'
  },
  {
    accessorKey: 'address',
    header: 'Address'
  },
  {
    accessorKey: 'phone',
    header: 'Phone'
  },
  {
    accessorKey: 'isMain',
    header: 'Main Branch',
    cell: ({ row }) => {
      return h(resolveComponent('UBadge'), {
        label: row.original.isMain ? 'Yes' : 'No',
        color: row.original.isMain ? 'success' : 'neutral',
        variant: 'subtle'
      })
    }
  },
  {
    accessorKey: 'isActive',
    header: 'Status',
    cell: ({ row }) => {
      return h(resolveComponent('UBadge'), {
        label: row.original.isActive ? 'Active' : 'Inactive',
        color: row.original.isActive ? 'success' : 'error',
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
          onSelect: () => editBranch(row.original)
        },
        {
          label: 'Set as Main',
          icon: 'i-lucide-star',
          onSelect: () => setAsMain(row.original)
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

function editBranch(branch: any) {
  selectedBranch.value = branch
  isModalOpen.value = true
}

function openAddModal() {
  if (isDeveloper.value && !selectedClinicId.value) {
    toast.add({ title: 'Select a clinic', description: 'Choose the clinic that will own the new branch.', color: 'warning' })
    return
  }
  selectedBranch.value = null
  isModalOpen.value = true
}

function confirmDelete(branch: any) {
  selectedBranch.value = branch
  isDeleteModalOpen.value = true
}

async function handleDelete() {
  if (!selectedBranch.value) return
  isDeleting.value = true
  try {
    await $api(`/branches/${selectedBranch.value._id}`, { method: 'DELETE' })
    toast.add({ title: 'Success', description: 'Branch deleted', color: 'success' })
    refresh()
    isDeleteModalOpen.value = false
  } catch (error: any) {
    toast.add({ title: 'Error', description: error.data?.message || 'Failed to delete', color: 'error' })
  } finally {
    isDeleting.value = false
    selectedBranch.value = null
  }
}

async function setAsMain(branch: any) {
  try {
    await $api(`/branches/${branch._id}/set-main`, { method: 'POST' })
    toast.add({ title: 'Success', description: 'Main branch updated', color: 'success' })
    refresh()
  } catch (error: any) {
    toast.add({ title: 'Error', description: error.data?.message || 'Failed to set main branch', color: 'error' })
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

  const allResult = await $api<{ data: any[] }>(`/branches/clinic/${clinicId.value}`, {
    params: { search: searchQuery.value, limit: 100000, skip: 0 }
  })
  const allBranches = allResult?.data || []

  const headers = [
    { header: 'ID', key: 'id', width: 25 },
    { header: 'Code', key: 'code', width: 12 },
    { header: 'Name (EN)', key: 'name', width: 20 },
    { header: 'Name (KH)', key: 'nameKh', width: 20 },
    { header: 'Address', key: 'address', width: 30 },
    { header: 'Phone', key: 'phone', width: 15 },
    { header: 'Email', key: 'email', width: 20 },
    { header: 'Manager', key: 'manager', width: 20 },
    { header: 'Main Branch', key: 'isMain', width: 12 },
    { header: 'Status', key: 'status', width: 10 }
  ]

  const data = allBranches.map((b: any) => ({
    id: b._id || '',
    code: b.code || '',
    name: b.name || '',
    nameKh: b.nameKh || '',
    address: b.address || '',
    phone: b.phone || '',
    email: b.email || '',
    manager: b.manager || '',
    isMain: b.isMain ? 'Yes' : 'No',
    status: b.isActive ? 'Active' : 'Inactive'
  }))

  const XLSX = await import('xlsx')
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Branches')
  XLSX.writeFile(workbook, 'Branches_Export.xlsx')
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
        clinicId: clinicId.value,
        code: rowData['Code'] || '',
        name: rowData['Name (EN)'] || '',
        nameKh: rowData['Name (KH)'] || '',
        address: rowData['Address'] || '',
        phone: rowData['Phone'] || '',
        email: rowData['Email'] || undefined,
        manager: rowData['Manager'] || '',
        isActive: String(rowData['Status'] || 'Active').toLowerCase() !== 'inactive'
      }

      const existingId = rowData['ID'] ? String(rowData['ID']).trim() : ''
      if (existingId) {
        await $api(`/branches/${existingId}`, { method: 'PUT', body: payload })
      } else {
        await $api('/branches', { method: 'POST', body: payload })
      }
      successCount++
    } catch (err) {
      console.error('Import error:', err)
      errorCount++
    }
  }

  toast.add({
    title: 'Import Result',
    description: `Successfully imported ${successCount} branches.${errorCount ? ` ${errorCount} failed.` : ''}`,
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
        :items="[{ label: t('nav.home'), to: '/' }, { label: t('settings.title'), to: '/settings' }, { label: 'Branches' }]" />
      <UButton icon="i-lucide-plus" label="Add Branch" @click="openAddModal" />
    </div>

    <UCard>
      <template #header>
        <div class="flex flex-col gap-4">
          <USelectMenu v-if="isDeveloper" v-model="selectedClinicId" :items="clinicOptions" value-key="value"
            label-key="label" placeholder="All clinics" class="w-full md:w-72" clearable />
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold flex items-center gap-2">
              <UIcon name="i-lucide-git-branch" />
              Branches Management
            </h2>
          </div>

          <div class="flex items-center gap-2">
            <UInput v-model="searchQuery" placeholder="Search branches..." icon="i-lucide-search" class="flex-1" />
            <UButton color="error" variant="outline" icon="i-lucide-rotate-ccw" :label="t('common.reset')"
              @click="resetFilters" />
            <input ref="fileInput" type="file" accept=".xlsx,.xls" class="hidden" @change="handleImport" />
            <UButton icon="i-lucide-download" :label="t('common.export')" color="neutral" variant="outline"
              @click="exportToExcelFile" />
            <UButton icon="i-lucide-upload" :label="t('common.import')" color="neutral" variant="outline"
              @click="triggerImport" />
          </div>
        </div>
      </template>

      <div class="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-lg">
        <UTable :columns="columns" :data="branches" :loading="status === 'pending'" class="w-full" :ui="{
          td: 'py-1 px-4 text-sm',
          th: 'py-1.5 px-4 font-semibold text-sm bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 text-left'
        }" />
      </div>

      <template #footer>
        <div v-if="branches.length === 0 && status !== 'pending'" class="text-center py-8">
          <UIcon name="i-lucide-git-branch" class="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p class="text-gray-500">
            No branches found. Add your first branch!
          </p>
        </div>
        <div v-else class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2 text-sm text-gray-500">
              {{ t('pagination.perPage') }}:
              <USelectMenu v-model="limit" :items="[10, 20, 50, 100]" class="w-20" />
            </div>
            <span class="text-sm text-gray-500">Total: {{ total }}</span>
          </div>
          <div class="flex gap-2">
            <UButton label="Back" icon="i-lucide-chevron-left" :disabled="!hasPrevPage" @click="page--" />
            <UButton label="Next" trailing-icon="i-lucide-chevron-right" :disabled="!hasNextPage" @click="page++" />
          </div>
        </div>
      </template>
    </UCard>

    <SettingsBranchModal v-model:open="isModalOpen" :branch="selectedBranch" :clinic-id="modalClinicId"
      @success="refresh" />

    <UModal v-model:open="isDeleteModalOpen" title="Confirm Delete">
      <template #body>
        <p>Are you sure you want to delete <strong>{{ selectedBranch?.name }}</strong>?</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Cancel" color="neutral" variant="subtle" @click="isDeleteModalOpen = false" />
          <UButton label="Delete" color="error" :loading="isDeleting" @click="handleDelete" />
        </div>
      </template>
    </UModal>
  </div>
</template>
