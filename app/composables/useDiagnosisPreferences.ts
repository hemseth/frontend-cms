import { ref } from 'vue'
import type { DiagnosisSearchResult } from '~/types/diagnosis'

/** User-level diagnosis preferences: personal favorites and recent diagnoses. */
export function useDiagnosisPreferences() {
  const favorites = ref<DiagnosisSearchResult[]>([])
  const recents = ref<DiagnosisSearchResult[]>([])
  const loading = ref(false)

  async function loadFavorites() {
    loading.value = true
    try {
      const res = await $api<{ data: DiagnosisSearchResult[] }>('/my/diagnosis-favorites', {
        params: { limit: 100 }
      })
      favorites.value = res.data
    } catch (e) {
      console.error('[useDiagnosisPreferences] loadFavorites failed', e)
      favorites.value = []
    } finally {
      loading.value = false
    }
  }

  async function loadRecents() {
    try {
      const res = await $api<{ data: DiagnosisSearchResult[] }>('/my/recent-diagnoses', {
        params: { limit: 30 }
      })
      recents.value = res.data
    } catch (e) {
      console.error('[useDiagnosisPreferences] loadRecents failed', e)
      recents.value = []
    }
  }

  async function setFavorite(diagnosisId: string, favorite: boolean): Promise<boolean> {
    try {
      await $api(`/my/diagnosis-favorites/${diagnosisId}`, { method: 'PATCH', body: { favorite } })
      await loadFavorites()
      return true
    } catch (e) {
      console.error('[useDiagnosisPreferences] setFavorite failed', e)
      return false
    }
  }

  async function loadAll() {
    await Promise.all([loadFavorites(), loadRecents()])
  }

  return {
    favorites,
    recents,
    loading,
    loadFavorites,
    loadRecents,
    setFavorite,
    loadAll
  }
}
