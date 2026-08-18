<script setup lang="ts">
import { reactive, watch, computed } from 'vue'

const props = defineProps<{
  role?: any
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits(['success'])

const { t } = useI18n()
const toast = useToast()

const permissionsResult = ref<{ data: any[] }>({ data: [] })

const permissionsOptions = computed(() => {
  const permissions = Array.isArray(permissionsResult.value) ? permissionsResult.value : (permissionsResult.value?.data || [])
  return permissions.map((p: any) => ({
    label: `${p.nameEn} (${p.permissionSlug})`,
    value: p.permissionId,
    slug: p.permissionSlug, // Add slug for grouping
    name: p.nameEn
  }))
})

// Group permissions by resource for the checkbox UI
const groupedPermissions = computed(() => {
  const groups: Record<string, any[]> = {}

  // Fallback if data is raw permission objects or our mapped options
  const perms = permissionsOptions.value

  perms.forEach((perm) => {
    // Assume format "resource:action" or fall back to "general"
    const [resource] = perm.slug.includes(':') ? perm.slug.split(':') : ['general']

    if (!groups[resource]) {
      groups[resource] = []
    }
    groups[resource].push(perm)
  })

  // Sort keys alphabetically
  return Object.keys(groups).sort().reduce((acc: any, key) => {
    acc[key] = groups[key]
    return acc
  }, {})
})

// Fetch permissions when component mounts
const { data, refresh } = await useAsyncData('role-modal-permissions', () => $api('/permissions', { params: { limit: 1000 } }), { lazy: true, getCachedData: () => undefined })
watch(data, (val: any) => {
  if (val) permissionsResult.value = val
}, { immediate: true })

const state = reactive({
  roleId: 0,
  nameKh: '',
  nameEn: '',
  roleSlug: '',
  permissions: [] as number[],
  description: '',
  status: 1
})

watch(() => props.role, (val) => {
  if (val) {
    Object.assign(state, {
      roleId: val.roleId || 0,
      nameKh: val.nameKh || '',
      nameEn: val.nameEn || '',
      roleSlug: val.roleSlug || '',
      permissions: val.permissions || [],
      description: val.description || '',
      status: val.status ?? 1
    })
  } else {
    resetState()
  }
}, { immediate: true })

function togglePermission(value: number) {
  const idx = state.permissions.indexOf(value)
  if (idx === -1) {
    state.permissions.push(value)
  } else {
    state.permissions.splice(idx, 1)
  }
}

function toggleGroup(group: any[]) {
  const values = group.map(permission => permission.value)
  const allSelected = values.every(value => state.permissions.includes(value))
  state.permissions = allSelected
    ? state.permissions.filter(value => !values.includes(value))
    : [...new Set([...state.permissions, ...values])]
}

function resetState() {
  Object.assign(state, {
    roleId: 0,
    nameKh: '',
    nameEn: '',
    roleSlug: '',
    permissions: [],
    description: '',
    status: 1
  })
}

async function handleSave() {
  try {
    if (props.role?._id) {
      await $api(`/roles/${props.role._id}`, {
        method: 'PUT',
        body: state
      })
      toast.add({ title: t('common.success'), description: t('messages.updateSuccess'), color: 'success' })
    } else {
      await $api('/roles', {
        method: 'POST',
        body: state
      })
      toast.add({ title: t('common.success'), description: t('messages.createSuccess'), color: 'success' })
    }
    emit('success')
    open.value = false
  } catch (error: any) {
    toast.add({ title: t('common.error'), description: error.data?.message || t('messages.errorOccurred'), color: 'error' })
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="role ? 'Edit Role' : 'Add Role'"
    :ui="{ content: 'w-screen h-screen max-w-none sm:max-w-none rounded-none flex flex-col', body: 'flex-1 overflow-y-auto p-0' }"
  >
    <template #body>
      <div class="min-h-full flex flex-col">
        <div class="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Role ID
                *</label>
              <UInput
                v-model.number="state.roleId"
                type="number"
                placeholder="1"
                class="w-full"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Slug
                *</label>
              <UInput v-model="state.roleSlug" placeholder="doctor" class="w-full" />
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{{
              t('common.nameKh') }} *</label>
            <UInput v-model="state.nameKh" placeholder="វេជ្ជបណ្ឌិត" class="w-full" />
          </div>
            <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{{
              t('common.nameEn') }} *</label>
            <UInput v-model="state.nameEn" placeholder="Doctor" class="w-full" />
          </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{{
              t('settings.permissions') }}</label>
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <section
                v-for="(group, resource) in groupedPermissions"
                :key="resource"
                class="rounded-lg border border-default bg-elevated/30 p-4"
              >
                <div class="flex items-center justify-between gap-3 mb-3 pb-2 border-b border-default">
                  <h4 class="font-semibold capitalize">
                    {{ String(resource).replaceAll('_', ' ') }}
                  </h4>
                  <UButton
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    :label="group.every((permission: any) => state.permissions.includes(permission.value)) ? 'Clear' : 'Select all'"
                    @click="toggleGroup(group)"
                  />
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div v-for="perm in group" :key="perm.value" class="min-w-0">
                    <UCheckbox :model-value="state.permissions.includes(perm.value)" :label="perm.name" @update:model-value="togglePermission(perm.value)" />
                  </div>
                </div>
              </section>
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{{
              t('common.description') }}</label>
            <UTextarea v-model="state.description" placeholder="Optional description..." class="w-full" />
          </div>
        </div>
        <div class="sticky bottom-0 border-t border-default bg-default/95 backdrop-blur px-4 sm:px-6 lg:px-8 py-4">
          <div class="max-w-7xl mx-auto flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <UButton
            :label="t('common.cancel')"
            color="neutral"
            variant="ghost"
            @click="open = false"
          />
          <UButton :label="t('common.save')" color="primary" class="justify-center" @click="handleSave" />
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
