<script setup lang="ts">
import { ref, computed, h, resolveComponent } from 'vue'

// One generic "child records of a staff member" section. Six of the profile
// tabs (spouse, children, experience, education, training, documents) are the
// same shape — list what exists, add a row, soft delete one — so they share
// this rather than repeating the fetch/submit/delete plumbing six times.
interface RecordField {
  key: string
  label: string
  type?: 'text' | 'date' | 'number' | 'select' | 'textarea'
  items?: Array<{ label: string, value: string | number }>
  required?: boolean
  full?: boolean
}
interface RecordColumn {
  key: string
  label: string
  format?: 'date' | 'gender' | 'year'
}

const props = defineProps<{
  staffId: string
  endpoint: string
  fields: RecordField[]
  columns: RecordColumn[]
  addLabel?: string
}>()

const { t } = useI18n()
const toast = useToast()

const rows = ref<any[]>([])
const loading = ref(false)
const submitting = ref(false)

const blankForm = () => Object.fromEntries(
  props.fields.map(f => [f.key, f.type === 'number' ? undefined : (f.type === 'select' ? (f.items?.[0]?.value ?? '') : '')])
) as Record<string, any>

const form = ref<Record<string, any>>(blankForm())

async function load() {
  if (!props.staffId) return
  loading.value = true
  try {
    const res: any = await $api(`/${props.endpoint}`, { params: { staffId: props.staffId } })
    rows.value = res?.data ?? []
  } catch {
    rows.value = []
  } finally {
    loading.value = false
  }
}

await load()
watch(() => props.staffId, load)

async function add() {
  const missing = props.fields.find(f => f.required && !form.value[f.key])
  if (missing) {
    toast.add({ title: t('common.error'), description: missing.label, color: 'error' })
    return
  }
  submitting.value = true
  try {
    const payload: Record<string, any> = { staffId: props.staffId }
    for (const [key, value] of Object.entries(form.value)) {
      if (value === '' || value === null || value === undefined) continue
      payload[key] = value
    }
    await $api(`/${props.endpoint}`, { method: 'POST', body: payload })
    toast.add({ title: t('common.success'), description: t('messages.createSuccess'), color: 'success' })
    form.value = blankForm()
    await load()
  } catch (error: any) {
    toast.add({ title: t('common.error'), description: error.data?.message || t('messages.errorOccurred'), color: 'error' })
  } finally {
    submitting.value = false
  }
}

async function remove(id: string) {
  if (!confirm(t('staff.familyDeleteConfirm'))) return
  try {
    await $api(`/${props.endpoint}/${id}`, { method: 'DELETE' })
    toast.add({ title: t('common.success'), description: t('staff.familyDeleted'), color: 'success' })
    await load()
  } catch (error: any) {
    toast.add({ title: t('common.error'), description: error.data?.message || t('messages.errorOccurred'), color: 'error' })
  }
}

function display(row: any, col: RecordColumn) {
  const raw = row[col.key]
  if (raw === undefined || raw === null || raw === '') return '-'
  if (col.format === 'date') return new Date(raw).toLocaleDateString()
  if (col.format === 'gender') return raw === '1' ? t('patient.male') : raw === '2' ? t('patient.female') : '-'
  return String(raw)
}

const tableColumns = computed(() => [
  ...props.columns.map(col => ({
    accessorKey: col.key,
    header: col.label,
    cell: ({ row }: any) => display(row.original, col)
  })),
  {
    id: 'actions',
    header: t('common.actions'),
    cell: ({ row }: any) => h(resolveComponent('UButton'), {
      'icon': 'i-lucide-trash',
      'color': 'error',
      'variant': 'ghost',
      'size': 'xs',
      'aria-label': t('common.delete'),
      'onClick': () => remove(row.original._id)
    })
  }
])
</script>

<template>
  <div class="space-y-4">
    <div class="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UFormField
          v-for="field in fields"
          :key="field.key"
          :label="field.label"
          :required="field.required"
          :class="field.full ? 'md:col-span-2' : ''"
        >
          <USelect
            v-if="field.type === 'select'"
            v-model="form[field.key]"
            :items="field.items || []"
            value-key="value"
            label-key="label"
            class="w-full"
          />
          <UTextarea
            v-else-if="field.type === 'textarea'"
            v-model="form[field.key]"
            :rows="2"
            class="w-full"
          />
          <UInput
            v-else
            v-model="form[field.key]"
            :type="field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'"
            class="w-full"
          />
        </UFormField>
      </div>
      <div class="mt-4 flex justify-end">
        <UButton
          :loading="submitting"
          :label="addLabel || t('common.addNew')"
          icon="i-lucide-plus"
          :disabled="!staffId"
          @click="add"
        />
      </div>
    </div>

    <div class="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-lg">
      <UTable
        :columns="tableColumns"
        :data="rows"
        :loading="loading"
        class="w-full"
        :ui="{
          td: 'py-2 px-4 text-sm',
          th: 'py-2 px-4 font-semibold text-sm bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 text-left'
        }"
      />
    </div>
  </div>
</template>
