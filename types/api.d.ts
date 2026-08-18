import '#app'

declare module '#app' {
  interface NuxtApp {
    $apiFetch: <T = unknown>(path: string, options?: Record<string, any>) => Promise<T>
  }
}
