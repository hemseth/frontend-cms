<script setup lang="ts">
import { ref, computed, watch, h, resolveComponent } from 'vue'

const props = defineProps<{ staffMember?: any }>()
const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()
const toast = useToast()

function emptySpouseForm() {
  return { nameEn: '', nameKh: '', gender: '1', dob: '', phone: '', occupation: '' }
}
function emptyChildForm() {
  return { nameEn: '', nameKh: '', gender: '1', dob: '' }
}

const spouseForm = ref(emptySpouseForm())
const childForm = ref(emptyChildForm())
const submittingSpouse = ref(false)
const submittingChild = ref(false)

const { data: spouseResult, status: spouseStatus, refresh: refreshSpousesAsync } = await useAsyncData('staff-spouses', () => {
  if (!props.staffMember?._id) return Promise.resolve({ data: [] })
  return $api(`/staff-spouses`, { params: { staffId: props.staffMember._id } })
}, { watch: [() => props.staffMember?._id], default: () => ({ data: [] }) })

const { data: childrenResult, status: childrenStatus, refresh: refreshChildrenAsync } = await useAsyncData('staff-children', () => {
  if (!props.staffMember?._id) return Promise.resolve({ data: [] })
  return $api(`/staff-children`, { params: { staffId: props.staffMember._id } })
}, { watch: [() => props.staffMember?._id], default: () => ({ data: [] }) })

const spouses = computed(() => (spouseResult.value as any)?.data || [])
const children = computed(() => (childrenResult.value as any)?.data || [])

watch(() => open.value, (isOpen) => {
  if (isOpen) {
    refreshSpousesAsync()
    refreshChildrenAsync()
    spouseForm.value = emptySpouseForm()
    childForm.value = emptyChildForm()
  }
})

const genderItems = computed(() => [
  { label: t('patient.male'), value: '1' },
  { label: t('patient.female'), value: '2' }
])

function genderLabel(g: string) {
  if (g === '1') return t('patient.male')
  if (g === '2') return t('patient.female')
  return '-'
}

async function handleAddSpouse() {
  if (!spouseForm.value.nameEn) {
    toast.add({ title: t('common.error'), description: t('staff.nameRequired'), color: 'error' })
    return
  }
  submittingSpouse.value = true
  try {
    const payload: any = { ...spouseForm.value, staffId: props.staffMember._id }
    if (!payload.nameKh) delete payload.nameKh
    if (!payload.phone) delete payload.phone
    if (!payload.occupation) delete payload.occupation
    if (!payload.dob) delete payload.dob
    await $api('/staff-spouses', { method: 'POST', body: payload })
    toast.add({ title: t('common.success'), description: t('messages.createSuccess'), color: 'success' })
    spouseForm.value = emptySpouseForm()
    refreshSpousesAsync()
  } catch (error: any) {
    toast.add({ title: t('common.error'), description: error.data?.message || t('messages.errorOccurred'), color: 'error' })
  } finally {
    submittingSpouse.value = false
  }
}

async function handleDeleteSpouse(id: string) {
  if (!confirm(t('staff.familyDeleteConfirm'))) return
  try {
    await $api(`/staff-spouses/${id}`, { method: 'DELETE' })
    toast.add({ title: t('common.success'), description: t('staff.familyDeleted'), color: 'success' })
    refreshSpousesAsync()
  } catch (error: any) {
    toast.add({ title: t('common.error'), description: error.data?.message || t('messages.errorOccurred'), color: 'error' })
  }
}

async function handleAddChild() {
  if (!childForm.value.nameEn) {
    toast.add({ title: t('common.error'), description: t('staff.nameRequired'), color: 'error' })
    return
  }
  submittingChild.value = true
  try {
    const payload: any = { ...childForm.value, staffId: props.staffMember._id }
    if (!payload.nameKh) delete payload.nameKh
    if (!payload.dob) delete payload.dob
    await $api('/staff-children', { method: 'POST', body: payload })
    toast.add({ title: t('common.success'), description: t('messages.createSuccess'), color: 'success' })
    childForm.value = emptyChildForm()
    refreshChildrenAsync()
  } catch (error: any) {
    toast.add({ title: t('common.error'), description: error.data?.message || t('messages.errorOccurred'), color: 'error' })
  } finally {
    submittingChild.value = false
  }
}

async function handleDeleteChild(id: string) {
  if (!confirm(t('staff.familyDeleteConfirm'))) return
  try {
    await $api(`/staff-children/${id}`, { method: 'DELETE' })
    toast.add({ title: t('common.success'), description: t('staff.familyDeleted'), color: 'success' })
    refreshChildrenAsync()
  } catch (error: any) {
    toast.add({ title: t('common.error'), description: error.data?.message || t('messages.errorOccurred'), color: 'error' })
  }
}

