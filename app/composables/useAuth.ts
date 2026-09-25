export interface AuthProfile {
  id?: string
  username?: string
  email?: string
  role?: string
  /** Display-only fields read by UserMenu. */
  avatar?: string
  name?: string
  nameEn?: string
  clinicId: string | null
  branchId: string | null
  /** Permission slugs such as "patient:read"; ['*'] for admin and developer. */
  permissions: string[]
}

/**
 * Token cookies: sameSite 'strict' so they are never attached to cross-site requests, and Secure
 * in production. A production build opened over plain http (a LAN address, say) cannot keep a
 * Secure cookie at all and would lose the session, so Secure follows the page's own protocol there.
 */
export function authCookieOptions() {
  return {
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days; see the TTL proposal before changing
    sameSite: 'strict' as const,
    secure: !import.meta.dev && useRequestURL().protocol === 'https:'
  }
}

export const useAuth = () => {
  const options = authCookieOptions()
  const accessToken = useCookie<string | null>('access_token', options)
  const refreshToken = useCookie<string | null>('refresh_token', options)
  const developerClinicId = useCookie<string | null>('developer_clinic_id', options)

  // The profile is held in memory and loaded from /api/auth/me. It used to live in a JS-readable
  // user_data cookie that could be edited and that grew past the 4 KB cookie limit.
  const profile = useState<AuthProfile | null>('auth-profile', () => null)
  const legacyUserData = useCookie<unknown>('user_data', { path: '/' })
  if (legacyUserData.value) legacyUserData.value = null

  const isLoggedIn = computed(
    () => !!accessToken.value || !!refreshToken.value
  )

  const user = computed(() => profile.value)
  const clinicId = computed(() => profile.value?.clinicId || null)
  const branchId = computed(() => profile.value?.branchId || null)

  // UI only: the backend checks every request. The admin/developer shortcut predates this change.
  const hasPermission = (slug: string) => {
    const currentUser = profile.value
    if (!currentUser) return false
    const role = String(currentUser.role || '').toLowerCase()
    if (role === 'developer' || role === 'admin') return true

    const permissions = Array.isArray(currentUser.permissions) ? currentUser.permissions : []
    if (permissions.includes('*')) return true
    return permissions.includes(slug)
  }

  const can = (resource: string, action: 'read' | 'create' | 'update' | 'delete' | 'approve' = 'read') =>
    hasPermission(`${resource}:${action}`)

  /** Accepts the login response user (permission documents) or the /auth/me profile (slugs). */
  const setUser = (data: any) => {
    const resolvedClinicId = typeof data?.clinicId === 'object'
      ? (data?.clinicId?._id || data?.clinicId?.id)
      : data?.clinicId
    const resolvedBranchId = typeof data?.branchId === 'object'
      ? (data?.branchId?._id || data?.branchId?.id)
      : data?.branchId

    const role = String(data?.role || '').toLowerCase()
    const permissions = (role === 'admin' || role === 'developer')
      ? ['*']
      : (Array.isArray(data?.permissions)
          ? data.permissions
              .map((p: any) => (typeof p === 'string' ? p : p?.permissionSlug || p?.slug))
              .filter((p: unknown): p is string => typeof p === 'string')
          : [])

    profile.value = {
      id: data?.id || data?._id,
      username: data?.username,
      email: data?.email,
      role: data?.role,
      avatar: data?.avatar,
      name: data?.name,
      nameEn: data?.nameEn,
      clinicId: resolvedClinicId || null,
      branchId: resolvedBranchId || null,
      permissions
    }
    if (role !== 'developer') {
      developerClinicId.value = null
    }
  }

  /** Loads the signed-in profile. Returns null (and keeps no profile) when it cannot be loaded. */
  const fetchUser = async () => {
    if (!accessToken.value && !refreshToken.value) return null
    try {
      const res: { data?: AuthProfile } = await $api('/auth/me')
      if (res?.data) {
        setUser(res.data)
        return res.data
      }
    } catch (e) {
      console.warn('Failed to fetch user:', e)
    }
    return null
  }

  const logout = () => {
    accessToken.value = null
    refreshToken.value = null
    profile.value = null
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
    setUser,
    fetchUser
  }
}
