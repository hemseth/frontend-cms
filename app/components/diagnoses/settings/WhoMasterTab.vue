<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import type { DiagnosisMaster, DiagnosisMasterMetaText } from '~/types/diagnosis'
import { useDiagnosisMaster } from '~/composables/useDiagnosisMaster'
import { useDiagnosisMetadata } from '~/composables/useDiagnosisMetadata'

const { t } = useI18n()

const {
  data,
  loading,
  error,
  total,
  page,
  limit,
  stats,
  search,
  fetchStats,
  addToClinic,
  bulkAddToClinic
} = useDiagnosisMaster()
const {
  chapters,
  categories,
  bodySystems,
  bodyRegions,
  organs,
  loadChapters,
  loadCategories,
  loadBodySystems,
  loadBodyRegions,
  loadOrgans,
  clearCache
} = useDiagnosisMetadata()

const searchText = ref('')
const chapter = ref<string>('')
const category = ref<string>('')
const bodySystem = ref<string>('')
const bodyRegion = ref<string>('')
const organ = ref<string>('')
const level = ref<string>('')
const terminal = ref<string>('')
const codeType = ref<string>('')
const clinicStatus = ref<string>('')
const selected = ref<Set<string>>(new Set())

const toast = useToast()
const adding = ref(false)

const chapterItems = computed(() => chapters.value.map((c: DiagnosisMasterMetaText) => ({
  value: c.code,
  label: `${c.code} — ${c.nameEn || c.range || c.code}`
})))
const categoryItems = computed(() => categories.value.map((c: DiagnosisMasterMetaText) => ({ value: c.code, label: c.nameEn || c.code })))
const systemItems = computed(() => bodySystems.value.map((s: DiagnosisMasterMetaText) => ({ value: s.code, label: s.nameEn || s.code })))
const regionItems = computed(() => bodyRegions.value.map((r: DiagnosisMasterMetaText) => ({ value: r.code, label: r.nameEn || r.code })))
const organItems = computed(() => organs.value.map((o: DiagnosisMasterMetaText) => ({ value: o.code, label: o.nameEn || o.code })))
const levelItems = [
  { value: '', label: t('diagnosisSettings.statusAll') },
  { value: '3', label: 'Level 3' },
  { value: '4', label: 'Level 4' },
  { value: '5', label: 'Level 5' }
]
const terminalItems = [
  { value: '', label: t('diagnosisSettings.statusAll') },
  { value: 'true', label: t('diagnosisSettings.terminal') },
  { value: 'false', label: t('diagnosisSettings.terminal') + ' ✕' }
]
const codeTypeItems = [
  { value: '', label: t('diagnosisSettings.statusAll') },
  { value: 'primary', label: 'Primary' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'invalid', label: 'Invalid' },
  { value: 'unknown', label: 'Unknown' }
]
const statusItems = [
  { value: '', label: t('diagnosisSettings.statusAll') },
  { value: 'added', label: t('diagnosisSettings.statusAdded') },
  { value: 'not_added', label: t('diagnosisSettings.statusNotAdded') },
  { value: 'favorite', label: t('diagnosisSettings.statusFavorite') },
  { value: 'disabled', label: t('diagnosisSettings.statusDisabled') }
]

async function runFetch() {
  await search({
    q: searchText.value,
    chapter: chapter.value,
    category: category.value,
    bodySystem: bodySystem.value,
    bodyRegion: bodyRegion.value,
    organ: organ.value,
    level: level.value,
    terminal: terminal.value,
    codeType: codeType.value,
    clinicStatus: clinicStatus.value,
    page: page.value,
    limit: limit.value
  })
}

const debouncedFetch = useDebounceFn(runFetch, 350)

watch([searchText, chapter, category, bodySystem, bodyRegion, organ, level, terminal, codeType, clinicStatus], () => {
  page.value = 1
  debouncedFetch()
})

// Cascading metadata: chapter/category/system influence region + organ options.
watch([chapter, category, bodySystem, bodyRegion], async () => {
  clearCache()
  await Promise.all([
    loadCategories({ chapter: chapter.value, bodySystem: bodySystem.value }),
    loadBodySystems({ chapter: chapter.value, category: category.value }),
    loadBodyRegions({ chapter: chapter.value, category: category.value, bodySystem: bodySystem.value }),
    loadOrgans({ chapter: chapter.value, category: category.value, bodySystem: bodySystem.value, bodyRegion: bodyRegion.value })
  ])
})

watch(page, () => runFetch())

onMounted(async () => {
  await Promise.all([
    loadChapters(),
    loadCategories(),
    loadBodySystems(),
    loadBodyRegions(),
    loadOrgans(),
    fetchStats(),
    runFetch()
  ])
})

const isChecked = (id: string) => selected.value.has(id)

