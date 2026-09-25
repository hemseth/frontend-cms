import { ref } from 'vue'
import type { ClinicDiagnosisGroup } from '~/types/diagnosis'

export function useDiagnosisGroups() {
  const groups = ref<ClinicDiagnosisGroup[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetch() {
    loading.value = true
    error.value = null
    try {
      const res = await $api<{ data: ClinicDiagnosisGroup[] }>('/clinic-diagnosis-groups')
      groups.value = res.data
    } catch (e) {
      console.error('[useDiagnosisGroups] fetch failed', e)
      error.value = 'Unable to load diagnosis groups.'
      groups.value = []
    } finally {
      loading.value = false
    }
  }

  async function create(payload: Record<string, any>): Promise<ClinicDiagnosisGroup | null> {
    try {
      const res = await $api<{ data: ClinicDiagnosisGroup }>('/clinic-diagnosis-groups', {
        method: 'POST',
        body: payload
      })
      await fetch()
      return res.data
    } catch (e) {
      console.error('[useDiagnosisGroups] create failed', e)
      return null
    }
  }

  async function update(id: string, payload: Record<string, any>): Promise<ClinicDiagnosisGroup | null> {
    try {
      const res = await $api<{ data: ClinicDiagnosisGroup }>(`/clinic-diagnosis-groups/${id}`, {
        method: 'PATCH',
        body: payload
      })
      await fetch()
      return res.data
    } catch (e) {
      console.error('[useDiagnosisGroups] update failed', e)
      return null
    }
  }

  async function remove(id: string): Promise<boolean> {
    try {
      await $api(`/clinic-diagnosis-groups/${id}`, { method: 'DELETE' })
      await fetch()
      return true
    } catch (e) {
      console.error('[useDiagnosisGroups] remove failed', e)
      return false
    }
  }

  return {
    groups,
    loading,
    error,
    fetch,
    create,
    update,
    remove
  }
}
