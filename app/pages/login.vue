<script setup lang="ts">
import { z } from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { onMounted } from 'vue'

const { isLoggedIn, accessToken, refreshToken, setUser } = useAuth()

definePageMeta({
  layout: false
})

onMounted(() => {
  if (accessToken.value || refreshToken.value) {
    navigateTo('/')
  }
})

async function onLogin(event: FormSubmitEvent<Schema>) {
  try {
    const data = await $api('/auth/login', {
      method: 'POST',
      body: event.data
    })

    accessToken.value = data.data.access_token
    refreshToken.value = data.data.refresh_token

    // Save user data including clinic and branch info
    if (data.data.user) {
      setUser(data.data.user)

      // RBAC debug: log the authenticated user's role and effective permissions
      const u = data.data.user
      console.log('[RBAC] login user:', {
        id: u.id || u._id,
        username: u.username,
        role: u.role,
        clinicId: u.clinicId,
        branchId: u.branchId,
        permissionIds: u.permissionIds || u.permissions?.map?.((p: any) => p.permissionId || p) || [],
        permissionSlugs: Array.isArray(u.permissions)
          ? u.permissions.map((p: any) => p.permissionSlug || p.slug || p)
          : []
      })
    }

    await navigateTo('/')
  } catch (err: any) {
    console.error('Login error:', err)
    useToast().add({ title: 'Error', description: err.data?.message || err.message || 'Login failed', color: 'error' })
  }
}

const schema = z.object({
  username: z.string().min(3, 'Invalid username'),
  password: z.string().min(6, 'Password must be at least 6 characters')
})

type Schema = z.output<typeof schema>

const state = reactive({
  username: '',
  password: ''
})

const loading = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true
  try {
    await onLogin(event)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4"
  >
    <UCard class="w-full max-w-md shadow-xl">
      <template #header>
        <div class="flex justify-center mb-3">
          <Logo />
        </div>
        <h2 class="text-2xl font-bold text-center">
          Welcome Back
        </h2>
        <p class="text-center text-gray-500 dark:text-gray-400 mt-1">
          Sign in to your account
        </p>
      </template>

      <UForm
        class="space-y-4"
        :schema="schema"
        :state="state"
        @submit="onSubmit"
      >
        <UFormField label="Username" name="username" required>
          <UInput
            v-model="state.username"
            type="text"
            placeholder="your username"
            icon="i-lucide-user"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Password" name="password" required>
          <UInput
            v-model="state.password"
            type="password"
            placeholder="••••••••"
            icon="i-lucide-lock"
            class="w-full"
          />
        </UFormField>

        <UButton
          type="submit"
          color="primary"
          size="lg"
          block
          :loading="loading"
          :disabled="loading"
        >
          Sign In
        </UButton>
      </UForm>

      <template #footer>
        <div class="flex flex-col items-center gap-3 text-sm">
          <div class="flex items-center gap-1">
            <span class="text-gray-500 dark:text-gray-400">Don't have an account?</span>
            <UButton variant="link" to="/register" :padded="false">
              Sign up
            </UButton>
          </div>
          <USeparator />
          <UButton
            variant="ghost"
            to="/public/medicines"
            icon="i-lucide-search"
            color="neutral"
            size="sm"
          >
            Browse Public Medicine Catalog
          </UButton>
        </div>
      </template>
    </UCard>
  </div>
</template>
