<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface Warehouse {
  _id: string
  code: string
  nameKh: string
  nameEn: string
  type: string
  allowReceive: boolean
  allowIssue: boolean
  address?: string
  notes?: string
  active: 'active' | 'inactive'
}

const { t } = useI18n()
const toast = useToast()
const auth = useAuth()

const TYPES = ['MAIN', 'PHARMACY', 'EMERGENCY', 'LAB', 'COLD_CHAIN', 'DISPENSING', 'OTHER']
const typeOptions = computed(() => TYPES.map(value => ({ label: t(`pharmacy.docs.warehouseType.${value}`), value })))
const statusOptions = computed(() => [
  { label: t('common.active'), value: 'active' },
  { label: t('common.inactive'), value: 'inactive' }
])

const warehouses = ref<Warehouse[]>([])
const isLoading = ref(true)
const loadError = ref('')

async function load() {
  isLoading.value = true
  loadError.value = ''
  try {
    warehouses.value = unwrapList<Warehouse>(await $api('/warehouses'))
  } catch (err) {
    loadError.value = getApiErrorMessage(err, t('pharmacy.docs.loadFailed'))
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

const isModalOpen = ref(false)
const isSaving = ref(false)
const editingId = ref('')
const emptyForm = (): Omit<Warehouse, '_id'> => ({
  code: '', nameKh: '', nameEn: '', type: 'PHARMACY', allowReceive: true, allowIssue: true, address: '', notes: '', active: 'active'
})
const form = ref(emptyForm())

function openModal(warehouse?: Warehouse) {
  editingId.value = warehouse?._id ?? ''
  form.value = warehouse ? { ...emptyForm(), ...warehouse } : emptyForm()
  isModalOpen.value = true
}

const formError = computed(() => (!form.value.code || !form.value.nameKh || !form.value.nameEn) ? t('pharmacy.docs.warehouseRequired') : '')

async function save() {
  if (formError.value) return
  isSaving.value = true
  const { code, nameKh, nameEn, type, allowReceive, allowIssue, address, notes, active } = form.value
  try {
    await $api(editingId.value ? `/warehouses/${editingId.value}` : '/warehouses', {
      method: editingId.value ? 'PUT' : 'POST',
      body: { code, nameKh, nameEn, type, allowReceive, allowIssue, address, notes, active }
    })
    toast.add({ title: t('common.saved'), color: 'success' })
    isModalOpen.value = false
    await load()
  } catch (err) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(err, t('common.saveFailed')), color: 'error' })
  } finally {
    isSaving.value = false
  }
}

async function remove(warehouse: Warehouse) {
  if (!window.confirm(t('pharmacy.docs.deleteWarehouseConfirm', { name: warehouse.nameKh || warehouse.nameEn }))) return
  try {
    await $api(`/warehouses/${warehouse._id}`, { method: 'DELETE' })
    toast.add({ title: t('pharmacy.docs.deleted'), color: 'success' })
    await load()
  } catch (err) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(err, t('common.saveFailed')), color: 'error' })
  }
}
</script>

