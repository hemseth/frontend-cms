<script setup lang="ts">
import { ref, computed } from 'vue'

/** Shifts: times, breaks, grace and overtime threshold per clinic (GET/POST/PUT /shifts). */
export interface ShiftBreakRow { name?: string, start: string, end: string, paid?: boolean }
export interface ShiftRow {
  _id?: string
  code: string
  nameEn: string
  nameKh?: string
  type: string
  startTime: string
  endTime: string
  breaks: ShiftBreakRow[]
  graceMinutes: number
  earlyLeaveGraceMinutes: number
  overtimeAfterMinutes: number
  status: 'active' | 'inactive'
}

const emit = defineEmits<{ changed: [] }>()
const { t, locale } = useI18n()
const toast = useToast()
const auth = useAuth()
const canEdit = computed(() => auth.can('attendance', 'update'))

const { data, refresh, status } = await useAsyncData('hr-shifts', () => $api<{ data: ShiftRow[] }>('/shifts'), { default: () => ({ data: [] }) })
const shifts = computed(() => (data.value as { data?: ShiftRow[] })?.data || [])

const TYPES = ['morning', 'afternoon', 'evening', 'night', 'rotating', 'split', 'custom']
const typeOptions = computed(() => TYPES.map(value => ({ label: t(`hr.shift.type.${value}`), value })))
const open = ref(false)
const saving = ref(false)
const blank = (): ShiftRow => ({ code: '', nameEn: '', nameKh: '', type: 'morning', startTime: '07:30', endTime: '17:00', breaks: [{ name: 'Lunch', start: '12:00', end: '13:00' }], graceMinutes: 5, earlyLeaveGraceMinutes: 0, overtimeAfterMinutes: 15, status: 'active' })
const form = ref<ShiftRow>(blank())
const overnight = computed(() => form.value.endTime <= form.value.startTime)

function edit(row?: ShiftRow) {
  form.value = row ? { ...row, breaks: row.breaks.map(b => ({ ...b })) } : blank()
  open.value = true
}

async function save() {
  saving.value = true
  try {
    const { _id, ...body } = form.value
    const payload = { ...body, nameKh: body.nameKh || undefined, breaks: body.breaks.filter(b => b.start && b.end) }
    if (_id) await $api(`/shifts/${_id}`, { method: 'PUT', body: payload })
    else await $api('/shifts', { method: 'POST', body: payload })
    open.value = false
    await refresh()
    emit('changed')
  } catch (error) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(error, t('messages.errorOccurred')), color: 'error' })
  } finally {
    saving.value = false
  }
}

