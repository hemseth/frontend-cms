<script setup lang="ts">
const { t } = useI18n()

const breadcrumbItems = computed(() => [
  { label: t('nav.home'), to: '/' },
  { label: t('report.title') }
])

// Only reports that have a page. Links to planned-but-unbuilt reports used to 404 from here.
const reportCategories = [
  {
    title: t('report.patientReports'),
    icon: 'i-lucide-users',
    color: 'primary',
    reports: [
      { title: t('report.patientProfile'), description: 'Patient profile and details', icon: 'i-lucide-user', link: '/reports/patient-profile' },
      { title: t('report.patientAnalysis'), description: 'Patient registrations and visits', icon: 'i-lucide-users', link: '/reports/patients' },
      { title: t('report.historyReport'), description: 'Complete patient history', icon: 'i-lucide-history', link: '/reports/history' }
    ]
  },
  {
    title: t('report.financialReports'),
    icon: 'i-lucide-dollar-sign',
    color: 'green',
    reports: [
      { title: t('report.invoiceReport'), description: 'Patient invoices', icon: 'i-lucide-file-text', link: '/reports/invoice' },
      { title: t('report.outstandingReport'), description: 'Outstanding balances', icon: 'i-lucide-credit-card', link: '/reports/outstanding' },
      { title: t('report.dailyRevenueReport'), description: 'Daily revenue summary', icon: 'i-lucide-calendar', link: '/reports/daily' },
      { title: t('report.financialReport'), description: 'Revenue, expenses and cash flow', icon: 'i-lucide-bar-chart-2', link: '/reports/financial' },
      { title: t('report.financeAnalysis'), description: 'Revenue by service, profitability and cash flow', icon: 'i-lucide-chart-pie', link: '/reports/finance-analysis' },
      { title: t('report.pharmacyReports'), description: 'Stock value, expiry, movement and price variance', icon: 'i-lucide-pill', link: '/reports/pharmacy' }
    ]
  },
  {
    title: t('report.hrReports'),
    icon: 'i-lucide-users',
    color: 'blue',
    reports: [
      { title: t('report.employeeList'), description: 'Staff directory', icon: 'i-lucide-user-check', link: '/reports/employees' },
      { title: t('report.payrollSummary'), description: 'Payroll overview', icon: 'i-lucide-list', link: '/reports/payroll-summary' }
    ]
  },
  {
    title: t('report.managementReports'),
    icon: 'i-lucide-pie-chart',
    color: 'purple',
    reports: [
      { title: t('report.departmentReport'), description: 'Department performance', icon: 'i-lucide-building', link: '/reports/departments' },
      { title: t('report.serviceUsage'), description: 'Service usage stats', icon: 'i-lucide-pie-chart', link: '/reports/service-usage' },
      { title: t('report.topDiseases'), description: 'Common diseases', icon: 'i-lucide-activity', link: '/reports/diseases' }
    ]
  }
]

const expandedCategories = ref<string[]>(['patientReports', 'financialReports'])
</script>

<template>
  <div class="p-6 space-y-6">
    <UBreadcrumb :items="breadcrumbItems" />

    <div>
      <h1 class="text-2xl font-bold">
        {{ t('report.title') }}
      </h1>
      <p class="text-toned mt-1">
        View, analyze and export clinic reports
      </p>
    </div>

    <div class="space-y-6">
      <div
        v-for="category in reportCategories"
        :key="category.title"
        class="border border-default rounded-lg overflow-hidden"
      >
        <div
          class="flex items-center justify-between p-4 bg-muted cursor-pointer"
          @click="expandedCategories.includes(category.title)
            ? expandedCategories = expandedCategories.filter(c => c !== category.title)
            : expandedCategories.push(category.title)"
        >
          <div class="flex items-center gap-3">
            <div :class="`p-2 rounded-lg bg-${category.color}-100 dark:bg-${category.color}-900/20`">
              <UIcon :name="category.icon" :class="`w-5 h-5 text-${category.color}-600`" />
            </div>
            <h2 class="font-semibold">
              {{ category.title }}
            </h2>
          </div>
          <UIcon
            :name="expandedCategories.includes(category.title) ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
            class="w-5 h-5 text-dimmed"
          />
        </div>

        <div
          v-show="expandedCategories.includes(category.title)"
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 bg-default"
        >
          <UCard
            v-for="report in category.reports"
            :key="report.title"
            class="hover:shadow-md transition-shadow cursor-pointer border border-default"
            @click="navigateTo(report.link)"
          >
            <div class="flex items-center gap-3">
              <UIcon :name="report.icon" class="w-5 h-5 text-dimmed" />
              <div>
                <h3 class="font-medium text-sm">
                  {{ report.title }}
                </h3>
                <p class="text-xs text-muted mt-0.5">
                  {{ report.description }}
                </p>
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </div>

    <div class="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
      <div class="flex items-start gap-3">
        <UIcon name="i-lucide-info" class="w-5 h-5 text-blue-600 mt-0.5" />
        <div>
          <h3 class="font-medium text-blue-900 dark:text-blue-100">
            Export & Print
          </h3>
          <p class="text-sm text-blue-700 dark:text-blue-300 mt-1">
            All reports support PDF, Excel (XLSX), and CSV export formats. Use the export buttons on each report page.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
