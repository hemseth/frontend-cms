import { ref, computed } from 'vue'
import type { OpdMedicine, OpdService } from '~/types/models'

export const useOpdData = () => {
  const allMedicines = ref<OpdMedicine[]>([])
  const allServices = ref<OpdService[]>([])
  const allServiceCategories = ref<any[]>([])
  const allMedicineCategories = ref<any[]>([])
  const allDosageForms = ref<any[]>([])
  const isLoading = ref(false)

  const categoryMap = computed(() => {
    const map = new Map<string, any>()
    allServiceCategories.value.forEach((cat) => {
      if (cat._id) map.set(cat._id, cat)
    })
    return map
  })

  const medicines = computed(() =>
    allMedicines.value.filter(m => m.status === 'active')
  )

  const labServices = computed(() => {
    return allServices.value.filter((s) => {
      const catId = s.categoryId || s.category
      if (!catId) return false
      const cat = categoryMap.value.get(catId)
      return cat && cat.group === 'laboratory'
    })
  })

  const echoServices = computed(() => {
    return allServices.value.filter((s) => {
      const catId = s.categoryId || s.category
      if (!catId) return false
      const cat = categoryMap.value.get(catId)
      return cat && cat.group === 'imaging'
    })
  })

  async function refreshData() {
    isLoading.value = true
    try {
      const branch = useBranch()
      const branchFilter = branch.currentBranchId.value ? `&branchId=${branch.currentBranchId.value}` : ''

      const [medicinesRes, servicesRes, categoriesRes, medCategoriesRes, dosageFormsRes] = await Promise.all([
        $api<{ data: OpdMedicine[] }>(`/medicines?limit=1000${branchFilter}`),
        $api<{ data: OpdService[] }>(`/services?limit=1000${branchFilter}`),
        $api<{ data: any[] }>(`/service-categories${branchFilter ? `?branchId=${branch.currentBranchId.value}` : ''}`),
        $api<{ data: any[] }>(`/public/medicine-categories${branchFilter ? `?branchId=${branch.currentBranchId.value}` : ''}`),
        $api<{ data: any }>('/public/dosage-forms')
      ])

      const medData: any = medicinesRes
      if (medData.data && Array.isArray(medData.data)) {
        allMedicines.value = medData.data
      } else if (Array.isArray(medData)) {
        allMedicines.value = medData as any
      } else {
        allMedicines.value = []
      }

      if (servicesRes.data && Array.isArray(servicesRes.data)) {
        allServices.value = servicesRes.data
      } else if (Array.isArray(servicesRes)) {
        allServices.value = servicesRes as any
      }

      if (categoriesRes.data && Array.isArray(categoriesRes.data)) {
        allServiceCategories.value = categoriesRes.data
      } else if (Array.isArray(categoriesRes)) {
        allServiceCategories.value = categoriesRes
      }

      const medCatsData: any = medCategoriesRes
      if (medCatsData && Array.isArray(medCatsData.data)) {
        allMedicineCategories.value = medCatsData.data
      } else if (Array.isArray(medCatsData)) {
        allMedicineCategories.value = medCatsData
      } else {
        allMedicineCategories.value = medCatsData?.data?.data || []
      }

      const dosageData: any = dosageFormsRes
      if (dosageData && Array.isArray(dosageData.data)) {
        allDosageForms.value = dosageData.data
      } else if (Array.isArray(dosageData)) {
        allDosageForms.value = dosageData
      } else {
        allDosageForms.value = dosageData?.data?.data || []
      }
    } catch (err) {
      console.error('Failed to load data from API:', err)
      throw err
    } finally {
      isLoading.value = false
    }
  }

  function findMedicineById(id: string | undefined) {
    if (!id) return undefined
    return medicines.value.find(m => m._id === id)
  }

  function getCategoryName(service: OpdService): string {
    const catId = service.categoryId || service.category
    const cat = catId ? categoryMap.value.get(catId) : null
    return cat?.nameEn || ''
  }

  return {
    allMedicines,
    allServices,
    allServiceCategories,
    allMedicineCategories,
    allDosageForms,
    isLoading,
    medicines,
    labServices,
    echoServices,
    categoryMap,
    refreshData,
    findMedicineById,
    getCategoryName
  }
}
