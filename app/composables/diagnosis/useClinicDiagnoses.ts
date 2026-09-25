import { ref } from 'vue'
import type { ClinicDiagnosis } from '~/types/diagnosis'

export interface ClinicDiagnosisFilters {
  q?: string
  category?: string
  bodySystem?: string
  bodyRegion?: string
  organ?: string
  groupId?: string
  favorite?: string
  enabled?: string
  page?: number
  limit?: number
}

export function useClinicDiagnoses() {
  const data = ref<ClinicDiagnosis[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const total = ref(0)
  const page = ref(1)
  const limit = ref(30)

  async function fetch(filters: ClinicDiagnosisFilters = {}) {
    loading.value = true
    error.value = null
    try {
      const params: Record<string, any> = {
        page: filters.page ?? page.value,
        limit: filters.limit ?? limit.value
      }
      for (const key of ['q', 'category', 'bodySystem', 'bodyRegion', 'organ', 'groupId', 'favorite', 'enabled'] as const) {
        const value = filters[key]
        if (value !== undefined && value !== '') params[key] = value
      }
      const res = await $api<{ data: ClinicDiagnosis[], total: number, page: number, limit: number }>(
        '/clinic-diagnoses',
        { params }
      )
      data.value = res.data
      total.value = res.total
      page.value = res.page
    } catch (e) {
      console.error('[useClinicDiagnoses] fetch failed', e)
      error.value = 'Unable to load clinic diagnoses.'
      data.value = []
      total.value = 0
    } finally {
      loading.value = false
    }
  }

  async function getById(id: string): Promise<ClinicDiagnosis | null> {
    try {
      const res = await $api<{ data: ClinicDiagnosis }>(`/clinic-diagnoses/${id}`)
      return res.data
    } catch {
      return null
    }
  }

  async function add(diagnosisId: string): Promise<ClinicDiagnosis | null> {
    try {
      const res = await $api<{ data: ClinicDiagnosis }>('/clinic-diagnoses', {
        method: 'POST',
        body: { diagnosisId }
      })
      return res.data
    } catch (e) {
      console.error('[useClinicDiagnoses] add failed', e)
      return null
    }
  }

  async function update(id: string, payload: Record<string, any>): Promise<ClinicDiagnosis | null> {
    try {
      const res = await $api<{ data: ClinicDiagnosis }>(`/clinic-diagnoses/${id}`, {
        method: 'PATCH',
        body: payload
      })
      return res.data
    } catch (e) {
      console.error('[useClinicDiagnoses] update failed', e)
      return null
    }
  }

  async function setFavorite(id: string, favorite: boolean): Promise<boolean> {
    try {
      await $api(`/clinic-diagnoses/${id}/favorite`, { method: 'PATCH', body: { favorite } })
      return true
    } catch (e) {
      console.error('[useClinicDiagnoses] setFavorite failed', e)
      return false
    }
  }

  async function setEnabled(id: string, enabled: boolean): Promise<boolean> {
    try {
      await $api(`/clinic-diagnoses/${id}/status`, { method: 'PATCH', body: { enabled } })
      return true
    } catch (e) {
      console.error('[useClinicDiagnoses] setEnabled failed', e)
      return false
    }
  }

  async function remove(id: string): Promise<boolean> {
    try {
      await $api(`/clinic-diagnoses/${id}`, { method: 'DELETE' })
      return true
    } catch (e) {
      console.error('[useClinicDiagnoses] remove failed', e)
      return false
    }
  }

  return {
    data,
    loading,
    error,
    total,
    page,
    limit,
    fetch,
    getById,
    add,
    update,
    setFavorite,
    setEnabled,
    remove
  }
}
