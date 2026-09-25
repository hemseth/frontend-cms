import { ref } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import type { DiagnosisSearchResult } from '~/types/diagnosis'

/**
 * Asynchronous, debounced diagnosis search for OPD. Results are prioritized by
 * the backend (user favorite > clinic favorite > clinic enabled > WHO master).
 * Stale responses are discarded via a request token so a slow old response can
 * never overwrite a newer one.
 */
export function useDiagnosisSearch() {
  const query = ref('')
  const results = ref<DiagnosisSearchResult[]>([])
  const favorites = ref<DiagnosisSearchResult[]>([])
  const recents = ref<DiagnosisSearchResult[]>([])
  const loading = ref(false)
  const searched = ref(false)
  const bodyRegion = ref<string>('')

  let requestId = 0

  async function runSearch(q: string, region?: string) {
    const current = ++requestId
    loading.value = true
    try {
      const activeRegion = region !== undefined ? region : bodyRegion.value
      const params: Record<string, any> = { q, limit: 30 }
      if (activeRegion) params.bodyRegion = activeRegion

      const res = await $api<{ data: DiagnosisSearchResult[] }>('/diagnosis-master/search', {
        params
      })
      if (current === requestId) {
        results.value = res.data
        searched.value = true
      }
    } catch (e) {
      console.error('[useDiagnosisSearch] search failed', e)
      if (current === requestId) results.value = []
    } finally {
      if (current === requestId) loading.value = false
    }
  }

  const debouncedSearch = useDebounceFn((q: string) => {
    query.value = q
    if (!q.trim() && !bodyRegion.value) {
      results.value = []
      searched.value = false
      return
    }
    runSearch(q)
  }, 300)

  function search(q: string, immediate = false, region?: string) {
    if (region !== undefined) bodyRegion.value = region
    if (immediate) {
      query.value = q
      runSearch(q, region)
    } else {
      debouncedSearch(q)
    }
  }

  function setBodyRegion(region: string) {
    bodyRegion.value = region
    runSearch(query.value, region)
  }

  function clearBodyRegion() {
    bodyRegion.value = ''
    if (query.value.trim()) {
      runSearch(query.value, '')
    } else {
      results.value = []
      searched.value = false
    }
  }

  async function loadFavorites() {
    try {
      const res = await $api<{ data: DiagnosisSearchResult[] }>('/my/diagnosis-favorites', {
        params: { limit: 50 }
      })
      favorites.value = res.data
    } catch (e) {
      console.error('[useDiagnosisSearch] loadFavorites failed', e)
    }
  }

  async function loadRecents() {
    try {
      const res = await $api<{ data: DiagnosisSearchResult[] }>('/my/recent-diagnoses', {
        params: { limit: 20 }
      })
      recents.value = res.data
    } catch (e) {
      console.error('[useDiagnosisSearch] loadRecents failed', e)
    }
  }

  async function toggleUserFavorite(diagnosisId: string, favorite: boolean) {
    try {
      await $api(`/my/diagnosis-favorites/${diagnosisId}`, { method: 'PATCH', body: { favorite } })
      await loadFavorites()
    } catch (e) {
      console.error('[useDiagnosisSearch] toggleUserFavorite failed', e)
    }
  }

  async function loadInitial() {
    await Promise.all([loadFavorites(), loadRecents()])
  }

  return {
    query,
    results,
    favorites,
    recents,
    loading,
    searched,
    search,
    bodyRegion,
    setBodyRegion,
    clearBodyRegion,
    loadFavorites,
    loadRecents,
    toggleUserFavorite,
    loadInitial
  }
}