<template>
  <div class="p-4 space-y-4">
    <div class="flex items-center justify-between gap-3">
      <h1 class="text-xl font-bold flex items-center gap-2">
        <UIcon name="i-lucide-warehouse" class="w-6 h-6 text-primary" />
        {{ t('nav.warehouses') }}
      </h1>
      <UButton
        v-if="auth.can('warehouse', 'create')"
        :label="t('pharmacy.docs.addWarehouse')"
        icon="i-lucide-plus"
        @click="openModal()"
      />
    </div>

    <div v-if="isLoading" class="py-12 text-center">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto text-primary-500" />
    </div>

    <UAlert
      v-else-if="loadError"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="loadError"
      :actions="[{ label: t('common.refresh'), onClick: load }]"
    />

    <p v-else-if="warehouses.length === 0" class="py-12 text-center text-sm text-muted">
      {{ t('pharmacy.docs.noWarehouses') }}
    </p>

    <UCard v-else :ui="{ body: 'p-0 sm:p-0' }">
      <table class="w-full text-sm">
        <thead class="bg-muted text-left text-muted">
          <tr>
            <th class="p-3">
              {{ t('inpatient.setup.code') }}
            </th>
            <th class="p-3">
              {{ t('inpatient.setup.nameKh') }}
            </th>
            <th class="p-3">
              {{ t('inpatient.setup.category') }}
            </th>
            <th class="p-3">
              {{ t('pharmacy.docs.canReceiveIssue') }}
            </th>
            <th class="p-3">
              {{ t('common.status') }}
            </th>
            <th class="p-3" />
          </tr>
        </thead>
        <tbody class="divide-y divide-default">
          <tr v-for="warehouse in warehouses" :key="warehouse._id">
            <td class="p-3 font-medium">
              {{ warehouse.code }}
            </td>
            <td class="p-3">
              {{ warehouse.nameKh }}
              <span class="text-muted">{{ warehouse.nameEn }}</span>
            </td>
            <td class="p-3">
              {{ t(`pharmacy.docs.warehouseType.${warehouse.type}`) }}
            </td>
            <td class="p-3">
              {{ warehouse.allowReceive ? '✓' : '✗' }} / {{ warehouse.allowIssue ? '✓' : '✗' }}
            </td>
            <td class="p-3">
              <UBadge :color="warehouse.active === 'active' ? 'success' : 'neutral'" variant="subtle">
                {{ t(`common.${warehouse.active}`) }}
              </UBadge>
            </td>
            <td class="p-3">
              <div class="flex justify-end gap-1">
                <UButton
                  v-if="auth.can('warehouse', 'update')"
                  icon="i-lucide-pencil"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  :aria-label="t('common.edit')"
                  @click="openModal(warehouse)"
                />
                <UButton
                  v-if="auth.can('warehouse', 'delete')"
                  icon="i-lucide-trash-2"
                  color="error"
                  variant="ghost"
                  size="xs"
                  :aria-label="t('common.delete')"
                  @click="remove(warehouse)"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </UCard>

    <UModal v-model:open="isModalOpen" :title="editingId ? t('common.edit') : t('pharmacy.docs.addWarehouse')">
      <template #body>
        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <UFormField :label="t('inpatient.setup.code')" required>
              <UInput v-model="form.code" class="w-full" />
            </UFormField>
            <UFormField :label="t('inpatient.setup.category')">
              <USelect v-model="form.type" :items="typeOptions" class="w-full" />
            </UFormField>
          </div>
          <UFormField :label="t('inpatient.setup.nameKh')" required>
            <UInput v-model="form.nameKh" class="w-full" />
          </UFormField>
          <UFormField :label="t('inpatient.setup.nameEn')" required>
            <UInput v-model="form.nameEn" class="w-full" />
          </UFormField>
          <div class="flex flex-wrap gap-4">
            <UCheckbox v-model="form.allowReceive" :label="t('pharmacy.docs.allowReceive')" />
            <UCheckbox v-model="form.allowIssue" :label="t('pharmacy.docs.allowIssue')" />
          </div>
          <UFormField :label="t('common.status')">
            <USelect v-model="form.active" :items="statusOptions" class="w-full" />
          </UFormField>
          <UFormField :label="t('common.notes')">
            <UTextarea v-model="form.notes" :rows="2" class="w-full" />
          </UFormField>
          <p v-if="formError" class="text-sm text-error">
            {{ formError }}
          </p>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            :label="t('common.cancel')"
            color="neutral"
            variant="ghost"
            @click="isModalOpen = false"
          />
          <UButton
            :label="t('common.save')"
            icon="i-lucide-save"
            :loading="isSaving"
            :disabled="Boolean(formError)"
            @click="save"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
