export const usePositions = () => {
  const positions = ref<any[]>([])
  const total = ref(0)
  const isLoading = ref(false)

  async function fetchPositions(search = '', page = 1, limit = 10) {
    isLoading.value = true
    try {
      const offset = (page - 1) * limit
      const res = await $api<{ data: any[], total: number }>(
        `/positions?search=${encodeURIComponent(search)}&offset=${offset}&limit=${limit}`
      )
      positions.value = res.data || []
      total.value = res.total || 0
    } catch (e) {
      console.error('Failed to fetch positions', e)
    } finally {
      isLoading.value = false
    }
  }

  async function createPosition(data: any) {
    try {
      await $api('/positions', {
        method: 'POST',
        body: data
      })
    } catch (e) {
      throw e
    }
  }

  async function updatePosition(id: string, data: any) {
    try {
      await $api(`/positions/${id}`, {
        method: 'PUT',
        body: data
      })
    } catch (e) {
      throw e
    }
  }

  async function deletePosition(id: string) {
    try {
      await $api(`/positions/${id}`, {
        method: 'DELETE'
      })
    } catch (e) {
      throw e
    }
  }

  return {
    positions,
    total,
    isLoading,
    fetchPositions,
    createPosition,
    updatePosition,
    deletePosition
  }
}
