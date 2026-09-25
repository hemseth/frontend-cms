<template>
  <UModal
    v-model:open="isOpen"
    :title="`ផ្លាស់ប្តូរគ្រូពេទ្យទទួលបន្ទុក (Change Attending Doctor): ${admission?.patient?.name || ''}`"
    :ui="{
      content: 'sm:max-w-md'
    }"
  >
    <template #content>
      <div class="p-5 space-y-4 font-khmer bg-default rounded-xl">
        <!-- Header -->
        <div class="flex items-center justify-between pb-3 border-b border-default">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-950 text-primary-600 flex items-center justify-center font-bold">
              <UIcon name="i-lucide-user-cog" class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-base font-bold text-highlighted">
                ផ្លាស់ប្តូរគ្រូពេទ្យទទួលខុសត្រូវ
              </h3>
              <p class="text-xs text-muted">
                {{ admission?.admissionNumber }} • {{ admission?.patient?.nameKh || admission?.patient?.name }}
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

        <!-- Current Doctor Box -->
        <div class="p-3 rounded-lg bg-muted border border-default text-xs">
          <span class="text-muted block mb-1">គ្រូពេទ្យទទួលបន្ទុកបច្ចុប្បន្ន (Current Attending Doctor):</span>
          <span class="font-bold text-sm text-highlighted">
            👨‍⚕️ {{ admission?.attendingDoctor?.nameKh || admission?.attendingDoctor?.nameEn || admission?.attendingDoctor?.name || '-' }}
          </span>
        </div>

        <!-- Form -->
        <div class="space-y-3 text-xs">
          <div>
            <label class="block font-semibold text-default mb-1">
              វេជ្ជបណ្ឌិតទទួលបន្ទុកថ្មី (New Attending Doctor) *
            </label>
            <select
              v-model="newDoctorId"
              class="w-full p-2 border border-default rounded-lg bg-default text-xs font-medium"
            >
              <option value="" disabled>
                -- ជ្រើសរើសវេជ្ជបណ្ឌិត --
              </option>
              <option v-for="d in doctors" :key="d._id" :value="d._id">
                Dr. {{ d.nameKh || d.nameEn || d.name }} ({{ d.specialization?.nameKh || 'ទូទៅ' }})
              </option>
            </select>
          </div>

          <div>
            <label class="block font-semibold text-default mb-1">
              មូលហេតុនៃការផ្លាស់ប្តូរ (Reason for Change) *
            </label>
            <UTextarea
              v-model="reason"
              placeholder="ឧ. ផ្លាស់ប្តូរឯកទេសព្យាបាលបេះដូង ឬប្តូរវេនយាម..."
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
            label="បញ្ជាក់ការផ្លាស់ប្តូរ (Confirm Change)"
            icon="i-lucide-check"
            color="primary"
            size="sm"
            :loading="isSubmitting"
            @click="submitChange"
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
  admission?: any
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'changed'): void
}>()

const toast = useToast()

const isOpen = computed({
  get: () => props.open ?? false,
  set: val => emit('update:open', val)
})

const isSubmitting = ref(false)
const doctors = ref<any[]>([])
const newDoctorId = ref('')
const reason = ref('')

async function fetchDoctors() {
  try {
    const res: any = await $api('/staff?role=doctor')
    doctors.value = res?.data || res || []
  } catch (err: any) {
    doctors.value = []
    toast.add({ title: 'Error', description: getApiErrorMessage(err, 'មិនអាចទាញយកបញ្ជីគ្រូពេទ្យបានទេ (Could not load doctors)'), color: 'error' })
  }
}

watch(isOpen, (val) => {
  if (val) {
    fetchDoctors()
    newDoctorId.value = ''
    reason.value = ''
  }
})

async function submitChange() {
  if (!newDoctorId.value) {
    toast.add({ title: 'Error', description: 'សូមជ្រើសរើសវេជ្ជបណ្ឌិតថ្មី', color: 'error' })
    return
  }
  if (!reason.value.trim()) {
    toast.add({ title: 'Error', description: 'សូមបញ្ជាក់មូលហេតុផ្លាស់ប្តូរ', color: 'error' })
    return
  }

  isSubmitting.value = true
  try {
    const admId = props.admission?.admissionId || props.admission?._id
    await $api(`/inpatient/admissions/${admId}/change-attending`, {
      method: 'POST',
      body: {
        newDoctorId: newDoctorId.value,
        reason: reason.value
      }
    })

    toast.add({ title: 'Success', description: 'បានផ្លាស់ប្តូរគ្រូពេទ្យទទួលបន្ទុក និងរក្សាទុកប្រវត្តិ', color: 'success' })
    isOpen.value = false
    emit('changed')
  } catch (err: any) {
    toast.add({ title: 'Error', description: getApiErrorMessage(err, 'មិនអាចផ្លាស់ប្តូរគ្រូពេទ្យបានទេ (Could not change doctor)'), color: 'error' })
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
