export default defineNuxtRouteMiddleware((to) => {
  const { accessToken, refreshToken, can } = useAuth()
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