const spouseColumns = [
  { accessorKey: 'nameEn', header: t('common.nameEn') },
  { accessorKey: 'nameKh', header: t('common.nameKh'), cell: ({ row }: any) => row.original.nameKh || '-' },
  { accessorKey: 'gender', header: t('staff.gender'), cell: ({ row }: any) => genderLabel(row.original.gender) },
  { accessorKey: 'phone', header: t('staff.phone'), cell: ({ row }: any) => row.original.phone || '-' },
  { accessorKey: 'occupation', header: t('staff.occupation'), cell: ({ row }: any) => row.original.occupation || '-' },
  {
    id: 'actions',
    header: t('common.actions'),
    cell: ({ row }: any) => h(resolveComponent('UButton'), {
      icon: 'i-lucide-trash',
      color: 'error',
      variant: 'ghost',
      size: 'xs',
      onClick: () => handleDeleteSpouse(row.original._id)
    })
  }
]

const childColumns = [
  { accessorKey: 'nameEn', header: t('common.nameEn') },
  { accessorKey: 'nameKh', header: t('common.nameKh'), cell: ({ row }: any) => row.original.nameKh || '-' },
  { accessorKey: 'gender', header: t('staff.gender'), cell: ({ row }: any) => genderLabel(row.original.gender) },
  { accessorKey: 'dob', header: t('staff.dob'), cell: ({ row }: any) => row.original.dob ? new Date(row.original.dob).toLocaleDateString() : '-' },
  {
    id: 'actions',
    header: t('common.actions'),
    cell: ({ row }: any) => h(resolveComponent('UButton'), {
      icon: 'i-lucide-trash',
      color: 'error',
      variant: 'ghost',
      size: 'xs',
      onClick: () => handleDeleteChild(row.original._id)
    })
  }
]
</script>

<template>
  <UModal v-model:open="open" size="xl">
    <template #header>
      <h3 class="text-lg font-semibold">
        {{ staffMember?.nameEn || staffMember?.nameKh }} - {{ t('staff.family') }}
      </h3>
    </template>
    <template #body>
      <div class="space-y-8">
        <div>
          <h4 class="font-medium mb-4">
            {{ t('staff.spouse') }}
          </h4>
          <div class="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg mb-4">
            <div class="grid grid-cols-2 gap-4">
              <UFormField :label="t('common.nameEn')" required>
                <UInput v-model="spouseForm.nameEn" class="w-full" />
              </UFormField>
              <UFormField :label="t('common.nameKh')">
                <UInput v-model="spouseForm.nameKh" class="w-full" />
              </UFormField>
              <UFormField :label="t('staff.gender')">
                <USelect
                  v-model="spouseForm.gender"
                  :items="genderItems"
                  value-key="value"
                  label-key="label"
                  class="w-full"
                />
              </UFormField>
              <UFormField :label="t('staff.dob')">
                <UInput v-model="spouseForm.dob" type="date" class="w-full" />
              </UFormField>
              <UFormField :label="t('staff.phone')">
                <UInput v-model="spouseForm.phone" class="w-full" />
              </UFormField>
              <UFormField :label="t('staff.occupation')">
                <UInput v-model="spouseForm.occupation" class="w-full" />
              </UFormField>
            </div>
            <div class="mt-4 flex justify-end">
              <UButton :loading="submittingSpouse" :label="t('common.addNew')" @click="handleAddSpouse" />
            </div>
          </div>
          <div class="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-lg">
            <UTable
              :columns="spouseColumns"
              :data="spouses"
              :loading="spouseStatus === 'pending'"
              class="w-full"
              :ui="{
                td: 'py-2 px-4 text-sm',
                th: 'py-2 px-4 font-semibold text-sm bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 text-left'
              }"
            />
          </div>
        </div>

        <div>
          <h4 class="font-medium mb-4">
            {{ t('staff.children') }}
          </h4>
          <div class="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg mb-4">
            <div class="grid grid-cols-2 gap-4">
              <UFormField :label="t('common.nameEn')" required>
                <UInput v-model="childForm.nameEn" class="w-full" />
              </UFormField>
              <UFormField :label="t('common.nameKh')">
                <UInput v-model="childForm.nameKh" class="w-full" />
              </UFormField>
              <UFormField :label="t('staff.gender')">
                <USelect
                  v-model="childForm.gender"
                  :items="genderItems"
                  value-key="value"
                  label-key="label"
                  class="w-full"
                />
              </UFormField>
              <UFormField :label="t('staff.dob')">
                <UInput v-model="childForm.dob" type="date" class="w-full" />
              </UFormField>
            </div>
            <div class="mt-4 flex justify-end">
              <UButton :loading="submittingChild" :label="t('common.addNew')" @click="handleAddChild" />
            </div>
          </div>
          <div class="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-lg">
            <UTable
              :columns="childColumns"
              :data="children"
              :loading="childrenStatus === 'pending'"
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
