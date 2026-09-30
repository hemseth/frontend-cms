<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { useSidebar } from '~/composables/useSidebar'

const { t } = useI18n()
const { collapsed, toggleCollapsed } = useSidebar()
const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const isOpen = computed({
  get: () => props.open,
  set: value => emit('update:open', value)
})

const route = useRoute()

// Which module group owns a route. Checked in order, so the more specific
// prefixes (/settings/specializations belongs to HR) come before /settings.
const groupForPath = (path: string) => {
  if (path.startsWith('/opd') || path.startsWith('/visits')) return 'opd'
  if (path.startsWith('/lab') || path.startsWith('/echo')) return 'lab'
  if (path.startsWith('/pharmacy') || path.startsWith('/medicines') || path.startsWith('/prescriptions')) return 'pharmacy'
  if (path.startsWith('/suppliers') || path.startsWith('/purchases')) return 'inventory'
  if (path.startsWith('/payments') || path.startsWith('/revenues') || path.startsWith('/expenses')) return 'finance'
  if (path.startsWith('/staff') || path.startsWith('/positions') || path.startsWith('/payrolls')
    || path.startsWith('/settings/specializations')) return 'hr'
  if (path.startsWith('/reports')) return 'reports'
  if (path.startsWith('/settings')) return 'settings'
  return null
}

// Open (expanded) top-level accordion groups. Controlled so that landing on a
// page expands the group holding it, instead of leaving the user to guess
// which one to open.
const openGroups = ref<string[]>([])

watch(
  () => route.path,
  (path) => {
    const group = groupForPath(path)
    if (group && !openGroups.value.includes(group)) {
      openGroups.value = [...openGroups.value, group]
    }
  },
  { immediate: true }
)

