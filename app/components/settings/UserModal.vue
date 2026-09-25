<script setup lang="ts">
import { reactive, watch, computed, ref } from 'vue'
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
const { data: rolesResult, refresh: refreshRoles } = await useAsyncData(
  'user-editor-roles',
  () => $api('/roles', { params: { limit: 1000 } }),
  { getCachedData: () => undefined }
) as any

const roleOptions = computed(() => {
  const roles = Array.isArray(rolesResult.value) ? rolesResult.value : (rolesResult.value?.data || [])
  return roles.map((role: any) => ({
    label: role.nameEn,
    value: role.roleSlug,
    permissions: role.permissions
  }))
})

// Fetch all permissions for the override list
const { data: permissionsResult, refresh: refreshPermissions } = await useAsyncData(
  'user-editor-permissions',
  () => $api('/permissions', { params: { limit: 1000 } }),
  { getCachedData: () => undefined }
) as any

// Friendly resource names in Khmer & English
const RESOURCE_METADATA: Record<string, { labelEn: string; labelKh: string; category: 'clinical' | 'pharmacy' | 'finance' | 'admin' }> = {
  patient: { labelEn: 'Patient', labelKh: 'អ្នកជំងឺ', category: 'clinical' },
  visit: { labelEn: 'Visit & Consultation', labelKh: 'ការពិគ្រោះ', category: 'clinical' },
  admission: { labelEn: 'Inpatient & Admission', labelKh: 'ការសម្រាកពេទ្យ', category: 'clinical' },
  room: { labelEn: 'Rooms', labelKh: 'បន្ទប់', category: 'clinical' },
  bed: { labelEn: 'Beds', labelKh: 'គ្រែ', category: 'clinical' },
  prescription: { labelEn: 'Prescriptions', labelKh: 'វេជ្ជបញ្ជា', category: 'clinical' },
  laboratory: { labelEn: 'Laboratory', labelKh: 'ពិសោធន៍', category: 'clinical' },
  echo: { labelEn: 'Ultrasound / Echo', labelKh: 'អេកូ', category: 'clinical' },
  appointment: { labelEn: 'Appointments', labelKh: 'ការណាត់ជួប', category: 'clinical' },

  pharmacy: { labelEn: 'Pharmacy', labelKh: 'ឱសថស្ថាន', category: 'pharmacy' },
  warehouse: { labelEn: 'Warehouse', labelKh: 'ឃ្លាំង', category: 'pharmacy' },
  stock: { labelEn: 'Inventory & Stock', labelKh: 'ស្តុកថ្នាំ', category: 'pharmacy' },
  dispensing: { labelEn: 'Dispensing', labelKh: 'ការចែកថ្នាំ', category: 'pharmacy' },
  goodsReceipt: { labelEn: 'Goods Receipt', labelKh: 'ការទទួលទំនិញ', category: 'pharmacy' },
  transfer: { labelEn: 'Stock Transfer', labelKh: 'ការផ្ទេរស្តុក', category: 'pharmacy' },
  stockCount: { labelEn: 'Stock Count', labelKh: 'ការរាប់ស្តុក', category: 'pharmacy' },
  stockAdjustment: { labelEn: 'Stock Adjustment', labelKh: 'ការកែតម្រូវស្តុក', category: 'pharmacy' },
  inventoryReturn: { labelEn: 'Inventory Return', labelKh: 'ការដាក់ស្តុកវិញ', category: 'pharmacy' },
  recall: { labelEn: 'Medicine Recall', labelKh: 'ការដកថ្នាំវិញ', category: 'pharmacy' },
  supplier: { labelEn: 'Suppliers', labelKh: 'អ្នកផ្គត់ផ្គង់', category: 'pharmacy' },
  purchase: { labelEn: 'Purchases', labelKh: 'ការបញ្ជាទិញ', category: 'pharmacy' },

  payment: { labelEn: 'Payments & Billing', labelKh: 'ការទូទាត់ប្រាក់', category: 'finance' },
  revenue: { labelEn: 'Revenue', labelKh: 'ចំណូល', category: 'finance' },
  expense: { labelEn: 'Expenses', labelKh: 'ចំណាយ', category: 'finance' },
  payroll: { labelEn: 'Payroll', labelKh: 'ប្រាក់ខែ', category: 'finance' },

  user: { labelEn: 'User Management', labelKh: 'អ្នកប្រើប្រាស់', category: 'admin' },
  staff: { labelEn: 'Staff Management', labelKh: 'បុគ្គលិក', category: 'admin' },
  report: { labelEn: 'Reports & Analytics', labelKh: 'របាយការណ៍', category: 'admin' },
  settings: { labelEn: 'Settings & Config', labelKh: 'ការកំណត់', category: 'admin' },
  device: { labelEn: 'Devices & Equipment', labelKh: 'ឧបករណ៍', category: 'admin' },
  audit: { labelEn: 'Audit Logs', labelKh: 'សវនកម្ម', category: 'admin' },
  location: { labelEn: 'Clinic Locations', labelKh: 'ទីតាំង', category: 'admin' }
}

