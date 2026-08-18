<script setup lang="ts">
import { ref, computed, watch, h, resolveComponent } from 'vue'
import { refDebounced } from '@vueuse/core'
import type { TableColumn } from '@nuxt/ui'
import {
  IMPORT_REQUIRED_COLUMNS,
  findColumnIndex,
  parseImportRows,
  readWorksheetHeaders,
  validateImportRows,
  type ImportResult,
  type ImportRowError,
  type SpecializationStatus,
  type ValidImportRow
} from '~/utils/specializationImport'

interface Specialization {
  _id: string
  nameKh: string
  nameEn: string
  description?: string
  status: SpecializationStatus
  createdAt?: string
  updatedAt?: string
}

interface SpecializationListResponse {
  data: Specialization[]
  total: number
}

interface SpecializationPayload {
  nameKh: string
  nameEn: string
  description?: string
  status: SpecializationStatus
}

const EXPORT_BATCH_SIZE = 500
const IMPORT_CONCURRENCY = 5
const MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024
const MAX_IMPORT_ROWS = 5000

const { t } = useI18n()
const toast = useToast()

const searchQuery = ref('')
const debouncedSearch = refDebounced(searchQuery, 300)
const isModalOpen = ref(false)
const selectedSpecialization = ref<Specialization | null>(null)
const isDeleting = ref(false)
const isDeleteModalOpen = ref(false)
const isImporting = ref(false)
const isExporting = ref(false)
const page = ref(1)
const limit = ref(20)

async function fetchSpecializations(): Promise<SpecializationListResponse> {
  return $api('/specializations', {
    params: {
      search: debouncedSearch.value,
      limit: limit.value,
      skip: (page.value - 1) * limit.value
    }
  })
}

const { data: result, status, refresh } = await useAsyncData('specializations', fetchSpecializations, {
  watch: [debouncedSearch, page, limit],
  default: () => ({ data: [], total: 0 })
})

const specializations = computed<Specialization[]>(() => result.value?.data ?? [])
const total = computed<number>(() => result.value?.total ?? 0)
const totalPages = computed(() => (total.value === 0 ? 0 : Math.ceil(total.value / limit.value)))
const hasPrevPage = computed(() => page.value > 1)
const hasNextPage = computed(() => totalPages.value > 0 && page.value < totalPages.value)

watch(debouncedSearch, () => {
  page.value = 1
}, { flush: 'sync' })

watch(limit, () => {
  page.value = 1
}, { flush: 'sync' })

watch(total, (newTotal) => {
  const maxPage = Math.max(1, Math.ceil(newTotal / limit.value))
  if (page.value > maxPage) {
    page.value = maxPage
  }
})

const columns: TableColumn<Specialization>[] = [
  {
    id: 'no',
    header: t('common.number'),
    cell: ({ row }) => (page.value - 1) * limit.value + row.index + 1
  },
  {
    accessorKey: 'nameKh',
    header: t('specialization.nameKh')
  },
  {
    accessorKey: 'nameEn',
    header: t('specialization.nameEn')
  },
  {
    accessorKey: 'status',
    header: t('specialization.status'),
    cell: ({ row }) => {
      return h(resolveComponent('UBadge'), {
        label: row.original.status === 'active' ? t('common.active') : t('common.inactive'),
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
          onSelect: () => editSpecialization(row.original)
        },
        {
          type: 'separator'
        },
        {
          label: t('common.delete'),
          icon: 'i-lucide-trash',
          color: 'error' as const,
          onSelect: () => confirmDelete(row.original)
        }
      ]

      return h(resolveComponent('UDropdownMenu'), {
        items: [items]
      }, {
        default: () => h(resolveComponent('UButton'), {
          'icon': 'i-lucide-more-vertical',
          'color': 'neutral',
          'variant': 'ghost',
          'aria-label': t('common.actions')
        })
      })
    }
  }
]

function editSpecialization(item: Specialization) {
  selectedSpecialization.value = item
  isModalOpen.value = true
}

function confirmDelete(item: Specialization) {
  selectedSpecialization.value = item
  isDeleteModalOpen.value = true
}

async function handleDelete() {
  const item = selectedSpecialization.value
  if (!item?._id || isDeleting.value) return

  isDeleting.value = true
  try {
    await $api(`/specializations/${item._id}`, { method: 'DELETE' })
    toast.add({ title: t('common.success'), description: t('messages.deleteSuccess'), color: 'success' })
    isDeleteModalOpen.value = false
    selectedSpecialization.value = null
    await refresh()
  } catch (error: unknown) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(error, t('messages.errorOccurred')), color: 'error' })
  } finally {
    isDeleting.value = false
  }
}

function openAddModal() {
  selectedSpecialization.value = null
  isModalOpen.value = true
}