async function toggle(row: ShiftRow) {
  try {
    await $api(`/shifts/${row._id}`, { method: 'PUT', body: { status: row.status === 'active' ? 'inactive' : 'active' } })
    await refresh()
    emit('changed')
  } catch (error) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(error, t('messages.errorOccurred')), color: 'error' })
  }
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <p class="text-sm text-muted">
        {{ t('hr.shift.help') }}
      </p>
      <UButton
        v-if="canEdit"
        icon="i-lucide-plus"
        :label="t('hr.shift.add')"
        @click="edit()"
      />
    </div>
    <p v-if="status === 'pending'" class="text-sm text-muted">
      {{ t('common.loading') }}
    </p>
    <p v-else-if="!shifts.length" class="text-sm text-muted">
      {{ t('hr.shift.none') }}
    </p>
    <ul v-else class="divide-y divide-default rounded-lg border border-default">
      <li
        v-for="row in shifts"
        :key="row._id"
        class="flex flex-wrap items-center gap-3 px-3 py-2"
        :class="row.status === 'inactive' ? 'opacity-60' : ''"
      >
        <UBadge color="neutral" variant="outline">
          {{ row.code }}
        </UBadge>
        <span class="font-medium">{{ locale === 'km' ? row.nameKh || row.nameEn : row.nameEn }}</span>
        <span class="text-sm">{{ row.startTime }}–{{ row.endTime }}<span v-if="row.endTime <= row.startTime" class="text-muted"> ({{ t('hr.shift.overnight') }})</span></span>
        <span class="text-xs text-muted">{{ row.breaks.map(b => `${b.name || t('hr.attendance.break')} ${b.start}–${b.end}`).join(' · ') }}</span>
        <div v-if="canEdit" class="ml-auto flex gap-1">
          <UButton
            size="xs"
            variant="ghost"
            icon="i-lucide-pencil"
            :aria-label="t('common.edit')"
            @click="edit(row)"
          />
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            :label="row.status === 'active' ? t('hr.shift.deactivate') : t('hr.shift.activate')"
            @click="toggle(row)"
          />
        </div>
      </li>
    </ul>

    <UModal v-model:open="open" :title="form._id ? t('hr.shift.edit') : t('hr.shift.add')" :ui="{ content: 'sm:max-w-2xl' }">
      <template #body>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
          <UFormField :label="t('hr.shift.code')" required>
            <UInput v-model="form.code" placeholder="DAY" class="w-full" />
          </UFormField>
          <UFormField :label="t('common.nameEn')" required>
            <UInput v-model="form.nameEn" class="w-full" />
          </UFormField>
          <UFormField :label="t('common.nameKh')">
            <UInput v-model="form.nameKh" class="w-full" />
          </UFormField>
          <UFormField :label="t('hr.shift.typeLabel')">
            <USelect v-model="form.type" :items="typeOptions" class="w-full" />
          </UFormField>
          <UFormField :label="t('hr.shift.start')" required>
            <UInput v-model="form.startTime" type="time" class="w-full" />
          </UFormField>
          <UFormField :label="t('hr.shift.end')" required :help="overnight ? t('hr.shift.overnightHelp') : undefined">
            <UInput v-model="form.endTime" type="time" class="w-full" />
          </UFormField>
          <UFormField :label="t('hr.shift.grace')" :help="t('hr.shift.graceHelp')">
            <UInput
              v-model.number="form.graceMinutes"
              type="number"
              min="0"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('hr.shift.earlyGrace')">
            <UInput
              v-model.number="form.earlyLeaveGraceMinutes"
              type="number"
              min="0"
              class="w-full"
            />
          </UFormField>
          <UFormField :label="t('hr.shift.overtimeAfter')" :help="t('hr.shift.overtimeAfterHelp')">
            <UInput
              v-model.number="form.overtimeAfterMinutes"
              type="number"
              min="0"
              class="w-full"
            />
          </UFormField>
        </div>
        <div class="mt-4 space-y-2">
          <p class="text-sm font-medium">
            {{ t('hr.attendance.breaks') }}
          </p>
          <div v-for="(b, i) in form.breaks" :key="i" class="flex flex-wrap items-end gap-2">
            <UFormField :label="t('hr.shift.breakName')">
              <UInput v-model="b.name" class="w-36" />
            </UFormField>
            <UFormField :label="t('hr.shift.start')">
              <UInput v-model="b.start" type="time" />
            </UFormField>
            <UFormField :label="t('hr.shift.end')">
              <UInput v-model="b.end" type="time" />
            </UFormField>
            <UCheckbox v-model="b.paid" :label="t('hr.shift.paidBreak')" class="mb-2" />
            <UButton
              size="xs"
              color="error"
              variant="ghost"
              icon="i-lucide-x"
              class="mb-1"
              :aria-label="t('common.delete')"
              @click="form.breaks.splice(i, 1)"
            />
          </div>
          <UButton
            size="xs"
            variant="soft"
            icon="i-lucide-plus"
            :label="t('hr.shift.addBreak')"
            @click="form.breaks.push({ name: '', start: '', end: '' })"
          />
        </div>
      </template>
      <template #footer>
        <div class="flex w-full justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            :label="t('common.cancel')"
            @click="open = false"
          />
          <UButton :loading="saving" :label="t('common.save')" @click="save" />
        </div>
      </template>
    </UModal>
  </div>
</template>
