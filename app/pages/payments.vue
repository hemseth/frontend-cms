<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'

const toast = useToast()
const selectedPayment = ref<any>(null)

const branch = useBranch()

const { data: payments, refresh } = await useAsyncData<any>('payments', () =>
  $api('/payments', {
    params: {
      ...(branch.currentBranchId.value ? { branchId: branch.currentBranchId.value } : {})
    }
  }), {
  watch: [() => branch.currentBranchId.value]
})

const columns: TableColumn<any>[] = [
  {
    accessorKey: 'paymentId',
    header: 'Payment ID'
  },
  {
    accessorKey: 'patientId',
    header: 'Patient ID'
  },
  {
    accessorKey: 'visitId',
    header: 'Visit ID'
  },
  {
    accessorKey: 'amount',
    header: 'Amount',
    cell: ({ row }) => `${row.original.currency || 'USD'} ${row.original.amount.toFixed(2)}`
  },
  {
    accessorKey: 'method',
    header: 'Method',
    cell: ({ row }) => row.original.method || 'Other'
  },
  {
    accessorKey: 'source',
    header: 'Source',
    cell: ({ row }) => row.original.source || 'Medicine'
  },
  {
    accessorKey: 'paidAt',
    header: 'Paid At',
    cell: ({ row }) => {
      if (!row.original.paidAt) return 'N/A'
      const date = new Date(row.original.paidAt)
      return date.toLocaleString()
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
          onSelect: () => viewPayment(row.original)
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

function viewPayment(payment: any) {
  selectedPayment.value = payment
}
</script>

<template>
  <div>
    <UDashboardPage>
      <UDashboardPanel grow>
        <UDashboardNavbar title="Payments">
          <template #right>
            <UButton icon="i-lucide-download" label="Export" variant="outline" />
          </template>
        </UDashboardNavbar>

        <UDashboardPanelContent>
          <UTable :columns="columns" :rows="payments?.data || []" :loading="!payments" />
        </UDashboardPanelContent>
      </UDashboardPanel>
    </UDashboardPage>

    <!-- Payment Details Modal -->
    <UModal v-model="selectedPayment">
      <UCard v-if="selectedPayment">
        <template #header>
          <h3 class="text-lg font-semibold">
            Payment Details
          </h3>
        </template>

        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-500">
                Payment ID
              </p>
              <p class="font-semibold">
                {{ selectedPayment.paymentId }}
              </p>
            </div>
            <div>
              <p class="text-sm text-gray-500">
                Amount
              </p>
              <p class="font-semibold">
                {{ selectedPayment.currency }} {{ selectedPayment.amount }}
              </p>
            </div>
            <div>
              <p class="text-sm text-gray-500">
                Patient ID
              </p>
              <p class="font-semibold">
                {{ selectedPayment.patientId }}
              </p>
            </div>
            <div>
              <p class="text-sm text-gray-500">
                Visit ID
              </p>
              <p class="font-semibold">
                {{ selectedPayment.visitId }}
              </p>
            </div>
            <div>
              <p class="text-sm text-gray-500">
                Method
              </p>
              <p class="font-semibold">
                {{ selectedPayment.method }}
              </p>
            </div>
            <div>
              <p class="text-sm text-gray-500">
                Source
              </p>
              <p class="font-semibold">
                {{ selectedPayment.source }}
              </p>
            </div>
          </div>

          <div v-if="selectedPayment.items && selectedPayment.items.length">
            <p class="text-sm text-gray-500 mb-2">
              Items
            </p>
            <div class="border rounded-lg overflow-hidden">
              <table class="w-full">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-4 py-2 text-left text-sm font-medium">
                      Name
                    </th>
                    <th class="px-4 py-2 text-left text-sm font-medium">
                      Kind
                    </th>
                    <th class="px-4 py-2 text-right text-sm font-medium">
                      Qty
                    </th>
                    <th class="px-4 py-2 text-right text-sm font-medium">
                      Price
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(item, index) in selectedPayment.items" :key="index" class="border-t">
                    <td class="px-4 py-2">
                      {{ item.name }}
                    </td>
                    <td class="px-4 py-2">
                      {{ item.kind }}
                    </td>
                    <td class="px-4 py-2 text-right">
                      {{ item.quantity || 1 }}
                    </td>
                    <td class="px-4 py-2 text-right">
                      {{ item.price }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div v-if="selectedPayment.notes">
            <p class="text-sm text-gray-500">
              Notes
            </p>
            <p class="mt-1">
              {{ selectedPayment.notes }}
            </p>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end">
            <UButton
              label="Close"
              color="neutral"
              variant="ghost"
              @click="selectedPayment = null"
            />
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>
