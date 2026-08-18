<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

const toast = useToast()
const isAddModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const selectedService = ref<any>(null)

const branch = useBranch()

const { data: services, refresh } = await useFetch<any>('/api/service-prices', {
  lazy: true,
  query: computed(() => ({
    ...(branch.currentBranchId.value ? { branchId: branch.currentBranchId.value } : {})
  })),
  watch: [() => branch.currentBranchId.value]
})

const columns: TableColumn<any>[] = [
  {
    accessorKey: 'code',
    header: 'Code'
  },
  {
    accessorKey: 'name',
    header: 'Name'
  },
  {
    accessorKey: 'type',
    header: 'Type'
  },
  {
    accessorKey: 'price',
    header: 'Price',
    cell: ({ row }) => `${row.original.currency} ${row.original.price.toFixed(2)}`
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      return h(resolveComponent('UBadge'), {
        label: row.original.status,
        color: row.original.status === 'active' ? 'success' : 'neutral'
      })
    }
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const items = [
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
          onSelect: () => deleteService(row.original)
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

const form = ref({
  code: '',
  name: '',
  type: '',
  price: 0,
  currency: 'USD',
  status: 'active'
})

function editService(service: any) {
  selectedService.value = service
  form.value = { ...service }
  isAddModalOpen.value = true
}

function deleteService(service: any) {
  selectedService.value = service
  isDeleteModalOpen.value = true
}

async function handleDelete() {
  try {
    await $api(`/service-prices/${selectedService.value._id}`, {
      method: 'DELETE'
    })
    toast.add({
      title: 'Success',
      description: 'Service price deleted successfully'
    })
    refresh()
    isDeleteModalOpen.value = false
  } catch (error) {
    toast.add({
      title: 'Error',
      description: 'Failed to delete service price',
      color: 'error'
    })
  }
}

async function handleSave() {
  try {
    if (selectedService.value) {
    await $api(`/service-prices/${selectedService.value._id}`, {
        method: 'PUT',
        body: form.value
      })
    } else {
    await $api('/service-prices', {
        method: 'POST',
        body: form.value
      })
    }
    toast.add({
      title: 'Success',
      description: `Service price ${selectedService.value ? 'updated' : 'created'} successfully`
    })
    refresh()
    isAddModalOpen.value = false
    selectedService.value = null
    form.value = {
      code: '',
      name: '',
      type: '',
      price: 0,
      currency: 'USD',
      status: 'active'
    }
  } catch (error) {
    toast.add({
      title: 'Error',
      description: 'Failed to save service price',
      color: 'error'
    })
  }
}
</script>

<template>
  <div>
    <UDashboardPage>
      <UDashboardPanel grow>
        <UDashboardNavbar title="Service Prices">
          <template #right>
            <UButton
              icon="i-lucide-plus"
              label="Add Service"
              @click="isAddModalOpen = true"
            />
          </template>
        </UDashboardNavbar>

        <UDashboardPanelContent>
          <UTable
            :columns="columns"
            :rows="services?.data || []"
            :loading="!services"
          />
        </UDashboardPanelContent>
      </UDashboardPanel>
    </UDashboardPage>

    <!-- Add/Edit Service Modal -->
    <UModal v-model="isAddModalOpen">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">
            {{ selectedService ? 'Edit Service Price' : 'Add New Service Price' }}
          </h3>
        </template>

        <form class="space-y-4" @submit.prevent="handleSave">
          <UFormField label="Code" required>
            <UInput v-model="form.code" />
          </UFormField>

          <UFormField label="Name" required>
            <UInput v-model="form.name" />
          </UFormField>

          <UFormField label="Type" required>
            <UInput v-model="form.type" placeholder="e.g., consultation, lab test, imaging" />
          </UFormField>

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Price" required>
              <UInput v-model.number="form.price" type="number" step="0.01" />
            </UFormField>

            <UFormField label="Currency" required>
              <USelectMenu
                v-model="form.currency"
                :options="[
                  { label: 'USD', value: 'USD' },
                  { label: 'KHR', value: 'KHR' }
                ]"
              />
            </UFormField>
          </div>

          <UFormField label="Status" required>
            <USelectMenu
              v-model="form.status"
              :options="[
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' }
              ]"
            />
          </UFormField>
        </form>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="ghost"
              @click="isAddModalOpen = false"
            />
            <UButton
              label="Save"
              @click="handleSave"
            />
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model="isDeleteModalOpen">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">
            Delete Service Price
          </h3>
        </template>

        <p>Are you sure you want to delete this service price? This action cannot be undone.</p>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="ghost"
              @click="isDeleteModalOpen = false"
            />
            <UButton
              label="Delete"
              color="error"
              @click="handleDelete"
            />
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>
