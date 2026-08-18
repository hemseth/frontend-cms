<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import type { ClinicDiagnosis, ClinicDiagnosisGroup, DiagnosisMasterMetaText } from '~/types/diagnosis'
import { useClinicDiagnoses } from '~/composables/useClinicDiagnoses'
import { useDiagnosisGroups } from '~/composables/useDiagnosisGroups'
import { useDiagnosisMetadata } from '~/composables/useDiagnosisMetadata'
import ClinicDiagnosisEditModal from '~/components/diagnoses/settings/ClinicDiagnosisEditModal.vue'

const { t } = useI18n()

const { data, loading, error, total, page, limit, fetch, setFavorite, setEnabled, remove, update } = useClinicDiagnoses()
const { groups, fetch: fetchGroups } = useDiagnosisGroups()
const { categories, bodyRegions, organs, loadCategories, loadBodyRegions, loadOrgans, clearCache } = useDiagnosisMetadata()

const search = ref('')
const category = ref<string>('')
const bodyRegion = ref<string>('')
const organ = ref<string>('')
const groupId = ref<string>('')
const favorite = ref<string>('')

const toast = useToast()

const categoryItems = computed(() => categories.value.map((c: DiagnosisMasterMetaText) => ({ value: c.code, label: c.nameEn || c.code })))
const regionItems = computed(() => bodyRegions.value.map((r: DiagnosisMasterMetaText) => ({ value: r.code, label: r.nameEn || r.code })))
const organItems = computed(() => organs.value.map((o: DiagnosisMasterMetaText) => ({ value: o.code, label: o.nameEn || o.code })))
const groupItems = computed(() => groups.value.map((g: ClinicDiagnosisGroup) => ({ value: g.id, label: g.nameEn || g.nameKh || g.code })))
const favoriteItems = [
  { value: '', label: t('diagnosisSettings.statusAll') },
  { value: 'true', label: t('diagnosisSettings.statusFavorite') },
  { value: 'false', label: t('diagnosisSettings.favoriteNo') }
]

async function runFetch() {
  await fetch({
    q: search.value,
    category: category.value,
    bodyRegion: bodyRegion.value,
    organ: organ.value,
    groupId: groupId.value,
    favorite: favorite.value,
    page: page.value,
    limit: limit.value
  })
}

const debouncedFetch = useDebounceFn(runFetch, 350)

watch([search, category, bodyRegion, organ, groupId, favorite], () => {
  page.value = 1
  debouncedFetch()
})

watch([category, bodyRegion], async () => {
  clearCache()
  await Promise.all([
    loadBodyRegions({ category: category.value }),
    loadOrgans({ category: category.value, bodyRegion: bodyRegion.value })
  ])
})

watch([organ], async () => {
  clearCache()
  await loadOrgans({ category: category.value, bodyRegion: bodyRegion.value })
})

watch(page, () => runFetch())

onMounted(async () => {
  await Promise.all([
    fetch(),
    fetchGroups(),
    loadCategories(),
    loadBodyRegions(),
    loadOrgans()
  ])
})

const editTarget = ref<ClinicDiagnosis | null>(null)
const isEditOpen = ref(false)
const isSaving = ref(false)
const removeTarget = ref<ClinicDiagnosis | null>(null)
const removeModalOpen = ref(false)

function openEdit(d: ClinicDiagnosis) {
  editTarget.value = d
  isEditOpen.value = true
}

async function handleEditSave(payload: Record<string, any>) {
  if (!editTarget.value) return
  isSaving.value = true
  try {
    await update(editTarget.value.id, payload)
    toast.add({ title: t('common.success'), description: t('diagnosisSettings.localOverrideSaved'), color: 'success' })
    isEditOpen.value = false
    editTarget.value = null
    runFetch()
  } catch (e: any) {
    toast.add({ title: t('common.error'), description: e.data?.message || 'Failed to save', color: 'error' })
  } finally {
    isSaving.value = false
  }
}

async function toggleFavorite(d: ClinicDiagnosis) {
  const ok = await setFavorite(d.id, !d.favorite)
  if (ok) runFetch()
}

async function toggleEnabled(d: ClinicDiagnosis) {
  const ok = await setEnabled(d.id, !d.enabled)
  if (ok) runFetch()
}

async function confirmRemove() {
  if (!removeTarget.value) return
  const ok = await remove(removeTarget.value.id)
  if (ok) {
    toast.add({ title: t('common.success'), description: t('diagnosisSettings.removedFromClinic'), color: 'success' })
    removeTarget.value = null
    removeModalOpen.value = false
    runFetch()
  }
}

