<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { ClinicDiagnosisGroup } from '~/types/diagnosis'
import { useDiagnosisGroups } from '~/composables/useDiagnosisGroups'
import GroupModal from '~/components/diagnoses/settings/GroupModal.vue'

const { t } = useI18n()

const { groups, loading, error, fetch, create, update, remove } = useDiagnosisGroups()

const isModalOpen = ref(false)
const selectedGroup = ref<ClinicDiagnosisGroup | null>(null)
const isSaving = ref(false)
const deleteTarget = ref<ClinicDiagnosisGroup | null>(null)
const deleteModalOpen = ref(false)
const toast = useToast()

onMounted(() => fetch())

function openCreate() {
  selectedGroup.value = null
  isModalOpen.value = true
}

function openEdit(group: ClinicDiagnosisGroup) {
  selectedGroup.value = group
  isModalOpen.value = true
}

async function handleSave(payload: Record<string, any>) {
  isSaving.value = true
  try {
    const ok = selectedGroup.value
      ? await update(selectedGroup.value.id, payload)
      : await create(payload)
    if (!ok) {
      toast.add({ title: t('common.error'), description: t('diagnosisSettings.failedToSaveGroup'), color: 'error' })
      return
    }
    toast.add({ title: t('common.success'), description: selectedGroup.value ? t('diagnosisSettings.editGroup') : t('diagnosisSettings.createGroup'), color: 'success' })
    isModalOpen.value = false
    selectedGroup.value = null
  } catch (e: any) {
    toast.add({ title: t('common.error'), description: e.data?.message || 'Failed to save group', color: 'error' })
  } finally {
    isSaving.value = false
  }
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  await remove(deleteTarget.value.id)
  toast.add({ title: t('common.success'), description: t('diagnosisSettings.groupDeleteConfirm'), color: 'success' })
  deleteTarget.value = null
  deleteModalOpen.value = false
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-end">
      <UButton
        icon="i-lucide-plus"
        :label="t('diagnosisSettings.createGroup')"
        color="primary"
        @click="openCreate"
      />
    </div>

    <UCard>
      <div v-if="error" class="flex flex-col items-center gap-2 py-6">
        <p class="text-sm text-gray-500">
          {{ error }}
        </p>
        <UButton
          color="primary"
          variant="outline"
          icon="i-lucide-rotate-ccw"
          :label="t('diagnosisSettings.retry')"
          @click="fetch"
        />
      </div>
      <div v-else class="overflow-x-auto">
        <UTable
          :columns="[
            { accessorKey: 'code', header: t('diagnosisSettings.groupCode') },
            { accessorKey: 'nameKh', header: t('diagnosisSettings.groupNameKh') },
            { accessorKey: 'nameEn', header: t('diagnosisSettings.groupNameEn') },
            { accessorKey: 'diagnosisCount', header: t('diagnosisSettings.count') },
            { accessorKey: 'sortOrder', header: t('diagnosisSettings.sortOrder') },
            { id: 'actions', header: t('common.actions') }
          ]"
          :data="groups"
          :loading="loading"
          class="w-full"
          :ui="{ td: 'py-1.5 px-4 text-sm', th: 'py-1.5 px-4 font-semibold text-sm bg-gray-50 dark:bg-gray-900' }"
        >
          <template #empty>
            <div class="py-10 text-center text-gray-500 dark:text-gray-400">
              {{ t('diagnosisSettings.noResults') }}
            </div>
          </template>
          <template #diagnosisCount-cell="{ row }">
            <span class="font-mono">{{ row.original.diagnosisCount ?? 0 }}</span>
          </template>
          <template #actions-cell="{ row }">
            <div class="flex gap-2">
              <UButton
                icon="i-lucide-pencil"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="openEdit(row.original)"
              />
              <UButton
                icon="i-lucide-trash"
                color="error"
                variant="ghost"
                size="sm"
                @click="deleteTarget = row.original; deleteModalOpen = true"
              />
            </div>
          </template>
        </UTable>
      </div>
    </UCard>

    <GroupModal
      v-model:open="isModalOpen"
      :group="selectedGroup"
      :loading="isSaving"
      @save="handleSave"
    />

    <UModal v-model:open="deleteModalOpen" :title="t('common.confirm')">
      <template #body>
        <p class="text-gray-600 dark:text-gray-300">
          {{ t('diagnosisSettings.groupDeleteConfirm') }}
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            :label="t('diagnosisSettings.cancel')"
            color="neutral"
            variant="ghost"
            @click="deleteTarget = null; deleteModalOpen = false"
          />
          <UButton :label="t('diagnosisSettings.remove')" color="error" @click="confirmDelete" />
        </div>
      </template>
    </UModal>
  </div>
</template>