function toggleCheck(id: string) {
  const next = new Set(selected.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selected.value = next
}

function toggleAll() {
  if (selected.value.size === data.value.length && data.value.length > 0) {
    selected.value = new Set()
  } else {
    selected.value = new Set(data.value.map(d => d.id))
  }
}

async function handleAddOne(d: DiagnosisMaster) {
  adding.value = true
  try {
    const ok = await addToClinic(d.id)
    if (ok) {
      toast.add({ title: t('common.success'), description: `${d.code} ${t('diagnosisSettings.addedToClinic')}`, color: 'success' })
      runFetch()
      fetchStats()
    } else {
      toast.add({ title: t('common.error'), description: t('diagnosisSettings.add'), color: 'error' })
    }
  } finally {
    adding.value = false
  }
}

async function handleAddSelected() {
  if (selected.value.size === 0) return
  adding.value = true
  try {
    const ids = [...selected.value]
    const ok = await bulkAddToClinic(ids)
    if (ok) {
      toast.add({ title: t('common.success'), description: `${ids.length} ${t('diagnosisSettings.addedToClinic')}`, color: 'success' })
      selected.value = new Set()
      runFetch()
      fetchStats()
    }
  } finally {
    adding.value = false
  }
}

function resetFilters() {
  searchText.value = ''
  chapter.value = ''
  category.value = ''
  bodySystem.value = ''
  bodyRegion.value = ''
  organ.value = ''
  level.value = ''
  terminal.value = ''
  codeType.value = ''
  clinicStatus.value = ''
  page.value = 1
  runFetch()
}

function pathLabel(d: DiagnosisMaster): string {
  const parts = [
    d.body?.system?.nameEn || d.body?.system?.code,
    d.body?.region?.nameEn || d.body?.region?.code,
    d.body?.organ?.nameEn || d.body?.organ?.code
  ].filter(Boolean)
  return parts.join(' > ')
}
</script>

<template>
  <div class="space-y-4">
    <!-- Summary counters -->
    <div class="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
      <div class="flex items-center gap-1.5">
        <span class="font-semibold text-gray-700 dark:text-gray-200">{{ t('diagnosisSettings.summary.whoMaster') }}</span>
        <span class="font-mono text-gray-500 dark:text-gray-400">{{ stats.totalMaster.toLocaleString() }}</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="text-gray-500 dark:text-gray-400">{{ t('diagnosisSettings.summary.clinicAdded') }}</span>
        <span class="font-mono text-gray-700 dark:text-gray-200">{{ stats.clinicAdded.toLocaleString() }}</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="text-gray-500 dark:text-gray-400">{{ t('diagnosisSettings.summary.favorites') }}</span>
        <span class="font-mono text-gray-700 dark:text-gray-200">{{ stats.favorites.toLocaleString() }}</span>
      </div>
      <div class="flex items-center gap-1.5">
        <span class="text-gray-500 dark:text-gray-400">{{ t('diagnosisSettings.summary.disabled') }}</span>
        <span class="font-mono text-gray-700 dark:text-gray-200">{{ stats.disabled.toLocaleString() }}</span>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-2">
      <UInput
        v-model="searchText"
        icon="i-lucide-search"
        :placeholder="t('diagnosisSettings.search')"
        class="flex-1 min-w-48"
      />
      <USelectMenu
        v-model="chapter"
        :items="chapterItems"
        value-key="value"
        label-key="label"
        :placeholder="t('diagnosisSettings.chapter')"
        class="w-44"
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
        v-model="bodySystem"
        :items="systemItems"
        value-key="value"
        label-key="label"
        :placeholder="t('diagnosisSettings.bodySystem')"
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
        v-model="level"
        :items="levelItems"
        value-key="value"
        label-key="label"
        placeholder="Level"
        class="w-28"
      />
      <USelectMenu
        v-model="terminal"
        :items="terminalItems"
        value-key="value"
        label-key="label"
        placeholder="Terminal"
        class="w-32"
      />
      <USelectMenu
        v-model="codeType"
        :items="codeTypeItems"
        value-key="value"
        label-key="label"
        placeholder="Code type"
        class="w-32"
      />
      <USelectMenu
        v-model="clinicStatus"
        :items="statusItems"
        value-key="value"
        label-key="label"
        :placeholder="t('diagnosisSettings.clinicStatus')"
        class="w-40"
      />
      <UButton
        color="neutral"
        variant="outline"
        icon="i-lucide-rotate-ccw"
        :label="t('diagnosisSettings.clearFilters')"
        @click="resetFilters"
      />
    </div>

    <div class="flex items-center gap-2">
      <UButton
        variant="outline"
        color="neutral"
        :label="`${t('diagnosisSettings.select')} ${t('diagnosisSettings.statusAll')}`"
        @click="toggleAll"
      />
      <UButton
        v-if="selected.size > 0"
        color="primary"
        icon="i-lucide-plus"
        :label="`${t('diagnosisSettings.addSelected')} (${selected.size})`"
        :loading="adding"
        @click="handleAddSelected"
      />
    </div>

    <UCard>
      <div class="overflow-x-auto">
        <UTable
          :columns="[
            { id: 'checkbox', header: '' },
            { accessorKey: 'code', header: t('diagnosisSettings.code') },
            { accessorKey: 'nameKh', header: t('diagnosisSettings.nameKh') },
            { accessorKey: 'nameEn', header: t('diagnosisSettings.nameEn') },
            { accessorKey: 'path', header: t('diagnosisSettings.path') },
            { accessorKey: 'clinic', header: t('diagnosisSettings.clinic') },
            { id: 'actions', header: t('common.actions') }
          ]"
          :data="data"
          :loading="loading"
          class="w-full"
          :ui="{ td: 'py-1.5 px-4 text-sm', th: 'py-1.5 px-4 font-semibold text-sm bg-gray-50 dark:bg-gray-900' }"
        >
          <template #empty>
            <div class="py-10 text-center">
              <p class="text-gray-500 dark:text-gray-400">
                {{ t('diagnosisSettings.noResults') }}
              </p>
              <p v-if="stats.totalMaster === 0" class="text-xs text-gray-400 mt-1">
                {{ t('diagnosisSettings.importHint') }}
              </p>
            </div>
          </template>

          <template #checkbox-cell="{ row }">
            <UCheckbox
              :model-value="isChecked(row.original.id)"
              :disabled="loading"
              @update:model-value="toggleCheck(row.original.id)"
            />
          </template>

          <template #code-cell="{ row }">
            <div class="flex items-center gap-2">
              <span :class="row.original.terminal === false ? 'text-gray-400' : 'font-mono font-semibold'">
                {{ row.original.code }}
              </span>
              <UBadge
                v-if="row.original.clinic?.favorite"
                size="xs"
                variant="subtle"
                color="warning"
              >
                ★
              </UBadge>
              <UBadge
                v-if="row.original.terminal === true"
                size="xs"
                variant="subtle"
                color="success"
              >
                terminal
              </UBadge>
              <UBadge
                v-else-if="row.original.terminal === false"
                size="xs"
                variant="subtle"
                color="neutral"
              >
                nav
              </UBadge>
            </div>
          </template>

          <template #nameKh-cell="{ row }">
            <div>
              <div>{{ row.original.display.nameKh || row.original.nameKh || '—' }}</div>
              <div v-if="row.original.clinic?.localNameKh" class="text-xs text-gray-400">
                {{ t('diagnosisSettings.masterName') }}: {{ row.original.master.nameKh }}
              </div>
            </div>
          </template>

          <template #nameEn-cell="{ row }">
            <div>
              <div>{{ row.original.display.nameEn || row.original.nameEn || '—' }}</div>
              <div v-if="row.original.clinic?.localNameEn" class="text-xs text-gray-400">
                {{ t('diagnosisSettings.masterName') }}: {{ row.original.master.nameEn }}
              </div>
            </div>
          </template>

          <template #path-cell="{ row }">
            <div class="text-xs text-gray-500">
              <span>{{ pathLabel(row.original) }}</span>
              <div class="mt-0.5 text-gray-400">
                WHO ICD-10{{ row.original.codeSystem ? ` · ${row.original.codeSystem}` : '' }}{{ row.original.codeVersion ? ` · ${row.original.codeVersion}` : '' }}
              </div>
            </div>
          </template>

          <template #clinic-cell="{ row }">
            <UBadge
              v-if="row.original.clinic?.added"
              :label="row.original.clinic.enabled ? t('diagnosisSettings.added') : t('diagnosisSettings.statusDisabled')"
              :color="row.original.clinic.enabled ? 'success' : 'error'"
              variant="subtle"
            />
            <span v-else class="text-xs text-gray-400">{{ t('diagnosisSettings.statusNotAdded') }}</span>
          </template>

          <template #actions-cell="{ row }">
            <UButton
              v-if="!row.original.clinic?.added"
              icon="i-lucide-plus"
              :label="t('diagnosisSettings.add')"
              color="primary"
              size="sm"
              :loading="adding"
              @click="handleAddOne(row.original)"
            />
            <UBadge
              v-else
              :label="t('diagnosisSettings.added')"
              color="neutral"
              variant="subtle"
            />
          </template>
        </UTable>
      </div>

      <template v-if="error" #footer>
        <div class="flex flex-col items-center gap-2 py-6">
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
      </template>

      <template v-else #footer>
        <div class="flex items-center justify-between">
          <span class="text-sm text-gray-500">Total: {{ total.toLocaleString() }}</span>
          <div class="flex gap-2">
            <UButton icon="i-lucide-chevron-left" :disabled="page === 1" @click="page--" />
            <UButton trailing-icon="i-lucide-chevron-right" :disabled="page * limit >= total" @click="page++" />
          </div>
        </div>
      </template>
    </UCard>
  </div>
</template>
