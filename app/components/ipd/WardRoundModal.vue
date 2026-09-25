<template>
  <UModal
    v-model:open="isOpen"
    :title="`ការពិនិត្យជុំសាលប្រចាំថ្ងៃ (Daily Ward Round): ${ward?.nameKh || ward?.name || 'សាលសម្រាកព្យាបាល'}`"
    :ui="{
      content: 'sm:max-w-4xl'
    }"
  >
    <template #content>
      <div class="p-5 space-y-4 font-khmer bg-default rounded-xl max-h-[85vh] flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-between pb-3 border-b border-default shrink-0">
          <div class="flex items-center gap-2">
            <div class="w-9 h-9 rounded-lg bg-primary-100 dark:bg-primary-950 text-primary-600 flex items-center justify-center font-bold">
              <UIcon name="i-lucide-stethoscope" class="w-6 h-6" />
            </div>
            <div>
              <h3 class="text-base font-bold text-highlighted">
                ការពិនិត្យជុំសាលប្រចាំថ្ងៃ (Daily Ward Rounds)
              </h3>
              <p class="text-xs text-muted">
                {{ ward?.code }} • {{ ward?.nameKh }} • គ្រូពេទ្យទទួលបន្ទុក៖ {{ ward?.doctorName || 'Dr. Chan Dara' }}
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

        <!-- Patients in this Ward List -->
        <div class="flex-1 overflow-y-auto space-y-4 pr-1">
          <div v-if="patients.length === 0" class="py-12 text-center text-dimmed">
            <UIcon name="i-lucide-user-check" class="w-10 h-10 mx-auto mb-2 text-emerald-500" />
            <p class="text-sm font-bold text-default">គ្មានអ្នកជំងឺសម្រាកក្នុងសាលនេះនៅឡើយទេ</p>
          </div>

          <div
            v-for="(pat, idx) in patients"
            :key="pat._id || idx"
            class="border border-default rounded-xl p-4 bg-muted/50 space-y-3"
          >
            <!-- Patient Top Bar -->
            <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-default">
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded bg-primary-500 text-white font-bold text-xs">
                  គ្រែ {{ pat.bedCode || `W-${idx + 1}` }}
                </span>
                <span class="font-bold text-sm text-highlighted">
                  {{ pat.patientName }} ({{ pat.gender || 'ស្រី' }}, {{ pat.age || '32' }} ឆ្នាំ)
                </span>
                <span class="text-xs text-muted">
                  ID: {{ pat.patientCode || 'P-000123' }}
                </span>
              </div>

              <div class="flex items-center gap-2 text-xs">
                <span class="text-muted">សម្រាកបាន៖ <b class="text-rose-600 font-bold">{{ pat.daysStayed || 3 }} ថ្ងៃ</b></span>
                <UBadge color="primary" variant="subtle" size="xs">
                  {{ pat.status || 'Under Treatment' }}
                </UBadge>
              </div>
            </div>

            <!-- Diagnosis & Current Vitals -->
            <div class="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
              <div class="md:col-span-4 space-y-1">
                <span class="font-semibold text-toned">រោគវិនិច្ឆ័យ (Diagnosis):</span>
                <p class="font-bold text-highlighted">
                  {{ pat.diagnosis || 'J18 • ជំងឺរលាកសួតស្រួចស្រាវ' }}
                </p>
              </div>

              <!-- Vitals Inputs for this round -->
              <div class="md:col-span-8 flex flex-wrap items-center gap-2">
                <div>
                  <span class="text-[10px] text-muted block">BP (mmHg)</span>
                  <input
                    v-model="pat.roundBp"
                    class="w-20 p-1 border rounded text-xs bg-default font-medium"
                    placeholder="120/80"
                  >
                </div>
                <div>
                  <span class="text-[10px] text-muted block">Temp (°C)</span>
                  <input
                    v-model="pat.roundTemp"
                    class="w-16 p-1 border rounded text-xs bg-default font-medium"
                    placeholder="37.0"
                  >
                </div>
                <div>
                  <span class="text-[10px] text-muted block">Pulse (bpm)</span>
                  <input
                    v-model="pat.roundPulse"
                    class="w-16 p-1 border rounded text-xs bg-default font-medium"
                    placeholder="80"
                  >
                </div>
                <div>
                  <span class="text-[10px] text-muted block">SpO₂ (%)</span>
                  <input
                    v-model="pat.roundSpo2"
                    class="w-16 p-1 border rounded text-xs bg-default font-medium"
                    placeholder="98"
                  >
                </div>
              </div>
            </div>

            <!-- Doctor Round Progress Note -->
            <div>
              <label class="block text-xs font-semibold text-default mb-1">
                កំណត់ត្រាពិនិត្យជុំសាល (Doctor's Daily Progress & Prescription Note)
              </label>
              <textarea
                v-model="pat.roundNotes"
                rows="2"
                class="w-full p-2 text-xs border border-default rounded-lg bg-default"
                placeholder="កត់ត្រាអាការៈវិវត្តរបស់អ្នកជំងឺ ការផ្លាស់ប្តូរកម្រិតថ្នាំ ឬការណែនាំបន្ថែម..."
              />
            </div>

            <!-- Quick Action Shortcuts -->
            <div class="flex items-center justify-between pt-2 text-xs border-t border-default">
              <span class="text-muted italic text-[11px]">
                ថ្នាំបច្ចុប្បន្ន៖ {{ pat.currentMeds || 'Ceftriaxone 1g IV + Paracetamol 500mg' }}
              </span>
              <div class="flex items-center gap-1.5">
                <UButton
                  label="ចេញថ្នាំបន្ថែម (Add Rx)"
                  icon="i-lucide-pill"
                  color="primary"
                  variant="soft"
                  size="xs"
                  @click="openAddMedication(pat)"
                />
                <UButton
                  label="ស្នើសុំពិសោធន៍ (Order Lab)"
                  icon="i-lucide-flask-conical"
                  color="neutral"
                  variant="outline"
                  size="xs"
                  @click="openOrderLab(pat)"
                />
                <UButton
                  label="ត្រៀមចេញ (Ready Discharge)"
                  icon="i-lucide-check-circle"
                  color="success"
                  variant="soft"
                  size="xs"
                  @click="markReadyDischarge(pat)"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-2 pt-3 border-t border-default shrink-0">
          <UButton
            label="បិទ (Close)"
            color="neutral"
            variant="outline"
            size="sm"
            @click="isOpen = false"
          />
          <UButton
            label="រក្សាទុកកំណត់ត្រាពិនិត្យជុំសាលទាំងអស់ (Save All Round Notes)"
            icon="i-lucide-save"
            color="primary"
            size="sm"
            :loading="isSaving"
            @click="saveAllRoundNotes"
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
  ward?: any
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

const isSaving = ref(false)
const patients = ref<any[]>([])

function loadWardPatients() {
  // Mock inpatient list in this ward
  patients.value = [
    {
      _id: 'pat_adm_1',
      patientName: 'សុខ សុភា',
      patientCode: 'P-000123',
      gender: 'ស្រី',
      age: 31,
      bedCode: 'W1-01',
      daysStayed: 3,
      diagnosis: 'J18 • ជំងឺរលាកសួតស្រួចស្រាវ (Acute Pneumonia)',
      roundBp: '120/80',
      roundTemp: '37.2',
      roundPulse: '78',
      roundSpo2: '98',
      roundNotes: 'អ្នកជំងឺស្រកកម្តៅច្រើន មិនសូវក្អក អាការៈប្រសើរឡើងជាលំដាប់។ បន្តថ្នាំចាស់ ២ ថ្ងៃទៀត។',
      currentMeds: 'Amoxicillin 500mg + Paracetamol 500mg',
      status: 'Under Treatment'
    },
    {
      _id: 'pat_adm_2',
      patientName: 'ឡុង វិបុល',
      patientCode: 'P-000125',
      gender: 'ប្រុស',
      age: 45,
      bedCode: 'W1-02',
      daysStayed: 5,
      diagnosis: 'K29 • ជំងឺរលាកក្រពះស្រួចស្រាវ (Acute Gastritis)',
      roundBp: '130/85',
      roundTemp: '36.8',
      roundPulse: '82',
      roundSpo2: '99',
      roundNotes: 'បាត់ឈឺចុកពោះ អាចបរិភោគអាហាររាវបានស្រួល ត្រៀមធ្វើ Discharge ថ្ងៃស្អែក។',
      currentMeds: 'Omeprazole 20mg + Antacid Gel',
      status: 'Ready for Discharge'
    }
  ]
}

watch(isOpen, (val) => {
  if (val) {
    loadWardPatients()
  }
})

function openAddMedication(pat: any) {
  toast.add({ title: 'Medication', description: `ចេញថ្នាំបន្ថែមសម្រាប់អ្នកជំងឺ ${pat.patientName}`, color: 'info' })
}

function openOrderLab(pat: any) {
  toast.add({ title: 'Lab Order', description: `បានបញ្ជាធ្វើតេស្តឈាមតាមដានសម្រាប់ ${pat.patientName}`, color: 'info' })
}

function markReadyDischarge(pat: any) {
  pat.status = 'Ready for Discharge'
  toast.add({ title: 'Ready', description: `${pat.patientName} ត្រូវបានកំណត់ថាត្រៀមចេញពីពេទ្យ`, color: 'success' })
}

async function saveAllRoundNotes() {
  isSaving.value = true
  setTimeout(() => {
    isSaving.value = false
    toast.add({ title: 'Success', description: 'បានរក្សាទុកកំណត់ត្រាពិនិត្យជុំសាលប្រចាំថ្ងៃដោយជោគជ័យ', color: 'success' })
    isOpen.value = false
    emit('saved')
  }, 500)
}
</script>

<style scoped>
.font-khmer {
  font-family: 'Battambang', 'Noto Sans Khmer', serif;
}
</style>
