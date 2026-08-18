export const useAuth = () => {
  const accessToken = useCookie<string | null>('access_token')
  const refreshToken = useCookie<string | null>('refresh_token')
  const userData = useCookie<any>('user_data')
  const developerClinicId = useCookie<string | null>('developer_clinic_id')

  const isLoggedIn = computed(
    () => !!accessToken.value || !!refreshToken.value
  )

  const user = computed(() => userData.value || null)
  const clinicId = computed(() => userData.value?.clinicId || null)
  const branchId = computed(() => userData.value?.branchId || null)

  const hasPermission = (slug: string) => {
    const currentUser = userData.value
    if (!currentUser) return false
    if (String(currentUser.role).toLowerCase() === 'developer') return true

    const permissions = Array.isArray(currentUser.permissions) ? currentUser.permissions : []
    return permissions.some((permission: any) => {
      const value = typeof permission === 'string'
        ? permission
        : permission?.permissionSlug || permission?.slug
      return value === slug
    })
  }

  const can = (resource: string, action: 'read' | 'create' | 'update' | 'delete' | 'approve' = 'read') =>
    hasPermission(`${resource}:${action}`)

  const setUser = (data: any) => {
    // Browsers cap a single cookie at ~4KB. The login response embeds the full
    // permission documents (with multi-byte Khmer names), which would blow the
    // user_data cookie and silently drop permissions on reload — hiding menu
    // items / blocking routes. Persist only the fields RBAC needs.
    userData.value = {
      id: data?.id,
      username: data?.username,
      email: data?.email,
      role: data?.role,
      clinicId: data?.clinicId,
      branchId: data?.branchId,
      permissions: Array.isArray(data?.permissions)
        ? data.permissions.map((p: any) => (typeof p === 'string' ? p : p?.permissionSlug || p?.slug || p))
        : []
    }
    if (String(data?.role || '').toLowerCase() !== 'developer') {
      developerClinicId.value = null
    }
  }

  const logout = () => {
    accessToken.value = null
    refreshToken.value = null
    userData.value = null
    developerClinicId.value = null
    navigateTo('/login')
  }

  return {
    accessToken,
    refreshToken,
    isLoggedIn,
    logout,
    user,
    clinicId,
    branchId,
    hasPermission,
    can,
    setUser
  }
}
