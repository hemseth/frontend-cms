<script setup lang="ts">
/**
 * Print-ready bilingual payslip: Khmer primary, English underneath.
 *
 * A payslip shows BOTH languages whatever the interface language is, so it
 * reads the `hr` block from both locale files directly. `t()` cannot do this:
 * it only holds the active locale's messages.
 *
 * The QR code carries a payment REFERENCE only (payroll id, period, employee
 * id), never an amount, and is drawn locally so no salary data is sent to a
 * third-party QR service.
 */
import { computed, ref, watch, onMounted } from 'vue'
// A default import, not `import { hr }`: the production bundler does not expose
// named exports from JSON, so a named import type-checks but fails the build.
import kmLocale from '~~/locales/km.json'
import enLocale from '~~/locales/en.json'
import type { PayslipData } from '~/utils/payroll'

const props = defineProps<{
  data: PayslipData
}>()

const { t } = useI18n()

const KM = (kmLocale as unknown as { hr: Record<string, string> }).hr
const EN = (enLocale as unknown as { hr: Record<string, string> }).hr

/** Substitute `{name}` placeholders. */
function fill(text: string | undefined, params: Record<string, string | number> = {}): string {
  return (text ?? '').replace(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? ''))
}

const a = computed(() => props.data.amounts)
const r = computed(() => props.data.result)

interface Line {
  key: string
  amount: number
  /** Extra text after the label, e.g. the NSSF rate. */
  suffix?: string
}

const earningLines = computed<Line[]>(() => [
  { key: 'baseSalary', amount: a.value.baseSalary },
  { key: 'overtime', amount: a.value.overtime },
  { key: 'allowances', amount: r.value.allowances },
  { key: 'bonus', amount: a.value.bonus }
])

/** The employee NSSF rate actually applied, read back from the result so custom rules show correctly. */
const nssfRateText = computed(() => {
  const base = r.value.nssfBase
  return base > 0 ? `${Math.round((r.value.nssfEmployee / base) * 1000) / 10}%` : ''
})

const deductionLines = computed<Line[]>(() => {
  const lines: Line[] = [
    { key: 'nssfEmployee', amount: r.value.nssfEmployee, suffix: nssfRateText.value },
    { key: 'incomeTax', amount: r.value.incomeTax },
    { key: 'advanceRepayment', amount: a.value.advanceRepayment },
    { key: 'absence', amount: a.value.absenceDeduction }
  ]
  // Late and "other" are not in the standard layout, so they only appear when used.
  if (a.value.lateDeduction > 0) lines.push({ key: 'late', amount: a.value.lateDeduction })
  if (a.value.otherDeductions > 0) lines.push({ key: 'otherDeductions', amount: a.value.otherDeductions })
  return lines
})

const netKhr = computed(() => usdToKhr(r.value.net, props.data.khrPerUsd))
const rateText = computed(() => props.data.khrPerUsd.toLocaleString('en-US'))

const paymentReference = computed(() =>
  ['PAYSLIP', props.data.payrollId || '-', props.data.period, props.data.employee.employeeId].join('|')
)

const qrUrl = ref('')

type QrFn = (text: string, options: { margin: number, width: number, errorCorrectionLevel: 'M' }) => Promise<string>

async function drawQr(text: string) {
  try {
    const mod = (await import('qrcode')) as unknown as { toDataURL?: QrFn, default?: { toDataURL?: QrFn } }
    const toDataURL = mod.toDataURL ?? mod.default?.toDataURL
    if (!toDataURL) throw new Error('qrcode failed to load')
    qrUrl.value = await toDataURL(text, { margin: 1, width: 132, errorCorrectionLevel: 'M' })
  } catch {
    // The payslip is still valid without the QR; the reference text below stays.
    qrUrl.value = ''
  }
}

onMounted(() => {
  watch(paymentReference, drawQr, { immediate: true })
})
</script>

