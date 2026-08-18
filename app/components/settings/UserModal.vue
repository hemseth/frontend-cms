<script setup lang="ts">
import { reactive, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast, useAsyncData } from '#imports'

const props = defineProps<{
  user?: any
  staffId?: string
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits(['success'])

const { t } = useI18n()
const toast = useToast()

// Fetch roles for selection
const { data: rolesResult, refresh: refreshRoles } = await useAsyncData('user-editor-roles', () => $api('/roles', { params: { limit: 1000 } }), { getCachedData: () => undefined }) as any
const roleOptions = computed(() => {
  const roles = Array.isArray(rolesResult.value) ? rolesResult.value : (rolesResult.value?.data || [])
  return roles.map((role: any) => ({
    label: role.nameEn,
    value: role.roleSlug,
    permissions: role.permissions
  }))
})

// Fetch all permissions for the override list
const { data: permissionsResult, refresh: refreshPermissions } = await useAsyncData('user-editor-permissions', () => $api('/permissions', { params: { limit: 1000 } }), { getCachedData: () => undefined }) as any
const permissionOptions = computed(() => {
  const permissions = Array.isArray(permissionsResult.value) ? permissionsResult.value : (permissionsResult.value?.data || [])
  return permissions.map((p: any) => ({
    label: `${p.nameEn} (${p.permissionSlug})`,
    value: p.permissionId
  }))
})
const groupedPermissions = computed(() => permissionOptions.value.reduce((groups: Record<string, any[]>, permission: any) => {
  const resource = permission.label.includes('(')
    ? permission.label.split('(').pop()?.replace(')', '').split(':')[0] || 'general'
    : 'general'
  ;(groups[resource] ||= []).push(permission)
  return groups
}, {}))

// Fetch staff for selection
const { data: staffResult, refresh: refreshStaff } = await useAsyncData('user-editor-staff', () => $api('/staff', { params: { limit: 1000 } }), { getCachedData: () => undefined }) as any
const staffOptions = computed(() => {
  const list = (staffResult.value?.data as any)?.data || []
  return (Array.isArray(list) ? list : []).map((s: any) => ({
    label: `${s.nameEn} - ${s.role}`,
    value: s._id,
    phone: s.phone,
    nameEn: s.nameEn
  }))
})

const state = reactive({
  staffId: '',
  username: '',
  email: '',
  password: '',
  role: '',
  active: 1,
  permissions: [] as number[]
})

// Handle staff selection
watch(() => state.staffId, (newStaffId) => {
  const selectedStaff = staffOptions.value.find((s: any) => s.value === newStaffId)
  if (selectedStaff && !props.user) {
    // Auto-suggest username from name
    state.username = selectedStaff.nameEn.toLowerCase().replace(/\s+/g, '_')
    // Usually phone or something else could be email if not available
  }
})

// Handle role change to auto-assign permissions
watch(() => state.role, (newRole) => {
  const selectedRoleData = roleOptions.value.find((r: any) => r.value === newRole)
  if (selectedRoleData && (!props.user || state.permissions.length === 0)) {
    state.permissions = [...(selectedRoleData.permissions || [])]
  }
})

watch(open, async (isOpen) => {
  if (isOpen) await Promise.all([refreshRoles(), refreshPermissions(), refreshStaff()])
})

function togglePermission(value: number) {
  const index = state.permissions.indexOf(value)
  if (index === -1) state.permissions.push(value)
  else state.permissions.splice(index, 1)
}

function toggleGroup(group: any[]) {
  const values = group.map(permission => permission.value)
  const allSelected = values.every(value => state.permissions.includes(value))
  state.permissions = allSelected
    ? state.permissions.filter(value => !values.includes(value))
    : [...new Set([...state.permissions, ...values])]
}

// Handle both user prop (for editing) and staffId prop (for creating from staff)
watch([() => props.user, () => props.staffId], ([user, staffId]) => {
  if (user) {
    state.staffId = user.staffId?._id || user.staffId || ''
    state.username = user.username || ''
    state.email = user.email || ''
    state.password = ''
    state.role = user.role || ''
    state.active = user.active ?? 1
    state.permissions = user.permissions || []
  } else {
    resetState()
    if (staffId) {
      state.staffId = staffId
    }
  }
}, { immediate: true })

function resetState() {
  state.staffId = ''
  state.username = ''
  state.email = ''
  state.password = ''
  state.role = ''
  state.active = 1
  state.permissions = []
}

async function handleSave() {
  try {
    const payload: any = {
      staffId: state.staffId,
      username: state.username,
      email: state.email,
      role: state.role,
      active: state.active,
      permissions: state.permissions
    }
    if (state.password) {
      payload.password = state.password
    }

    if (props.user?._id) {
      await $api(`/users/${props.user._id}`, {
        method: 'PUT',
        body: payload
      })
      toast.add({ title: t('common.success'), description: t('messages.updateSuccess'), color: 'success' })
    } else {
      await $api('/users', {
        method: 'POST',
        body: payload
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
    :title="user ? 'Edit User' : 'Add User'"
    :ui="{ content: 'w-screen h-screen max-w-none sm:max-w-none rounded-none flex flex-col', body: 'flex-1 overflow-y-auto p-0' }"
  >
    <template #body>
      <div class="min-h-full flex flex-col">
        <div class="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 md:grid-cols-2 gap-4 content-start">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Select Staff
              *</label>
            <USelectMenu
              v-model="state.staffId"
              :items="staffOptions"
              placeholder="Search staff..."
              class="w-full"
              value-key="value"
              label-key="label"
              searchable
            />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 md:col-span-2">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Login
                Username *</label>
              <UInput v-model="state.username" placeholder="john_doe" class="w-full" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Email</label>
              <UInput
                v-model="state.email"
                type="email"
                placeholder="john@example.com"
                class="w-full"
              />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Password {{ user
              ? '(Leave blank to keep same)' : '*' }}</label>
            <UInput
              v-model="state.password"
              type="password"
              placeholder="••••••••"
              class="w-full"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">System Role
              *</label>
            <USelect
              v-model="state.role"
              :items="roleOptions"
              value-key="value"
              label-key="label"
              placeholder="Select role"
              class="w-full"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Account Status</label>
            <USelect
              v-model="state.active"
              :items="[{ label: 'Active', value: 1 }, { label: 'Inactive', value: 0 }]"
              value-key="value"
              label-key="label"
              class="w-full"
            />
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Override
              Permissions (Role
              defaults assigned auto)</label>
            <div class="mt-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <section v-for="(group, resource) in groupedPermissions" :key="resource" class="rounded-lg border border-default bg-elevated/30 p-4">
                <div class="flex items-center justify-between gap-3 mb-3 pb-2 border-b border-default">
                  <h4 class="font-semibold capitalize">{{ String(resource).replaceAll('_', ' ') }}</h4>
                  <UButton size="xs" color="neutral" variant="ghost" :label="group.every((permission: any) => state.permissions.includes(permission.value)) ? 'Clear' : 'Select all'" @click="toggleGroup(group)" />
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <UCheckbox
                    v-for="permission in group"
                    :key="permission.value"
                    :model-value="state.permissions.includes(permission.value)"
                    :label="permission.label.split(' (')[0]"
                    @update:model-value="togglePermission(permission.value)"
                  />
                </div>
              </section>
            </div>
            <p class="text-xs text-info mt-1">
              If you change the role, permissions will revert to role
              defaults unless you manually edit them after.
            </p>
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
