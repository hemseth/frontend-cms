<script setup lang="ts">
/**
 * Medicine labels for one dispensing: one label per medicine handed over, sized for a
 * 60 mm label printer. Everything comes from GET /dispensings/:id/labels, so the label
 * shows what actually left stock (batch, expiry), not what was prescribed.
 */
import { onMounted, ref } from 'vue'
import type { MedicineLabelData } from '~/types/pharmacy'

definePageMeta({
  layout: false
})

const { t } = useI18n()
const route = useRoute()
const { fetchLabels } = useDispensing()
const { profile, load: loadProfile } = useClinicProfile()

const data = ref<MedicineLabelData | null>(null)
const isLoading = ref(true)
const loadError = ref('')

onMounted(async () => {
  try {
    const [labels] = await Promise.all([fetchLabels(String(route.params.id || '')), loadProfile()])
    data.value = labels ?? null
    if (!labels?.labels.length) loadError.value = t('pharmacy.label.nothingToPrint')
  } catch (e) {
    loadError.value = getApiErrorMessage(e, t('pharmacy.label.loadFailed'))
  } finally {
    isLoading.value = false
  }
})

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('en-GB') : '')

function patientLine(d: MedicineLabelData) {
  const p = d.patient
  if (!p) return ''
  const code = p.pId ? `P-${String(p.pId).padStart(6, '0')}` : ''
  return [p.nameKh || p.nameEn, code].filter(Boolean).join(' · ')
}

function print() {
  window.print()
}
</script>

<template>
  <div class="label-page">
    <div class="toolbar no-print">
      <UButton
        :label="t('pharmacy.label.print')"
        icon="i-lucide-printer"
        :disabled="!data?.labels.length"
        @click="print"
      />
    </div>

    <p v-if="isLoading" class="no-print status">
      {{ t('common.loading') }}
    </p>
    <p v-else-if="loadError" class="no-print status error">
      {{ loadError }}
    </p>

    <template v-else-if="data">
      <section v-for="(label, index) in data.labels" :key="index" class="label">
        <header>
          <strong>{{ profile.title }}</strong>
          <span v-if="profile.phone"> · {{ profile.phone }}</span>
        </header>
        <div class="patient">
          {{ patientLine(data) }}
        </div>
        <div class="medicine">
          {{ label.medicineName }} <span v-if="label.strength">{{ label.strength }}</span>
        </div>
        <div v-if="label.medicineNameKh && label.medicineNameKh !== label.medicineName" class="muted">
          {{ label.medicineNameKh }}
        </div>
        <div class="qty">
          {{ t('pharmacy.label.quantity', { qty: label.quantityBase, unit: label.baseUnit || '' }) }}
        </div>
        <table v-if="label.schedule" class="schedule">
          <tr>
            <th>{{ t('pharmacy.label.morning') }}</th>
            <th>{{ t('pharmacy.label.afternoon') }}</th>
            <th>{{ t('pharmacy.label.evening') }}</th>
            <th>{{ t('pharmacy.label.night') }}</th>
          </tr>
          <tr>
            <td>{{ label.schedule.morning || '-' }}</td>
            <td>{{ label.schedule.afternoon || '-' }}</td>
            <td>{{ label.schedule.evening || '-' }}</td>
            <td>{{ label.schedule.night || '-' }}</td>
          </tr>
        </table>
        <div v-if="label.schedule?.days">
          {{ t('pharmacy.label.days', { n: label.schedule.days }) }}
        </div>
        <div v-if="label.dose || label.frequency">
          {{ [label.dose, label.frequency].filter(Boolean).join(' · ') }}
        </div>
        <div v-if="label.notes" class="notes">
          {{ label.notes }}
        </div>
        <div v-else-if="label.instructionKh || label.instructionEn" class="notes">
          {{ label.instructionKh || label.instructionEn }}
        </div>
        <footer>
          <span v-if="label.batchNos.length">{{ t('pharmacy.label.batch') }}: {{ label.batchNos.join(', ') }}</span>
          <span v-if="label.expiryDate"> · {{ t('pharmacy.label.expiry') }}: {{ formatDate(label.expiryDate) }}</span>
          <div>{{ data.dispensingNo }} · {{ formatDate(data.dispensedAt) }}</div>
        </footer>
      </section>
    </template>
  </div>
</template>

<style scoped>
.label-page {
  font-family: 'Battambang', 'Noto Sans Khmer', sans-serif;
  color: #000;
  background: #fff;
  min-height: 100vh;
  padding: 12px;
}
.toolbar { margin-bottom: 12px; }
.status { font-size: 14px; }
.status.error { color: #b91c1c; }
.label {
  width: 60mm;
  padding: 3mm;
  border: 1px dashed #999;
  margin-bottom: 4mm;
  font-size: 11px;
  line-height: 1.35;
  page-break-inside: avoid;
  break-inside: avoid;
}
.label header { font-size: 11px; border-bottom: 1px solid #000; padding-bottom: 1mm; margin-bottom: 1mm; }
.patient { font-weight: 600; }
.medicine { font-size: 13px; font-weight: 700; margin-top: 1mm; }
.muted { color: #333; }
.qty { font-weight: 600; }
.schedule { width: 100%; border-collapse: collapse; margin: 1mm 0; text-align: center; }
.schedule th, .schedule td { border: 1px solid #000; padding: 0.5mm; font-size: 10px; }
.notes { font-style: italic; }
.label footer { margin-top: 1mm; font-size: 9px; color: #333; }
@media print {
  .no-print { display: none !important; }
  .label-page { padding: 0; }
  .label { border: none; border-bottom: 1px dashed #999; margin: 0; }
}
</style>
