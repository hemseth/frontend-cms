<script setup lang="ts">
import { ref, computed, h, resolveComponent, watch } from 'vue'
import type { TableColumn } from '@nuxt/ui'

const { t } = useI18n()
const toast = useToast()
const { locale } = useI18n()

const searchQuery = ref('')
const page = ref(1)
const limit = ref(10)
const selectedRole = ref<string | undefined>()

// Fetch positions for filter
const { data: positionsResult } = await useAsyncData('staff-positions-filter', () => $api('/positions'), {
  default: () => ({ data: [] })
})

const roleOptions = computed(() => {
  const options = ((positionsResult.value as any)?.data || []).map((p: any) => ({
    label: locale.value === 'km' ? (p.nameKh || p.nameEn) : p.nameEn,
    value: p.nameEn
  }))
  return [{ label: t('filter.all'), value: undefined }, ...options]
})

// Fetch staff with filters
const { data: result, status, refresh } = await useAsyncData('staff-list', () =>
  $api<{ data: { data: any[], total: number } }>('/staff', {
    params: {
      search: searchQuery.value,
      role: selectedRole.value,
      limit: limit.value,
      skip: (page.value - 1) * limit.value
    }
  }), {
  watch: [searchQuery, selectedRole, page, limit],
  default: () => ({ data: { data: [], total: 0 } })
}
)

const staff = computed(() => (result.value as any)?.data?.data || [])
const total = computed(() => (result.value as any)?.data?.total || 0)
const hasNextPage = computed(() => total.value > page.value * limit.value)
const hasPrevPage = computed(() => page.value > 1)

// Fetch users for account mapping
const { data: usersResult } = await useAsyncData('staff-user-mapping', () => $api('/users', { params: { limit: 1000 } }))
const userMap = computed(() => {
  const map = new Map()
  if (usersResult.value?.data) {
    usersResult.value.data.forEach((u: any) => {
      if (u.staffId?._id || u.staffId) {
        map.set(u.staffId?._id || u.staffId, u)
      }
    })
  }
  return map
})

