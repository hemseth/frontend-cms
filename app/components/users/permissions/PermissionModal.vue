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
const { data, refresh } = await useAsyncData('permission-modal-permissions', () => $api('/permissions', { params: { limit: 1000 } }), { lazy: true, getCachedData: () => undefined })
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
  <UModal v-model:open="open" :title="role ? 'Edit Role' : 'Add Role'" :ui="{ content: 'sm:max-w-xl' }">
    <template #body>
      <div class="space-y-4">
        <div class="grid grid-cols-1 gap-4">
          <div class="grid grid-cols-2 gap-4">
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
          <!--
                    <div>
                        <label
                            class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Permissions</label>
                        <div class="border rounded-md p-4 max-h-60 overflow-y-auto space-y-4">
                            <div v-for="(group, resource) in groupedPermissions" :key="resource">
                                <h4
                                    class="font-semibold text-sm capitalize mb-2 sticky top-0 bg-white dark:bg-gray-900 pb-1 border-b">
                                    {{ resource.replace('_', ' ') }}
                                </h4>
                                <div class="grid grid-cols-2 gap-2">
                                    <UCheckbox v-for="perm in group" :key="perm.value" v-model="state.permissions"
                                        :value="perm.value" :label="perm.name.replace(resource + ':', '')" />
                                </div>
                            </div>
                        </div>
                    </div>
                    -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">{{
              t('common.description') }}</label>
            <UTextarea v-model="state.description" placeholder="Optional description..." class="w-full" />
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            :label="t('common.cancel')"
            color="neutral"
            variant="ghost"
            @click="open = false"
          />
          <UButton :label="t('common.save')" color="primary" @click="handleSave" />
        </div>
      </div>
    </template>
  </UModal>
</template>
