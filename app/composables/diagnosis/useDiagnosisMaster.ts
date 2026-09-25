import { ref } from 'vue'
import type { DiagnosisMaster } from '~/types/diagnosis'

export interface MasterSearchFilters {
  q?: string
  chapter?: string
  category?: string
  bodySystem?: string
  bodyRegion?: string
  organ?: string
  codeSystem?: string
  level?: string
  terminal?: string
  codeType?: string
  active?: string
  clinicStatus?: string
  page?: number
  limit?: number
}

export interface MasterStats {
  totalMaster: number
  clinicAdded: number
  favorites: number
  disabled: number
}

export function useDiagnosisMaster() {
  const data = ref<DiagnosisMaster[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const total = ref(0)
  const page = ref(1)
  const limit = ref(50)
  const stats = ref<MasterStats>({ totalMaster: 0, clinicAdded: 0, favorites: 0, disabled: 0 })

  let requestId = 0

  async function search(filters: MasterSearchFilters = {}) {
    const current = ++requestId
    loading.value = true
    error.value = null
    try {
      const params: Record<string, any> = {
        page: filters.page ?? page.value,
        limit: filters.limit ?? limit.value
      }
      for (const key of ['q', 'chapter', 'category', 'bodySystem', 'bodyRegion', 'organ', 'codeSystem', 'level', 'terminal', 'codeType', 'active', 'clinicStatus'] as const) {
        const value = filters[key]
        if (value !== undefined && value !== '') params[key] = value
      }
      const res = await $api<{ data: DiagnosisMaster[], total: number, page: number, limit: number }>(
        '/diagnosis-master',
        { params }
      )
      if (current === requestId) {
        data.value = res.data
        total.value = res.total
        page.value = res.page
      }
    } catch (e) {
      console.error('[useDiagnosisMaster] search failed', e)
      if (current === requestId) {
        error.value = 'Unable to load diagnosis master.'
        data.value = []
        total.value = 0
      }
    } finally {
      if (current === requestId) loading.value = false
    }
  }

  async function fetchStats() {
    try {
      const res = await $api<{ data: MasterStats }>('/diagnosis-master/stats')
      stats.value = res.data
    } catch (e) {
      console.error('[useDiagnosisMaster] fetchStats failed', e)
    }
  }

  async function getById(id: string): Promise<DiagnosisMaster | null> {
    try {
      const res = await $api<{ data: DiagnosisMaster }>(`/diagnosis-master/${id}`)
      return res.data
    } catch {
      return null
    }
  }

  async function getByCode(code: string): Promise<DiagnosisMaster | null> {
    try {
      const res = await $api<{ data: DiagnosisMaster }>(`/diagnosis-master/code/${code}`)
      return res.data
    } catch {
      return null
    }
  }

  async function addToClinic(diagnosisId: string): Promise<boolean> {
    try {
      await $api('/clinic-diagnoses', { method: 'POST', body: { diagnosisId } })
      return true
    } catch (e) {
      console.error('[useDiagnosisMaster] addToClinic failed', e)
      return false
    }
  }

  async function bulkAddToClinic(diagnosisIds: string[]): Promise<boolean> {
    try {
      await $api('/clinic-diagnoses/bulk', { method: 'POST', body: { diagnosisIds } })
      return true
    } catch (e) {
      console.error('[useDiagnosisMaster] bulkAddToClinic failed', e)
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
    stats,
    search,
    fetchStats,
    getById,
    getByCode,
    addToClinic,
    bulkAddToClinic
  }
}
