export default defineNuxtRouteMiddleware((to) => {
  const { isLoggedIn } = useAuth()
  const toast = useToast()
  const config = useRuntimeConfig()

  // Auth routes
  const authRoutes = ['/login', '/register']
  if (!authRoutes.includes(to.path)) return
  if (isLoggedIn.value) {
    toast.add({
      title: 'Already Logged In',
      description: 'You are already logged in',
      icon: 'i-lucide-circle-check',
      color: 'success'
    })
    return navigateTo('/')
  }
})
