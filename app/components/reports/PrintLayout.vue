<script setup lang="ts">
const props = defineProps<{
  title: string
  showSignature?: boolean
  clinicName?: string
  clinicPhone?: string
  clinicAddress?: string
}>()

const { t } = useI18n()
</script>

<template>
  <div class="report-container">
    <div class="report-header print-only">
      <div class="clinic-header">
        <h1 class="clinic-name">
          {{ clinicName || 'Clinic Management System' }}
        </h1>
        <p v-if="clinicPhone" class="clinic-contact">
          {{ clinicPhone }}
        </p>
        <p v-if="clinicAddress" class="clinic-address">
          {{ clinicAddress }}
        </p>
      </div>
      <div class="report-title-section">
        <h2 class="report-title">
          {{ title }}
        </h2>
      </div>
    </div>

    <slot />

    <div v-if="showSignature" class="report-footer print-only">
      <div class="signature-section">
        <div class="signature-box">
          <div class="signature-line">
            <span>{{ t('report.doctorSignature') }}</span>
          </div>
        </div>
        <div class="signature-box">
          <div class="signature-line">
            <span>{{ t('report.adminSignature') }}</span>
          </div>
        </div>
      </div>
      <div class="footer-note">
        <p>{{ t('report.generatedAt') }}: {{ new Date().toLocaleString() }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.report-container {
  min-height: 100%;
}

.print-only {
  display: none;
}

@media print {
  :deep(.no-print) {
    display: none !important;
  }

  .print-only {
    display: block !important;
  }

  .report-header {
    text-align: center;
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 2px solid #333;
  }

  .clinic-header {
    margin-bottom: 15px;
  }

  .clinic-name {
    font-size: 24px;
    font-weight: bold;
    margin: 0;
  }

  .clinic-contact,
  .clinic-address {
    font-size: 12px;
    margin: 5px 0;
    color: #666;
  }

  .report-title-section {
    margin-top: 15px;
  }

  .report-title {
    font-size: 18px;
    font-weight: bold;
    margin: 0;
  }

  .report-footer {
    margin-top: 50px;
    padding-top: 20px;
    border-top: 1px solid #ccc;
  }

  .signature-section {
    display: flex;
    justify-content: space-between;
    margin-bottom: 30px;
  }

  .signature-box {
    width: 45%;
    text-align: center;
  }

  .signature-line {
    border-top: 1px solid #333;
    padding-top: 10px;
    margin-top: 60px;
  }

  .signature-line span {
    font-size: 12px;
    color: #666;
  }

  .footer-note {
    text-align: right;
    font-size: 10px;
    color: #999;
  }

  .p-6 {
    padding: 0 !important;
  }

  .space-y-6 > * + * {
    margin-top: 1rem;
  }
}
</style>
