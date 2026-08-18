import { ref, reactive } from 'vue'
import type { DiagnosisMetadataItem } from '~/types/diagnosis'

export interface DiagnosisMetaFilters {
  chapter?: string
  category?: string
  bodySystem?: string
  bodyRegion?: string
  organ?: string
}

/**
 * Metadata (chapters/categories/body systems/regions/organs) with cascading
 * filters and a simple in-memory cache to avoid repeated identical fetches.
 */
export function useDiagnosisMetadata() {
  const chapters = ref<DiagnosisMetadataItem[]>([])
  const categories = ref<DiagnosisMetadataItem[]>([])
  const bodySystems = ref<DiagnosisMetadataItem[]>([])
  const bodyRegions = ref<DiagnosisMetadataItem[]>([])
  const organs = ref<DiagnosisMetadataItem[]>([])
  const loading = ref(false)

  const cache = reactive<Record<string, DiagnosisMetadataItem[] | null>>({})

  async function fetchMeta(endpoint: string, filters: DiagnosisMetaFilters = {}): Promise<DiagnosisMetadataItem[]> {
    const params: Record<string, string> = {}
    for (const key of ['chapter', 'category', 'bodySystem', 'bodyRegion', 'organ'] as const) {
      if (filters[key]) params[key] = filters[key] as string
    }
    const cacheKey = `${endpoint}:${JSON.stringify(params)}`
    if (cache[cacheKey]) return cache[cacheKey] as DiagnosisMetadataItem[]

    loading.value = true
    try {
      const res = await $api<{ data: DiagnosisMetadataItem[] }>(endpoint, { params })
      cache[cacheKey] = res.data
      return res.data
    } catch (e) {
      console.error(`[useDiagnosisMetadata] ${endpoint} failed`, e)
      return []
    } finally {
      loading.value = false
    }
  }

  async function loadChapters() {
    chapters.value = await fetchMeta('/diagnosis-meta/chapters')
    return chapters.value
  }

  async function loadCategories(filters: DiagnosisMetaFilters = {}) {
    categories.value = await fetchMeta('/diagnosis-meta/categories', filters)
    return categories.value
  }

  async function loadBodySystems(filters: DiagnosisMetaFilters = {}) {
    bodySystems.value = await fetchMeta('/diagnosis-meta/body-systems', filters)
    return bodySystems.value
  }

  async function loadBodyRegions(filters: DiagnosisMetaFilters = {}) {
    bodyRegions.value = await fetchMeta('/diagnosis-meta/body-regions', filters)
    return bodyRegions.value
  }

  async function loadOrgans(filters: DiagnosisMetaFilters = {}) {
    organs.value = await fetchMeta('/diagnosis-meta/organs', filters)
    return organs.value
  }

  /** Cascading reload: category affects systems/regions/organs, region affects organs. */
  async function loadCascading(filters: DiagnosisMetaFilters = {}) {
    await Promise.all([
      loadCategories({ chapter: filters.chapter, bodySystem: filters.bodySystem }),
      loadBodySystems({ chapter: filters.chapter, category: filters.category }),
      loadBodyRegions({ chapter: filters.chapter, category: filters.category, bodySystem: filters.bodySystem }),
      loadOrgans({
        chapter: filters.chapter,
        category: filters.category,
        bodySystem: filters.bodySystem,
        bodyRegion: filters.bodyRegion
      })
    ])
  }

  function clearCache() {
    for (const key of Object.keys(cache)) {
      cache[key] = null
    }
  }

  return {
    chapters,
    categories,
    bodySystems,
    bodyRegions,
    organs,
    loading,
    loadChapters,
    loadCategories,
    loadBodySystems,
    loadBodyRegions,
    loadOrgans,
    loadCascading,
    clearCache
  }
}
