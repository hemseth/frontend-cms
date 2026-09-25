export default defineNuxtRouteMiddleware(async (to) => {
  const { accessToken, refreshToken, can, user, fetchUser } = useAuth()
  // 1. Define routes that should ALWAYS be accessible (Public Routes)
  const publicRoutes = ['/login', '/register', '/forgot-password', '/public/medicines']
  // 2. Check if the current route is in the public list
  const isPublicRoute = publicRoutes.includes(to.path)

  // 3. Logic: If there are no tokens and the user is NOT going to a public page, redirect to login
  if (!accessToken.value && !refreshToken.value && !isPublicRoute) {
    return navigateTo({
      path: '/login',
      query: { redirect: to.fullPath } // Save intended destination
    })
  }
  // The profile (role, clinic, permissions) is loaded from /api/auth/me, not a cookie. If the
  // server-side render cannot reach the API (in Docker the API base is localhost, which is the
  // frontend container itself), leave the profile checks to the client, where this middleware
  // runs again on hydration.
  if ((accessToken.value || refreshToken.value) && !user.value) {
    await fetchUser()
    if (!user.value) {
      if (import.meta.server) return
      // The tokens no longer give a profile (expired, revoked or the API is unreachable).
      accessToken.value = null
      refreshToken.value = null
      if (isPublicRoute) return
      return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
    }
  }

  // 4. Logic: If user IS logged in but tries to go to Login/Register, redirect to Home
  if ((accessToken.value || refreshToken.value) && isPublicRoute) {
    return navigateTo('/')
  }

  if (!isPublicRoute && (accessToken.value || refreshToken.value)) {
    const routePermissions: Array<[string, string]> = [
      ['/users/roles', 'user:read'],
      ['/users/permissions', 'user:read'],
      ['/users', 'user:read'],
      ['/settings', 'settings:read'],
      ['/positions', 'staff:read'],
      ['/payrolls', 'payroll:read'],
      ['/staff', 'staff:read'],
      ['/suppliers', 'supplier:read'],
      ['/purchases', 'purchase:read'],
      ['/revenues', 'revenue:read'],
      ['/expenses', 'expense:read'],
      ['/reports', 'report:read'],
      ['/medicines', 'settings:read'],
      ['/pharmacy', 'pharmacy:read'],
      ['/payments', 'payment:read'],
      ['/prescriptions', 'prescription:read'],
      ['/visits', 'visit:read'],
      ['/patients', 'patient:read'],
      ['/opd', 'visit:read'],
      ['/ipd', 'admission:read'],
      ['/admissions', 'admission:read'],
      ['/lab', 'laboratory:read'],
      ['/echo', 'echo:read'],
      ['/appointments', 'appointment:read']
    ]
    const required = routePermissions.find(([prefix]) => to.path === prefix || to.path.startsWith(`${prefix}/`))?.[1]
    const [resource, action] = required?.split(':') || []
    if (resource && action && !can(resource, action as any)) {
      return navigateTo({ path: '/access-denied', query: { from: to.fullPath } })
    }
  }
})
