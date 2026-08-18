<script setup lang="ts">
import { ref, computed, watch, onActivated, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast, useAsyncData } from '#imports'
import { useAuth } from '~/composables/useAuth'
import type { TableColumn } from '@nuxt/ui'

const { t } = useI18n()
const toast = useToast()
const { user: currentUser } = useAuth()

const isModalOpen = ref(false)
const selectedUser = ref<any>(null)
const page = ref(1)
const pageSize = ref(20)
const search = ref('')

const usersKey = computed(() => `users-list-${currentUser.value?.id || 'anonymous'}-${currentUser.value?.clinicId || 'platform'}`)
const { data: usersResult, refresh, status } = await useAsyncData(
  usersKey,
  () => $api('/users', { params: { limit: pageSize.value, skip: (page.value - 1) * pageSize.value, search: search.value } }),
  { watch: [page, pageSize, search], getCachedData: () => undefined }
) as any
const users = computed(() => usersResult.value?.data || [])
const total = computed(() => usersResult.value?.total || 0)
watch([search, pageSize], () => { page.value = 1 })
onActivated(() => refresh())

const columns = computed(() => {
  const cols: TableColumn<any>[] = [
    { accessorKey: 'username', header: 'Username' },
    {
      accessorKey: 'staffId',
      header: 'Staff'
    }
  ]

  // Show Clinic for developer role
  if (currentUser.value?.role === 'developer') {
    cols.push({
      accessorKey: 'clinicId',
      header: 'Clinic'
    })
  }

  cols.push(
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'role', header: 'Role' },
    { accessorKey: 'active', header: 'Status' },
    { id: 'actions', header: t('common.actions') }
  )

  return cols
})

async function openAddUser() {
  isModalOpen.value = false
  selectedUser.value = null
  await nextTick()
  isModalOpen.value = true
}

async function openEditUser(user: any) {
  isModalOpen.value = false
  selectedUser.value = user
  await nextTick()
  isModalOpen.value = true
}

async function deleteUser(id: string) {
  if (confirm(t('messages.confirmDelete'))) {
    try {
      await $api(`/users/${id}`, { method: 'DELETE' })
      toast.add({ title: t('common.success'), color: 'success' })
      refresh()
    } catch (error: any) {
      toast.add({ title: t('common.error'), description: error.data?.message, color: 'error' })
    }
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <UBreadcrumb
        :items="[{ label: t('nav.home'), to: '/' }, { label: t('settings.roles'), to: '/users/roles' }, { label: 'User Management' }]"
      />
    </div>

    <UCard>
      <template #header>
        <div class="flex justify-between items-center">
          <h2 class="text-xl font-semibold">
            Users
          </h2>
          <UButton icon="i-lucide-plus" label="Add User" @click="openAddUser" />
        </div>
      </template>

      <div class="flex gap-3 pb-4">
        <UInput v-model="search" icon="i-lucide-search" placeholder="Search users..." class="flex-1" />
        <USelect v-model="pageSize" :items="[10, 20, 50, 100]" class="w-24" />
      </div>

      <UTable :data="users" :columns="columns" :loading="status === 'pending'">
        <template #staffId-cell="{ row }">
          <div v-if="row.original.staffId" class="flex flex-col">
            <span>{{ row.original.staffId.nameEn }}</span>
            <span v-if="row.original.staffId.nameKh" class="text-xs text-gray-500">({{ row.original.staffId.nameKh }})</span>
          </div>
          <UButton
            v-else
            label="Assign Staff"
            size="xs"
            variant="soft"
            color="primary"
            icon="i-lucide-user-plus"
            @click="openEditUser(row.original)"
          />
        </template>

        <template #clinicId-cell="{ row }">
          <div v-if="row.original.clinicId" class="flex flex-col">
            <span class="font-medium text-primary-600 dark:text-primary-400">{{ row.original.clinicId.name }}</span>
            <span v-if="row.original.clinicId.nameKh" class="text-xs text-gray-500">{{ row.original.clinicId.nameKh }}</span>
          </div>
          <span v-else class="text-gray-400">N/A</span>
        </template>

        <template #active-cell="{ row }">
          <UBadge :color="row.original.active === 1 ? 'success' : 'error'" variant="soft">
            {{ row.original.active === 1 ? 'Active' : 'Inactive' }}
          </UBadge>
        </template>

        <template #actions-cell="{ row }">
          <div class="flex gap-2">
            <UButton
              icon="i-lucide-pencil"
              size="xs"
              color="neutral"
              variant="ghost"
              @click="openEditUser(row.original)"
            />
            <UButton
              icon="i-lucide-trash"
              size="xs"
              color="error"
              variant="ghost"
              @click="deleteUser(row.original._id)"
            />
          </div>
        </template>
      </UTable>
      <div class="flex items-center justify-between pt-4">
        <span class="text-sm text-muted">Total: {{ total }}</span>
        <UPagination v-model:page="page" :items-per-page="pageSize" :total="total" />
      </div>
    </UCard>

    <SettingsUserModal
      :key="selectedUser?._id || 'new-user'"
      v-model:open="isModalOpen"
      :user="selectedUser"
      @success="refresh"
    />
  </div>
</template>
