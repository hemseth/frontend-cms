<script setup lang="ts">
/** Printable inpatient bill (from GET /ipd/admissions/:id/bill). */
import { onMounted, ref } from 'vue'
import Letterhead from '~/components/print/Letterhead.vue'
import type { IpdBill } from '~/types/ipd'

definePageMeta({
  layout: false
})

const { t } = useI18n()
const route = useRoute()
const admissionId = String(route.params.id || '')
const ipd = useIpd(admissionId)
const { profile, load: loadProfile } = useClinicProfile()

const bill = ref<IpdBill | null>(null)
const patient = ref<{ nameKh?: string, nameEn?: string, name?: string } | null>(null)
const isLoading = ref(true)
const loadError = ref('')

onMounted(async () => {
  try {
    const [b, detail] = await Promise.all([
      ipd.getBill(),
      $api<{ data?: { patient?: { nameKh?: string, nameEn?: string, name?: string } } }>(`/inpatient/admissions/${admissionId}`).catch(() => null),
      loadProfile()
    ])
    bill.value = b ?? null
    patient.value = detail?.data?.patient ?? null
  } catch (e) {
    loadError.value = getApiErrorMessage(e, t('ipd.loadFailed'))
  } finally {
    isLoading.value = false
  }
})

const money = (n: number) => `$${(Math.round(n * 100) / 100).toFixed(2)}`
const fmt = (value?: string) => (value ? new Date(value).toLocaleDateString('en-GB') : '')
function print() {
  window.print()
}
</script>

<template>
  <div class="bill-page">
    <div class="no-print toolbar">
      <UButton
        :label="t('pharmacy.label.print')"
        icon="i-lucide-printer"
        :disabled="!bill"
        @click="print"
      />
    </div>
    <p v-if="isLoading" class="no-print">
      {{ t('common.loading') }}
    </p>
    <p v-else-if="loadError" class="no-print error">
      {{ loadError }}
    </p>
    <template v-else-if="bill">
      <Letterhead :profile="profile" />
      <h1>{{ t('ipd.bill.printTitle') }}</h1>
      <table class="meta">
        <tr>
          <td>{{ t('ipd.bill.patient') }}: <b>{{ patient?.nameKh || patient?.nameEn || patient?.name }}</b></td>
          <td>{{ t('ipd.bill.admissionNo') }}: <b>{{ bill.admission.admissionNumber }}</b></td>
        </tr>
        <tr>
          <td>{{ t('ipd.bill.admitted') }}: {{ fmt(bill.admission.admissionDate) }}</td>
          <td>{{ t('ipd.bill.discharged') }}: {{ fmt(bill.admission.dischargeDate) || '-' }}</td>
        </tr>
      </table>
      <table class="lines">
        <thead>
          <tr>
            <th>#</th>
            <th>{{ t('ipd.bill.item') }}</th>
            <th>{{ t('ipd.bill.qty') }}</th>
            <th>{{ t('ipd.bill.price') }}</th>
            <th>{{ t('ipd.bill.amount') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(line, i) in bill.lines" :key="i">
            <td>{{ i + 1 }}</td>
            <td>{{ t(`ipd.bill.kind.${line.kind}`) }} — {{ line.nameKh || line.name }}</td>
            <td class="num">
              {{ line.quantity }} {{ line.unit === 'day' ? t('ipd.bill.days') : line.unit || '' }}
            </td>
            <td class="num">
              {{ money(line.unitPrice) }}
            </td>
            <td class="num">
              {{ money(line.amount) }}
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="4" class="num">
              {{ t('ipd.bill.subtotal') }}
            </td>
            <td class="num">
              {{ money(bill.subtotal) }}
            </td>
          </tr>
          <tr v-if="bill.discount">
            <td colspan="4" class="num">
              {{ t('ipd.bill.discount') }}
            </td>
            <td class="num">
              -{{ money(bill.discount) }}
            </td>
          </tr>
          <tr>
            <td colspan="4" class="num">
              <b>{{ t('ipd.bill.total') }}</b>
            </td>
            <td class="num">
              <b>{{ money(bill.total) }}</b>
            </td>
          </tr>
          <tr>
            <td colspan="4" class="num">
              {{ t('ipd.bill.received') }}
            </td>
            <td class="num">
              {{ money(bill.received) }}
            </td>
          </tr>
          <tr>
            <td colspan="4" class="num">
              <b>{{ t('ipd.bill.balance') }}</b>
            </td>
            <td class="num">
              <b>{{ money(bill.balance) }}</b>
            </td>
          </tr>
        </tfoot>
      </table>
      <p v-if="!bill.admission.billFinalizedAt" class="draft">
        {{ t('ipd.bill.draftNotice') }}
      </p>
    </template>
  </div>
</template>

<style scoped>
.bill-page { font-family: 'Battambang', 'Noto Sans Khmer', sans-serif; color: #000; background: #fff; min-height: 100vh; padding: 16px; max-width: 210mm; margin: 0 auto; font-size: 12px; }
.toolbar { margin-bottom: 12px; }
.error { color: #b91c1c; }
h1 { text-align: center; font-size: 16px; margin: 8px 0; }
table { width: 100%; border-collapse: collapse; }
.meta td { padding: 2px 0; }
.lines { margin-top: 8px; }
.lines th, .lines td { border: 1px solid #000; padding: 3px 5px; }
.lines th { background: #f3f3f3; }
.num { text-align: right; white-space: nowrap; }
.draft { margin-top: 8px; font-style: italic; }
@media print {
  .no-print { display: none !important; }
  .bill-page { padding: 0; }
}
</style>
