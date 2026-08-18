<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import ServiceModal from '~/components/settings/ServiceModal.vue'

const { t } = useI18n()
const toast = useToast()
const isModalOpen = ref(false)
const selectedService = ref<any>(null)

const searchQuery = ref('')
const categoryId = ref<string | undefined>(undefined)
const page = ref(1)
const limit = ref(10)

// Fetch Categories
const { data: categoriesRes, refresh: refreshCategories } = await useAsyncData('services-page-categories-v3', () => $api<any>('/service-categories'))
const categories = computed(() => {
  const raw = categoriesRes.value
  const data = Array.isArray(raw) ? raw : ((raw as any)?.data || [])
  return Array.isArray(data)
    ? data.map((c: any) => ({
        label: c.nameEn && c.nameKh ? `${c.nameEn} (${c.nameKh})` : (c.nameEn || c.nameKh || 'Unknown'),
        value: c._id
      }))
    : []
})

onMounted(() => {
  refreshCategories()
})

// Fetch Services with Pagination
const { data: result, status, refresh: refreshServices } = await useAsyncData('page-services-list', () =>
  $api<{ data: any[], meta: { total: number } }>('/services', {
    params: {
      search: searchQuery.value,
      categoryId: categoryId.value || undefined,
      page: page.value,
      limit: limit.value
    }
  }), {
  watch: [searchQuery, categoryId, page, limit],
  default: () => ({ data: [], meta: { total: 0 } })
})

// Reset pagination when filters change
watch([searchQuery, categoryId, limit], () => {
  page.value = 1
})

const services = computed(() => result.value?.data || [])
const total = computed(() => result.value?.meta?.total || 0)
const hasNextPage = computed(() => total.value > page.value * limit.value)
const hasPrevPage = computed(() => page.value > 1)

// Delete State
const isDeleteModalOpen = ref(false)
const isDeleting = ref(false)

// Parameter View State
const isParamViewModalOpen = ref(false)

// Columns - Using Standard Accessor Pattern (TanStack Table)
const columns = computed<TableColumn<any>[]>(() => [
  { accessorKey: 'code', header: 'Code' },
  { accessorKey: 'nameEn', header: 'Name (EN)' },
  { accessorKey: 'nameKh', header: 'Name (KH)' },
  {
    accessorKey: 'categoryId',
    header: 'Category',
    cell: ({ row }) => {
      const val = row.original.categoryId || row.original.category
      // Check if populated object
      if (val && typeof val === 'object') {
        return val.nameEn || val.nameKh || 'Unknown'
      }
      // Look up by ID
      const cat = categories.value?.find((c: any) => c.value === val)
      return cat ? cat.label : val
    }
  },
  {
    accessorKey: 'price',
    header: 'Price',
    cell: ({ row }) => `$${row.original.price} ${row.original.currency}`
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => h(resolveComponent('UBadge'), {
      color: row.original.status === 'active' ? 'success' : 'neutral',
      label: row.original.status,
      variant: 'subtle'
    })
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const items = [
        {
          label: 'Parameters',
          icon: 'i-lucide-list',
          onSelect: () => viewParameters(row.original)
        },
        {
          label: 'Edit',
          icon: 'i-lucide-pencil',
          onSelect: () => editService(row.original)
        },
        {
          type: 'separator'
        },
        {
          label: 'Delete',
          icon: 'i-lucide-trash',
          color: 'error',
          onSelect: () => confirmDeleteService(row.original)
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
])

function editService(item: any) {
  selectedService.value = item
  isModalOpen.value = true
}

function viewParameters(item: any) {
  selectedService.value = item
  isParamViewModalOpen.value = true
}

function confirmDeleteService(item: any) {
  selectedService.value = item
  isDeleteModalOpen.value = true
}

async function handleDelete() {
  if (!selectedService.value) return
  isDeleting.value = true
  try {
    await $api(`/services/${selectedService.value._id}`, { method: 'DELETE' })
    toast.add({ title: 'Success', description: 'Service deleted successfully', color: 'success' })
    refreshServices()
    isDeleteModalOpen.value = false
  } catch (err: any) {
    toast.add({ title: 'Error', description: err.message || 'Failed to delete service', color: 'error' })
  } finally {
    isDeleting.value = false
  }
}

function addService() {
  selectedService.value = null
  isModalOpen.value = true
}

function resetFilters() {
  searchQuery.value = ''
  categoryId.value = undefined
  page.value = 1
}
</script>

<template>
  <UDashboardPage>
    <UDashboardPanel grow>
      <UDashboardNavbar title="Lab Test Management">
        <template #right>
          <UButton icon="i-lucide-plus" label="Add New Test" @click="addService" />
        </template>
      </UDashboardNavbar>

      <UDashboardPanelContent>
        <div class="flex flex-col gap-4">
          <UCard>
            <template #header>
              <div class="flex flex-col gap-4">
                <div class="flex items-center gap-2">
                  <UInput
                    v-model="searchQuery"
                    placeholder="Search..."
                    icon="i-lucide-search"
                    class="flex-1"
                  />
                  <USelectMenu
                    v-model="categoryId"
                    :items="categories"
                    searchable
                    placeholder="Filter by Category"
                    value-key="value"
                    label-key="label"
                    class="w-48"
                  />
                  <UButton
                    color="neutral"
                    variant="outline"
                    icon="i-lucide-rotate-ccw"
                    label="Reset"
                    @click="resetFilters"
                  />
                </div>
              </div>
            </template>

            <UTable :columns="columns" :data="services" :loading="status === 'pending'" />

            <template #footer>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                  <div class="flex items-center gap-2 text-sm text-gray-500">
                    {{ t('pagination.perPage') }}:
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
        </div>
      </UDashboardPanelContent>
    </UDashboardPanel>

    <!-- Use the Refactored Component -->
    <ServiceModal
      v-model:open="isModalOpen"
      :service="selectedService"
      :categories="categories"
      @success="refreshServices"
    />

    <UModal v-model:open="isParamViewModalOpen" title="Service Parameters">
      <template #header>
        <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-gray-100">
          Parameters for {{ selectedService?.nameEn }}
        </h3>
      </template>
      <div class="p-4">
        <div v-if="selectedService?.parameters?.length > 0" class="space-y-2">
          <div
            v-for="(p, i) in selectedService.parameters"
            :key="i"
            class="flex items-center justify-between p-2 rounded border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900"
          >
            <div>
              <div class="font-medium text-sm">
                {{ p.labelEn }} <span
                  v-if="p.labelKh"
                  class="text-gray-500"
                >({{
                  p.labelKh }})</span>
              </div>
              <div class="text-xs text-gray-500">
                Range: {{ p.refRange || 'N/A' }}
              </div>
            </div>
            <UBadge color="neutral" variant="soft">
              {{ p.unit || '-' }}
            </UBadge>
          </div>
        </div>
        <div v-else class="text-center py-8 text-gray-500 italic">
          No parameters defined for this service.
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end">
          <UButton
            label="Close"
            color="neutral"
            variant="ghost"
            @click="isParamViewModalOpen = false"
          />
        </div>
      </template>
    </UModal>

    <UModal v-model:open="isDeleteModalOpen" title="Confirm Delete">
      <template #body>
        <p>
          Are you sure you want to delete service <strong>{{ selectedService?.nameEn || 'Selected Service'
          }}</strong>?
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton label="Cancel" variant="subtle" @click="isDeleteModalOpen = false" />
          <UButton
            label="Delete"
            color="error"
            :loading="isDeleting"
            @click="handleDelete"
          />
        </div>
      </template>
    </UModal>
  </UDashboardPage>
</template>
