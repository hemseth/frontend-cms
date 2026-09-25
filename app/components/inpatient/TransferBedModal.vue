<template>
  <UModal
    v-model:open="isOpen"
    :title="`ផ្ទេរគ្រែ / សាលអ្នកជំងឺ (Transfer Bed): ${admission?.patient?.name || ''}`"
    :ui="{
      content: 'sm:max-w-xl'
    }"
  >
    <template #content>
      <div class="p-5 space-y-4 font-khmer bg-default rounded-xl">
        <!-- Header -->
        <div class="flex items-center justify-between pb-3 border-b border-default">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center font-bold">
              <UIcon name="i-lucide-arrow-left-right" class="w-5 h-5" />
            </div>
            <div>
              <h3 class="text-base font-bold text-highlighted">
                ផ្ទេរគ្រែ / សាលសម្រាកព្យាបាល (Bed & Ward Transfer)
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

        <!-- Current Location Card -->
        <div class="p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 text-xs space-y-1">
          <span class="font-bold text-amber-800 dark:text-amber-300">📍 ទីតាំងបច្ចុប្បន្ន (Current Location):</span>
          <div class="flex flex-wrap items-center gap-3 text-default">
            <span>សាល៖ <b>{{ admission?.location?.wardNameKh || '-' }}</b></span>
            <span>បន្ទប់៖ <b>{{ admission?.location?.roomCode || '-' }}</b></span>
            <span>គ្រែ៖ <b class="text-rose-600">{{ admission?.location?.bedCode || '-' }}</b></span>
            <span>ស្នាក់នៅបាន៖ <b>{{ admission?.lengthOfStayDays || 1 }} ថ្ងៃ</b></span>
          </div>
        </div>

        <!-- Destination Selection Form -->
        <div class="space-y-3 text-xs">
          <!-- Select Ward -->
          <div>
            <label class="block font-semibold text-default mb-1">
              សាលគោលដៅ (Destination Ward) *
            </label>
            <select
              v-model="selectedWardId"
              class="w-full p-2 border border-default rounded-lg bg-default text-xs"
              @change="onWardChange"
            >
              <option value="" disabled>
                -- ជ្រើសរើសសាល --
              </option>
              <option v-for="w in wards" :key="w._id" :value="w._id">
                {{ w.wardCode }} • {{ w.nameKh }} (ជាន់ទី {{ w.floor || 1 }})
              </option>
            </select>
          </div>

          <!-- Select Room -->
          <div>
            <label class="block font-semibold text-default mb-1">
              បន្ទប់គោលដៅ (Destination Room) *
            </label>
            <select
              v-model="selectedRoomId"
              class="w-full p-2 border border-default rounded-lg bg-default text-xs"
              @change="onRoomChange"
            >
              <option value="" disabled>
                -- ជ្រើសរើសបន្ទប់ --
              </option>
              <option v-for="r in availableRooms" :key="r._id" :value="r._id">
                {{ r.roomCode }} • {{ r.roomNameKh || r.roomCode }}
              </option>
            </select>
          </div>

          <!-- Select Bed -->
          <div>
            <label class="block font-semibold text-default mb-1">
              គ្រែទំនេរគោលដៅ (Available Destination Bed) *
            </label>
            <select
              v-model="selectedBedId"
              class="w-full p-2 border border-default rounded-lg bg-default text-xs font-bold text-primary-600"
            >
              <option value="" disabled>
                -- ជ្រើសរើសគ្រែទំនេរ --
              </option>
              <option v-for="b in availableBeds" :key="b._id" :value="b._id">
                គ្រែ {{ b.bedCode }} ({{ b.bedType || 'Standard' }}) — ទំនេរ (Available)
              </option>
            </select>
          </div>

          <!-- Transfer Reason -->
          <div>
            <label class="block font-semibold text-default mb-1">
              មូលហេតុនៃការផ្ទេរ (Transfer Reason) *
            </label>
            <UTextarea
              v-model="reason"
              placeholder="ឧ. ផ្ទេរទៅសាល ICU ដោយសារអាការៈវិវត្តធ្ងន់ធ្ងរ ឬផ្ទេរមកសាលទូទៅវិញ..."
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
            label="បញ្ជាក់ការផ្ទេរ (Confirm Transfer)"
            icon="i-lucide-arrow-left-right"
            color="primary"
            size="sm"
            :loading="isSubmitting"
            @click="submitTransfer"
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
  (e: 'transferred'): void
}>()

const toast = useToast()

const isOpen = computed({
  get: () => props.open ?? false,
  set: val => emit('update:open', val)
})

const isSubmitting = ref(false)
const wards = ref<any[]>([])
const rooms = ref<any[]>([])
const beds = ref<any[]>([])

const selectedWardId = ref('')
const selectedRoomId = ref('')
const selectedBedId = ref('')
const reason = ref('')

async function fetchLocations() {
  try {
    const [wRes, rRes, bRes]: any = await Promise.all([
      $api('/wards'),
      $api('/rooms'),
      $api('/beds')
    ])
    wards.value = wRes?.data || []
    rooms.value = rRes?.data || []
    beds.value = bRes?.data || []
  } catch (err: any) {
    wards.value = []
    rooms.value = []
    beds.value = []
    toast.add({ title: 'Error', description: getApiErrorMessage(err, 'មិនអាចទាញយកសាល បន្ទប់ និងគ្រែបានទេ (Could not load wards, rooms and beds)'), color: 'error' })
  }
}

watch(isOpen, (val) => {
  if (val) {
    fetchLocations()
    selectedWardId.value = ''
    selectedRoomId.value = ''
    selectedBedId.value = ''
    reason.value = ''
  }
})

const availableRooms = computed(() => {
  if (!selectedWardId.value) return rooms.value
  return rooms.value.filter(r => String(r.wardId) === String(selectedWardId.value) || String(r.wardId?._id) === String(selectedWardId.value))
})

const availableBeds = computed(() => {
  return beds.value.filter((b) => {
    const isAvail = String(b.status).toLowerCase() === 'available'
    const matchRoom = !selectedRoomId.value || String(b.roomId) === String(selectedRoomId.value) || String(b.roomId?._id) === String(selectedRoomId.value)
    return isAvail && matchRoom
  })
})

function onWardChange() {
  selectedRoomId.value = ''
  selectedBedId.value = ''
}

function onRoomChange() {
  selectedBedId.value = ''
}

async function submitTransfer() {
  if (!selectedBedId.value) {
    toast.add({ title: 'Error', description: 'សូមជ្រើសរើសគ្រែទំនេរគោលដៅ', color: 'error' })
    return
  }
  if (!reason.value.trim()) {
    toast.add({ title: 'Error', description: 'សូមបញ្ចូលមូលហេតុនៃការផ្ទេរ', color: 'error' })
    return
  }

  isSubmitting.value = true
  try {
    const admId = props.admission?.admissionId || props.admission?._id
    await $api(`/inpatient/admissions/${admId}/transfer`, {
      method: 'POST',
      body: {
        newBedId: selectedBedId.value,
        newWardId: selectedWardId.value || undefined,
        newRoomId: selectedRoomId.value || undefined,
        reason: reason.value
      }
    })

    toast.add({ title: 'Success', description: 'អ្នកជំងឺត្រូវបានផ្ទេរទៅគ្រែថ្មីដោយជោគជ័យ', color: 'success' })
    isOpen.value = false
    emit('transferred')
  } catch (err: any) {
    toast.add({ title: 'Error', description: getApiErrorMessage(err, 'មិនអាចផ្ទេរគ្រែបានទេ (Transfer failed)'), color: 'error' })
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
