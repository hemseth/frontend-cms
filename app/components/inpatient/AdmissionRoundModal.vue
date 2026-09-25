<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  open?: boolean
  admission?: any
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'saved'): void
}>()

const toast = useToast()

const isOpen = computed({
  get: () => props.open ?? false,
  set: val => emit('update:open', val)
})

const roundTypes = [
  { label: 'ពិនិត្យជុំសាលធម្មតា (Routine)', value: 'ROUTINE' },
  { label: 'ពិនិត្យបន្ទាន់ (Urgent)', value: 'URGENT' },
  { label: 'ពិគ្រោះយោបល់ឯកទេស (Consultation)', value: 'CONSULTATION' },
  { label: 'ពិនិត្យក្រោយវះកាត់ (Post-operative)', value: 'POST_OPERATIVE' },
  { label: 'ពិនិត្យមុនចេញពីពេទ្យ (Discharge review)', value: 'DISCHARGE_REVIEW' }
]

const doctors = ref<{ label: string, value: string }[]>([])
const isSaving = ref(false)

const emptyForm = () => ({
  doctorId: props.admission?.attendingDoctor?.id ? String(props.admission.attendingDoctor.id) : '',
  roundType: 'ROUTINE',
  bp: '',
  temp: '',
  pulse: '',
  spo2: '',
  respiratoryRate: '',
  subjective: '',
  objective: '',
  assessment: '',
  plan: ''
})
const form = ref(emptyForm())

async function fetchDoctors() {
  try {
    const res: any = await $api('/staff?role=doctor')
    doctors.value = (res?.data || []).map((d: any) => ({ label: d.nameKh || d.nameEn || d.name, value: String(d._id) }))
  } catch (err: any) {
    doctors.value = []
    toast.add({ title: 'Error', description: getApiErrorMessage(err, 'មិនអាចទាញយកបញ្ជីគ្រូពេទ្យបានទេ (Could not load doctors)'), color: 'error' })
  }
}

watch(isOpen, (val) => {
  if (val) {
    form.value = emptyForm()
    fetchDoctors()
  }
})

const hasNote = computed(() => [form.value.subjective, form.value.objective, form.value.assessment, form.value.plan].some(v => v.trim()))

async function save() {
  const admissionId = props.admission?.admissionId || props.admission?._id
  if (!admissionId) return
  if (!form.value.doctorId) {
    toast.add({ title: 'Error', description: 'សូមជ្រើសរើសគ្រូពេទ្យ (Select a doctor)', color: 'error' })
    return
  }
  if (!hasNote.value) {
    toast.add({ title: 'Error', description: 'សូមបញ្ចូលកំណត់ត្រាយ៉ាងហោចណាស់មួយ (Enter at least one SOAP note)', color: 'error' })
    return
  }

  const vitals = {
    bp: form.value.bp || undefined,
    temp: form.value.temp || undefined,
    pulse: form.value.pulse || undefined,
    spo2: form.value.spo2 || undefined,
    respiratoryRate: form.value.respiratoryRate || undefined
  }

  isSaving.value = true
  try {
    await $api(`/inpatient/admissions/${admissionId}/rounds`, {
      method: 'POST',
      body: {
        doctorId: form.value.doctorId,
        roundType: form.value.roundType,
        subjective: form.value.subjective || undefined,
        objective: form.value.objective || undefined,
        assessment: form.value.assessment || undefined,
        plan: form.value.plan || undefined,
        vitalsSnapshot: Object.values(vitals).some(Boolean) ? vitals : undefined
      }
    })
    toast.add({ title: 'Success', description: 'បានរក្សាទុកការពិនិត្យជុំសាល (Round saved)', color: 'success' })
    isOpen.value = false
    emit('saved')
  } catch (err: any) {
    toast.add({ title: 'Error', description: getApiErrorMessage(err, 'មិនអាចរក្សាទុកការពិនិត្យជុំសាលបានទេ (Could not save the round)'), color: 'error' })
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    title="កត់ត្រាការពិនិត្យជុំសាល (Clinical Round)"
    :description="admission?.patient?.nameKh || admission?.patient?.name || ''"
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <template #body>
      <div class="space-y-4 font-khmer">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <UFormField label="គ្រូពេទ្យ (Doctor)" required>
            <USelect
              v-model="form.doctorId"
              :items="doctors"
              class="w-full"
              placeholder="ជ្រើសរើស..."
            />
          </UFormField>
          <UFormField label="ប្រភេទ (Round type)">
            <USelect v-model="form.roundType" :items="roundTypes" class="w-full" />
          </UFormField>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <UFormField label="BP">
            <UInput v-model="form.bp" placeholder="120/80" />
          </UFormField>
          <UFormField label="Temp (°C)">
            <UInput v-model="form.temp" inputmode="decimal" />
          </UFormField>
          <UFormField label="Pulse">
            <UInput v-model="form.pulse" inputmode="numeric" />
          </UFormField>
          <UFormField label="SpO2 (%)">
            <UInput v-model="form.spo2" inputmode="numeric" />
          </UFormField>
          <UFormField label="RR">
            <UInput v-model="form.respiratoryRate" inputmode="numeric" />
          </UFormField>
        </div>

        <UFormField label="S - រោគសញ្ញាដែលអ្នកជំងឺរៀបរាប់ (Subjective)">
          <UTextarea v-model="form.subjective" :rows="2" class="w-full" />
        </UFormField>
        <UFormField label="O - លទ្ធផលពិនិត្យ (Objective)">
          <UTextarea v-model="form.objective" :rows="2" class="w-full" />
        </UFormField>
        <UFormField label="A - ការវាយតម្លៃ (Assessment)">
          <UTextarea v-model="form.assessment" :rows="2" class="w-full" />
        </UFormField>
        <UFormField label="P - ផែនការព្យាបាល (Plan)">
          <UTextarea v-model="form.plan" :rows="2" class="w-full" />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton
          label="បោះបង់ (Cancel)"
          color="neutral"
          variant="ghost"
          @click="isOpen = false"
        />
        <UButton
          label="រក្សាទុក (Save)"
          icon="i-lucide-save"
          :loading="isSaving"
          @click="save"
        />
      </div>
    </template>
  </UModal>
</template>