function onModalOpenChange(open: boolean) {
  isModalOpen.value = open
  if (!open) {
    selectedSpecialization.value = null
  }
}

function handleSuccess() {
  selectedSpecialization.value = null
  isModalOpen.value = false
  refresh()
}

function resetFilters() {
  searchQuery.value = ''
  page.value = 1
}

const fileInput = ref<HTMLInputElement | null>(null)
const lastImportErrors = ref<ImportRowError[]>([])

function triggerImport() {
  fileInput.value?.click()
}

function sanitizeExcelCell(value: unknown): string {
  const text = String(value ?? '')
  return /^[=+\-@]/.test(text) ? `'${text}` : text
}

async function exportToExcelFile() {
  if (!import.meta.client || isExporting.value) return

  isExporting.value = true
  try {
    const rows: Specialization[] = []
    let fetched = 0
    let batchTotal = 0
    do {
      const res = await $api('/specializations', {
        params: { search: searchQuery.value, limit: EXPORT_BATCH_SIZE, skip: fetched }
      })
      const batch = res?.data ?? []
      batchTotal = res?.total ?? 0
      rows.push(...batch)
      fetched += batch.length
      if (batch.length === 0) break
    } while (fetched < batchTotal)

    const ExcelJS = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Specializations')
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 25 },
      { header: 'Name (KH)', key: 'nameKh', width: 20 },
      { header: 'Name (EN)', key: 'nameEn', width: 20 },
      { header: 'Status', key: 'status', width: 10 }
    ]
    for (const item of rows) {
      worksheet.addRow({
        id: sanitizeExcelCell(item._id),
        nameKh: sanitizeExcelCell(item.nameKh),
        nameEn: sanitizeExcelCell(item.nameEn),
        status: sanitizeExcelCell(item.status)
      })
    }
    worksheet.getRow(1).font = { bold: true }

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'Specializations_Export.xlsx'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    window.URL.revokeObjectURL(url)

    toast.add({ title: t('common.success'), description: t('specialization.exportSuccess', { count: rows.length }), color: 'success' })
  } catch (error: unknown) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(error, t('specialization.exportFailed')), color: 'error' })
  } finally {
    isExporting.value = false
  }
}

async function upsertSpecialization(id: string | undefined, payload: SpecializationPayload): Promise<void> {
  if (id) {
    await $api(`/specializations/${id}`, { method: 'PUT', body: payload })
  } else {
    await $api('/specializations', { method: 'POST', body: payload })
  }
}

async function mapWithConcurrency<T>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<void>
): Promise<void> {
  let cursor = 0
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++
      const item = items[index]
      if (item === undefined) continue
      await fn(item, index)
    }
  })
  await Promise.all(workers)
}

async function importSpecializationsFromFile(file: File): Promise<ImportResult> {
  // Phase A — parse + validate (no API request is made here)
  let workbook: import('exceljs').Workbook
  try {
    const arrayBuffer = await file.arrayBuffer()
    workbook = new (await import('exceljs')).Workbook()
    await workbook.xlsx.load(arrayBuffer)
  } catch {
    throw new Error(t('specialization.invalidWorkbook'))
  }

  const worksheet = workbook.worksheets[0]
  if (!worksheet) {
    throw new Error(t('specialization.missingWorksheet'))
  }

  const indexByName = readWorksheetHeaders(worksheet)
  const missing = IMPORT_REQUIRED_COLUMNS.filter(col => findColumnIndex(indexByName, col) === undefined)
  if (missing.length > 0) {
    throw new Error(t('specialization.missingColumns', { columns: missing.join(', ') }))
  }

  const parsedRows = parseImportRows(worksheet, indexByName)
  if (parsedRows.length === 0) {
    throw new Error(t('specialization.noRows'))
  }

  if (parsedRows.length > MAX_IMPORT_ROWS) {
    throw new Error(t('specialization.importTooManyRows', { max: MAX_IMPORT_ROWS }))
  }

  const { valid, errors } = validateImportRows(parsedRows, key => t(key))
  const importResult: ImportResult = {
    totalRows: parsedRows.length,
    validRows: valid.length,
    importedRows: 0,
    failedRows: errors.length,
    errors: [...errors]
  }

  // Phase B — import only the validated rows, with bounded concurrency
  await mapWithConcurrency(valid, IMPORT_CONCURRENCY, async (row: ValidImportRow) => {
    try {
      await upsertSpecialization(row.id, { nameKh: row.nameKh, nameEn: row.nameEn, status: row.status })
      importResult.importedRows++
    } catch (error: unknown) {
      importResult.failedRows++
      importResult.errors.push({ row: row.row, field: '', message: getApiErrorMessage(error, t('messages.errorOccurred')) })
    }
  })

  return importResult
}

