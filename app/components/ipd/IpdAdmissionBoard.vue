<script setup lang="ts">
import { onMounted, ref } from 'vue'

const { t } = useI18n()
const toast = useToast()
interface AdmissionSummary {
  _id: string
  admissionNumber: string
  patientId: string
  admissionReason: string
}

const admissions = ref<AdmissionSummary[]>([])
const loading = ref(false)
const selected = ref<AdmissionSummary | null>(null)
const dischargeReason = ref('recovered')
const summaryKh = ref('')
const followUpDate = ref('')
const isModalOpen = computed({
  get: () => !!selected.value,
  set: (value: boolean) => { if (!value) selected.value = null }
})

async function loadAdmissions() {
  loading.value = true
  try {
    const response = await $api<{ data: AdmissionSummary[] }>('/admissions?status=under_treatment')
    admissions.value = response.data || []
  } catch {
    toast.add({ title: t('common.error'), description: 'មិនអាចទាញយកបញ្ជីអ្នកជំងឺសម្រាកពេទ្យបានទេ', color: 'error' })
  } finally { loading.value = false }
}

async function discharge() {
  if (!selected.value) return
  try {
    await $api(`/admissions/${selected.value._id}/discharge`, {
      method: 'POST',
      body: { dischargeReason: dischargeReason.value, treatmentSummaryKh: summaryKh.value, followUpDate: followUpDate.value || undefined }
    })
    toast.add({ title: 'បានបញ្ចេញអ្នកជំងឺ', color: 'success' })
    selected.value = null
    await loadAdmissions()
  } catch { toast.add({ title: 'បរាជ័យ', description: 'មិនអាចបញ្ចេញអ្នកជំងឺបានទេ', color: 'error' }) }
}

onMounted(loadAdmissions)
</script>

<template>
  <UCard>
    <template #header>
      <h2 class="font-semibold">
        អ្នកជំងឺសម្រាកពេទ្យ / IPD
      </h2>
    </template>
    <div v-if="loading" class="text-gray-500">
      កំពុងទាញយក...
    </div>
    <div v-else-if="!admissions.length" class="text-gray-500">
      មិនមានអ្នកជំងឺកំពុងសម្រាកពេទ្យ
    </div>
    <div v-else class="space-y-3">
      <button
        v-for="item in admissions"
        :key="item._id"
        class="w-full rounded border p-3 text-left hover:bg-gray-50"
        @click="selected = item"
      >
        <div class="font-medium">
          {{ item.admissionNumber }}
        </div>
        <div class="text-sm text-gray-500">
          Patient: {{ item.patientId }} · {{ item.admissionReason }}
        </div>
      </button>
    </div>
    <UModal v-model:open="isModalOpen" title="បញ្ចេញអ្នកជំងឺ / Discharge">
      <template #body>
        <div class="space-y-3">
          <USelect v-model="dischargeReason" :items="['recovered', 'referred', 'requested', 'transferred', 'other']" />
          <UTextarea v-model="summaryKh" placeholder="សេចក្តីសង្ខេបការព្យាបាល" />
          <UInput v-model="followUpDate" type="date" />
        </div>
      </template>
      <template #footer>
        <UButton color="primary" label="បញ្ចេញ និងរក្សាទុក" @click="discharge" />
      </template>
    </UModal>
  </UCard>
</template>