function resetFilters() {
  search.value = ''
  category.value = ''
  bodyRegion.value = ''
  organ.value = ''
  groupId.value = ''
  favorite.value = ''
  page.value = 1
  runFetch()
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-center gap-2">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        :placeholder="t('diagnosisSettings.search')"
        class="flex-1 min-w-48"
      />
      <USelectMenu
        v-model="category"
        :items="categoryItems"
        value-key="value"
        label-key="label"
        :placeholder="t('diagnosisSettings.category')"
        class="w-44"
      />
      <USelectMenu
        v-model="bodyRegion"
        :items="regionItems"
        value-key="value"
        label-key="label"
        :placeholder="t('diagnosisSettings.bodyRegion')"
        class="w-40"
      />
      <USelectMenu
        v-model="organ"
        :items="organItems"
        value-key="value"
        label-key="label"
        :placeholder="t('diagnosisSettings.organ')"
        class="w-40"
      />
      <USelectMenu
        v-model="groupId"
        :items="groupItems"
        value-key="value"
        label-key="label"
        :placeholder="t('diagnosisSettings.group')"
        class="w-44"
      />
      <USelectMenu
        v-model="favorite"
        :items="favoriteItems"
        value-key="value"
        label-key="label"
        :placeholder="t('diagnosisSettings.favorite')"
        class="w-36"
      />
      <UButton
        color="neutral"
        variant="outline"
        icon="i-lucide-rotate-ccw"
        :label="t('diagnosisSettings.clearFilters')"
        @click="resetFilters"
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
          @click="runFetch"
        />
      </div>
      <div v-else class="overflow-x-auto">
        <UTable
          :columns="[
            { accessorKey: 'code', header: t('diagnosisSettings.code') },
            { accessorKey: 'nameKh', header: t('diagnosisSettings.nameKh') },
            { accessorKey: 'nameEn', header: t('diagnosisSettings.nameEn') },
            { accessorKey: 'enabled', header: t('diagnosisSettings.enabled') },
            { accessorKey: 'favorite', header: t('diagnosisSettings.favorite') },
            { id: 'actions', header: t('common.actions') }
          ]"
          :data="data"
          :loading="loading"
          class="w-full"
          :ui="{ td: 'py-1.5 px-4 text-sm', th: 'py-1.5 px-4 font-semibold text-sm bg-gray-50 dark:bg-gray-900' }"
        >
          <template #empty>
            <div class="py-10 text-center text-gray-500 dark:text-gray-400">
              {{ t('diagnosisSettings.noResults') }}
            </div>
          </template>
          <template #nameKh-cell="{ row }">
            <div>
              <div>{{ row.original.display.nameKh || row.original.nameKh || '—' }}</div>
              <div v-if="row.original.localNameKh" class="text-xs text-gray-400">
                {{ t('diagnosisSettings.masterName') }}: {{ row.original.master.nameKh }}
              </div>
            </div>
          </template>
          <template #nameEn-cell="{ row }">
            <div>
              <div>{{ row.original.display.nameEn || row.original.nameEn || '—' }}</div>
              <div v-if="row.original.localNameEn" class="text-xs text-gray-400">
                {{ t('diagnosisSettings.masterName') }}: {{ row.original.master.nameEn }}
              </div>
            </div>
          </template>
          <template #enabled-cell="{ row }">
            <UBadge :label="row.original.enabled ? t('diagnosisSettings.enabledYes') : t('diagnosisSettings.enabledNo')" :color="row.original.enabled ? 'success' : 'error'" variant="subtle" />
          </template>
          <template #favorite-cell="{ row }">
            <UButton
              :icon="row.original.favorite ? 'i-lucide-star' : 'i-lucide-star'"
              :color="row.original.favorite ? 'warning' : 'neutral'"
              variant="ghost"
              size="sm"
              @click="toggleFavorite(row.original)"
            />
          </template>
          <template #actions-cell="{ row }">
            <div class="flex gap-1">
              <UButton
                icon="i-lucide-pencil"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="openEdit(row.original)"
              />
              <UButton
                :icon="row.original.enabled ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="toggleEnabled(row.original)"
              />
              <UButton
                icon="i-lucide-trash"
                color="error"
                variant="ghost"
                size="sm"
                @click="removeTarget = row.original; removeModalOpen = true"
              />
            </div>
          </template>
        </UTable>
      </div>

      <template #footer>
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-500">Total: {{ total }}</span>
          <div class="flex gap-2">
            <UButton icon="i-lucide-chevron-left" :disabled="page === 1" @click="page--" />
            <UButton trailing-icon="i-lucide-chevron-right" :disabled="page * limit >= total" @click="page++" />
          </div>
        </div>
      </template>
    </UCard>

    <ClinicDiagnosisEditModal
      v-model:open="isEditOpen"
      :diagnosis="editTarget"
      :groups="groups"
      :loading="isSaving"
      @save="handleEditSave"
    />

    <UModal v-model:open="removeModalOpen" :title="t('common.confirm')">
      <template #body>
        <p class="text-gray-600 dark:text-gray-300">
          {{ t('diagnosisSettings.deleteConfirm') }}
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            :label="t('diagnosisSettings.cancel')"
            color="neutral"
            variant="ghost"
            @click="removeTarget = null; removeModalOpen = false"
          />
          <UButton :label="t('diagnosisSettings.remove')" color="error" @click="confirmRemove" />
        </div>
      </template>
    </UModal>
  </div>
</template>