const ACTION_LABELS: Record<string, { en: string; kh: string }> = {
  read: { en: 'View / Read', kh: 'មើល' },
  create: { en: 'Create / Add', kh: 'បង្កើត' },
  update: { en: 'Update / Edit', kh: 'កែប្រែ' },
  delete: { en: 'Delete', kh: 'លុប' },
  approve: { en: 'Approve', kh: 'អនុម័ត' }
}

// Normalized permissions list
const allPermissions = computed(() => {
  const permissions = Array.isArray(permissionsResult.value) ? permissionsResult.value : (permissionsResult.value?.data || [])
  return permissions.map((p: any) => {
    let resource = 'general'
    let action = 'manage'

    if (p.permissionSlug && p.permissionSlug.includes(':')) {
      const parts = p.permissionSlug.split(':')
      resource = parts[0]
      action = parts[1]
    } else if (p.permissionSlug) {
      // Legacy normalization if any left
      resource = p.permissionSlug.replace(/^(create|view|update|delete)-/, '')
      action = p.permissionSlug.split('-')[0] || 'view'
    }

    const meta = RESOURCE_METADATA[resource] || {
      labelEn: resource.charAt(0).toUpperCase() + resource.slice(1),
      labelKh: resource,
      category: 'admin' as const
    }

    const actionMeta = ACTION_LABELS[action] || { en: action, kh: action }

    return {
      id: p.permissionId,
      slug: p.permissionSlug,
      resource,
      resourceLabelEn: meta.labelEn,
      resourceLabelKh: meta.labelKh,
      category: meta.category,
      action,
      actionLabelEn: actionMeta.en,
      actionLabelKh: actionMeta.kh,
      displayName: `${actionMeta.en} ${meta.labelEn}`,
      nameKh: `${meta.labelKh} - ${actionMeta.kh}`
    }
  })
})

// Search and category filtering
const permissionSearch = ref('')
const activeCategoryFilter = ref<'all' | 'clinical' | 'pharmacy' | 'finance' | 'admin'>('all')

const categoryTabs = [
  { id: 'all', label: 'ទាំងអស់ (All)' },
  { id: 'clinical', label: 'គ្លីនិក (Clinical)' },
  { id: 'pharmacy', label: 'ឱសថ & ស្តុក (Pharmacy/Stock)' },
  { id: 'finance', label: 'ហិរញ្ញវត្ថុ (Finance)' },
  { id: 'admin', label: 'រដ្ឋបាល (Admin)' }
]

// Grouped permissions filtered by search and category
const groupedPermissions = computed(() => {
  const q = permissionSearch.value.toLowerCase().trim()
  const filtered = allPermissions.value.filter((p: any) => {
    // Category filter
    if (activeCategoryFilter.value !== 'all' && p.category !== activeCategoryFilter.value) {
      return false
    }
    // Search query
    if (q) {
      const matchSlug = p.slug?.toLowerCase().includes(q)
      const matchResEn = p.resourceLabelEn?.toLowerCase().includes(q)
      const matchResKh = p.resourceLabelKh?.toLowerCase().includes(q)
      const matchAction = p.action?.toLowerCase().includes(q)
      const matchName = p.displayName?.toLowerCase().includes(q)
      return matchSlug || matchResEn || matchResKh || matchAction || matchName
    }
    return true
  })

  // Group by resource
  const groups: Record<string, { resource: string; labelEn: string; labelKh: string; permissions: typeof allPermissions.value }> = {}

  filtered.forEach((p: any) => {
    if (!groups[p.resource]) {
      groups[p.resource] = {
        resource: p.resource,
        labelEn: p.resourceLabelEn,
        labelKh: p.resourceLabelKh,
        permissions: []
      }
    }
    groups[p.resource]?.permissions.push(p)
  })

  return groups
})

// Fetch staff for selection
const { data: staffResult, refresh: refreshStaff } = await useAsyncData(
  'user-editor-staff',
  () => $api('/staff', { params: { limit: 1000 } }),
  { getCachedData: () => undefined }
) as any

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
    state.username = selectedStaff.nameEn.toLowerCase().replace(/\s+/g, '_')
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

function togglePermission(id: number) {
  const index = state.permissions.indexOf(id)
  if (index === -1) state.permissions.push(id)
  else state.permissions.splice(index, 1)
}

