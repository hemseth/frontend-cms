<script setup lang="ts">
/** Queue ticket for a checked-in visit, sized for a 58/80 mm receipt printer. */
import { onMounted, ref } from 'vue'

definePageMeta({
  layout: false
})

interface TicketVisit {
  queueNo?: number
  queueDate?: string
  checkedInAt?: string
  dateIn?: string
  consultRoom?: string
  triagePriority?: string
  patient?: { nameKh?: string, nameEn?: string, pId?: number } | null
}

const { t } = useI18n()
const route = useRoute()
const { profile, load: loadProfile } = useClinicProfile()
const visit = ref<TicketVisit | null>(null)
const doctorName = ref('')
const loadError = ref('')

onMounted(async () => {
  try {
    const [res, queue] = await Promise.all([
      $api<{ data?: TicketVisit & { doctorId?: string } }>(`/visits/${route.params.id}`),
      $api<{ data?: Array<{ _id: string, doctorName?: string }> }>('/visits/queue', { params: { tzOffset: new Date().getTimezoneOffset() } }).catch(() => null),
      loadProfile()
    ])
    visit.value = res?.data ?? null
    doctorName.value = queue?.data?.find((v: { _id: string, doctorName?: string }) => v._id === route.params.id)?.doctorName || ''
    setTimeout(() => window.print(), 300)
  } catch (e) {
    loadError.value = getApiErrorMessage(e, t('ipd.loadFailed'))
  }
})

const time = (value?: string) => (value ? new Date(value).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '')
</script>

<template>
  <div class="ticket">
    <p v-if="loadError">
      {{ loadError }}
    </p>
    <template v-else-if="visit">
      <div class="clinic">
        {{ profile.title }}
      </div>
      <div class="label">
        {{ t('workstation.ticket.queueNumber') }}
      </div>
      <div class="number">
        {{ visit.queueNo ?? '-' }}
      </div>
      <div class="name">
        {{ visit.patient?.nameKh || visit.patient?.nameEn }}
      </div>
      <div v-if="visit.patient?.pId" class="small">
        P-{{ String(visit.patient.pId).padStart(6, '0') }}
      </div>
      <div v-if="doctorName || visit.consultRoom" class="small">
        {{ [doctorName, visit.consultRoom].filter(Boolean).join(' · ') }}
      </div>
      <div class="small">
        {{ time(visit.checkedInAt || visit.dateIn) }}
      </div>
      <div class="wait">
        {{ t('workstation.ticket.pleaseWait') }}
      </div>
    </template>
  </div>
</template>

<style scoped>
.ticket { font-family: 'Battambang', 'Noto Sans Khmer', sans-serif; width: 72mm; margin: 0 auto; padding: 4mm; text-align: center; color: #000; background: #fff; }
.clinic { font-weight: 700; font-size: 14px; border-bottom: 1px dashed #000; padding-bottom: 2mm; }
.label { margin-top: 3mm; font-size: 12px; }
.number { font-size: 56px; font-weight: 800; line-height: 1.1; }
.name { font-size: 16px; font-weight: 600; margin-top: 2mm; }
.small { font-size: 11px; }
.wait { margin-top: 3mm; border-top: 1px dashed #000; padding-top: 2mm; font-size: 12px; }
@media print { .ticket { padding: 0; } }
</style>
