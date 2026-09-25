<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { useSidebar } from '~/composables/shared/useSidebar'

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

// Open (expanded) top-level accordion groups. Controlled so the Settings
// group auto-expands when the user is on any Diagnosis Management route.
const openGroups = ref<string[]>(['reports'])

watch(
  () => route.path,
  (path) => {
    if (path.startsWith('/settings/diagnoses') && !openGroups.value.includes('settings')) {
      openGroups.value = [...openGroups.value, 'settings']
    }
  },
  { immediate: true }
)

const links = computed(() => {
  const auth = useAuth()
  const menu: any[][] = [[{
    label: t('nav.home'),
    icon: 'i-lucide-house',
    to: '/'
  }, {
    label: t('workstation.nav'),
    icon: 'i-lucide-monitor-check',
    value: 'workstations',
    defaultOpen: true,
    children: [{
      label: t('workstation.pages.triage'),
      to: '/workstation/triage',
      icon: 'i-lucide-activity',
      // Shown only to users who can do this department's main action.
      permission: 'visit:update'
    }, {
      label: t('workstation.pages.doctor'),
      to: '/workstation/doctor',
      icon: 'i-lucide-stethoscope',
      // Shown only to users who can do this department's main action.
      permission: 'prescription:create'
    }, {
      label: t('workstation.pages.lab'),
      to: '/workstation/lab',
      icon: 'i-lucide-flask-conical',
      // Shown only to users who can do this department's main action.
      permission: 'laboratory:update'
    }, {
      label: t('workstation.pages.echo'),
      to: '/workstation/echo',
      icon: 'i-lucide-scan-line',
      // Shown only to users who can do this department's main action.
      permission: 'laboratory:update'
    }, {
      label: t('workstation.pages.cashier'),
      to: '/workstation/cashier',
      icon: 'i-lucide-wallet',
      // Shown only to users who can do this department's main action.
      permission: 'payment:create'
    }, {
      label: t('workstation.pages.pharmacy'),
      to: '/workstation/pharmacy',
      icon: 'i-lucide-pill',
      // Shown only to users who can do this department's main action.
      permission: 'dispensing:create'
    }]
  }, {
    label: t('nav.patientManagement'),
    icon: 'i-lucide-users',
    value: 'patients',
    defaultOpen: false,
    children: [{
      label: t('nav.patients'),
      to: '/patients',
      icon: 'i-lucide-user'
    }, {
      label: t('nav.appointments'),
      to: '/appointments',
      icon: 'i-lucide-calendar-days'
    }, {
      label: t('nav.opd'),
      to: '/opd',
      icon: 'i-lucide-stethoscope'
    }, {
      label: t('nav.ipd'),
      to: '/ipd',
      icon: 'i-lucide-bed'
    }, {
      label: t('inpatient.bedBoard'),
      to: '/inpatient/bed-board',
      icon: 'i-lucide-layout-grid'
    }, {
      label: t('nav.wardSetup'),
      to: '/ipd/wards',
      icon: 'i-lucide-hospital'
    }, {
      label: t('nav.lab'),
      to: '/lab',
      icon: 'i-lucide-flask-conical'
    }, {
      label: t('nav.echo'),
      to: '/echo',
      icon: 'i-lucide-activity'
    }, {
      label: t('visit.title'),
      to: '/visits',
      icon: 'i-lucide-calendar-check'
    }, {
      label: t('nav.prescriptions'),
      to: '/prescriptions',
      icon: 'i-lucide-clipboard-list'
    }, {
      label: t('nav.payments'),
      to: '/payments',
      icon: 'i-lucide-credit-card'
    }]
  }, {
    label: t('nav.maternityCare'),
    icon: 'i-lucide-baby',
    value: 'maternity',
    defaultOpen: true,
    children: [{
      label: t('nav.maternityDashboard'),
      to: '/maternity/dashboard',
      icon: 'i-lucide-layout-dashboard'
    }, {
      label: t('nav.maternityAnc'),
      to: '/maternity/episodes',
      icon: 'i-lucide-heart-pulse'
    }, {
      label: t('nav.maternityDelivery'),
      to: '/maternity/delivery',
      icon: 'i-lucide-baby'
    }, {
      label: t('nav.maternityBloodBank'),
      to: '/maternity/blood-bank',
      icon: 'i-lucide-droplet'
    }, {
      label: t('nav.maternityConsents'),
      to: '/maternity/consents',
      icon: 'i-lucide-file-signature'
    }, {
      label: t('nav.maternityMar'),
      to: '/maternity/mar',
      icon: 'i-lucide-pill'
    }, {
      label: t('nav.maternityReferrals'),
      to: '/maternity/referrals',
      icon: 'i-lucide-send'
    }, {
      label: t('nav.maternityScreenings'),
      to: '/maternity/screenings',
      icon: 'i-lucide-clipboard-check'
    }, {
      label: t('nav.maternityDeaths'),
      to: '/maternity/deaths',
      icon: 'i-lucide-file-text'
    }, {
      label: t('nav.maternityFacilities'),
      to: '/maternity/facilities',
      icon: 'i-lucide-building-2'
    }]
  }, {
    label: t('nav.inventory'),
    icon: 'i-lucide-package',
    value: 'inventory',
    defaultOpen: false,
    children: [{
      label: t('supplier.title'),
      to: '/suppliers',
      icon: 'i-lucide-truck'
    }, {
      label: t('purchase.title'),
      to: '/purchases',
      icon: 'i-lucide-shopping-cart'
    }, {
      label: t('nav.goodsReceipt'),
      to: '/inventory/goods-receipt',
      icon: 'i-lucide-package-check'
    }, {
      label: t('nav.dispensing'),
      to: '/inventory/dispense',
      icon: 'i-lucide-pill-bottle'
    }, {
      label: t('nav.controlledRegister'),
      to: '/inventory/controlled-register',
      icon: 'i-lucide-lock'
    }, {
      label: t('nav.stockCount'),
      to: '/inventory/stock-count',
      icon: 'i-lucide-clipboard-list'
    }, {
      label: t('nav.stockTransfers'),
      to: '/inventory/transfers',
      icon: 'i-lucide-arrow-left-right'
    }, {
      label: t('nav.stockAdjustments'),
      to: '/inventory/adjustments',
      icon: 'i-lucide-sliders-horizontal'
    }, {
      label: t('nav.inventoryReturns'),
      to: '/inventory/returns',
      icon: 'i-lucide-undo-2'
    }, {
      label: t('nav.recalls'),
      to: '/inventory/recalls',
      icon: 'i-lucide-shield-alert'
    }, {
      label: t('nav.warehouses'),
      to: '/inventory/warehouses',
      icon: 'i-lucide-warehouse'
    }]
  }, {
    label: t('nav.finance'),
    icon: 'i-lucide-wallet',
    value: 'finance',
    defaultOpen: false,
    children: [{
      label: t('revenue.title'),
      to: '/revenues',
      icon: 'i-lucide-trending-up'
    }, {
      label: t('expense.title'),
      to: '/expenses',
      icon: 'i-lucide-trending-down'
    }, {
      label: t('nav.servicePricing'),
      to: '/settings/services',
      icon: 'i-lucide-tags'
    }, {
      label: t('nav.serviceCategories'),
      to: '/settings/service-categories',
      icon: 'i-lucide-folder-tree'
    }, {
      label: t('nav.taxSettings'),
      to: '/settings/tax',
      icon: 'i-lucide-percent'
    }]
  }, {
    label: t('nav.medicines'),
    icon: 'i-lucide-pill',
    value: 'medicines',
    defaultOpen: false,
    children: [{
      label: t('nav.pharmacyPos'),
      to: '/pharmacy',
      icon: 'i-lucide-shopping-cart'
    }, {
      label: t('nav.medicines'),
      to: '/medicines',
      icon: 'i-lucide-pill'
    }]
  }, {
    label: t('nav.settings'),
    icon: 'i-lucide-settings',
    value: 'settings',
    defaultOpen: false,
    children: [{
      label: t('nav.clinic'),
      to: '/settings/clinic',
      icon: 'i-lucide-building-2'
    }, {
      label: t('nav.branches'),
      to: '/settings/branches',
      icon: 'i-lucide-git-branch'
    }, {
      label: t('nav.subscription'),
      to: '/settings/subscription',
      icon: 'i-lucide-credit-card'
    }, {
      label: t('nav.diagnosisManagement'),
      icon: 'i-lucide-stethoscope',
      value: 'diagnosis',
      defaultOpen: true,
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
      label: t('settings.unit'),
      to: '/settings/unit',
      icon: 'i-lucide-ruler'
    }, {
      label: t('nav.dosageForms'),
      to: '/settings/dosage-forms',
      icon: 'i-lucide-tablets'
    }, {
      label: t('settings.security'),
      to: '/settings/security',
      icon: 'i-lucide-shield-check'
    }, {
      label: t('nav.auditLogs'),
      to: '/settings/audit-logs',
      icon: 'i-lucide-scroll-text'
    }, {
      label: t('nav.deviceSessions'),
      to: '/settings/devices',
      icon: 'i-lucide-monitor-smartphone'
    }]
  },
  {
    label: t('report.title'),
    icon: 'i-lucide-file-chart-column',
    value: 'reports',
    defaultOpen: true,
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
    }, {
      label: t('report.outstandingReport'),
      to: '/reports/outstanding',
      icon: 'i-lucide-credit-card'
    }, {
      label: t('report.topDiseases'),
      to: '/reports/diseases',
      icon: 'i-lucide-activity'
    }, {
      label: t('report.serviceUsage'),
      to: '/reports/service-usage',
      icon: 'i-lucide-pie-chart'
    }, {
      label: t('report.financeAnalysis'),
      to: '/reports/finance-analysis',
      icon: 'i-lucide-chart-pie'
    }, {
      label: t('report.pharmacyReports'),
      to: '/reports/pharmacy',
      icon: 'i-lucide-pill'
    }]
  }],
  [{
    label: t('nav.administration'),
    icon: 'i-lucide-shield-check',
    value: 'administration',
    defaultOpen: false,
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
    }, {
      label: t('hr.navCalculator'),
      to: '/hr/payroll-calculator',
      icon: 'i-lucide-calculator'
    }, {
      label: t('hr.navNssf'),
      to: '/hr/nssf-report',
      icon: 'i-lucide-shield-check'
    }, {
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

  // Platform console manages every tenant and is gated server-side by role, not by a
  // permission slug (saas.route.ts's admin endpoints use hasRole('developer')), so it's
  // shown by role here too rather than going through the resource/permission filter below.
  if (auth.user.value?.role === 'developer') {
    menu.push([{
      label: t('nav.platformConsole'),
      icon: 'i-lucide-server-cog',
      value: 'platform',
      defaultOpen: false,
      children: [{
        label: t('nav.platformConsole'),
        to: '/platform',
        icon: 'i-lucide-server-cog'
      }]
    }])
  }

  const resourceForPath = (path: string) => {
    if (path.startsWith('/users')) return 'user'
    if (path.startsWith('/reports')) return 'report'
    // Device sessions belong to the signed-in user, so every user sees that entry.
    if (path.startsWith('/settings/devices')) return null
    if (path.startsWith('/settings/audit-logs')) return 'audit'
    if (path.startsWith('/settings')) return 'settings'
    if (path.startsWith('/inventory/goods-receipt')) return 'goodsReceipt'
    if (path.startsWith('/inventory/dispense')) return 'dispensing'
    if (path.startsWith('/inventory/controlled-register')) return 'pharmacy'
    if (path.startsWith('/inventory/stock-count')) return 'stockCount'
    if (path.startsWith('/inventory/transfers')) return 'transfer'
    if (path.startsWith('/inventory/adjustments')) return 'stockAdjustment'
    if (path.startsWith('/inventory/returns')) return 'inventoryReturn'
    if (path.startsWith('/inventory/recalls')) return 'recall'
    if (path.startsWith('/inventory/warehouses')) return 'warehouse'
    if (path.startsWith('/ipd/wards')) return 'room'
    if (path.startsWith('/inpatient')) return 'admission'
    if (path.startsWith('/staff') || path.startsWith('/positions')) return 'staff'
    if (path.startsWith('/suppliers')) return 'supplier'
    if (path.startsWith('/purchases')) return 'purchase'
    if (path.startsWith('/revenues')) return 'revenue'
    if (path.startsWith('/expenses')) return 'expense'
    if (path.startsWith('/payrolls') || path.startsWith('/hr')) return 'payroll'
    if (path.startsWith('/pharmacy')) return 'pharmacy'
    if (path.startsWith('/payments')) return 'payment'
    if (path.startsWith('/prescriptions')) return 'prescription'
    if (path.startsWith('/visits')) return 'visit'
    if (path.startsWith('/opd')) return 'visit'
    if (path.startsWith('/ipd') || path.startsWith('/admissions')) return 'admission'
    if (path.startsWith('/lab')) return 'laboratory'
    if (path.startsWith('/echo')) return 'echo'
    if (path.startsWith('/appointments')) return 'appointment'
    if (path.startsWith('/patients')) return 'patient'
    if (path.startsWith('/maternity/blood-bank')) return 'bloodBank'
    if (path.startsWith('/maternity/consents')) return 'consent'
    if (path.startsWith('/maternity/mar')) return 'mar'
    if (path.startsWith('/maternity/referrals')) return 'referral'
    if (path.startsWith('/maternity/screenings')) return 'screening'
    if (path.startsWith('/maternity/deaths')) return 'perinatalDeath'
    if (path.startsWith('/maternity/facilities')) return 'facility'
    if (path.startsWith('/maternity')) return 'maternity'
    return null
  }

  const filterChildren = (children: any[]): any[] => children
    .map((child) => {
      if (child.children?.length) {
        const filteredChildren = filterChildren(child.children)
        return filteredChildren.length ? { ...child, children: filteredChildren } : null
      }
      if (child.permission) {
        const [resource, action] = String(child.permission).split(':')
        return auth.can(resource!, action as 'read' | 'create' | 'update' | 'delete' | 'approve') ? child : null
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
    class="flex flex-col border-r border-default bg-muted/50 h-screen fixed lg:sticky top-0 z-50 transition-all duration-300 lg:translate-x-0"
    :class="[
      isOpen ? 'translate-x-0' : '-translate-x-full',
      collapsed ? 'lg:w-16 px-2' : 'lg:w-64 px-4'
    ]"
  >
    <div class="border-b border-default h-16 flex items-center justify-between overflow-hidden relative">
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
        v-model:model-value="openGroups"
        :items="links[0]"
        orientation="vertical"
        :collapsed="collapsed"
      />

      <UNavigationMenu
        :items="links[1]"
        orientation="vertical"
        class="mt-auto"
        :collapsed="collapsed"
      />
    </div>

    <div class="py-4 border-t border-default flex flex-col gap-4">
      <UserMenu :collapsed="collapsed" />
    </div>
  </aside>
</template>
