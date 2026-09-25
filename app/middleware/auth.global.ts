export default defineNuxtRouteMiddleware(async (to) => {
  const { accessToken, refreshToken, can, user, clinicId, fetchUser } = useAuth()
  // 1. Define routes that should ALWAYS be accessible (Public Routes)
  const publicRoutes = ['/login', '/register', '/saas-register', '/forgot-password', '/public/medicines']
  // 2. Check if the current route is in the public list
  const isPublicRoute = publicRoutes.includes(to.path)
  const isLogged = !!accessToken.value || !!refreshToken.value

  // 3. Logic: If there are no tokens and the user is NOT going to a public page, redirect to login
  if (!isLogged && !isPublicRoute) {
    return navigateTo({
      path: '/login',
      query: { redirect: to.fullPath } // Save intended destination
    })
  }

  // The profile (role, clinic, permissions) is loaded from /api/auth/me, not a cookie. If the
  // server-side render cannot reach the API (in Docker the API base is localhost, which is the
  // frontend container itself), leave the profile checks to the client, where this middleware
  // runs again on hydration.
  if (isLogged && !user.value) {
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

  // 4. Logic: If user IS logged in but tries to go to Login/Register
  if (isLogged && isPublicRoute) {
    if (!clinicId.value && user.value?.role !== 'developer') {
      return navigateTo('/setup-clinic')
    }
    return navigateTo('/')
  }

  // 5. CRITICAL SAAS RULE: The system is ONLY usable AFTER a clinic has been created!
  // "ប្រព័ន្ធប្រើបាន លុះត្រាបានបង្កើតគ្លីនិចជាមុនសិន"
  if (isLogged && user.value?.role !== 'developer') {
    if (!clinicId.value) {
      if (to.path !== '/setup-clinic') {
        return navigateTo('/setup-clinic')
      }
      return // Allow access to /setup-clinic
    } else {
      if (to.path === '/setup-clinic') {
        return navigateTo('/')
      }
    }
  }

  if (!isPublicRoute && (accessToken.value || refreshToken.value)) {
    const routePermissions: Array<[string, string]> = [
      // Workstations: each page needs the permission its main action writes with.
      ['/workstation/triage', 'visit:update'],
      ['/workstation/doctor', 'prescription:create'],
      ['/workstation/lab', 'laboratory:update'],
      ['/workstation/echo', 'laboratory:update'],
      ['/workstation/cashier', 'payment:create'],
      ['/workstation/pharmacy', 'dispensing:create'],
      ['/users/roles', 'user:read'],
      ['/users/permissions', 'user:read'],
      ['/users', 'user:read'],
      // More specific prefixes first: the first match wins. Device sessions are the user's own.
      ['/settings/devices', ''],
      ['/settings/audit-logs', 'audit:read'],
      ['/settings', 'settings:read'],
      ['/inventory/goods-receipt', 'goodsReceipt:read'],
      ['/inventory/dispense', 'dispensing:read'],
      ['/inventory/stock-count', 'stockCount:read'],
      ['/inventory/transfers', 'transfer:read'],
      ['/inventory/adjustments', 'stockAdjustment:read'],
      ['/inventory/returns', 'inventoryReturn:read'],
      ['/inventory/recalls', 'recall:read'],
      ['/inventory/warehouses', 'warehouse:read'],
      ['/ipd/wards', 'room:read'],
      ['/inpatient', 'admission:read'],
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
