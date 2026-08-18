export interface ClinicContextOption {
  _id: string
  name: string
  nameKh?: string
  isActive?: boolean
}

export const useClinicContext = () => {
  const selectedClinicId = useCookie<string | null>('developer_clinic_id', {
    sameSite: 'lax'
  })

  const setSelectedClinicId = (clinicId: string | null) => {
    selectedClinicId.value = clinicId || null
  }

  return { selectedClinicId, setSelectedClinicId }
}
