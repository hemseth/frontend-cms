<script setup lang="ts">
const props = defineProps<{
  title: string
  // The period the report covers. Pages without a date filter leave this out
  // rather than printing an invented range.
  dateRange?: { start: string, end: string }
  showSignature?: boolean
  // Who signs. This differs per report, so both sides are overridable.
  leftSignature?: string
  rightSignature?: string
}>()

const { t } = useI18n()
const { profile, load: loadProfile } = useClinicProfile()
const { toKhmerNumber, formatKhmerDate } = useKhmerUtils()

onMounted(loadProfile)

// "ធ្វើនៅ <place>, <date>" sits above the approving signature on Cambodian
// official documents. The place comes from the clinic's own address, whose last
// comma-separated part is the city or province.
const placeOfIssue = computed(() => {
  const address = profile.value?.address?.trim()
  if (!address) return ''
  const parts = address.split(/[,។]/).map(part => part.trim()).filter(Boolean)
  return parts[parts.length - 1] || ''
})

const issuedOn = computed(() => formatKhmerDate(new Date()))

const issuedTime = computed(() =>
  toKhmerNumber(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))
)

const periodLabel = computed(() => {
  if (!props.dateRange?.start || !props.dateRange?.end) return ''
  return `${formatKhmerDate(props.dateRange.start)} - ${formatKhmerDate(props.dateRange.end)}`
})

const leftLabel = computed(() => props.leftSignature || t('report.preparedBy'))
const rightLabel = computed(() => props.rightSignature || t('report.director'))
</script>

<template>
  <div class="report-container font-khmer">
    <div class="report-header print-only">
      <PrintLetterhead :profile="profile" class="clinic-header" />

      <!-- The clinic's configured header lines: the ministry and department it
           reports under. Invoices and lab results already print these; reports
           did not, so an official header was missing from every one of them. -->
      <div v-if="profile.headerLines?.length" class="header-lines">
        <PrintHeaderLines :lines="profile.headerLines" />
      </div>

      <div class="report-title-section">
        <h2 class="report-title">
          {{ title }}
        </h2>
        <p v-if="periodLabel" class="report-period">
          {{ t('report.reportPeriod') }}៖ {{ periodLabel }}
        </p>
      </div>

      <PrintClinicFooter :profile="profile" :show-note="false" class="clinic-contact" />
    </div>

    <slot />

    <div v-if="showSignature" class="report-footer print-only">
      <p v-if="placeOfIssue" class="place-of-issue">
        {{ t('report.madeAt') }} {{ placeOfIssue }}, {{ issuedOn }}
      </p>
      <div class="signature-section">
        <div class="signature-box">
          <div class="signature-line">
            <span>{{ leftLabel }}</span>
          </div>
        </div>
        <div class="signature-box">
          <div class="signature-line">
            <span>{{ rightLabel }}</span>
          </div>
        </div>
      </div>
      <div class="footer-note">
        <p>{{ t('report.generatedAt') }}៖ {{ issuedOn }} {{ issuedTime }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.report-container {
  min-height: 100%;
}

/* Khmer needs a Khmer face; the default stack renders it with fallback glyphs. */
.font-khmer {
  font-family: 'Battambang', 'Hanuman', 'Noto Sans Khmer', serif;
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

  /* The header lines read as a list, so they stay left-aligned inside the
     otherwise centred header. */
  .header-lines {
    display: flex;
    justify-content: flex-start;
    text-align: left;
    margin: 10px 0;
  }

  .clinic-contact {
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
    font-family: 'Moul', serif;
  }

  .report-period {
    font-size: 12px;
    margin-top: 6px;
  }

  .report-footer {
    margin-top: 50px;
    padding-top: 20px;
    border-top: 1px solid #ccc;
  }

  .place-of-issue {
    text-align: right;
    font-size: 12px;
    margin-bottom: 10px;
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
