<script setup lang="ts">
import { ref, computed, watch, h, resolveComponent } from 'vue'

const props = defineProps<{ staffMember?: any }>()
const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()
const toast = useToast()

const submitting = ref(false)
const state = ref({
  baseSalary: 0,
  positionAllowance: 0,
  transportAllowance: 0,
  housingAllowance: 0,
  otherAllowances: 0,
  effectiveDate: new Date().toISOString().split('T')[0],
  notes: ''
})

const { data: result, status, refresh: refreshAsync } = await useAsyncData('staff-salaries', () => {
  if (!props.staffMember?._id) return Promise.resolve({ data: [] })
  return $api(`/salaries`, { params: { staffId: props.staffMember._id, limit: 100 } })
}, { watch: [() => props.staffMember?._id], default: () => ({ data: [] }) })

const salaries = computed(() => (result.value as any)?.data || [])

watch(() => open.value, (isOpen) => {
  if (isOpen) {
    refresh()
    resetForm()
  }
})

function refresh() {
  if (typeof refreshAsync === 'function') {
    refreshAsync()
  }
}

function resetForm() {
  state.value = {
    baseSalary: 0,
    positionAllowance: 0,
    transportAllowance: 0,
    housingAllowance: 0,
    otherAllowances: 0,
    effectiveDate: new Date().toISOString().split('T')[0],
    notes: ''
  }
}

async function handleSubmit() {
  if (!state.value.baseSalary || state.value.baseSalary <= 0) {
    toast.add({ title: 'Error', description: 'Base salary is required', color: 'error' })
    return
  }

  submitting.value = true
  try {
    const payload = {
      ...state.value,
      staffId: props.staffMember._id,
      active: 1 // Sets others to inactive on backend
    }

    await $api('/salaries', {
      method: 'POST',
      body: payload
    })
    toast.add({ title: 'Success', description: 'Salary recorded successfully', color: 'success' })
    resetForm()
    refresh()
  } catch (error: any) {
    toast.add({ title: 'Error', description: error.data?.message || 'Failed to record salary', color: 'error' })
  } finally {
    submitting.value = false
  }
}

async function handleDelete(id: string) {
  if (!confirm('Are you sure you want to delete this salary record?')) return
  try {
    await $api(`/salaries/${id}`, { method: 'DELETE' })
    toast.add({ title: 'Success', description: 'Record deleted', color: 'success' })
    refresh()
  } catch (error: any) {
    toast.add({ title: 'Error', description: 'Failed to delete record', color: 'error' })
  }
}

const columns = [
  {
    accessorKey: 'effectiveDate',
    header: 'Date',
    cell: ({ row }: any) => new Date(row.original.effectiveDate || row.original.createdAt).toLocaleDateString()
  },
  {
    accessorKey: 'baseSalary',
    header: 'Base Salary',
    cell: ({ row }: any) => `$${Number(row.original.baseSalary || 0).toFixed(2)}`
  },
  {
    accessorKey: 'active',
    header: 'Status',
    cell: ({ row }: any) => h(resolveComponent('UBadge'), {
      color: row.original.active === 1 ? 'success' : 'neutral',
      variant: 'subtle',
      label: row.original.active === 1 ? 'Active' : 'Inactive'
    })
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }: any) => h(resolveComponent('UButton'), {
      icon: 'i-lucide-trash',
      color: 'error',
      variant: 'ghost',
      size: 'xs',
      onClick: () => handleDelete(row.original._id)
    })
  }
]
</script>

<template>
  <UModal v-model:open="open" size="xl">
    <template #header>
      <h3 class="text-lg font-semibold">
        {{ staffMember?.nameEn || staffMember?.nameKh }} - Salary History
      </h3>
    </template>
    <template #body>
      <div class="space-y-6">
        <div class="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
          <h4 class="font-medium mb-4">
            Add New Salary Record
          </h4>
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Base Salary" required>
              <UInput
                v-model.number="state.baseSalary"
                type="number"
                min="0"
                step="0.01"
              />
            </UFormField>
            <UFormField label="Effective Date">
              <UInput v-model="state.effectiveDate" type="date" />
            </UFormField>
            <UFormField label="Position Allowance">
              <UInput
                v-model.number="state.positionAllowance"
                type="number"
                min="0"
                step="0.01"
              />
            </UFormField>
            <UFormField label="Transport Allowance">
              <UInput
                v-model.number="state.transportAllowance"
                type="number"
                min="0"
                step="0.01"
              />
            </UFormField>
          </div>
          <div class="mt-4 flex justify-end">
            <UButton :loading="submitting" @click="handleSubmit">
              Add Record
            </UButton>
          </div>
        </div>

        <div>
          <h4 class="font-medium mb-4">
            History
          </h4>
          <div class="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-lg">
            <UTable
              :columns="columns"
              :data="salaries"
              :loading="status === 'pending'"
              class="w-full"
              :ui="{
                td: 'py-2 px-4 text-sm',
                th: 'py-2 px-4 font-semibold text-sm bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 text-left'
              }"
            />
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
