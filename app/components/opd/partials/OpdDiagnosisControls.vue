<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { DiagnosisSearchResult } from '~/types/diagnosis'
import { useDiagnosisSearch } from '~/composables/diagnosis/useDiagnosisSearch'

const { t } = useI18n()

const props = defineProps<{
  modelValue: any[]
  regionFilter?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: any[]): void
  (e: 'clearRegionFilter'): void
}>()

const selected = computed({
  get: () => props.modelValue,
  set: (value: any[]) => emit('update:modelValue', value)
})

const {
  query,
  results,
  favorites,
  recents,
  loading,
  search,
  bodyRegion,
  setBodyRegion,
  clearBodyRegion,
  toggleUserFavorite,
  loadInitial
} = useDiagnosisSearch()

const showResults = ref(false)

onMounted(async () => {
  await loadInitial()
  if (props.regionFilter) {
    setBodyRegion(props.regionFilter)
  }
})

watch(() => props.regionFilter, (newRegion) => {
  if (newRegion) {
    setBodyRegion(newRegion)
    showResults.value = true
  } else {
    clearBodyRegion()
  }
})

watch(query, () => {
  const q = query.value
  showResults.value = !!q.trim() || !!bodyRegion.value
  if (q.trim() || bodyRegion.value) {
    search(q)
  } else {
    results.value = []
  }
})

function isAlreadySelected(diagnosisId?: string): boolean {
  return selected.value.some((d: any) => d.diagnosisId && d.diagnosisId.toString() === diagnosisId)
}

function addDiagnosis(item: DiagnosisSearchResult) {
  if (isAlreadySelected(item.id)) return
  selected.value = [
    ...selected.value,
    {
      diagnosisId: item.id,
      sourceType: item.sourceType,
      code: item.code,
      nameKh: item.nameKh,
      nameEn: item.nameEn,
      isPrimary: selected.value.length === 0,
      status: 'confirmed'
    }
  ]
  query.value = ''
  showResults.value = false
}

function setPrimary(index: number) {
  const next = selected.value.map((d: any, i: number) => ({ ...d, isPrimary: i === index }))
  selected.value = next
}

function updateStatus(index: number, status: string) {
  const next = [...selected.value]
  next[index] = { ...next[index], status }
  selected.value = next
}

function removeAt(index: number) {
  selected.value = selected.value.filter((_, i) => i !== index)
}

const primaries = computed(() => selected.value.filter((d: any) => d.isPrimary))
const secondaries = computed(() => selected.value.filter((d: any) => !d.isPrimary))

function sourceLabel(item: any): string {
  const source = item.sourceType || (item.diagnosisId ? 'ICD_MASTER' : 'CLINIC_LOCAL')
  if (source === 'ICD_MASTER') return t('diagnosisSettings.who')
  if (source === 'FREE_TEXT') return t('diagnosisSettings.local')
  return t('diagnosisSettings.clinic')
}

function resultSourceLabel(item: DiagnosisSearchResult): string {
  if (item.clinic?.added) return t('diagnosisSettings.clinic')
  return t('diagnosisSettings.who')
}

function isUserFavorite(item: DiagnosisSearchResult): boolean {
  return item.userFavorite || favorites.value.some(f => f.id === item.id)
}

async function handleFavorite(item: DiagnosisSearchResult) {
  await toggleUserFavorite(item.id, !isUserFavorite(item))
}
</script>

