<script setup lang="ts">
import { ref, computed, h, resolveComponent, watch } from 'vue'
import type { TableColumn } from '@nuxt/ui'

const toast = useToast()
const isAddModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const selectedVisit = ref<any>(null)
const searchQuery = ref('')
const page = ref(1)
const limit = ref(20)
const { t } = useI18n()

const { data: result, refresh, status } = await useAsyncData('visits-list', async () => {
  return $api<{ data: { data: any[], total: number } }>('/visits', {
    params: {
      limit: limit.value,
      skip: (page.value - 1) * limit.value,
      search: searchQuery.value
    }
  })
}, {
  watch: [page, limit],
  default: () => ({ data: { data: [], total: 0 } })
})

const visits = computed<any[]>(() => {
  const data = (result.value as any)?.data
  if (!data) return []
  return data.data || []
})

const total = computed(() => (result.value as any)?.data?.total || 0)

watch(searchQuery, () => page.value = 1)

const { data: patients } = await useAsyncData('visits-patient-picker', () =>
  $api<{ data: any[] }>('/patients', { params: { limit: 1000 } }))

const columns: TableColumn<any>[] = [
  {
    accessorKey: 'no',
    header: t('common.number'),
    cell: ({ row }) => (page.value - 1) * limit.value + row.index + 1
  },
  {
    accessorKey: 'patientName',
    header: t('patient.name')
  },
  {
    accessorKey: 'dateIn',
    header: t('common.date'),
    cell: ({ row }) => {
      const date = new Date(row.original.dateIn)
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = date.getFullYear()
      return `${day}-${month}-${year}`
    }
  },
  {
    accessorKey: 'dateOut',
    header: t('common.status'),
    cell: ({ row }) => {
      return h(resolveComponent('UBadge'), {
        label: row.original.status || 'Active',
        color: row.original.status === 'completed' ? 'success' : 'warning',
        variant: 'subtle'
      })
    }
  },
  {
    accessorKey: 'type',
    header: t('common.type'),
    cell: ({ row }) => row.original.type?.toUpperCase() || 'OPD'
  },
  {
    accessorKey: 'diagnosis',
    header: 'Diagnosis',
    cell: ({ row }) => {
      const diagnoses = row.original.diagnosis || []
      return diagnoses.join(', ')
    }
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      const items = [
        {
          label: 'View Details',
          icon: 'i-lucide-eye',
          onSelect: () => viewVisit(row.original)
        },
        {
          label: 'Edit',
          icon: 'i-lucide-pencil',
          onSelect: () => editVisit(row.original)
        },
        {
          type: 'separator'
        },
        {
          label: 'Delete',
          icon: 'i-lucide-trash',
          color: 'error',
          onSelect: () => deleteVisit(row.original)
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
  patientId: null,
  dateIn: new Date().toISOString().split('T')[0],
  dateOut: null,
  diagnosis: [] as any,
  notes: '',
  type: 'opd'
})

function viewVisit(visit: any) {
  navigateTo(`/patients/${visit.patientId}`)
}

function editVisit(visit: any) {
  const dept = (visit.type || 'opd').toLowerCase()
  navigateTo(`/departments/${dept}?visitId=${visit._id}&patientId=${visit.patientId}`)
}

function deleteVisit(visit: any) {
  selectedVisit.value = visit
  isDeleteModalOpen.value = true
}

async function handleDelete() {
  try {
    await $api(`/visits/${selectedVisit.value._id}`, {
      method: 'DELETE'
    })
    toast.add({
      title: 'Success',
      description: 'Visit deleted successfully'
    })
    refresh()
    isDeleteModalOpen.value = false
  } catch (error) {
    toast.add({
      title: 'Error',
      description: 'Failed to delete visit',
      color: 'error'
    })
  }
}

async function handleSave() {
  try {
    if (selectedVisit.value) {
    await $api(`/visits/${selectedVisit.value._id}`, {
        method: 'PUT',
        body: form.value
      })
    } else {
    await $api('/visits', {
        method: 'POST',
        body: form.value
      })
    }
    toast.add({
      title: 'Success',
      description: `Visit ${selectedVisit.value ? 'updated' : 'created'} successfully`
    })
    refresh()
    isAddModalOpen.value = false
    selectedVisit.value = null
  } catch (error) {
    toast.add({
      title: 'Error',
      description: 'Failed to save visit',
      color: 'error'
    })
  }
}
</script>

<template>
  <div>
    <UDashboardPage>
      <UDashboardPanel grow>
        <UDashboardNavbar title="Visits">
          <template #right>
            <UButton icon="i-lucide-plus" label="Add Visit" @click="isAddModalOpen = true" />
          </template>
        </UDashboardNavbar>

        <UDashboardPanelContent>
          <div class="flex flex-col h-full gap-4">
            <div class="flex items-center gap-2">
              <UInput
                v-model="searchQuery"
                :placeholder="t('common.search')"
                icon="i-lucide-search"
                class="flex-1"
              />
              <UButton
                color="neutral"
                variant="outline"
                icon="i-lucide-refresh-cw"
                @click="refresh()"
              />
            </div>

            <UTable
              :columns="columns"
              :data="visits"
              :loading="status === 'pending'"
              class="border rounded-lg"
              :ui="{ td: 'py-1', th: 'py-1.5' }"
            />

            <div class="mt-auto flex items-center justify-between py-4 border-t border-gray-200 dark:border-gray-800">
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
                  :disabled="page === 1"
                  @click="page--"
                />
                <UButton
                  label="Next"
                  trailing-icon="i-lucide-chevron-right"
                  :disabled="page * limit >= total"
                  @click="page++"
                />
              </div>
            </div>
          </div>
        </UDashboardPanelContent>
      </UDashboardPanel>
    </UDashboardPage>

    <!-- Add/Edit Visit Modal -->
    <UModal v-model="isAddModalOpen">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">
            {{ selectedVisit ? 'Edit Visit' : 'Add New Visit' }}
          </h3>
        </template>

        <form class="space-y-4" @submit.prevent="handleSave">
          <UFormField label="Patient" required>
            <USelectMenu
              v-model="form.patientId"
              :options="patients?.data?.map((p: any) => ({ label: p.nameEn || p.nameKh, value: p._id })) || []"
              placeholder="Select patient"
            />
          </UFormField>

          <UFormField label="Type" required>
            <USelectMenu
              v-model="form.type"
              :options="[
                { label: 'OPD (Outpatient)', value: 'opd' },
                { label: 'IPD (Inpatient)', value: 'ipd' }
              ]"
            />
          </UFormField>

          <UFormField label="Date In" required>
            <UInput v-model="form.dateIn" type="datetime-local" />
          </UFormField>

          <UFormField label="Date Out">
            <UInput v-model="form.dateOut" type="datetime-local" />
          </UFormField>

          <UFormField label="Diagnosis">
            <UInput v-model="form.diagnosis" placeholder="Enter diagnoses separated by commas" />
          </UFormField>

          <UFormField label="Notes">
            <UTextarea v-model="form.notes" />
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
            <UButton label="Save" @click="handleSave" />
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model="isDeleteModalOpen">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">
            Delete Visit
          </h3>
        </template>

        <p>Are you sure you want to delete this visit? This action cannot be undone.</p>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="ghost"
              @click="isDeleteModalOpen = false"
            />
            <UButton label="Delete" color="error" @click="handleDelete" />
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>
