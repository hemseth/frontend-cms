import { ref } from 'vue'
import type { OpdService } from '~/types/models'

export const useOpdServiceSelection = (
  addServiceRow: (service: OpdService, params?: any[]) => void
) => {
  const isParamModalOpen = ref(false)
  const selectedServiceForParams = ref<OpdService | null>(null)
  const selectedParamSet = ref<Set<number>>(new Set())

  function handleAddService(service: OpdService) {
    if (!service) return

    // Check for parameters - show selection modal
    if (service.parameters && service.parameters.length > 0) {
      selectedServiceForParams.value = service
      selectedParamSet.value.clear()
      isParamModalOpen.value = true
      return
    }

    // No parameters - add directly
    addServiceRow(service)
  }

  function confirmAddServiceWithParams(selectedParams?: any[]) {
    if (!selectedServiceForParams.value) return

    const service = selectedServiceForParams.value

    // Use provided params or fallback to empty array (or legacy logic if needed, but we are switching entirely)
    const paramsToAdd = selectedParams || []

    // Add service with selected parameters
    addServiceRow(service, paramsToAdd)

    // Close modal
    isParamModalOpen.value = false
    selectedServiceForParams.value = null
    selectedParamSet.value.clear()
  }

  return {
    isParamModalOpen,
    selectedServiceForParams,
    selectedParamSet,
    handleAddService,
    confirmAddServiceWithParams
  }
}
