<script setup lang="ts">
import { ref, computed, onActivated } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from '#imports'
import type { TableColumn } from '@nuxt/ui'

const { t } = useI18n()
const toast = useToast()

// Permissions State
const isPermissionModalOpen = ref(false)
const selectedPermission = ref<any>(null)
const page = ref(1)
const pageSize = ref(20)
const search = ref('')
const auth = useAuth()
const permissionsKey = computed(() => `permissions-list-${auth.user.value?.id || 'anonymous'}`)
const { data: permissionsResult, refresh: refreshPermissions, status } = await useAsyncData(
  permissionsKey,
  () => $api('/permissions', {
    params: { limit: pageSize.value, skip: (page.value - 1) * pageSize.value, search: search.value }
  }),
  { watch: [page, pageSize, search], getCachedData: () => undefined }
)
const permissions = computed(() => (permissionsResult.value as any)?.data || [])
const total = computed(() => (permissionsResult.value as any)?.total || 0)
watch([search, pageSize], () => { page.value = 1 })
onActivated(() => refreshPermissions())

const permissionColumns: TableColumn<any>[] = [
  { accessorKey: 'permissionId', header: 'ID' },
  { accessorKey: 'nameKh', header: t('common.nameKh') },
  { accessorKey: 'nameEn', header: t('common.nameEn') },
  { accessorKey: 'permissionSlug', header: 'Slug' },
  { id: 'actions', header: t('common.actions') }
]

function openAddPermission() {
  selectedPermission.value = null
  isPermissionModalOpen.value = true
}

function openEditPermission(permission: any) {
  selectedPermission.value = permission
  isPermissionModalOpen.value = true
}

async function deletePermission(id: string) {
  if (confirm(t('messages.confirmDelete'))) {
    try {
      await $api(`/permissions/${id}`, { method: 'DELETE' })
      toast.add({ title: t('common.success'), color: 'success' })
      refreshPermissions()
    } catch (error: any) {
      toast.add({ title: t('common.error'), description: error.data?.message, color: 'error' })
    }
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <UBreadcrumb :items="[{ label: t('nav.home'), to: '/' }, { label: t('settings.permissions') }]" />
      <UButton icon="i-lucide-plus" :label="t('settings.addPermission')" @click="openAddPermission" />
    </div>

    <UCard :ui="{ body: 'p-0' }">
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold">
            {{ t('settings.permissions') }}
          </h2>
        </div>
      </template>

      <div class="flex gap-3 p-4 border-b border-default">
        <UInput v-model="search" icon="i-lucide-search" placeholder="Search permissions..." class="flex-1" />
        <USelect v-model="pageSize" :items="[10, 20, 50, 100]" class="w-24" />
      </div>
      <UTable :data="permissions" :columns="permissionColumns" :loading="status === 'pending'">
        <template #actions-cell="{ row }">
          <div class="flex gap-2">
            <UButton
              icon="i-lucide-pencil"
              size="xs"
              color="neutral"
              variant="ghost"
              @click="openEditPermission(row.original)"
            />
            <UButton
              icon="i-lucide-trash"
              size="xs"
              color="error"
              variant="ghost"
              @click="deletePermission(row.original._id)"
            />
          </div>
        </template>
      </UTable>
      <div class="flex items-center justify-between p-4 border-t border-default">
        <span class="text-sm text-muted">Total: {{ total }}</span>
        <UPagination v-model:page="page" :items-per-page="pageSize" :total="total" />
      </div>
    </UCard>

    <SettingsPermissionModal
      v-model:open="isPermissionModalOpen"
      :permission="selectedPermission"
      @success="refreshPermissions"
    />
  </div>
</template>
