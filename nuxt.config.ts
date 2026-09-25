// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vueuse/nuxt',
    '@nuxtjs/i18n'
  ],
  imports: {
    dirs: [
      '~/composables',
      '~/composables/*/index.{ts,js,mjs,mts}',
      '~/composables/**'
    ]
  },

  // DevTools exposes an unauthenticated RPC (advisory: remote code execution), so it is only
  // enabled for local development, never in a build that could be served elsewhere.
  devtools: {
    enabled: process.env.NODE_ENV === 'development'
  },

  app: {
    head: {
      link: [],
      script: [
        { src: 'https://accounts.google.com/gsi/client', async: true, defer: true }
      ]
    }
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    // API address for server-side rendering, set at runtime with NUXT_API_BASE_SERVER. In Docker
    // the public address (http://localhost:4000/api) points at the frontend container itself,
    // so pages rendered on the server could not load their data. Empty = use the public address.
    apiBaseServer: '',
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api',
      googleClientId: process.env.NUXT_PUBLIC_GOOGLE_CLIENT_ID || '35029038689-imi2e24d90vjici54dibhjehahiv8fea.apps.googleusercontent.com'
    }
  },
  srcDir: 'app',

  routeRules: {
    '/api/**': {
      cors: true
    }
  },

  sourcemap: {
    server: false,
    client: false
  },

  compatibilityDate: '2024-07-11',
  vite: {
    server: {
      hmr: {
        port: 24680
      }
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },
  fonts: {
    providers: {
      google: false,
      googleicons: false
    }
  },

  i18n: {
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'km', name: 'ខ្មែរ', file: 'km.json' }
    ],
    defaultLocale: 'km',
    langDir: '../locales',
    strategy: 'no_prefix'
  }
})
