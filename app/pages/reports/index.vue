<script setup lang="ts">
const { t } = useI18n()

const breadcrumbItems = computed(() => [
  { label: t('nav.home'), to: '/' },
  { label: t('report.title') }
])

const reportCategories = [
  {
    title: t('report.patientReports'),
    icon: 'i-lucide-users',
    color: 'primary',
    reports: [
      { title: t('report.patientProfile'), description: 'Patient profile and details', icon: 'i-lucide-user', link: '/reports/patient-profile' },
      { title: t('report.visitReport'), description: 'Visit history and details', icon: 'i-lucide-stethoscope', link: '/reports/visit' },
      { title: t('report.diagnosisReport'), description: 'Diagnosis records', icon: 'i-lucide-clipboard-list', link: '/reports/diagnosis' },
      { title: t('report.treatmentReport'), description: 'Treatment plans and outcomes', icon: 'i-lucide-activity', link: '/reports/treatment' },
      { title: t('report.labReport'), description: 'Lab and test results', icon: 'i-lucide-test-tube', link: '/reports/lab' },
      { title: t('report.followupReport'), description: 'Follow-up schedules', icon: 'i-lucide-calendar-check', link: '/reports/followup' },
      { title: t('report.criticalReport'), description: 'Critical patients', icon: 'i-lucide-alert-triangle', link: '/reports/critical' },
      { title: t('report.historyReport'), description: 'Complete patient history', icon: 'i-lucide-history', link: '/reports/history' }
    ]
  },
  {
    title: t('report.financialReports'),
    icon: 'i-lucide-dollar-sign',
    color: 'green',
    reports: [
      { title: t('report.invoiceReport'), description: 'Patient invoices', icon: 'i-lucide-file-text', link: '/reports/invoice' },
      { title: t('report.receiptReport'), description: 'Payment receipts', icon: 'i-lucide-receipt', link: '/reports/receipt' },
      { title: t('report.outstandingReport'), description: 'Outstanding balances', icon: 'i-lucide-credit-card', link: '/reports/outstanding' },
      { title: t('report.dailyRevenueReport'), description: 'Daily revenue summary', icon: 'i-lucide-calendar', link: '/reports/daily' },
      { title: t('report.monthlyRevenueReport'), description: 'Monthly revenue summary', icon: 'i-lucide-bar-chart-2', link: '/reports/monthly' }
    ]
  },
  {
    title: t('report.hrReports'),
    icon: 'i-lucide-users',
    color: 'blue',
    reports: [
      { title: t('report.employeeList'), description: 'Staff directory', icon: 'i-lucide-user-check', link: '/reports/employees' },
      { title: t('report.attendanceReport'), description: 'Attendance records', icon: 'i-lucide-clock', link: '/reports/attendance' },
      { title: t('report.leaveReport'), description: 'Leave management', icon: 'i-lucide-calendar-off', link: '/reports/leave' },
      { title: t('report.performanceReport'), description: 'Staff performance', icon: 'i-lucide-trending-up', link: '/reports/performance' },
      { title: t('report.doctorActivity'), description: 'Doctor activities', icon: 'i-lucide-user-md', link: '/reports/doctor-activity' }
    ]
  },
  {
    title: t('report.payrollReports'),
    icon: 'i-lucide-wallet',
    color: 'amber',
    reports: [
      { title: t('report.payrollSummary'), description: 'Payroll overview', icon: 'i-lucide-list', link: '/reports/payroll-summary' },
      { title: t('report.payslip'), description: 'Individual payslips', icon: 'i-lucide-file-check', link: '/reports/payslip' },
      { title: t('report.salaryStructure'), description: 'Salary structure', icon: 'i-lucide-table', link: '/reports/salary-structure' },
      { title: t('report.allowanceReport'), description: 'Allowances and deductions', icon: 'i-lucide-calculator', link: '/reports/allowances' },
      { title: t('report.loanReport'), description: 'Loan deductions', icon: 'i-lucide-banknote', link: '/reports/loans' }
    ]
  },
  {
    title: t('report.managementReports'),
    icon: 'i-lucide-pie-chart',
    color: 'purple',
    reports: [
      { title: t('report.dashboardSummary'), description: 'Overview statistics', icon: 'i-lucide-layout-dashboard', link: '/reports/dashboard' },
      { title: t('report.departmentReport'), description: 'Department performance', icon: 'i-lucide-building', link: '/reports/departments' },
      { title: t('report.serviceUsage'), description: 'Service usage stats', icon: 'i-lucide-pie-chart', link: '/reports/service-usage' },
      { title: t('report.topDiseases'), description: 'Common diseases', icon: 'i-lucide-activity', link: '/reports/diseases' },
      { title: t('report.topRevenueServices'), description: 'Top revenue services', icon: 'i-lucide-trending-up', link: '/reports/top-services' }
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
      <p class="text-gray-600 dark:text-gray-400 mt-1">
        View, analyze and export clinic reports
      </p>
    </div>

    <div class="space-y-6">
      <div
        v-for="category in reportCategories"
        :key="category.title"
        class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
      >
        <div
          class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 cursor-pointer"
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
            class="w-5 h-5 text-gray-400"
          />
        </div>

        <div
          v-show="expandedCategories.includes(category.title)"
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 bg-white dark:bg-gray-900"
        >
          <UCard
            v-for="report in category.reports"
            :key="report.title"
            class="hover:shadow-md transition-shadow cursor-pointer border border-gray-100 dark:border-gray-800"
            @click="navigateTo(report.link)"
          >
            <div class="flex items-center gap-3">
              <UIcon :name="report.icon" class="w-5 h-5 text-gray-400" />
              <div>
                <h3 class="font-medium text-sm">
                  {{ report.title }}
                </h3>
                <p class="text-xs text-gray-500 mt-0.5">
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