const links = computed(() => {
  const auth = useAuth()
  // Grouped by backend module (see cms/src/models/<module>), so where a screen
  // lives here matches where its data lives. Modules with a single screen are
  // plain links rather than an accordion holding one item.
  const menu: any[][] = [[{
    label: t('nav.home'),
    icon: 'i-lucide-house',
    to: '/'
  }, {
    label: t('nav.patients'),
    icon: 'i-lucide-user',
    to: '/patients'
  }, {
    label: t('nav.opd'),
    icon: 'i-lucide-stethoscope',
    value: 'opd',
    children: [{
      label: t('nav.opd'),
      to: '/opd',
      icon: 'i-lucide-stethoscope'
    }, {
      label: t('visit.title'),
      to: '/visits',
      icon: 'i-lucide-calendar-check'
    }]
  }, {
    label: t('nav.ipd'),
    icon: 'i-lucide-bed',
    to: '/ipd'
  }, {
    label: t('nav.lab'),
    icon: 'i-lucide-flask-conical',
    value: 'lab',
    children: [{
      label: t('nav.lab'),
      to: '/lab',
      icon: 'i-lucide-flask-conical'
    }, {
      label: t('nav.echo'),
      to: '/echo',
      icon: 'i-lucide-activity'
    }]
  }, {
    label: t('nav.pharmacy'),
    icon: 'i-lucide-pill',
    value: 'pharmacy',
    children: [{
      label: t('nav.pharmacyPos'),
      to: '/pharmacy',
      icon: 'i-lucide-shopping-cart'
    }, {
      label: t('nav.medicines'),
      to: '/medicines',
      icon: 'i-lucide-pill'
    }, {
      label: t('nav.prescriptions'),
      to: '/prescriptions',
      icon: 'i-lucide-clipboard-list'
    }]
  }, {
    label: t('nav.inventory'),
    icon: 'i-lucide-package',
    value: 'inventory',
    children: [{
      label: t('supplier.title'),
      to: '/suppliers',
      icon: 'i-lucide-truck'
    }, {
      label: t('purchase.title'),
      to: '/purchases',
      icon: 'i-lucide-shopping-cart'
    }]
  }, {
    label: t('nav.finance'),
    icon: 'i-lucide-wallet',
    value: 'finance',
    children: [{
      label: t('payment.title'),
      to: '/payments',
      icon: 'i-lucide-credit-card'
    }, {
      label: t('revenue.title'),
      to: '/revenues',
      icon: 'i-lucide-trending-up'
    }, {
      label: t('expense.title'),
      to: '/expenses',
      icon: 'i-lucide-trending-down'
    }]
  }, {
    label: t('nav.hr'),
    icon: 'i-lucide-users',
    value: 'hr',
    children: [{
      label: t('staff.title'),
      to: '/staff',
      icon: 'i-lucide-id-card'
    }, {
      label: t('position.title'),
      to: '/positions',
      icon: 'i-lucide-briefcase'
    }, {
      label: t('specialization.title'),
      to: '/settings/specializations',
      icon: 'i-lucide-graduation-cap'
    }, {
      label: t('payroll.title'),
      to: '/payrolls',
      icon: 'i-lucide-banknote'
    }]
  }, {
    label: t('report.title'),
    icon: 'i-lucide-file-chart-column',
    value: 'reports',
    children: [{
      label: t('report.allReports'),
      to: '/reports',
      icon: 'i-lucide-layout-grid'
    }, {
      label: t('report.patientAnalysis'),
      to: '/reports/patients',
      icon: 'i-lucide-users'
    }, {
      label: t('report.dailyReport'),
      to: '/reports/daily',
      icon: 'i-lucide-calendar'
    }, {
      label: t('report.financialReport'),
      to: '/reports/financial',
      icon: 'i-lucide-dollar-sign'
    }, {
      label: t('report.outstandingReport'),
      to: '/reports/outstanding',
      icon: 'i-lucide-credit-card'
    }, {
      label: t('report.serviceUsage'),
      to: '/reports/service-usage',
      icon: 'i-lucide-activity'
    }, {
      label: t('report.topDiseases'),
      to: '/reports/diseases',
      icon: 'i-lucide-thermometer'
    }, {
      label: t('report.historyReport'),
      to: '/reports/history',
      icon: 'i-lucide-history'
    }, {
      label: t('report.employeeList'),
      to: '/reports/employees',
      icon: 'i-lucide-user-check'
    }, {
      label: t('report.payrollSummary'),
      to: '/reports/payroll-summary',
      icon: 'i-lucide-wallet'
    }, {
      label: t('report.departmentReport'),
      to: '/reports/departments',
      icon: 'i-lucide-building'
    }]
  }, {
    label: t('nav.settings'),
    icon: 'i-lucide-settings',
    value: 'settings',
    children: [{
      label: t('nav.clinic'),
      to: '/settings/clinic',
      icon: 'i-lucide-building-2'
    }, {
      label: t('nav.branches'),
      to: '/settings/branches',
      icon: 'i-lucide-git-branch'
    }, {
      label: t('nav.diagnosisManagement'),
      icon: 'i-lucide-stethoscope',
      value: 'diagnosis',
      children: [{
        label: t('diagnosisSettings.tabs.clinicDiagnoses'),
        to: '/settings/diagnoses',
        icon: 'i-lucide-clipboard-medical',
        exact: true
      }, {
        label: t('diagnosisSettings.tabs.whoMaster'),
        to: '/settings/diagnoses/master',
        icon: 'i-lucide-globe',
        exact: true
      }, {
        label: t('diagnosisSettings.tabs.groups'),
        to: '/settings/diagnoses/groups',
        icon: 'i-lucide-folder-open',
        exact: true
      }]
    }, {
      label: t('settings.medicineType'),
      to: '/settings/medicine-type',
      icon: 'i-lucide-pill'
    }, {
      label: t('settings.dosageForms'),
      to: '/settings/dosage-forms',
      icon: 'i-lucide-droplets'
    }, {
      label: t('settings.unit'),
      to: '/settings/unit',
      icon: 'i-lucide-ruler'
    }, {
      label: t('settings.serviceCategories'),
      to: '/settings/service-categories',
      icon: 'i-lucide-layers'
    }]
  }],
  [{
    label: t('nav.administration'),
    icon: 'i-lucide-shield-check',
    value: 'administration',
    children: [{
      label: t('nav.users'),
      to: '/users',
      icon: 'i-lucide-user-cog'
    }, {
      label: t('settings.roles'),
      to: '/users/roles',
      icon: 'i-lucide-shield'
    }, {
      label: t('settings.permissions'),
      to: '/users/permissions',
      icon: 'i-lucide-key-round'
    }]
  }]
  ]

  const resourceForPath = (path: string) => {
    if (path.startsWith('/users')) return 'user'
    if (path.startsWith('/reports')) return 'report'
    if (path.startsWith('/settings')) return 'settings'
    if (path.startsWith('/staff') || path.startsWith('/positions')) return 'staff'
    if (path.startsWith('/suppliers')) return 'supplier'
    if (path.startsWith('/purchases')) return 'purchase'
    if (path.startsWith('/revenues')) return 'revenue'
    if (path.startsWith('/expenses')) return 'expense'
    if (path.startsWith('/payrolls')) return 'payroll'
    if (path.startsWith('/pharmacy') || path.startsWith('/medicines')) return 'pharmacy'
    if (path.startsWith('/payments')) return 'payment'
    if (path.startsWith('/prescriptions')) return 'prescription'
    if (path.startsWith('/visits')) return 'visit'
    if (path.startsWith('/opd')) return 'visit'
    if (path.startsWith('/ipd') || path.startsWith('/admissions')) return 'admission'
    if (path.startsWith('/lab')) return 'laboratory'
    if (path.startsWith('/echo')) return 'echo'
    if (path.startsWith('/appointments')) return 'appointment'
    if (path.startsWith('/patients')) return 'patient'
    return null
  }

  const filterChildren = (children: any[]): any[] => children
    .map((child) => {
      if (child.children?.length) {
        const filteredChildren = filterChildren(child.children)
        return filteredChildren.length ? { ...child, children: filteredChildren } : null
      }
      const resource = resourceForPath(child.to || '')
      return !resource || auth.can(resource) ? child : null
    })
    .filter(Boolean)

  const filterGroup = (group: any[]) => group
    .map((item) => {
      if (!item.children) return item
      const children = filterChildren(item.children)
      return children.length ? { ...item, children } : null
    })
    .filter(Boolean)

  return menu.map(filterGroup) as NavigationMenuItem[][]
})
</script>

