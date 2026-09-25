export interface Branch {
  _id: string
  name: string
  nameKh: string
  code: string
  isMain?: boolean
  isActive?: boolean
}

const branches = ref<Branch[]>([])
const currentBranchId = ref<string | null>(null)
const isLoading = ref(false)

export const useBranch = () => {
  const config = useRuntimeConfig()

  const currentBranch = computed(() => {
    if (!currentBranchId.value) return null
    return branches.value.find(b => b._id === currentBranchId.value) || null
  })

  const fetchBranches = async (clinicId?: string | null, token?: string | null) => {
    isLoading.value = true
    try {
      const path = clinicId ? `/branches/clinic/${clinicId}` : '/branches'
      const response = await $fetch<any>(`${config.public.apiBase}${path}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })

      if (response?.data?.data) {
        branches.value = response.data.data
      } else if (Array.isArray(response)) {
        branches.value = response
      } else if (response?.data && Array.isArray(response.data)) {
        branches.value = response.data
      }
    } catch (error) {
      console.error('Failed to fetch branches:', error)
    } finally {
      isLoading.value = false
    }
  }

  const setCurrentBranchId = (id: string | null) => {
    currentBranchId.value = id
  }

  return {
    branches,
    currentBranch,
    currentBranchId,
    isLoading,
    fetchBranches,
    setCurrentBranchId
  }
}
