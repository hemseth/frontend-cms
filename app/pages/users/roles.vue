<script setup lang="ts">
import { ref, computed, watch, h, resolveComponent, onActivated } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from '#imports'

const { t } = useI18n()
const toast = useToast()

// Roles State
const isRoleModalOpen = ref(false)
const selectedRole = ref<any>(null)
const page = ref(1)

const pageSizes = [10, 20, 50, 100]
const pageCount = ref(10)
const search = ref('')

const auth = useAuth()
const rolesKey = computed(() => `roles-list-${auth.user.value?.id || 'anonymous'}-${auth.clinicId.value || 'platform'}`)
const { data: rolesResult, refresh: refreshRoles, status, error } = await useAsyncData(rolesKey,
  () => $api(`/roles?limit=${pageCount.value}&skip=${(page.value - 1) * pageCount.value}&search=${search.value}`),
  { watch: [page, search, pageCount], getCachedData: () => undefined }
)
onActivated(() => refreshRoles())

const rows = computed(() => {
  const res = rolesResult.value as any
  // Handle array response (legacy) or object response with data property
  if (Array.isArray(res)) return res
  return res?.data || []
})

const total = computed(() => {
  const res = rolesResult.value as any
  return res?.total || 0
})

watch([search, pageCount], () => {
  page.value = 1
})

const mainColumns = computed(() => [
  {
    id: 'rowNum',
    header: t('common.number'),
    cell: ({ row }: any) => (page.value - 1) * pageCount.value + row.index + 1
  },
  { accessorKey: 'roleId', header: 'ID' },
  { accessorKey: 'nameKh', header: t('common.nameKh') },
  { accessorKey: 'nameEn', header: t('common.nameEn') },
  { accessorKey: 'roleSlug', header: 'Slug' },
  {
    id: 'actions',
    header: t('common.actions'),
    cell: ({ row }: any) => {
      const items = [
        { label: t('common.edit'), icon: 'i-lucide-pencil', onSelect: () => openEditRole(row.original) },
        { type: 'separator' },
        { label: t('common.delete'), icon: 'i-lucide-trash', color: 'error' as const, onSelect: () => openDeleteRole(row.original) }
      ]
      return h(resolveComponent('UDropdownMenu'), {
        items: [items],
        onSelect: (item: any) => item.onSelect?.()
      }, {
        default: () => h(resolveComponent('UButton'), { icon: 'i-lucide-ellipsis-vertical', color: 'gray', variant: 'ghost' })
      })
    }
  }
])

function resetFilters() {
  search.value = ''
  pageCount.value = 10
  page.value = 1
}

function openAddRole() {
  selectedRole.value = undefined
  isRoleModalOpen.value = true
}

function openEditRole(row: any) {
  selectedRole.value = row
  isRoleModalOpen.value = true
}

const isDeleteModalOpen = ref(false)
const roleToDelete = ref<any>(null)

function openDeleteRole(row: any) {
  roleToDelete.value = row
  isDeleteModalOpen.value = true
}

function getDropdownItems(row: any) {
  return [
    [{
      label: t('common.edit'),
      icon: 'i-lucide-pencil',
      click: () => openEditRole(row)
    }, {
      label: t('common.delete'),
      icon: 'i-lucide-trash',
      click: () => openDeleteRole(row)
    }]
  ]
}
</script>

