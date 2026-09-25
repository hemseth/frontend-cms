<template>
  <UModal
    v-model:open="isOpen"
    :title="`បញ្ចូលអ្នកជំងឺចូលសម្រាកព្យាបាល (IPD Admission): គ្រែ ${bed?.bedCode || ''}`"
    :ui="{
      content: 'sm:max-w-xl'
    }"
  >
    <template #content>
      <div class="p-5 space-y-4 font-khmer bg-default rounded-xl">
        <!-- Modal Header -->
        <div class="flex items-center justify-between pb-3 border-b border-default">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-200 flex items-center justify-center font-bold">
              <UIcon name="i-lucide-bed" class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-base font-bold text-highlighted">
                បញ្ចូលអ្នកជំងឺសម្រាក (Inpatient Bed Admission)
              </h3>
              <p class="text-xs text-muted">
                គ្រែ {{ bed?.bedCode }} • {{ roomName || 'បន្ទប់សម្រាកព្យាបាល' }}
              </p>
            </div>
          </div>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="isOpen = false"
          />
        </div>

        <!-- Form Fields -->
        <div class="space-y-3.5 text-xs">
          <!-- Select Patient -->
          <div>
            <label class="block font-semibold text-default mb-1">
              ជ្រើសរើសអ្នកជំងឺ (Select Patient) *
            </label>
            <USelectMenu
              v-model="selectedPatient"
              :items="patientOptions"
              label-key="label"
              placeholder="ស្វែងរកតាមឈ្មោះ ឬលេខកូដអ្នកជំងឺ..."
              class="w-full"
              size="sm"
            />
          </div>

          <!-- Admitting Doctor -->
          <div>
            <label class="block font-semibold text-default mb-1">
              វេជ្ជបណ្ឌិតទទួលបន្ទុក (Attending Doctor) *
            </label>
            <USelectMenu
              v-model="selectedDoctor"
              :items="doctorOptions"
              label-key="label"
              placeholder="ជ្រើសរើសវេជ្ជបណ្ឌិត..."
              class="w-full"
              size="sm"
            />
          </div>

          <!-- Admission Date & Time -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-default mb-1">
                ថ្ងៃចូលសម្រាក (Date In) *
              </label>
              <UInput
                v-model="form.admissionDate"
                type="date"
                size="sm"
                class="w-full"
              />
            </div>
            <div>
              <label class="block font-semibold text-default mb-1">
                ថ្លៃគ្រែប្រចាំថ្ងៃ (Daily Rate $)
              </label>
              <UInput
                v-model.number="form.dailyRate"
                type="number"
                min="0"
                size="sm"
                class="w-full"
                placeholder="20"
              />
            </div>
          </div>

          <!-- Admission Reason / Chief Complaint -->
          <div>
            <label class="block font-semibold text-default mb-1">
              មូលហេតុចូលសម្រាក (Admission Reason) *
            </label>
            <UTextarea
              v-model="form.admissionReason"
              placeholder="បញ្ជាក់រោគសញ្ញា ឬមូលហេតុនៃការសម្រាកព្យាបាល..."
              :rows="2"
              size="sm"
              class="w-full"
            />
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="flex items-center justify-end gap-2 pt-3 border-t border-default">
          <UButton
            label="បោះបង់ (Cancel)"
            color="neutral"
            variant="outline"
            size="sm"
            @click="isOpen = false"
          />
          <UButton
            label="បញ្ជាក់ការចូលសម្រាក (Confirm Admit)"
            icon="i-lucide-check"
            color="primary"
            size="sm"
            :loading="isSubmitting"
            @click="submitAdmission"
          />
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  open?: boolean
  bed?: any
  roomName?: string
  patientId?: string
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'admitted'): void
}>()

const toast = useToast()

const isOpen = computed({
  get: () => props.open ?? false,
  set: val => emit('update:open', val)
})

const isSubmitting = ref(false)
const selectedPatient = ref<any>(null)
const selectedDoctor = ref<any>(null)
const patientOptions = ref<any[]>([])
const doctorOptions = ref<any[]>([])

const form = ref({
  admissionDate: new Date().toISOString().split('T')[0],
  dailyRate: 20,
  admissionReason: ''
})

async function fetchDependencies() {
  try {
    const [patRes, docRes]: any = await Promise.all([
      $api('/patients?limit=100'),
      $api('/staff?role=doctor')
    ])

    const pats = patRes?.data || []
    // A patient sent from OPD may be outside the first page of the list, so fetch it directly.
    if (props.patientId && !pats.some((p: any) => p._id === props.patientId)) {
      const one: any = await $api(`/patients/${props.patientId}`).catch(() => null)
      if (one?.data) pats.unshift(one.data)
    }
    patientOptions.value = pats.map((p: any) => ({
      label: `[P-${String(p.pId || '').padStart(6, '0')}] ${p.nameKh || p.nameEn || p.name} (${p.phone || ''})`,
      value: p._id,
      raw: p
    }))

    const docs = docRes?.data || docRes || []
    doctorOptions.value = docs.map((d: any) => ({
      label: `Dr. ${d.nameKh || d.nameEn || d.name}`,
      value: d._id,
      raw: d
    }))
    selectedPatient.value = props.patientId
      ? patientOptions.value.find(option => option.value === props.patientId) || null
      : null
  } catch (err: any) {
    toast.add({ title: 'Error', description: getApiErrorMessage(err, 'មិនអាចទាញយកអ្នកជំងឺ ឬគ្រូពេទ្យបានទេ (Could not load patients or doctors)'), color: 'error' })
  }
}

watch(isOpen, (val) => {
  if (val) {
    fetchDependencies()
    form.value = {
      admissionDate: new Date().toISOString().split('T')[0],
      dailyRate: 20,
      admissionReason: ''
    }
  }
})

async function submitAdmission() {
  if (!selectedPatient.value) {
    toast.add({ title: 'Error', description: 'សូមជ្រើសរើសអ្នកជំងឺ', color: 'error' })
    return
  }
  if (!form.value.admissionReason.trim()) {
    toast.add({ title: 'Error', description: 'សូមបញ្ចូលមូលហេតុចូលសម្រាក', color: 'error' })
    return
  }

  isSubmitting.value = true
  try {
    await $api('/inpatient/admissions', {
      method: 'POST',
      body: {
        patientId: selectedPatient.value.value || selectedPatient.value,
        bedId: props.bed?._id || props.bed?.bedId,
        roomId: props.bed?.roomId?._id || props.bed?.roomId,
        attendingDoctorId: selectedDoctor.value?.value || selectedDoctor.value,
        admissionDate: form.value.admissionDate,
        admissionReason: form.value.admissionReason,
        dailyRate: form.value.dailyRate
      }
    })

    toast.add({ title: 'Success', description: 'អ្នកជំងឺត្រូវបានបញ្ចូលក្នុងគ្រែសម្រាកដោយជោគជ័យ', color: 'success' })
    isOpen.value = false
    emit('admitted')
  } catch (err: any) {
    toast.add({ title: 'Error', description: getApiErrorMessage(err, 'មិនអាចបញ្ចូលអ្នកជំងឺចូលសម្រាកបានទេ (Admission failed)'), color: 'error' })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.font-khmer {
  font-family: 'Battambang', 'Noto Sans Khmer', serif;
}
</style>
