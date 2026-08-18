export const useStaff = () => {
  const staff = ref<any[]>([])
  const isLoading = ref(false)

  async function fetchStaff(role?: string) {
    isLoading.value = true
    try {
      let url = '/staff'
      if (role) url += `?role=${role}`
      const res = await $api<{ data: { data: any[], total: number } }>(url)
      staff.value = res.data?.data || []
    } catch (e) {
      console.error('Failed to fetch staff', e)
    } finally {
      isLoading.value = false
    }
  }

  async function createStaff(data: any) {
    try {
      await $api('/staff', {
        method: 'POST',
        body: data
      })
      // refresh?
    } catch (e) {
      throw e
    }
  }

  async function updateStaff(id: string, data: any) {
    try {
      await $api(`/staff/${id}`, {
        method: 'PUT',
        body: data
      })
    } catch (e) {
      throw e
    }
  }

  async function deleteStaff(id: string) {
    try {
      await $api(`/staff/${id}`, {
        method: 'DELETE'
      })
    } catch (e) {
      throw e
    }
  }

  return {
    staff,
    isLoading,
    fetchStaff,
    createStaff,
    updateStaff,
    deleteStaff
  }
}