<template>
  <div class="w-full space-y-4 px-3 py-4 sm:px-5 lg:px-8">
    <!-- Breadcrumb -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <UBreadcrumb :items="[{ label: t('nav.home'), to: '/' }, { label: t('settings.roles') }]" />
      <UButton icon="i-lucide-plus" :label="t('settings.addRole')" class="justify-center" @click="openAddRole" />
    </div>

    <!-- Title and Action -->

    <UCard :ui="{ body: 'p-0', header: 'p-4' }">
      <!-- Filter Section -->
      <div class="flex flex-col sm:flex-row sm:items-center gap-2 p-4 border-b border-gray-200 dark:border-gray-700">
        <div class="flex-1">
          <UInput
            v-model="search"
            icon="i-heroicons-magnifying-glass-20-solid"
            :placeholder="t('common.search')"
            size="md"
            class="w-full"
          />
        </div>
        <!-- <USelectMenu placeholder="តួនាទី" class="w-40" /> -->
        <!-- Reset Button -->
        <UButton
          icon="i-heroicons-arrow-path"
          color="error"
          variant="soft"
          :label="t('common.reset')"
          @click="resetFilters"
        />
      </div>

      <!-- Table -->
      <UTable
        :columns="mainColumns"
        :data="rows"
        :loading="status === 'pending'"
        class="hidden md:block w-full"
        :ui="{
          td: 'py-3 px-4 text-sm',
          th: 'py-3 px-4 font-semibold text-sm bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 text-left',
          root: 'border-t border-gray-200 dark:border-gray-700'
        }"
      >
        <template #rowNum-cell="{ row }">
          <span>{{ (page - 1) * pageCount + row.index + 1 }}</span>
        </template>
      </UTable>

      <div class="md:hidden divide-y divide-default">
        <div v-if="status === 'pending'" class="p-6 text-center text-muted">Loading...</div>
        <article v-for="(role, index) in rows" :key="role._id || role.roleId" class="p-4 space-y-3">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <UBadge color="neutral" variant="soft">#{{ (page - 1) * Number(pageCount) + Number(index) + 1 }}</UBadge>
                <h3 class="font-semibold truncate">{{ role.nameKh || role.nameEn }}</h3>
              </div>
              <p class="mt-1 text-sm text-muted">{{ role.nameEn }}</p>
            </div>
            <UBadge :color="role.isSystemRole ? 'primary' : 'neutral'" variant="soft">
              {{ role.isSystemRole ? 'System' : 'Clinic' }}
            </UBadge>
          </div>
          <dl class="grid grid-cols-2 gap-3 text-sm">
            <div><dt class="text-muted">Role ID</dt><dd class="font-medium">{{ role.roleId }}</dd></div>
            <div><dt class="text-muted">Slug</dt><dd class="font-medium break-all">{{ role.roleSlug }}</dd></div>
            <div class="col-span-2"><dt class="text-muted">Permissions</dt><dd class="font-medium">{{ role.permissions?.length || 0 }}</dd></div>
          </dl>
          <div class="grid grid-cols-2 gap-2 pt-1">
            <UButton icon="i-lucide-pencil" :label="t('common.edit')" color="neutral" variant="soft" class="justify-center" @click="openEditRole(role)" />
            <UButton icon="i-lucide-trash" :label="t('common.delete')" color="error" variant="soft" class="justify-center" @click="openDeleteRole(role)" />
          </div>
        </article>
        <div v-if="status !== 'pending' && rows.length === 0" class="p-8 text-center text-muted">No roles found</div>
      </div>

      <!-- Footer -->
      <template #footer>
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm text-gray-500">{{ t('pagination.perPage') }}:</span>
            <USelectMenu
              v-model="pageCount"
              :options="pageSizes"
              class="w-20"
              size="sm"
              :ui-menu="{ width: 'w-20' }"
            />
            <span class="text-sm text-gray-500 ml-2">Total: {{ total }}</span>
          </div>

          <div class="flex gap-2">
            <!-- Custom Pagination Buttons if needed, or just UPagination -->
            <UPagination
              v-model="page"
              :page-count="pageCount"
              :total="total"
              :prev-button="{ icon: 'i-heroicons-chevron-left-20-solid', label: 'Back', color: 'primary' }"
              :next-button="{ icon: 'i-heroicons-chevron-right-20-solid', trailing: true, label: 'Next', color: 'primary' }"
            />
          </div>
        </div>
      </template>
    </UCard>

    <UsersRolesRoleModal v-model:open="isRoleModalOpen" :role="selectedRole" @success="refreshRoles" />

    <UsersRolesRoleDeleteModal v-model:open="isDeleteModalOpen" :role="roleToDelete" @success="refreshRoles" />
  </div>
</template>
