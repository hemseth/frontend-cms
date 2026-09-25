import { ref } from 'vue'

export interface Diagnosis {
  _id?: string
  nameEn: string
  nameKh?: string
  code?: string
  description?: string
  active?: number
}

export function useDiagnosis() {
  const diagnoses = ref<Diagnosis[]>([])
  const loading = ref(false)
  const total = ref(0)
  const page = ref(1)
  const perPage = ref(10)

  async function fetchDiagnoses(
    search = '',
    activeOnly = false,
    _page = 1,
    _limit = 10
  ) {
    loading.value = true
    try {
      const params: any = {}
      if (search) params.search = search
      if (activeOnly) params.active = 1
      params.page = _page
      params.limit = _limit

      page.value = _page
      perPage.value = _limit

      const res = await $api<{ data: Diagnosis[], total: number }>(
        '/diagnoses',
        {
          params
        }
      )
      diagnoses.value = res.data
      total.value = res.total
    } catch (e) {
      console.error(e)
      diagnoses.value = []
      total.value = 0
    } finally {
      loading.value = false
    }
  }

  async function createDiagnosis(data: Diagnosis) {
    console.log('Creating diagnosis:', data)
    const res = await $api<{ data: Diagnosis }>('/diagnoses', {
      method: 'POST',
      body: data
    })
    console.log('Diagnosis created:', res)
    return res.data
  }

  async function updateDiagnosis(id: string, data: Diagnosis) {
    const res = await $api<{ data: Diagnosis }>(`/diagnoses/${id}`, {
      method: 'PUT',
      body: data
    })
    return res.data
  }

  async function deleteDiagnosis(id: string) {
    await $api(`/diagnoses/${id}`, {
      method: 'DELETE'
    })
  }

  return {
    diagnoses,
    loading,
    fetchDiagnoses,
    createDiagnosis,
    updateDiagnosis,
    deleteDiagnosis,
    total,
    page,
    perPage
  }
}
