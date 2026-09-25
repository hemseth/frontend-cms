<template>
  <UModal
    v-model:open="isOpen"
    :title="`ចេញពីពេទ្យ (Discharge Patient): ${admission?.patient?.name || ''}`"
    :ui="{
      content: 'sm:max-w-2xl'
    }"
  >
    <template #content>
      <div class="p-5 space-y-4 font-khmer bg-default rounded-xl max-h-[85vh] flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between pb-3 border-b border-default shrink-0">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold">
              <UIcon name="i-lucide-log-out" class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-base font-bold text-highlighted">
                ទម្រង់អនុញ្ញាតឱ្យចេញពីមន្ទីរពេទ្យ (Discharge Process)
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

        <!-- Inpatient Summary Card -->
        <div class="p-3 rounded-lg bg-muted border border-default text-xs space-y-1.5 shrink-0">
          <div class="grid grid-cols-2 gap-2 text-default">
            <div>ថ្ងៃចូលសម្រាក៖ <b>{{ formatDate(admission?.admittedAt || admission?.admissionDate) }}</b></div>
            <div>ស្នាក់នៅសរុប៖ <b class="text-primary-600">{{ admission?.lengthOfStayDays || 1 }} ថ្ងៃ</b></div>
            <div>ទីតាំង៖ <b>{{ admission?.location?.wardNameKh }} / គ្រែ {{ admission?.location?.bedCode }}</b></div>
            <div>គ្រូពេទ្យព្យាបាល៖ <b>{{ admission?.attendingDoctor?.name || '-' }}</b></div>
          </div>
        </div>

        <!-- Form Fields -->
        <div class="flex-1 overflow-y-auto space-y-3.5 text-xs pr-1">
          <!-- Discharge Disposition -->
          <div>
            <label class="block font-semibold text-default mb-1">
              លក្ខខណ្ឌចេញពីពេទ្យ (Discharge Disposition) *
            </label>
            <select
              v-model="form.dischargeDisposition"
              class="w-full p-2 border border-default rounded-lg bg-default text-xs font-medium"
            >
              <option value="HOME">
                ជាសះស្បើយ ត្រឡប់ទៅផ្ទះ (Recovered - Home)
              </option>
              <option value="TRANSFER">
                ផ្ទេរទៅមន្ទីរពេទ្យផ្សេង (Transferred to another Hospital)
              </option>
              <option value="REFERRED">
                បញ្ជូនទៅឯកទេសបន្ត (Referred to Specialist)
              </option>
              <option value="LEFT_AGAINST_ADVICE">
                សុំចេញដោយស្ម័គ្រចិត្ត (Left Against Medical Advice)
              </option>
              <option value="DECEASED">
                ទទួលមរណភាព (Deceased)
              </option>
              <option value="OTHER">
                ផ្សេងៗ (Other)
              </option>
            </select>
          </div>

          <!-- Discharge Summary & Course -->
          <div>
            <label class="block font-semibold text-default mb-1">
              សង្ខេបដំណើរវិវត្តនៃការព្យាបាល (Treatment & Clinical Course Summary) *
            </label>
            <UTextarea
              v-model="form.treatmentSummaryKh"
              placeholder="កត់ត្រាសង្ខេបអំពីការព្យាបាល ស្ថានភាពជំងឺ និងលទ្ធផលនៃការសម្រាកព្យាបាល..."
              :rows="3"
              size="sm"
              class="w-full"
            />
          </div>

          <!-- Discharge Medications -->
          <div>
            <label class="block font-semibold text-default mb-1">
              ថ្នាំបន្តលេបនៅផ្ទះ (Discharge Medications)
            </label>
            <UInput
              v-model="form.dischargeMedicationsText"
              placeholder="ឧ. Amoxicillin 500mg (1 គ្រាប់ ព្រឹក-ល្ងាច រយៈពេល ៥ ថ្ងៃ)..."
              size="sm"
              class="w-full"
            />
          </div>

          <!-- Discharge Instructions -->
          <div>
            <label class="block font-semibold text-default mb-1">
              ការណែនាំថែទាំសុខភាពនៅផ្ទះ (Home Care Instructions)
            </label>
            <UTextarea
              v-model="form.dischargeInstructions"
              placeholder="ឧ. ហាមទទួលទានអាហារហឹរ សម្រាកឱ្យបានគ្រប់គ្រាន់ និងពិសាទឹកឱ្យបានច្រើន..."
              :rows="2"
              size="sm"
              class="w-full"
            />
          </div>

          <!-- Follow-up Date -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block font-semibold text-default mb-1">
                ថ្ងៃណាត់ជួបតាមដានបន្ត (Follow-up Date)
              </label>
              <UInput
                v-model="form.followUpDate"
                type="date"
                size="sm"
                class="w-full"
              />
            </div>
            <div>
              <label class="block font-semibold text-default mb-1">
                ស្ថានភាពគ្រែក្រោយចេញ (Bed State)
              </label>
              <div class="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 text-xs font-semibold">
                🧹 គ្រែនឹងប្តូរទៅជា "កំពុងសម្អាត (CLEANING)"
              </div>
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="flex items-center justify-between pt-3 border-t border-default shrink-0">
          <UButton
            label="បោះពុម្ពលិខិតចេញពីពេទ្យ (Print Preview)"
            icon="i-lucide-printer"
            color="neutral"
            variant="outline"
            size="sm"
            @click="openPrintPreview"
          />
          <div class="flex items-center gap-2">
            <UButton
              label="បោះបង់"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="isOpen = false"
            />
            <UButton
              label="បញ្ជាក់ការចេញពីពេទ្យ (Confirm Discharge)"
              icon="i-lucide-check-circle"
              color="primary"
              size="sm"
              :loading="isSubmitting"
              @click="submitDischarge"
            />
          </div>
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
  (e: 'discharged'): void
}>()

