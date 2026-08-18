import { useCookie, useRuntimeConfig } from '#app'
import { useAuth } from '~/composables/useAuth'
import type { FetchOptions } from 'ofetch'

interface RefreshResponse {
  access_token: string
  refresh_token: string
}

let isRefreshing: Promise<RefreshResponse> | null = null

export const $api = async <T = any>(path: string, options: FetchOptions = {}): Promise<any> => {
  const config = useRuntimeConfig()
  const { accessToken, refreshToken, logout, user } = useAuth()
  const selectedClinicId = useCookie<string | null>('developer_clinic_id')

  // The backend only allows a developer to select another clinic via
  // X-Clinic-Id (tenantMiddleware). Never send it for non-developers, even if
  // a stale developer_clinic_id cookie is present, or every request would 403
  // with "Only a developer can select another clinic".
  const isDeveloper = user.value?.role === 'developer'

  const fetcher = $fetch.create({
    baseURL: config.public.apiBase,
    onRequest({ request, options }: { request: any, options: FetchOptions }) {
      const isRefreshPath = typeof request === 'string' && request.includes('/auth/refresh')
      console.log(`[API Request] ${request} | Has Token: ${!!accessToken.value} | Is Refresh: ${isRefreshPath}`)

      if (accessToken.value && !isRefreshPath) {
        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${accessToken.value}`,
          ...(selectedClinicId.value && isDeveloper ? { 'X-Clinic-Id': selectedClinicId.value } : {})
        }
      }
    },
    async onResponseError({ response, options, request }: { response: Response, options: FetchOptions, request: any }) {
      console.log(`[API Error] ${request} returned ${response.status}`)

      // If error is 401 and we have a refresh token, try to refresh
      if (response.status === 401 && refreshToken.value) {
        console.log('[API] 401 detected, attempting refresh...')
        if (!isRefreshing) {
          // Perform the refresh
          const refreshUrl = `${config.public.apiBase}/auth/refresh`
          console.log(`[API] Refreshing via ${refreshUrl}`)

          isRefreshing = $fetch<RefreshResponse>(refreshUrl, {
            method: 'POST',
            body: { refresh_token: refreshToken.value }
          }).then((res) => {
            console.log('[API] Refresh successful')
            accessToken.value = res.access_token
            refreshToken.value = res.refresh_token
            isRefreshing = null
            return res
          }).catch((err) => {
            console.error('[API] Refresh failed:', err)
            isRefreshing = null
            logout()
            throw err
          })
        }
        await isRefreshing

        // Retry the original request with the new token
        console.log(`[API] Retrying original request: ${request}`)
        return $api<T>(path, options)
      } else if (response.status === 401) {
        console.log('[API] 401 but no refresh token available. Logging out.')
        logout()
      }
    }
  })

  return (fetcher as any)(path, options) as Promise<T>
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    const err = error as { data?: unknown, message?: unknown }
    if (typeof err.data === 'object' && err.data !== null) {
      const data = err.data as { message?: unknown }
      if (typeof data.message === 'string' && data.message.trim()) return data.message
    }
    if (typeof err.message === 'string' && err.message.trim()) return err.message
  }
  return fallback
}