function toggleGroup(groupPerms: any[]) {
  const values = groupPerms.map(p => p.id)
  const allSelected = values.every(id => state.permissions.includes(id))
  state.permissions = allSelected
    ? state.permissions.filter(id => !values.includes(id))
    : [...new Set([...state.permissions, ...values])]
}

function selectAllPermissions() {
  const allIds = allPermissions.value.map((p: any) => p.id)
  state.permissions = [...new Set([...state.permissions, ...allIds])]
}

function clearAllPermissions() {
  state.permissions = []
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
  if (!state.role) {
    toast.add({ title: t('common.error'), description: `តួនាទីប្រព័ន្ធ (System Role): ${t('validation.required')}`, color: 'error' })
    return
  }
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
    toast.add({ title: t('common.error'), description: getApiErrorMessage(error, t('messages.errorOccurred')), color: 'error' })
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="user ? 'កែសម្រួលគណនី (Edit User)' : 'បន្ថែមគណនីថ្មី (Add User)'"
    :ui="{ content: 'w-screen h-screen max-w-none sm:max-w-none rounded-none flex flex-col', body: 'flex-1 overflow-y-auto p-0 bg-muted/50' }"
  >
    <template #body>
      <div class="min-h-full flex flex-col justify-between">
        <!-- Main Form Container -->
        <div class="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          
          <!-- Basic Account Info Card -->
          <div class="bg-default rounded-2xl border border-default p-5 shadow-xs">
            <h3 class="text-sm font-bold text-highlighted flex items-center gap-2 mb-4 pb-2 border-b border-default">
              <UIcon name="i-lucide-user" class="w-4 h-4 text-primary-600" />
              ព័ត៌មានគណនីមូលដ្ឋាន (Account Details)
            </h3>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <!-- Select Staff -->
              <div>
                <label class="block font-semibold text-default mb-1">
                  បុគ្គលិក (Staff Member) *
                </label>
                <USelectMenu
                  v-model="state.staffId"
                  :items="staffOptions"
                  placeholder="ជ្រើសរើសបុគ្គលិក..."
                  class="w-full"
                  value-key="value"
                  label-key="label"
                  searchable
                />
              </div>

              <!-- Login Username -->
              <div>
                <label class="block font-semibold text-default mb-1">
                  ឈ្មោះចូលប្រើ (Username) *
                </label>
                <UInput
                  v-model="state.username"
                  placeholder="john_doe"
                  autocomplete="off"
                  class="w-full"
                />
              </div>

              <!-- Email -->
              <div>
                <label class="block font-semibold text-default mb-1">
                  អ៊ីមែល (Email)
                </label>
                <UInput
                  v-model="state.email"
                  type="email"
                  autocomplete="off"
                  placeholder="john@example.com"
                  class="w-full"
                />
              </div>

              <!-- Password -->
              <div>
                <label class="block font-semibold text-default mb-1">
                  ពាក្យសម្ងាត់ (Password) {{ user ? '(ទុកទទេបើមិនចង់ប្តូរ)' : '*' }}
                </label>
                <UInput
                  v-model="state.password"
                  type="password"
                  autocomplete="new-password"
                  placeholder="••••••••"
                  class="w-full"
                />
              </div>

              <!-- System Role -->
              <div>
                <label class="block font-semibold text-default mb-1">
                  តួនាទីប្រព័ន្ធ (System Role) *
                </label>
                <USelect
                  v-model="state.role"
                  :items="roleOptions"
                  value-key="value"
                  label-key="label"
                  placeholder="ជ្រើសរើសតួនាទី..."
                  class="w-full"
                />
              </div>

              <!-- Account Status -->
              <div>
                <label class="block font-semibold text-default mb-1">
                  ស្ថានភាពគណនី (Status)
                </label>
                <USelect
                  v-model="state.active"
                  :items="[{ label: 'Active (សកម្ម)', value: 1 }, { label: 'Inactive (អសកម្ម)', value: 0 }]"
                  value-key="value"
                  label-key="label"
                  class="w-full"
                />
              </div>
            </div>
          </div>

          <!-- Override Permissions Section -->
          <div class="bg-default rounded-2xl border border-default p-5 shadow-xs space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-default">
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="text-sm font-bold text-highlighted flex items-center gap-2">
                    <UIcon name="i-lucide-shield-check" class="w-4 h-4 text-primary-600" />
                    កំណត់សិទ្ធិប្រើប្រាស់ជាក់លាក់ (Override Permissions)
                  </h3>
                  <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300">
                    {{ state.permissions.length }} / {{ allPermissions.length }} សិទ្ធិបានជ្រើសរើស
                  </span>
                </div>
                <p class="text-[11px] text-muted mt-0.5">
                  សិទ្ធិដើមត្រូវបានកំណត់តាមតួនាទី (Role Defaults) ដោយស្វ័យប្រវត្តិ។ អ្នកអាចធីកបន្ថែម ឬដកសិទ្ធិពិសេសនៅទីនេះ។
                </p>
              </div>

              <!-- Master Select / Clear Actions -->
              <div class="flex items-center gap-2">
                <UButton
                  size="xs"
                  color="primary"
                  variant="soft"
                  icon="i-lucide-check-check"
                  label="ជ្រើសរើសទាំងអស់ (Select All)"
                  @click="selectAllPermissions"
                />
                <UButton
                  size="xs"
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-x"
                  label="សម្អាតទាំងអស់ (Clear All)"
                  @click="clearAllPermissions"
                />
              </div>
            </div>

            <!-- Permission Toolbar: Category Filter & Search -->
            <div class="flex flex-wrap items-center justify-between gap-3 pt-1">
              <!-- Category Filter Chips -->
              <div class="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <button
                  v-for="tab in categoryTabs"
                  :key="tab.id"
                  type="button"
                  class="px-3 py-1 rounded-lg transition-all font-medium whitespace-nowrap text-[11px]"
                  :class="activeCategoryFilter === tab.id
                    ? 'bg-primary-600 text-white font-bold shadow-xs'
                    : 'bg-elevated text-toned hover:bg-accented'"
                  @click="activeCategoryFilter = tab.id as any"
                >
                  {{ tab.label }}
                </button>
              </div>

              <!-- Search Bar -->
              <div class="w-full sm:w-64">
                <UInput
                  v-model="permissionSearch"
                  icon="i-lucide-search"
                  size="xs"
                  placeholder="ស្វែងរកសិទ្ធិ (ឧ. patient, delete)..."
                  class="w-full text-xs"
                />
              </div>
            </div>

            <!-- Grouped Permission Cards Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 pt-2">
              <section
                v-for="group in groupedPermissions"
                :key="group.resource"
                class="rounded-xl border border-default bg-muted/60 p-3.5 transition-all hover:border-accented flex flex-col justify-between"
              >
                <div>
                  <!-- Card Header -->
                  <div class="flex items-center justify-between gap-2 pb-2 mb-2.5 border-b border-default/80">
                    <div>
                      <h4 class="font-bold text-highlighted text-xs">
                        {{ group.labelEn }}
                      </h4>
                      <span class="text-[10px] text-muted font-khmer">
                        {{ group.labelKh }}
                      </span>
                    </div>
                    <UButton
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      class="text-[10px] h-6 px-2"
                      :label="group.permissions.every((p: any) => state.permissions.includes(p.id)) ? 'Clear' : 'All'"
                      @click="toggleGroup(group.permissions)"
                    />
                  </div>

                  <!-- Checkboxes List -->
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div
                      v-for="p in group.permissions"
                      :key="p.id"
                      class="flex items-center gap-2 p-1.5 rounded-lg transition-colors cursor-pointer hover:bg-default"
                      @click="togglePermission(p.id)"
                    >
                      <UCheckbox
                        :model-value="state.permissions.includes(p.id)"
                        class="pointer-events-none"
                      />
                      <div class="leading-tight select-none">
                        <span class="font-medium text-highlighted text-[11px] block">
                          {{ p.actionLabelEn }}
                        </span>
                        <span class="text-[9px] text-dimmed font-khmer">
                          {{ p.actionLabelKh }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <div v-if="Object.keys(groupedPermissions).length === 0" class="py-12 text-center text-dimmed text-xs">
              រកមិនឃើញសិទ្ធិដែលត្រូវនឹងពាក្យស្វែងរកឡើយ
            </div>
          </div>
        </div>

        <!-- Sticky Bottom Actions Bar -->
        <div class="sticky bottom-0 z-30 border-t border-default bg-default/95 backdrop-blur-md px-6 py-3 shadow-lg">
          <div class="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div class="text-xs text-muted">
              <span class="font-bold text-highlighted">{{ state.permissions.length }}</span> សិទ្ធិត្រូវបានជ្រើសរើសសម្រាប់គណនីនេះ
            </div>
            <div class="flex items-center gap-2">
              <UButton
                :label="t('common.cancel') || 'បោះបង់'"
                color="neutral"
                variant="outline"
                size="sm"
                @click="open = false"
              />
              <UButton
                :label="t('common.save') || 'រក្សាទុក'"
                icon="i-lucide-check"
                color="primary"
                size="sm"
                class="px-5 font-bold"
                @click="handleSave"
              />
            </div>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.font-khmer {
  font-family: 'Battambang', 'Noto Sans Khmer', sans-serif;
}
</style>
