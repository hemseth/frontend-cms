<script setup lang="ts">
import { ref, computed, h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'

const { t } = useI18n()
const toast = useToast()

const searchQuery = ref('')
const categoryId = ref('')
const isModalOpen = ref(false)
const selectedService = ref<any>(null)

const { data: categoriesRes } = await useAsyncData('settings-service-categories-list-v2', () => $api<{ data: any[] }>('/service-categories'))
const categories = computed(() => (categoriesRes.value as any)?.data?.map((c: any) => ({ label: c.nameEn, value: c._id })) || [])

const page = ref(1)
const limit = ref(10)

const { data: result, status, refresh } = await useAsyncData('settings-services-list-v2', () =>
  $api<any>('/services', {
    params: {
      search: searchQuery.value,
      categoryId: categoryId.value || undefined,
      page: page.value,
      limit: limit.value,
      skip: (page.value - 1) * limit.value
    }
  }), {
  watch: [searchQuery, categoryId, page, limit],
  default: () => ({ data: [], total: 0 })
})

// Reset pagination when filters change
watch([searchQuery, categoryId, limit], () => {
  page.value = 1
})

const services = computed(() => (result.value as any)?.data || [])
const total = computed(() => (result.value as any)?.meta?.total || 0)
const hasNextPage = computed(() => total.value > page.value * limit.value)
const hasPrevPage = computed(() => page.value > 1)

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
    accessorKey: 'nameEn',
    header: 'Name (EN)'
  },
  {
    accessorKey: 'nameKh',
    header: 'Name (KH)'
  },
  {
    accessorKey: 'price',
    header: 'Price',
    cell: ({ row }) => {
      return `${row.original.price} ${row.original.currency}`
    }
  },
  {
    accessorKey: 'status',
    header: t('medicine.status'),
    cell: ({ row }) => {
      return h(resolveComponent('UBadge'), {
        label: row.original.status,
        color: row.original.status === 'active' ? 'success' : 'neutral',
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
          onSelect: () => editService(row.original)
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

function editService(service: any) {
  selectedService.value = service
  isModalOpen.value = true
}

function openAddModal() {
  selectedService.value = null
  isModalOpen.value = true
}

function resetFilters() {
  searchQuery.value = ''
  categoryId.value = ''
  page.value = 1
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <UBreadcrumb
        :items="[{ label: t('nav.home'), to: '/' }, { label: t('settings.title'), to: '/settings' }, { label: 'Medical Services' }]"
      />
      <UButton icon="i-lucide-plus" label="Add Service" @click="openAddModal" />
    </div>

    <UCard>
      <template #header>
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold">
              Medical Services & Tests
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
              :label="t('common.reset')"
              @click="resetFilters"
            />
          </div>
        </div>
      </template>

      <UTable
        :columns="columns"
        :data="services"
        :loading="status === 'pending'"
        class="w-full"
        :ui="{
          td: 'py-1 px-4 text-sm',
          th: 'py-1.5 px-4 font-semibold text-sm bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 text-left'
        }"
      />

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

    <SettingsServiceModal
      v-model:open="isModalOpen"
      :service="selectedService"
      :categories="categories"
      @success="refresh"
    />
  </div>
</template>
