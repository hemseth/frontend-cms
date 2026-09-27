<script setup lang="ts">
import { ref, computed } from 'vue'
import type { LeaveTypeRow } from '~/types/hrLeave'

/**
 * New leave or overtime request. With `staffOptions` HR picks the staff member; without, it is the
 * signed-in person's own request. Emits the body; the parent sends it.
 */
const props = defineProps<{
  kind: 'leave' | 'overtime'
  types?: LeaveTypeRow[]
  staffOptions?: Array<{ label: string, value: string }>
  busy?: boolean
}>()
const emit = defineEmits<{ submit: [body: Record<string, unknown>] }>()
const { t, locale } = useI18n()

const today = clinicToday()
const form = ref({ staffId: '', leaveTypeId: '', fromDate: today, toDate: today, halfDay: 'none', date: today, startTime: '17:00', endTime: '19:00', type: 'normal', reason: '' })
const typeOptions = computed(() => (props.types || []).map(x => ({ label: `${locale.value === 'km' ? x.nameKh || x.nameEn : x.nameEn}${x.payPercent < 100 ? ` · ${x.payPercent}%` : ''}`, value: x._id })))
const halfOptions = computed(() => ['none', 'am', 'pm'].map(value => ({ label: t(`hr.leave.half.${value}`), value })))
const otTypeOptions = computed(() => ['normal', 'weekend', 'holiday', 'night', 'emergency'].map(value => ({ label: t(`hr.ot.type.${value}`), value })))
const selectedType = computed(() => props.types?.find(x => x._id === form.value.leaveTypeId))

function submit() {
  const f = form.value
  const staff = props.staffOptions ? { staffId: f.staffId } : {}
  const reason = f.reason.trim() ? { reason: f.reason.trim() } : {}
  if (props.kind === 'leave') {
    emit('submit', { ...staff, leaveTypeId: f.leaveTypeId, fromDate: f.fromDate, toDate: f.toDate < f.fromDate ? f.fromDate : f.toDate, ...(f.fromDate === f.toDate && f.halfDay !== 'none' ? { halfDay: f.halfDay } : {}), ...reason })
  } else {
    emit('submit', { ...staff, date: f.date, startTime: f.startTime, endTime: f.endTime, type: f.type, ...reason })
  }
}
const ready = computed(() => (!props.staffOptions || form.value.staffId) && (props.kind === 'overtime' || form.value.leaveTypeId))
</script>

<template>
  <div class="grid grid-cols-1 gap-3 md:grid-cols-4">
    <UFormField
      v-if="staffOptions"
      :label="t('hr.employee')"
      required
      class="md:col-span-2"
    >
      <USelectMenu
        v-model="form.staffId"
        :items="staffOptions"
        value-key="value"
        :placeholder="t('common.select')"
        class="w-full"
      />
    </UFormField>
    <template v-if="kind === 'leave'">
      <UFormField
        :label="t('hr.leave.type')"
        required
        class="md:col-span-2"
        :help="selectedType?.requiresDocument ? t('hr.leave.documentNeeded') : undefined"
      >
        <USelect
          v-model="form.leaveTypeId"
          :items="typeOptions"
          :placeholder="t('common.select')"
          class="w-full"
        />
      </UFormField>
      <UFormField :label="t('hr.leave.from')" required>
        <UInput v-model="form.fromDate" type="date" class="w-full" />
      </UFormField>
      <UFormField :label="t('hr.leave.to')" required>
        <UInput
          v-model="form.toDate"
          type="date"
          :min="form.fromDate"
          class="w-full"
        />
      </UFormField>
      <UFormField :label="t('hr.leave.halfDay')">
        <USelect
          v-model="form.halfDay"
          :items="halfOptions"
          :disabled="form.fromDate !== form.toDate"
          class="w-full"
        />
      </UFormField>
    </template>
    <template v-else>
      <UFormField :label="t('hr.ot.date')" required>
        <UInput v-model="form.date" type="date" class="w-full" />
      </UFormField>
      <UFormField :label="t('hr.shift.start')" required>
        <UInput v-model="form.startTime" type="time" class="w-full" />
      </UFormField>
      <UFormField :label="t('hr.shift.end')" required :help="form.endTime <= form.startTime ? t('hr.shift.overnightHelp') : undefined">
        <UInput v-model="form.endTime" type="time" class="w-full" />
      </UFormField>
      <UFormField :label="t('hr.ot.typeLabel')">
        <USelect v-model="form.type" :items="otTypeOptions" class="w-full" />
      </UFormField>
    </template>
    <UFormField :label="t('hr.leave.reason')" class="md:col-span-3">
      <UInput v-model="form.reason" class="w-full" />
    </UFormField>
    <div class="flex items-end">
      <UButton
        class="w-full justify-center"
        icon="i-lucide-send"
        :disabled="!ready"
        :loading="busy"
        :label="t('hr.leave.submit')"
        @click="submit"
      />
    </div>
  </div>
</template>