const columns: TableColumn<any>[] = [
  {
    accessorKey: 'no',
    header: t('common.number'),
    cell: ({ row }) => ((page.value - 1) * limit.value) + row.index + 1
  },
  {
    accessorKey: 'nameKh',
    header: t('common.nameKh')
  },
  {
    accessorKey: 'nameEn',
    header: t('common.nameEn')
  },
  {
    accessorKey: 'gender',
    header: t('staff.gender')
  },
  {
    accessorKey: 'role',
    header: t('staff.role'),
    cell: ({ row }) => {
      const roleName = row.original.role
      if (!roleName) return '-'

      // Lookup position for translation
      const positions = (positionsResult.value as any)?.data || []
      const found = positions.find((p: any) => p.nameEn === roleName)

      if (found) {
        return locale.value === 'km' ? (found.nameKh || found.nameEn) : found.nameEn
      }

      return roleName
    }
  },
  {
    accessorKey: 'specialization',
    header: t('staff.specialization'),
    cell: ({ row }) => row.original.specialization || '-'
  },
  {
    accessorKey: 'phone',
    header: t('staff.phone'),
    cell: ({ row }) => row.original.phone || '-'
  },
  {
    id: 'account',
    header: 'Account',
    cell: ({ row }) => {
      const hasAccount = userMap.value.has(row.original._id)
      if (hasAccount) {
        return h(resolveComponent('UBadge'), {
          label: 'Linked',
          color: 'success',
          variant: 'subtle',
          icon: 'i-lucide-user-check'
        })
      }
      return h(resolveComponent('UButton'), {
        label: 'Assign User',
        size: 'xs',
        variant: 'soft',
        color: 'primary',
        icon: 'i-lucide-user-plus',
        onClick: (e: Event) => {
          e.stopPropagation()
          createAccountFromStaff(row.original._id)
        }
      })
    }
  },
  {
    accessorKey: 'active',
    header: t('common.status'),
    cell: ({ row }) => {
      const isActive = row.original.active === 1
      return h(resolveComponent('UBadge'), {
        label: isActive ? t('staff.active') : t('staff.inactive'),
        color: isActive ? 'success' : 'neutral',
        variant: 'subtle'
      })
    }
  },
  {
    id: 'actions',
    header: t('common.actions'),
    cell: ({ row }) => {
      const hasAccount = userMap.value.has(row.original._id)
      const items = [
        {
          label: t('common.edit'),
          icon: 'i-lucide-pencil',
          onSelect: () => editStaff(row.original)
        },
        {
          label: 'Salary History',
          icon: 'i-lucide-dollar-sign',
          onSelect: () => viewSalary(row.original)
        },
        {
          label: hasAccount ? 'View Account' : 'Create User Account',
          icon: hasAccount ? 'i-lucide-user' : 'i-lucide-user-plus',
          onSelect: () => hasAccount ? viewAccount(row.original._id) : createAccountFromStaff(row.original._id)
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

const isAddModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const isUserModalOpen = ref(false)
const isSalaryModalOpen = ref(false)
const isDeleting = ref(false)
const selectedStaff = ref<any>(null)
const selectedStaffIdForAccount = ref<string | undefined>()

const { refresh: refreshUsers } = await useAsyncData('staff-user-mapping-refresh', () => $api('/users', { params: { limit: 1000 } }))

async function refreshUserMapping() {
  await Promise.all([refresh(), refreshUsers()])
}

function viewAccount(staffId: string) {
  const user = userMap.value.get(staffId)
  if (user) {
    navigateTo(`/users?search=${user.username}`)
  }
}

function createAccountFromStaff(staffId: string) {
  selectedStaffIdForAccount.value = staffId
  isUserModalOpen.value = true
}

function editStaff(staff: any) {
  selectedStaff.value = staff
  isAddModalOpen.value = true
}

function viewSalary(staff: any) {
  selectedStaff.value = staff
  isSalaryModalOpen.value = true
}

function confirmDelete(staff: any) {
  selectedStaff.value = staff
  isDeleteModalOpen.value = true
}

async function handleDelete() {
  if (!selectedStaff.value) return
  isDeleting.value = true
  try {
    await $api(`/staff/${selectedStaff.value._id}`, { method: 'DELETE' })
    toast.add({ title: t('common.success'), description: t('staff.deleteSuccess'), color: 'success' })
    refresh()
    isDeleteModalOpen.value = false
  } catch (error: any) {
    toast.add({ title: t('common.error'), description: error.data?.message || t('staff.deleteFailed'), color: 'error' })
  } finally {
    isDeleting.value = false
    selectedStaff.value = null
  }
}

function openAddModal() {
  selectedStaff.value = null
  isAddModalOpen.value = true
}




function handleSuccess() {
  refresh()
  isAddModalOpen.value = false
}

function onAddModalClose(open: boolean) {
  if (!open) {
    selectedStaff.value = null
  }
}

function resetFilters() {
  searchQuery.value = ''
  selectedRole.value = undefined
  page.value = 1
}

watch([searchQuery, selectedRole, limit], () => {
  page.value = 1
})

const fileInput = ref<HTMLInputElement | null>(null)

function triggerImport() {
  fileInput.value?.click()
}

async function exportToExcelFile() {
  if (!import.meta.client) return

  const allResult = await $api<{ data: { data: any[] } }>('/staff', {
    params: { search: searchQuery.value, role: selectedRole.value, limit: 100000, skip: 0 }
  })
  const allStaff = allResult?.data?.data || []

  const headers = [
    { header: 'ID', key: 'id', width: 25 },
    { header: 'Name Kh', key: 'nameKh', width: 20 },
    { header: 'Name En', key: 'nameEn', width: 20 },
    { header: 'Gender', key: 'gender', width: 10 },
    { header: 'Date of Birth', key: 'dob', width: 15 },
    { header: 'Phone', key: 'phone', width: 15 },
    { header: 'Role', key: 'role', width: 15 },
    { header: 'Specialization', key: 'specialization', width: 20 },
    { header: 'Status', key: 'status', width: 10 }
  ]

  const data = allStaff.map((s: any) => ({
    id: s._id || '',
    nameKh: s.nameKh || '',
    nameEn: s.nameEn || '',
    gender: s.gender || '',
    dob: s.dob ? new Date(s.dob).toISOString().split('T')[0] : '',
    phone: s.phone || '',
    role: s.role || 'Doctor',
    specialization: s.specialization || '',
    status: s.active === 1 ? 'active' : 'inactive'
  }))

  const XLSX = await import('xlsx')
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Staff')
  XLSX.writeFile(workbook, 'Staff_Export.xlsx')
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
        gender: rowData['Gender'] || undefined,
        dob: rowData['Date of Birth'] || undefined,
        phone: rowData['Phone'] || '',
        role: rowData['Role'] || 'Doctor',
        specialization: rowData['Specialization'] || '',
        active: String(rowData['Status'] || 'active').toLowerCase() === 'inactive' ? 0 : 1
      }

      const existingId = rowData['ID'] ? String(rowData['ID']).trim() : ''
      if (existingId) {
        await $api(`/staff/${existingId}`, { method: 'PUT', body: payload })
      } else {
        await $api('/staff', { method: 'POST', body: payload })
      }
      successCount++
    } catch (err) {
      console.error('Import error:', err)
      errorCount++
    }
  }

  toast.add({
    title: 'Import Result',
    description: `Successfully imported ${successCount} staff.${errorCount ? ` ${errorCount} failed.` : ''}`,
    color: errorCount ? 'warning' : 'success'
  })
  refresh()
  if (fileInput.value) fileInput.value.value = ''
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <UBreadcrumb :items="[{ label: t('nav.home'), to: '/' }, { label: t('staff.title') }]" />
      <UButton icon="i-lucide-plus" :label="t('common.addNew')" @click="openAddModal" />
    </div>
    <UCard :ui="{ body: 'p-0' }">
      <template #header>
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold">
              {{ t('staff.title') }}
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
              v-model="selectedRole"
              :items="roleOptions"
              value-key="value"
              label-key="label"
              class="w-48"
              :placeholder="t('staff.role')"
              clearable
            />
            <UButton
              color="error"
              variant="soft"
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
          :data="staff"
          :loading="status === 'pending'"
          class="w-full"
          :ui="{
            td: 'py-1 px-4 text-sm',
            th: 'py-1.5 px-4 font-semibold text-sm bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 text-left'
          }"
        />
      </div>

      <template #footer>
        <div class="flex items-center justify-between px-4">
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-500 whitespace-nowrap">{{ t('pagination.perPage') }}:</span>
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

    <!-- Add/Edit Staff Modal -->
    <StaffAddModal
      v-model:open="isAddModalOpen"
      :staff-member="selectedStaff"
      @save="handleSuccess"
      @update:open="onAddModalClose"
    />

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="isDeleteModalOpen" :title="t('common.confirmDelete')">
      <template #body>
        <p>{{ t('staff.deleteConfirm', { name: selectedStaff?.nameEn || selectedStaff?.nameKh || '' }) }}</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            :label="t('common.cancel')"
            color="neutral"
            variant="subtle"
            @click="isDeleteModalOpen = false"
          />
          <UButton
            :label="t('common.delete')"
            color="error"
            :loading="isDeleting"
            @click="handleDelete"
          />
        </div>
      </template>
    </UModal>

    <!-- User Account Modal -->
    <SettingsUserModal
      v-model:open="isUserModalOpen"
      :staff-id="selectedStaffIdForAccount"
      @success="refreshUserMapping"
    />

    <!-- Salary History Modal -->
    <StaffSalaryModal v-model:open="isSalaryModalOpen" :staff-member="selectedStaff" />
  </div>
</template>
