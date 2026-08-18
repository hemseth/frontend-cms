<script setup lang="ts">
import { ref, computed, h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'

const { t } = useI18n()
const toast = useToast()

const searchQuery = ref('')
const selectedType = ref<string | undefined>()
const selectedDosageForm = ref<string | undefined>()

// --- PAGINATION STATE ---
const page = ref(1)
const limit = ref<number>(20)

// --- BRANCH STATE ---
const branch = useBranch()
const auth = useAuth()

const { data: categoriesResult } = await useAsyncData('medicine-categories-list', () => $api('/medicine-categories'), {
  default: () => ({ data: [] })
})

const { data: dosageFormsResult } = await useAsyncData('dosage-forms-list', () => $api('/dosage-forms'), {
  default: () => ({ data: [] })
})

const { locale } = useI18n()

const medicineTypeOptions = computed(() => {
  return ((categoriesResult.value as any)?.data || []).map((t: any) => ({
    label: locale.value === 'km' ? t.nameKh : t.nameEn,
    value: t._id
  }))
})

const dosageFormOptions = computed(() => {
  return ((dosageFormsResult.value as any)?.data || []).map((d: any) => ({
    label: locale.value === 'km' ? d.nameKh : d.nameEn,
    value: d._id
  }))
})

const { data: unitsResult } = await useAsyncData('units-list-medicines', () => $api('/units'), {
  default: () => ({ data: [] })
})

const unitOptions = computed(() => {
  return ((unitsResult.value as any)?.data || []).map((u: any) => ({
    label: locale.value === 'km' ? u.nameKh : u.nameEn,
    value: u._id
  }))
})

// --- RESET LOGIC ---
watch([searchQuery, selectedType, selectedDosageForm, limit], () => {
  page.value = 1
})

const categoryId = computed(() => {
  if (!selectedType.value) return undefined
  return typeof selectedType.value === 'object' ? (selectedType.value as any).value : selectedType.value
})

const dosageFormId = computed(() => {
  if (!selectedDosageForm.value) return undefined
  return typeof selectedDosageForm.value === 'object' ? (selectedDosageForm.value as any).value : selectedDosageForm.value
})

const { data: result, status, refresh } = await useAsyncData('medicines', () => {
  const params: any = {
    search: searchQuery.value,
    category: categoryId.value,
    dosageForm: dosageFormId.value,
    limit: limit.value,
    skip: (page.value - 1) * limit.value
  }

  if (branch.currentBranchId.value) {
    params.branchId = branch.currentBranchId.value
  }

  return $api<{ data: any[], total: number }>('/medicines', { params })
}, {
  watch: [searchQuery, selectedType, selectedDosageForm, page, limit, () => branch.currentBranchId.value],
  default: () => ({ data: [], total: 0 })
})

const medicines = computed(() => (result.value as any)?.data || [])
const total = computed(() => (result.value as any)?.total || 0)
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
    header: t('medicine.code')
  },
  {
    accessorKey: 'nameEn',
    header: t('medicine.name')
  },
  {
    accessorKey: 'nameKh',
    header: t('medicine.nameKh')
  },
  {
    accessorKey: 'dosage',
    header: t('medicine.dosage')
  },
  {
    accessorKey: 'category',
    header: t('medicine.type'),
    cell: ({ row }) => {
      const type = row.original.category
      if (!type) return '-'

      if (typeof type === 'object') {
        return locale.value === 'km' ? type.nameKh : type.nameEn
      }

      // Try lookup by ID or Name (for legacy data)
      const categories = (categoriesResult.value as any)?.data || []
      const found = categories.find((c: any) =>
        c._id === type
        || c.nameEn?.toLowerCase() === type?.toLowerCase()
        || c.nameKh === type
      )

      if (found) {
        return locale.value === 'km' ? found.nameKh : found.nameEn
      }

      return type
    }
  },
  {
    accessorKey: 'dosageForm',
    header: locale.value === 'km' ? 'ទម្រង់' : 'Dosage Form',
    cell: ({ row }) => {
      const df = row.original.dosageForm
      if (!df) return '-'

      if (typeof df === 'object') {
        return locale.value === 'km' ? df.nameKh : df.nameEn
      }

      // Try lookup by ID or Name (for legacy data)
      const forms = (dosageFormsResult.value as any)?.data || []
      const found = forms.find((d: any) =>
        d._id === df
        || d.nameEn?.toLowerCase() === df?.toLowerCase()
        || d.nameKh === df
      )

      if (found) {
        return locale.value === 'km' ? found.nameKh : found.nameEn
      }

      return df
    }
  },
  {
    accessorKey: 'unit',
    header: t('medicine.unit'),
    cell: ({ row }) => {
      const unit = row.original.unit
      if (!unit) return '-'

      if (typeof unit === 'object') {
        return locale.value === 'km' ? unit.nameKh : unit.nameEn
      }

      // Try lookup (for legacy data or single ID)
      const found = unitOptions.value.find((o: any) => o.value === unit)
      return found ? found.label : unit
    }
  },
  {
    accessorKey: 'price',
    header: t('medicine.price'),
    cell: ({ row }) => `$${Number(row.original.price).toFixed(2)}`
  },
  {
    accessorKey: 'stock',
    header: t('medicine.stock'),
    cell: ({ row }) => {
      const stock = Number(row.original.stock)
      const color = stock > 50 ? 'success' : stock > 10 ? 'warning' : 'error'
      return h(resolveComponent('UBadge'), {
        label: stock.toString(),
        color,
        variant: 'subtle'
      })
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
          label: 'Edit',
          icon: 'i-lucide-pencil',
          onSelect: () => editMedicine(row.original)
        },
        {
          type: 'separator'
        },
        {
          label: 'Delete',
          icon: 'i-lucide-trash',
          color: 'error' as const,
          onSelect: () => confirmDelete(row.original)
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

const isAddModalOpen = ref(false)
const isDeleteModalOpen = ref(false)
const isDeleting = ref(false)
const selectedMedicine = ref<any>(null)

function editMedicine(medicine: any) {
  selectedMedicine.value = medicine
  isAddModalOpen.value = true
}

function confirmDelete(medicine: any) {
  selectedMedicine.value = medicine
  isDeleteModalOpen.value = true
}

async function handleDelete() {
  if (!selectedMedicine.value) return
  isDeleting.value = true
  try {
    await $api(`/medicines/${selectedMedicine.value._id}`, { method: 'DELETE' })
    toast.add({ title: 'Success', description: 'Medicine deleted successfully', color: 'success' })
    refresh()
    isDeleteModalOpen.value = false
  } catch (error: any) {
    toast.add({ title: 'Error', description: error.data?.message || 'Failed to delete medicine', color: 'error' })
  } finally {
    isDeleting.value = false
    selectedMedicine.value = null
  }
}

function openAddModal() {
  selectedMedicine.value = null
  isAddModalOpen.value = true
}

function handleSuccess() {
  refresh()
}

function onAddModalClose(open: boolean) {
  if (!open) {
    selectedMedicine.value = null
  }
}

function resetFilters() {
  searchQuery.value = ''
  selectedType.value = undefined
  selectedDosageForm.value = undefined
}

const fileInput = ref<HTMLInputElement | null>(null)

function triggerImport() {
  fileInput.value?.click()
}

async function exportToExcelFile() {
  if (!import.meta.client) return

  const params: any = {
    search: searchQuery.value,
    category: categoryId.value,
    dosageForm: dosageFormId.value,
    limit: 100000,
    skip: 0
  }
  if (branch.currentBranchId.value) {
    params.branchId = branch.currentBranchId.value
  }
  const allResult = await $api<{ data: any[] }>('/medicines', { params })
  const allMedicines = allResult?.data || []

  const headers = [
    { header: 'ID', key: 'id', width: 25 },
    { header: 'Code', key: 'code', width: 15 },
    { header: 'Name En', key: 'nameEn', width: 25 },
    { header: 'Name Kh', key: 'nameKh', width: 25 },
    { header: 'Dosage', key: 'dosage', width: 15 },
    { header: 'Type', key: 'category', width: 20 },
    { header: 'Dosage Form', key: 'dosageForm', width: 20 },
    { header: 'Unit', key: 'unit', width: 15 },
    { header: 'Price', key: 'price', width: 10 },
    { header: 'Stock', key: 'stock', width: 10 },
    { header: 'Status', key: 'status', width: 10 }
  ]

  const data = allMedicines.map((m: any) => ({
    id: m._id || '',
    code: m.code || '',
    nameEn: m.nameEn || '',
    nameKh: m.nameKh || '',
    dosage: m.dosage || '',
    category: typeof m.category === 'object' ? m.category?.nameEn : m.category,
    dosageForm: typeof m.dosageForm === 'object' ? m.dosageForm?.nameEn : m.dosageForm,
    unit: typeof m.unit === 'object' ? m.unit?.nameEn : m.unit,
    price: m.price || 0,
    stock: m.stock || 0,
    status: m.status || 'active'
  }))

  const XLSX = await import('xlsx')
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Medicines')
  XLSX.writeFile(workbook, 'Medicines_Export.xlsx')
}

async function handleImport(event: Event) {
  if (!import.meta.client) return

  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  const XLSX = await import('xlsx')
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer)
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return
  const worksheet = workbook.Sheets[sheetName]
  if (!worksheet) return
  const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[]

  const resolveReferenceId = (value: any, items: any[]) => {
    const text = String(value ?? '').trim()
    if (!text) return ''
    const found = items.find((item: any) =>
      item._id === text
      || item.nameEn?.toLowerCase() === text.toLowerCase()
      || item.nameKh === text
      || item.key?.toLowerCase() === text.toLowerCase()
    )
    return found?._id || text
  }

  const categories = (categoriesResult.value as any)?.data || []
  const dosageForms = (dosageFormsResult.value as any)?.data || []
  const units = (unitsResult.value as any)?.data || []
  let successCount = 0
  let errorCount = 0
  const errors: string[] = []

  for (const rowData of jsonData) {
    try {
      const categoryValue = rowData['Category ID'] || rowData['categoryId'] || rowData['Type'] || rowData['categoryName'] || ''
      const dosageFormValue = rowData['Dosage Form ID'] || rowData['dosageFormId'] || rowData['Dosage Form'] || rowData['dosageFormName'] || ''
      const unitValue = rowData['Unit ID'] || rowData['unit'] || rowData['Unit'] || rowData['unitName'] || ''
      const retailPrice = Number(rowData['Retail Price'] ?? rowData['retailPrice'] ?? rowData['Price'] ?? rowData['price'] ?? 0)
      const payload = {
        code: String(rowData['Code'] ?? rowData['code'] ?? '').trim(),
        atcCode: String(rowData['ATC Code'] ?? rowData['atcCode'] ?? '').trim() || undefined,
        nameEn: String(rowData['Name En'] ?? rowData['nameEn'] ?? '').trim(),
        nameKh: String(rowData['Name Kh'] ?? rowData['nameKh'] ?? '').trim(),
        brandName: String(rowData['Brand'] ?? rowData['brandName'] ?? '').trim() || undefined,
        categoryId: resolveReferenceId(categoryValue, categories),
        dosageFormId: resolveReferenceId(dosageFormValue, dosageForms),
        unit: resolveReferenceId(unitValue, units),
        route: String(rowData['Route'] ?? rowData['route'] ?? 'Oral').trim(),
        strength: String(rowData['Strength'] ?? rowData['strength'] ?? rowData['Dosage'] ?? rowData['dosage'] ?? '').trim(),
        retailPrice,
        wholesalePrice: Number(rowData['Wholesale Price'] ?? rowData['wholesalePrice'] ?? 0),
        currency: String(rowData['Currency'] ?? rowData['currency'] ?? 'USD').trim(),
        stock: Number(rowData['Stock'] ?? rowData['stock'] ?? 0),
        conversionRate: Number(rowData['Conversion Rate'] ?? rowData['conversionRate'] ?? 1),
        baseUnit: String(rowData['Base Unit'] ?? rowData['baseUnit'] ?? 'pill').trim(),
        saleUnit: String(rowData['Sale Unit'] ?? rowData['saleUnit'] ?? 'unit').trim(),
        minStockAlert: Number(rowData['Min Stock Alert'] ?? rowData['minStockAlert'] ?? 10),
        instructionEn: String(rowData['Instruction En'] ?? rowData['instructionEn'] ?? '').trim() || undefined,
        instructionKh: String(rowData['Instruction Kh'] ?? rowData['instructionKh'] ?? '').trim() || undefined,
        sideEffects: String(rowData['Side Effects'] ?? rowData['sideEffects'] ?? '').split(';').map((s: string) => s.trim()).filter(Boolean),
        status: rowData['Status'] ?? rowData['status'] ?? 'active'
      }

      const required = ['code', 'nameEn', 'nameKh', 'categoryId', 'dosageFormId', 'unit', 'strength']
      const missing = required.filter(key => !payload[key as keyof typeof payload])
      if (missing.length) throw new Error(`Missing required fields: ${missing.join(', ')}`)

      const existingId = rowData['ID'] ? String(rowData['ID']).trim() : ''
      if (existingId) {
        await $api(`/medicines/${existingId}`, { method: 'PUT', body: payload })
      } else {
        await $api('/medicines', { method: 'POST', body: payload })
      }
      successCount++
    } catch (err: any) {
      console.error('Import error:', err)
      errorCount++
      errors.push(`${rowData['Code'] || rowData['code'] || 'unknown'}: ${err?.data?.message || err?.message || 'Import failed'}`)
    }
  }

  toast.add({
    title: 'Import Result',
    description: `Successfully imported ${successCount} medicines.${errorCount ? ` ${errorCount} failed: ${errors.slice(0, 2).join(' | ')}` : ''}`,
    color: errorCount ? 'warning' : 'success'
  })
  refresh()
  if (fileInput.value) fileInput.value.value = ''
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <UBreadcrumb :items="[{ label: t('nav.home'), to: '/' }, { label: t('medicine.title') }]" />
      <UButton
        icon="i-lucide-plus"
        :label="t('common.addNew')"
        color="primary"
        @click="openAddModal"
      />
    </div>
    <UCard>
      <template #header>
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold">
              {{ t('medicine.medicineList') }}
            </h2>
          </div>
          <div class="flex items-center gap-2">
            <UInput
              v-model="searchQuery"
              :placeholder="t('medicine.search')"
              icon="i-lucide-search"
              class="flex-1"
            />
            <USelectMenu
              v-model="selectedType"
              :items="medicineTypeOptions"
              value-key="value"
              class="w-48"
              :placeholder="t('medicine.type')"
              clearable
            />
            <USelectMenu
              v-model="selectedDosageForm"
              :items="dosageFormOptions"
              value-key="value"
              class="w-48"
              placeholder="Dosage Form"
              clearable
            />
            <div class="ml-auto flex items-center gap-2">
              <UButton
                color="error"
                variant="outline"
                icon="i-lucide-rotate-ccw"
                :label="t('common.reset')"
                @click="resetFilters"
              />
              <input
                ref="fileInput"
                type="file"
                accept=".xlsx,.xls"
                class="hidden"
                @change="handleImport"
              />
              <UButton
                icon="i-lucide-download"
                :label="t('common.export')"
                color="neutral"
                variant="outline"
                @click="exportToExcelFile"
              />
              <UButton
                icon="i-lucide-upload"
                :label="t('common.import')"
                color="neutral"
                variant="outline"
                @click="triggerImport"
              />
            </div>
          </div>
        </div>
      </template>

      <div class="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-lg">
        <UTable
          :columns="columns"
          :data="medicines"
          :loading="status === 'pending'"
          class="w-full"
          :ui="{
            td: 'py-1 px-4 text-sm',
            th: 'py-1.5 px-4 font-semibold text-sm bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 text-left'
          }"
        />
      </div>

      <template #footer>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="flex items-center gap-2 text-sm text-gray-500">
              {{ t('pagination.perPage') }}:
              <USelectMenu v-model="limit" :items="[10, 20, 50, 100]" class="w-20" />
            </div>
            <span class="text-sm text-gray-500">
              {{ t('pagination.total') || 'Total' }}: {{ total }}
            </span>
          </div>
          <div class="flex gap-2">
            <UButton
              :label="t('pagination.prev') || 'Back'"
              icon="i-lucide-chevron-left"
              :disabled="!hasPrevPage"
              color="success"
              @click="page--"
            />
            <UButton
              :label="t('pagination.next') || 'Next'"
              trailing-icon="i-lucide-chevron-right"
              :disabled="!hasNextPage"
              color="success"
              @click="page++"
            />
          </div>
        </div>
      </template>
    </UCard>

    <!-- Add/Edit Medicine Modal -->
    <MedicinesAddModal
      v-model:open="isAddModalOpen"
      :medicine="selectedMedicine"
      @success="handleSuccess"
      @update:open="onAddModalClose"
    />

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="isDeleteModalOpen" title="Confirm Delete">
      <template #body>
        <p>Are you sure you want to delete medicine <strong>{{ selectedMedicine?.name }}</strong>?</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            @click="isDeleteModalOpen = false"
          />
          <UButton
            label="Delete"
            color="error"
            :loading="isDeleting"
            @click="handleDelete"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
