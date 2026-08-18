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

  devtools: {
    enabled: true
  },

  app: {
    head: {
      link: []
    }
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api'
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