<template>
  <article class="payslip mx-auto w-full max-w-[210mm] bg-white text-black p-8 print:p-0 print:max-w-none text-[12px] leading-snug">
    <!-- Header -->
    <header class="text-center border-b-2 border-black pb-3">
      <h1 class="text-lg font-bold">
        {{ data.clinicNameKh || data.clinicName }}
      </h1>
      <p v-if="data.clinicNameKh" class="text-xs text-toned">
        {{ data.clinicName }}
      </p>
      <div class="mt-2">
        <p class="text-base font-bold">
          {{ KM.payslip }}
        </p>
        <p class="text-[11px] text-toned">
          {{ EN.payslip }} · {{ periodLabel(data.period, 'km') }} / {{ periodLabel(data.period, 'en') }}
        </p>
      </div>
    </header>

    <!-- Employee -->
    <section class="grid grid-cols-2 gap-x-6 gap-y-2 py-3 border-b border-gray-400">
      <div class="col-span-2">
        <p class="text-[10px] text-muted">
          {{ KM.employee }} / {{ EN.employee }}
        </p>
        <p class="text-sm font-bold">
          {{ data.employee.nameKh || '-' }}
        </p>
        <p class="text-xs text-default">
          {{ data.employee.nameEn || '-' }}
        </p>
      </div>
      <div>
        <p class="text-[10px] text-muted">
          {{ KM.employeeId }} / {{ EN.employeeId }}
        </p>
        <p class="font-medium">
          {{ data.employee.employeeId }}
        </p>
      </div>
      <div>
        <p class="text-[10px] text-muted">
          {{ KM.nssfNo }} / {{ EN.nssfNo }}
        </p>
        <p class="font-medium">
          {{ data.employee.nssfNo || '-' }}
        </p>
      </div>
      <div v-if="data.issuedAt" class="col-span-2">
        <p class="text-[10px] text-muted">
          {{ KM.issuedOn }} / {{ EN.issuedOn }}
        </p>
        <p class="font-medium">
          {{ formatKhDate(data.issuedAt) }}
        </p>
      </div>
    </section>

    <!-- Earnings and deductions -->
    <section class="grid grid-cols-2 gap-6 py-3">
      <div>
        <h2 class="font-bold border-b border-black pb-1 mb-1">
          {{ KM.earnings }} <span class="font-normal text-[10px] text-toned">/ {{ EN.earnings }}</span>
        </h2>
        <table class="w-full">
          <tbody>
            <tr v-for="line in earningLines" :key="line.key" class="align-top">
              <td class="py-0.5 pe-2">
                {{ KM[line.key] }}
                <span class="block text-[10px] text-muted">{{ EN[line.key] }}</span>
              </td>
              <td class="py-0.5 text-right tabular-nums whitespace-nowrap">
                {{ formatUsd(line.amount) }}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="border-t border-black font-bold">
              <td class="pt-1">
                {{ KM.gross }}
                <span class="block text-[10px] font-normal text-muted">{{ EN.gross }}</span>
              </td>
              <td class="pt-1 text-right tabular-nums">
                {{ formatUsd(r.gross) }}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div>
        <h2 class="font-bold border-b border-black pb-1 mb-1">
          {{ KM.deductions }} <span class="font-normal text-[10px] text-toned">/ {{ EN.deductions }}</span>
        </h2>
        <table class="w-full">
          <tbody>
            <tr v-for="line in deductionLines" :key="line.key" class="align-top">
              <td class="py-0.5 pe-2">
                {{ KM[line.key] }}<template v-if="line.suffix">
                  {{ line.suffix }}
                </template>
                <span class="block text-[10px] text-muted">{{ EN[line.key] }}</span>
              </td>
              <td class="py-0.5 text-right tabular-nums whitespace-nowrap">
                {{ formatUsd(line.amount) }}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="border-t border-black font-bold">
              <td class="pt-1">
                {{ KM.totalDeductions }}
                <span class="block text-[10px] font-normal text-muted">{{ EN.totalDeductions }}</span>
              </td>
              <td class="pt-1 text-right tabular-nums">
                {{ formatUsd(r.totalDeductions) }}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>

    <!-- Net pay -->
    <section class="border-2 border-black rounded p-3 my-2">
      <div class="flex items-center justify-between gap-4">
        <div>
          <p class="font-bold text-sm">
            {{ KM.netPay }}
          </p>
          <p class="text-[10px] text-toned">
            {{ EN.netPay }}
          </p>
        </div>
        <div class="text-right">
          <p class="text-xl font-bold tabular-nums">
            {{ formatUsd(r.net) }}
          </p>
          <p class="text-base font-bold tabular-nums">
            {{ formatKhr(netKhr) }}
          </p>
        </div>
      </div>
      <p class="text-[10px] text-toned mt-1 text-right">
        {{ fill(KM.rateLine, { rate: rateText }) }} · {{ fill(EN.rateLine, { rate: rateText }) }}
      </p>
    </section>

    <!-- Footer: reference QR and signatures -->
    <footer class="flex items-end justify-between gap-6 pt-6">
      <div class="flex items-center gap-3">
        <img
          v-if="qrUrl"
          :src="qrUrl"
          :alt="KM.paymentReference"
          class="w-[30mm] h-[30mm]"
        >
        <div class="text-[10px] text-toned max-w-[45mm] break-all">
          <p class="font-medium text-highlighted">
            {{ KM.paymentReference }} / {{ EN.paymentReference }}
          </p>
          <p>{{ paymentReference }}</p>
        </div>
      </div>

      <div class="flex gap-8 text-center">
        <div class="w-40">
          <div class="border-t border-black pt-1 mt-12">
            {{ KM.employeeSignature }}
            <span class="block text-[10px] text-muted">{{ EN.employeeSignature }}</span>
          </div>
        </div>
        <div class="w-40">
          <div class="border-t border-black pt-1 mt-12">
            {{ KM.authorisedBy }}
            <span class="block text-[10px] text-muted">{{ EN.authorisedBy }}</span>
          </div>
        </div>
      </div>
    </footer>

    <!-- Screen only: never printed -->
    <UAlert
      v-if="data.reconciliation"
      class="mt-6 print:hidden"
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      :title="t('hr.reconcileTitle')"
      :description="t('hr.reconcileBody', {
        stored: formatUsd(data.reconciliation.storedNet),
        computed: formatUsd(data.reconciliation.computedNet)
      })"
    />
  </article>
</template>