<template>
  <div class="p-4 border-b border-default bg-default">
    <div class="flex items-center justify-between mb-1.5">
      <label class="khmer-label block text-sm font-bold text-default">
        {{ $t('visit.diagnosis') }}
      </label>
      <div v-if="bodyRegion" class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800 text-[11px] font-medium shadow-2xs">
        <UIcon name="i-lucide-activity" class="w-3 h-3 text-primary-500" />
        <span>តម្រងតំបន់: {{ bodyRegion }}</span>
        <button
          type="button"
          class="ml-0.5 text-dimmed hover:text-red-500 transition-colors"
          title="លុបតម្រងតំបន់រាងកាយ"
          @click="emit('clearRegionFilter'); clearBodyRegion()"
        >
          <UIcon name="i-lucide-x" class="w-3 h-3" />
        </button>
      </div>
    </div>

    <!-- Async search -->
    <div class="relative">
      <UInput
        v-model="query"
        icon="i-lucide-search"
        :placeholder="$t('diagnosisSettings.search')"
        class="w-full"
        @focus="showResults = true"
      />

      <div
        v-if="showResults || loading"
        class="absolute left-0 right-0 top-full mt-1 z-20 max-h-72 overflow-y-auto rounded-lg border border-default bg-default shadow-lg"
      >
        <div v-if="loading" class="p-3 text-sm text-muted">
          {{ $t('common.loading') }}
        </div>

        <template v-else-if="(query.trim() || bodyRegion) && results.length > 0">
          <button
            v-for="item in results"
            :key="item.id"
            class="w-full text-left px-3 py-2 hover:bg-muted flex items-start gap-2 border-b border-default last:border-0"
            :disabled="isAlreadySelected(item.id)"
            @click="addDiagnosis(item)"
          >
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <UBadge size="xs" variant="subtle" color="primary">
                  {{ item.code }}
                </UBadge>
                <UBadge size="xs" variant="subtle" color="neutral">
                  {{ resultSourceLabel(item) }}
                </UBadge>
                <UBadge
                  v-if="isUserFavorite(item)"
                  size="xs"
                  variant="subtle"
                  color="warning"
                >
                  ★
                </UBadge>
                <UBadge
                  v-if="item.terminal === false"
                  size="xs"
                  variant="subtle"
                  color="neutral"
                >
                  nav
                </UBadge>
              </div>
              <div class="text-sm font-medium truncate">
                {{ item.nameKh || item.nameEn }}
              </div>
              <div class="text-xs text-muted truncate">
                {{ item.nameEn }}
              </div>
              <div v-if="item.categoryCode || item.bodyRegionCode || item.organCode" class="text-xs text-dimmed truncate">
                {{ [item.categoryCode, item.bodyRegionCode, item.organCode].filter(Boolean).join(' • ') }}
              </div>
            </div>
            <UButton
              icon="i-lucide-star"
              size="xs"
              color="neutral"
              variant="ghost"
              @click.stop="handleFavorite(item)"
            />
          </button>
        </template>

        <template v-else-if="!query.trim()">
          <div v-if="favorites.length > 0" class="p-2">
            <div class="text-xs font-semibold text-dimmed px-2 py-1">
              {{ $t('diagnosisSettings.statusFavorite') }}
            </div>
            <button
              v-for="item in favorites"
              :key="'fav-' + item.id"
              class="w-full text-left px-3 py-2 hover:bg-muted flex items-start gap-2 rounded-md"
              :disabled="isAlreadySelected(item.id)"
              @click="addDiagnosis(item)"
            >
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <UBadge size="xs" variant="subtle" color="warning">
                    ★
                  </UBadge>
                  <UBadge size="xs" variant="subtle" color="primary">
                    {{ item.code }}
                  </UBadge>
                </div>
                <div class="text-sm truncate">
                  {{ item.nameKh || item.nameEn }}
                </div>
              </div>
            </button>
          </div>
          <div v-if="recents.length > 0" class="p-2 border-t border-default">
            <div class="text-xs font-semibold text-dimmed px-2 py-1">
              {{ $t('diagnosisSettings.select') }}
            </div>
            <button
              v-for="item in recents"
              :key="'rec-' + item.id"
              class="w-full text-left px-3 py-2 hover:bg-muted flex items-start gap-2 rounded-md"
              :disabled="isAlreadySelected(item.id)"
              @click="addDiagnosis(item)"
            >
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <UBadge size="xs" variant="subtle" color="primary">
                    {{ item.code }}
                  </UBadge>
                </div>
                <div class="text-sm truncate">
                  {{ item.nameKh || item.nameEn }}
                </div>
              </div>
            </button>
          </div>
          <div v-if="favorites.length === 0 && recents.length === 0" class="p-3 text-sm text-muted">
            {{ $t('diagnosisSettings.search') }}
          </div>
        </template>

        <div v-else class="p-3 text-sm text-muted">
          {{ $t('diagnosisSettings.noResults') }}
        </div>
      </div>
    </div>

    <!-- Selected diagnoses -->
    <div v-if="selected.length > 0" class="mt-3 space-y-1">
      <div v-if="primaries.length > 0" class="text-xs font-semibold text-primary-600 uppercase tracking-wide">
        {{ $t('diagnosisSettings.primary') }}
      </div>
      <div
        v-for="(item, index) in primaries"
        :key="'p-' + index"
        class="flex items-center gap-2 p-2 rounded-lg border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-950/40"
      >
        <span class="w-2 h-2 rounded-full bg-primary-500" />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-sm">{{ item.code }}</span>
            <UBadge size="xs" variant="subtle" color="neutral">
              {{ sourceLabel(item) }}
            </UBadge>
          </div>
          <div class="text-sm truncate">
            {{ item.nameKh || item.nameEn }}
          </div>
        </div>
        <USelectMenu
          :model-value="item.status || 'confirmed'"
          :items="['suspected', 'confirmed', 'ruled-out']"
          size="xs"
          class="w-28"
          @update:model-value="updateStatus(selected.indexOf(item), $event)"
        />
        <UButton
          icon="i-lucide-x"
          size="xs"
          color="neutral"
          variant="ghost"
          @click="removeAt(selected.indexOf(item))"
        />
      </div>

      <div v-if="secondaries.length > 0" class="text-xs font-semibold text-dimmed uppercase tracking-wide pt-1">
        {{ $t('diagnosisSettings.secondary') }}
      </div>
      <div
        v-for="(item, index) in secondaries"
        :key="'s-' + index"
        class="flex items-center gap-2 p-2 rounded-lg border border-default"
      >
        <span class="w-2 h-2 rounded-full border border-gray-400" />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-sm">{{ item.code }}</span>
            <UBadge size="xs" variant="subtle" color="neutral">
              {{ sourceLabel(item) }}
            </UBadge>
          </div>
          <div class="text-sm truncate">
            {{ item.nameKh || item.nameEn }}
          </div>
        </div>
        <UButton
          icon="i-lucide-arrow-up"
          size="xs"
          color="neutral"
          variant="ghost"
          :title="$t('diagnosisSettings.primary')"
          @click="setPrimary(selected.indexOf(item))"
        />
        <USelectMenu
          :model-value="item.status || 'confirmed'"
          :items="['suspected', 'confirmed', 'ruled-out']"
          size="xs"
          class="w-28"
          @update:model-value="updateStatus(selected.indexOf(item), $event)"
        />
        <UButton
          icon="i-lucide-x"
          size="xs"
          color="neutral"
          variant="ghost"
          @click="removeAt(selected.indexOf(item))"
        />
      </div>
    </div>
  </div>
</template>

<style scoped></style>