async function handleImport(event: Event) {
  if (!import.meta.client || isImporting.value) return

  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  isImporting.value = true
  lastImportErrors.value = []
  try {
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      throw new Error(t('specialization.unsupportedFileType'))
    }
    if (file.size > MAX_IMPORT_FILE_SIZE) {
      throw new Error(t('specialization.fileTooLarge'))
    }

    const result = await importSpecializationsFromFile(file)
    if (result.failedRows === 0) {
      toast.add({ title: t('specialization.importResult'), description: t('specialization.importSuccess', { count: result.importedRows }), color: 'success' })
    } else {
      lastImportErrors.value = result.errors.slice(0, 100)
      toast.add({
        title: t('specialization.importResult'),
        description: t('specialization.importSummaryDetail', { imported: result.importedRows, total: result.totalRows, failed: result.failedRows }),
        color: 'warning'
      })
    }
    await refresh()
  } catch (error: unknown) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(error, t('messages.errorOccurred')), color: 'error' })
  } finally {
    isImporting.value = false
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <UBreadcrumb
        :items="[{ label: t('nav.home'), to: '/' }, { label: t('settings.title'), to: '/settings' }, { label: t('specialization.title') }]"
      />
      <UButton
        icon="i-lucide-plus"
        :label="t('common.add')"
        @click="openAddModal"
      />
    </div>

    <UCard :ui="{ header: 'p-4 sm:px-6', body: 'p-0' }">
      <template #header>
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold">
              {{ t('specialization.title') }}
            </h2>
          </div>

          <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
            <UInput
              v-model="searchQuery"
              :placeholder="t('common.search')"
              icon="i-lucide-search"
              class="w-full sm:flex-1"
            />
            <div class="flex flex-wrap items-center gap-2">
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
                accept=".xlsx"
                class="hidden"
                @change="handleImport"
              >
              <UButton
                icon="i-lucide-download"
                :label="t('common.export')"
                color="neutral"
                variant="outline"
                :loading="isExporting"
                :disabled="isExporting"
                @click="exportToExcelFile"
              />
              <UButton
                icon="i-lucide-upload"
                :label="t('common.import')"
                color="neutral"
                variant="outline"
                :loading="isImporting"
                :disabled="isImporting"
                @click="triggerImport"
              />
            </div>
          </div>
        </div>
      </template>

      <div class="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-lg">
        <UTable
          :columns="columns"
          :data="specializations"
          :loading="status === 'pending'"
          :empty="t('common.noData')"
          class="w-full"
          :ui="{
            td: 'py-1 px-4 text-sm',
            th: 'py-1.5 px-4 font-semibold text-sm bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 text-left'
          }"
        />
      </div>

      <div v-if="lastImportErrors.length > 0" class="border-t border-gray-200 dark:border-gray-800 p-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-red-600 dark:text-red-400">{{ t('specialization.importErrorsTitle') }}</span>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="xs"
            :aria-label="t('common.close')"
            @click="lastImportErrors = []"
          />
        </div>
        <ul class="list-disc list-inside text-sm text-red-600 dark:text-red-400 space-y-1 max-h-48 overflow-auto">
          <li v-for="err in lastImportErrors" :key="`${err.row}-${err.field}-${err.message}`">
            {{ t('specialization.rowLabel') }} {{ err.row }}: {{ err.message }}
          </li>
        </ul>
      </div>

      <template #footer>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex flex-wrap items-center gap-4">
            <div class="flex items-center gap-2 text-sm text-gray-500">
              {{ t('pagination.perPage') }}:
              <USelectMenu v-model="limit" :items="[10, 20, 50, 100]" class="w-20" />
            </div>
            <span class="text-sm text-gray-500">{{ t('pagination.total') }}: {{ total }}</span>
          </div>
          <div class="flex gap-2">
            <UButton
              :label="t('common.back')"
              icon="i-lucide-chevron-left"
              :disabled="!hasPrevPage"
              @click="page--"
            />
            <UButton
              :label="t('pagination.next')"
              trailing-icon="i-lucide-chevron-right"
              :disabled="!hasNextPage"
              @click="page++"
            />
          </div>
        </div>
      </template>
    </UCard>

    <SettingsSpecializationModal
      :open="isModalOpen"
      :specialization="selectedSpecialization"
      @update:open="onModalOpenChange"
      @success="handleSuccess"
    />

    <UModal v-model:open="isDeleteModalOpen" :title="t('common.confirm')">
      <template #body>
        <p>{{ t('specialization.deleteConfirm', { name: selectedSpecialization?.nameEn }) }}</p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            :label="t('common.cancel')"
            color="neutral"
            variant="subtle"
            @click="isDeleteModalOpen = false"
          />
          <UButton
            :label="t('common.delete')"
            color="error"
            :loading="isDeleting"
            :disabled="isDeleting"
            @click="handleDelete"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