const toast = useToast()

const isOpen = computed({
  get: () => props.open ?? false,
  set: val => emit('update:open', val)
})

const isSubmitting = ref(false)

const form = ref({
  dischargeDisposition: 'HOME',
  treatmentSummaryKh: 'អ្នកជំងឺបានជាសះស្បើយពីអាការៈរលាកសួត គ្មានកម្តៅ សញ្ញាជីវិតមានស្ថិរភាពល្អ អនុញ្ញាតឱ្យត្រឡប់ទៅផ្ទះ។',
  dischargeMedicationsText: 'Amoxicillin 500mg 1 tab PO BID x 5 days, Paracetamol 500mg PRN',
  dischargeInstructions: 'សម្រាកឱ្យបានច្រើន ពិសាទឹកក្តៅឧណ្ហៗ និងត្រឡប់មកពិនិត្យតាមការណាត់។',
  followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
})

watch(isOpen, (val) => {
  if (val) {
    form.value = {
      dischargeDisposition: 'HOME',
      treatmentSummaryKh: 'អ្នកជំងឺបានជាសះស្បើយពីអាការៈរលាកសួត គ្មានកម្តៅ សញ្ញាជីវិតមានស្ថិរភាពល្អ អនុញ្ញាតឱ្យត្រឡប់ទៅផ្ទះ។',
      dischargeMedicationsText: 'Amoxicillin 500mg 1 tab PO BID x 5 days, Paracetamol 500mg PRN',
      dischargeInstructions: 'សម្រាកឱ្យបានច្រើន ពិសាទឹកក្តៅឧណ្ហៗ និងត្រឡប់មកពិនិត្យតាមការណាត់។',
      followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }
  }
})

function formatDate(d: any) {
  if (!d) return '-'
  const date = new Date(d)
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
}

function openPrintPreview() {
  const id = props.admission?.admissionId || props.admission?._id
  window.open(`/print/discharge-summary/${id}`, '_blank')
}

async function submitDischarge() {
  isSubmitting.value = true
  try {
    const admId = props.admission?.admissionId || props.admission?._id
    await $api(`/inpatient/admissions/${admId}/discharge`, {
      method: 'POST',
      body: {
        dischargeDisposition: form.value.dischargeDisposition,
        treatmentSummaryKh: form.value.treatmentSummaryKh,
        dischargeInstructions: form.value.dischargeInstructions,
        followUpDate: form.value.followUpDate ? new Date(form.value.followUpDate) : undefined
      }
    })

    toast.add({ title: 'Discharge Complete', description: 'អ្នកជំងឺត្រូវបានអនុញ្ញាតឱ្យចេញពីពេទ្យ និងដោះលែងគ្រែទៅកាន់ Cleaning', color: 'success' })
    isOpen.value = false
    emit('discharged')
  } catch (err: any) {
    toast.add({ title: 'Error', description: getApiErrorMessage(err, 'មិនអាចចេញពីពេទ្យបានទេ (Discharge failed)'), color: 'error' })
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
