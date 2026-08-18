<template>
  <div class="grid grid-cols-1 gap-4 h-full col-span-1 md:col-span-4">
    <UCard class="col-span-1 flex-1 w-full">
      <template #header>
        <div class="font-semibold flex items-center">
          <UIcon name="i-lucide-calendar-days" size="30" class="text-primary-500" />
          <span class="ml-2"> {{ dept === 'IPD' ? t('visit.admissionInfo') : t('visit.info') }}</span>
        </div>
      </template>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="khmer-label block text-sm mb-1 font-bold text-slate-700">{{ t('visit.visitNo')
          }}</label>
          <UInput
            type="text"
            class="w-full"
            :model-value="visitId"
            placeholder="C-002688"
            icon="i-lucide-file-text"
            readonly
          />
        </div>
        <div>
          <label class="khmer-label block text-sm mb-1 font-bold text-slate-700">{{ t('visit.date') }}</label>
          <UInput type="datetime-local" class="w-full" :value="new Date().toISOString().slice(0, 16)" />
        </div>

        <!-- IPD Dates -->
        <template v-if="dept === 'IPD'">
          <div class="col-span-1">
            <label class="khmer-label block text-sm mb-1 font-bold text-emerald-600">
              Date In / ថ្ងៃចូល
            </label>
            <UDateInput
              :model-value="dateIn"
              icon="i-lucide-log-in"
              color="success"
              @update:model-value="$emit('update:dateIn', $event)"
            />
          </div>
          <div class="col-span-1">
            <label class="khmer-label block text-sm mb-1 font-bold text-rose-600">
              Date Out / ថ្ងៃចេញ
            </label>
            <UDateInput
              :model-value="dateOut"
              icon="i-lucide-log-out"
              color="error"
              @update:model-value="$emit('update:dateOut', $event)"
            />
          </div>
        </template>

        <div class="hidden">
          <label class="khmer-label block text-sm mb-1 font-bold">{{ t('visit.department') }}</label>
          <USelect :options="['OPD', 'IPD']" class="w-full" :model-value="'OPD'" />
        </div>
        <div class="hidden">
          <label class="khmer-label block text-sm mb-1 font-bold">{{ t('visit.refNo') }}</label>
          <UInput type="text" class="w-full" icon="i-lucide-hash" />
        </div>
      </div>
    </UCard>
    <UCard class="col-span-1 flex-1 w-full">
      <template #header>
        <div class="font-semibold flex items-center">
          <UIcon size="30" name="i-lucide-stethoscope" class="text-primary-500" />
          <span class="ml-2"> {{ t('visit.doctor') }}</span>
        </div>
      </template>
      <USelectMenu
        v-model="selectedDoctor"
        class="w-full"
        :items="doctorOptions"
        label-key="label"
        value-key="value"
        placeholder="គ្រូពេទ្យព្យាបាល"
        icon="i-lucide-stethoscope"
      />
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ref, onMounted, computed } from 'vue'

const { t } = useI18n()
const props = defineProps<{
  dept?: string
  visitId?: string
  doctorId?: string
  dateIn?: string
  dateOut?: string
}>()

const emit = defineEmits<{
  (e: 'update:doctorId', value: string): void
  (e: 'update:dateIn', value: string): void
  (e: 'update:dateOut', value: string): void
}>()

const { staff, fetchStaff } = useStaff()

onMounted(() => {
  fetchStaff('Doctor')
})

const doctorOptions = computed(() => staff.value.map(s => ({
  label: s.nameEn + (s.nameKh ? ` / ${s.nameKh}` : ''),
  value: s._id
})))

const selectedDoctor = computed({
  get: () => props.doctorId,
  set: val => emit('update:doctorId', val || '')
})
</script>

<style scoped>
.font-khmer {
    font-family: 'Battambang', serif;
    font-size: 11pt;
}
</style>
