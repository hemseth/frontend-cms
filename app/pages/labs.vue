<script setup lang="ts">
import { ref, computed } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import ResultEntryModal from '~/components/opd/partials/ResultEntryModal.vue'

const toast = useToast()
const { t } = useI18n()

// Filters
const statusFilter = ref('')
const dateFrom = ref(new Date().toISOString().split('T')[0])
const dateTo = ref(new Date().toISOString().split('T')[0])

// Selected Lab for Result Entry
const isResultModalOpen = ref(false)
const selectedLab = ref<any>(null)

// API Fetching
const { data: labsResponse, refresh, pending } = await useAsyncData('labs', () =>
  $api('/labs', {
    params: {
      status: statusFilter.value || undefined,
      dateFrom: dateFrom.value,
      dateTo: dateTo.value
    }
  }), {
  watch: [statusFilter, dateFrom, dateTo]
}
)

const labs = computed(() => labsResponse.value?.data || [])

const columns: TableColumn<any>[] = [
  {
    accessorKey: 'patientId',
    header: 'Patient',
    cell: ({ row }) => {
      const p = row.original.patientId
      if (!p) return 'N/A'
      return h('div', { class: 'flex flex-col' }, [
        h('span', { class: 'font-bold text-highlighted' }, p.nameEn || p.nameKh),
        h('span', { class: 'text-xs text-muted' }, `#${p.pId || p.code || '?'}`)
      ])
    }
  },
  {
    accessorKey: 'serviceName',
    header: 'Test Name',
    cell: ({ row }) => h('div', { class: 'flex flex-col' }, [
      h('span', { class: 'font-medium' }, row.original.serviceName),
      h('span', { class: 'text-[10px] text-dimmed uppercase tracking-wider' }, row.original.category)
    ])
  },
  {
    accessorKey: 'requestedAt',
    header: 'Requested At',
    cell: ({ row }) => {
      const date = new Date(row.original.requestedAt)
      return date.toLocaleString()
    }
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const s = row.original.status
      let color: 'neutral' | 'success' | 'warning' | 'error' | 'primary' = 'neutral'
      if (s === 'completed') color = 'success'
      else if (s === 'in-progress') color = 'warning'
      else if (s === 'pending') color = 'primary'

      return h(resolveComponent('UBadge'), {
        label: s.toUpperCase(),
        color,
        variant: 'soft',
        size: 'xs'
      })
    }
  },
  {
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => {
      return h(resolveComponent('UButton'), {
        icon: 'i-lucide-flask-conical',
        label: row.original.status === 'completed' ? 'Edit Results' : 'Enter Results',
        color: row.original.status === 'completed' ? 'neutral' : 'primary',
        variant: 'solid',
        size: 'xs',
        onClick: () => openResultEntry(row.original)
      })
    }
  }
]

function openResultEntry(lab: any) {
  // Map lab request to the format expected by ResultEntryModal (which uses .name for title)
  selectedLab.value = {
    ...lab,
    name: lab.serviceName
  }
  isResultModalOpen.value = true
}

async function saveResults() {
  if (!selectedLab.value) return

  try {
    await $api(`/labs/${selectedLab.value._id}`, {
      method: 'PUT',
      body: {
        parameters: selectedLab.value.parameters,
        result: selectedLab.value.result
      }
    })

    toast.add({
      title: 'Success',
      description: 'Results saved successfully',
      color: 'success'
    })

    refresh()
  } catch (e: any) {
    toast.add({
      title: 'Error',
      description: e.message || 'Failed to save results',
      color: 'error'
    })
  }
}
</script>

<template>
  <div class="h-full flex flex-col p-4 bg-muted">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-black text-highlighted flex items-center gap-2">
          <UIcon name="i-lucide-flask-conical" class="text-primary-500" />
          Laboratory Dashboard
        </h1>
        <p class="text-muted text-sm">
          Manage test requests and enter results for patients.
        </p>
      </div>

      <div class="flex items-center gap-2 bg-default p-1.5 rounded-lg border border-default shadow-sm px-3">
        <UDateInput
          v-model="dateFrom"
          size="sm"
          variant="none"
          class="w-28"
          icon=""
        />
        <span class="text-dimmed">to</span>
        <UDateInput
          v-model="dateTo"
          size="sm"
          variant="none"
          class="w-28"
          icon=""
        />
        <div class="w-px h-6 bg-accented mx-1" />
        <USelect
          v-model="statusFilter"
          :options="[
            { label: 'All Status', value: '' },
            { label: 'Pending', value: 'pending' },
            { label: 'In Progress', value: 'in-progress' },
            { label: 'Completed', value: 'completed' }
          ]"
          size="sm"
          variant="none"
        />
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="ghost"
          :loading="pending"
          @click="() => refresh()"
        />
      </div>
    </div>

    <div class="flex-1 overflow-hidden bg-default rounded-xl border border-default shadow-sm flex flex-col">
      <UTable
        :columns="columns"
        :rows="labs"
        :loading="pending"
        class="flex-1"
        :ui="{
          thead: 'bg-muted/50',
          th: 'uppercase tracking-wider text-[10px] py-3'
        }"
      />
    </div>

    <!-- Reusing the Result Modal from OPD -->
    <ResultEntryModal
      v-model:open="isResultModalOpen"
      :service="selectedLab"
      @save="saveResults"
    />
  </div>
</template>

<style scoped>
/* Optional styling */
</style>