<template>
  <aside
    class="flex flex-col border-r border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 h-screen fixed lg:sticky top-0 z-50 transition-all duration-300 lg:translate-x-0"
    :class="[
      isOpen ? 'translate-x-0' : '-translate-x-full',
      collapsed ? 'lg:w-16 px-2' : 'lg:w-64 px-4'
    ]"
  >
    <div class="border-b border-gray-200 dark:border-gray-800 h-16 flex items-center justify-between overflow-hidden relative">
      <TeamsMenu :collapsed="collapsed" />
      <UButton
        variant="ghost"
        color="neutral"
        :icon="collapsed ? 'i-lucide-chevron-right' : 'i-lucide-chevron-left'"
        size="md"
        class="hidden md:flex"
        @click="toggleCollapsed"
      />
    </div>

    <div class="flex-1 overflow-y-auto py-4 space-y-4" @click="isOpen = false">
      <UNavigationMenu
        :items="links[0]"
        orientation="vertical"
        :collapsed="collapsed"
        v-model:model-value="openGroups"
      />

      <UNavigationMenu
        :items="links[1]"
        orientation="vertical"
        class="mt-auto"
        :collapsed="collapsed"
      />
    </div>

    <div class="py-4 border-t border-gray-200 dark:border-gray-800 flex flex-col gap-4">
      <UserMenu :collapsed="collapsed" />
    </div>
  </aside>
</template>
