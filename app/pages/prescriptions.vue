<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

const toast = useToast()
const isAddModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const selectedPrescription = ref<any>(null)

const branch = useBranch()

const { data: prescriptions, refresh } = await useAsyncData<any>('prescriptions', () =>
  $api('/prescriptions', {
    params: {
      ...(branch.currentBranchId.value ? { branchId: branch.currentBranchId.value } : {})
    }
  }), {
  watch: [() => branch.currentBranchId.value]
})

const columns: TableColumn<any>[] = [
  {
    accessorKey: 'medication',
    header: 'Medication'
  },
  {
    accessorKey: 'dose',
    header: 'Dose'
  },
  {
    accessorKey: 'frequency',
    header: 'Frequency'
  },
  {
    accessorKey: 'duration',
    header: 'Duration'
  },
  {
    accessorKey: 'quantity',
    header: 'Quantity'
  },
  {
    accessorKey: 'totalPrice',
    header: 'Total Price',
    cell: ({ row }) => row.original.totalPrice ? `$${row.original.totalPrice.toFixed(2)}` : 'N/A'
  },
  {
    accessorKey: 'prescribedBy',
    header: 'Prescribed By'
  },
  {
    accessorKey: 'prescribedAt',
    header: 'Prescribed At',
    cell: ({ row }) => {
      if (!row.original.prescribedAt) return 'N/A'
      const date = new Date(row.original.prescribedAt)
      return date.toLocaleDateString()
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
          onSelect: () => viewPrescription(row.original)
        },
        {
          label: 'Edit',
          icon: 'i-lucide-pencil',
          onSelect: () => editPrescription(row.original)
        },
        {
          type: 'separator'
        },
        {
          label: 'Delete',
          icon: 'i-lucide-trash',
          color: 'error',
          onSelect: () => deletePrescription(row.original)
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
  medication: '',
  dose: '',
  frequency: '',
  duration: '',
  notes: '',
  prescribedBy: '',
  morning: 0,
  afternoon: 0,
  evening: 0,
  night: 0,
  quantity: 0,
  unitPrice: 0
})

function viewPrescription(prescription: any) {
  selectedPrescription.value = prescription
}

function editPrescription(prescription: any) {
  selectedPrescription.value = prescription
  form.value = { ...prescription }
  isAddModalOpen.value = true
}

function deletePrescription(prescription: any) {
  selectedPrescription.value = prescription
  isDeleteModalOpen.value = true
}

async function handleDelete() {
  try {
    await $api(`/prescriptions/${selectedPrescription.value._id}`, {
      method: 'DELETE'
    })
    toast.add({
      title: 'Success',
      description: 'Prescription deleted successfully'
    })
    refresh()
    isDeleteModalOpen.value = false
  } catch (error) {
    toast.add({
      title: 'Error',
      description: 'Failed to delete prescription',
      color: 'error'
    })
  }
}

async function handleSave() {
  try {
    if (selectedPrescription.value) {
    await $api(`/prescriptions/${selectedPrescription.value._id}`, {
        method: 'PUT',
        body: form.value
      })
    } else {
    await $api('/prescriptions', {
        method: 'POST',
        body: form.value
      })
    }
    toast.add({
      title: 'Success',
      description: `Prescription ${selectedPrescription.value ? 'updated' : 'created'} successfully`
    })
    refresh()
    isAddModalOpen.value = false
    selectedPrescription.value = null
    form.value = {
      medication: '',
      dose: '',
      frequency: '',
      duration: '',
      notes: '',
      prescribedBy: '',
      morning: 0,
      afternoon: 0,
      evening: 0,
      night: 0,
      quantity: 0,
      unitPrice: 0
    }
  } catch (error) {
    toast.add({
      title: 'Error',
      description: 'Failed to save prescription',
      color: 'error'
    })
  }
}
</script>

<template>
  <div>
    <UDashboardPage>
      <UDashboardPanel grow>
        <UDashboardNavbar title="Prescriptions">
          <template #right>
            <UButton
              icon="i-lucide-plus"
              label="Add Prescription"
              @click="isAddModalOpen = true"
            />
          </template>
        </UDashboardNavbar>

        <UDashboardPanelContent>
          <UTable
            :columns="columns"
            :rows="prescriptions?.data || []"
            :loading="!prescriptions"
          />
        </UDashboardPanelContent>
      </UDashboardPanel>
    </UDashboardPage>

    <!-- Add/Edit Prescription Modal -->
    <UModal v-model="isAddModalOpen">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">
            {{ selectedPrescription ? 'Edit Prescription' : 'Add New Prescription' }}
          </h3>
        </template>

        <form class="space-y-4" @submit.prevent="handleSave">
          <UFormField label="Medication" required>
            <UInput v-model="form.medication" />
          </UFormField>

          <div class="grid grid-cols-3 gap-4">
            <UFormField label="Dose">
              <UInput v-model="form.dose" placeholder="e.g., 500mg" />
            </UFormField>

            <UFormField label="Frequency">
              <UInput v-model="form.frequency" placeholder="e.g., 3 times/day" />
            </UFormField>

            <UFormField label="Duration">
              <UInput v-model="form.duration" placeholder="e.g., 7 days" />
            </UFormField>
          </div>

          <div class="border rounded-lg p-4">
            <p class="text-sm font-medium mb-3">
              Daily Schedule
            </p>
            <div class="grid grid-cols-4 gap-4">
              <UFormField label="Morning">
                <UInput v-model.number="form.morning" type="number" min="0" />
              </UFormField>

              <UFormField label="Afternoon">
                <UInput v-model.number="form.afternoon" type="number" min="0" />
              </UFormField>

              <UFormField label="Evening">
                <UInput v-model.number="form.evening" type="number" min="0" />
              </UFormField>

              <UFormField label="Night">
                <UInput v-model.number="form.night" type="number" min="0" />
              </UFormField>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Quantity">
              <UInput v-model.number="form.quantity" type="number" min="0" />
            </UFormField>

            <UFormField label="Unit Price">
              <UInput
                v-model.number="form.unitPrice"
                type="number"
                step="0.01"
                min="0"
              />
            </UFormField>
          </div>

          <UFormField label="Prescribed By">
            <UInput v-model="form.prescribedBy" />
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
            Delete Prescription
          </h3>
        </template>

        <p>Are you sure you want to delete this prescription? This action cannot be undone.</p>

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
