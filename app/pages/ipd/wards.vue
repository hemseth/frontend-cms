<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

type Kind = 'ward' | 'room' | 'bed'

const { t } = useI18n()
const toast = useToast()
const auth = useAuth()

const wards = ref<any[]>([])
const rooms = ref<any[]>([])
const beds = ref<any[]>([])
const isLoading = ref(true)
const loadError = ref('')

const canWriteRooms = computed(() => auth.can('room', 'create'))
const canWriteBeds = computed(() => auth.can('bed', 'create'))

const WARD_CATEGORIES = ['GENERAL', 'ICU', 'MATERNITY', 'SURGICAL', 'PEDIATRIC', 'EMERGENCY', 'VIP']
const ROOM_TYPES = ['GENERAL', 'PRIVATE', 'VIP', 'ICU', 'ISOLATION', 'OBSERVATION']
const BED_TYPES = ['STANDARD', 'ELECTRIC', 'ICU', 'PEDIATRIC', 'DELIVERY', 'STRETCHER']
// "occupied" is left out on purpose: only admission, transfer and discharge change it.
const BED_STATUSES = ['available', 'reserved', 'cleaning', 'maintenance', 'blocked']
const AREA_STATUSES = ['active', 'inactive', 'maintenance']

const options = (values: string[], prefix: string) => values.map(value => ({ label: t(`${prefix}.${value}`), value }))
const areaStatusOptions = computed(() => AREA_STATUSES.map(value => ({
  label: value === 'maintenance' ? t('inpatient.setup.bedStatus.maintenance') : t(`common.${value}`),
  value
})))

const idOf = (ref: any) => String(ref?._id || ref || '')
const roomsOf = (wardId: string | null) => rooms.value.filter(r => (wardId ? idOf(r.wardId) === wardId : !r.wardId))
const bedsOf = (roomId: string) => beds.value.filter(b => idOf(b.roomId) === roomId)
const unassignedRooms = computed(() => roomsOf(null))
const isOccupied = (bed: any) => String(bed.status).toLowerCase() === 'occupied'

async function load() {
  isLoading.value = true
  loadError.value = ''
  try {
    const [w, r, b]: any = await Promise.all([$api('/wards'), $api('/rooms'), $api('/beds')])
    wards.value = w?.data || []
    rooms.value = r?.data || []
    beds.value = b?.data || []
  } catch (err: any) {
    loadError.value = getApiErrorMessage(err, t('inpatient.setup.loadFailed'))
  } finally {
    isLoading.value = false
  }
}

onMounted(load)

// One modal serves wards, rooms and beds; `kind` picks the fields and the endpoint.
const modal = ref({ open: false, kind: 'ward' as Kind, id: '' })
const form = ref<Record<string, any>>({})
const isSaving = ref(false)

const ENDPOINTS: Record<Kind, string> = { ward: '/wards', room: '/rooms', bed: '/beds' }

function openModal(kind: Kind, entity?: any, parentId?: string) {
  modal.value = { open: true, kind, id: entity?._id || '' }
  if (kind === 'ward') {
    form.value = {
      wardCode: entity?.wardCode || '',
      nameKh: entity?.nameKh || '',
      nameEn: entity?.nameEn || '',
      category: entity?.category || 'GENERAL',
      floor: entity?.floor ?? 1,
      capacity: entity?.capacity ?? 10,
      dailyRate: entity?.dailyRate ?? 0,
      status: entity?.status || 'active'
    }
  } else if (kind === 'room') {
    form.value = {
      roomCode: entity?.roomCode || '',
      roomNameKh: entity?.roomNameKh || '',
      roomNameEn: entity?.roomNameEn || '',
      wardId: entity ? idOf(entity.wardId) : (parentId || ''),
      roomType: entity?.roomType || 'GENERAL',
      capacity: entity?.capacity ?? 2,
      status: entity?.status || 'active'
    }
  } else {
    form.value = {
      bedCode: entity?.bedCode || '',
      roomId: entity ? idOf(entity.roomId) : (parentId || ''),
      bedType: entity?.bedType || 'STANDARD',
      status: entity ? String(entity.status).toLowerCase() : 'available'
    }
  }
}

const modalTitle = computed(() => t(`inpatient.setup.${modal.value.id ? 'edit' : 'add'}${modal.value.kind[0]!.toUpperCase()}${modal.value.kind.slice(1)}`))
const wardOptions = computed(() => wards.value.map(w => ({ label: `${w.wardCode} • ${w.nameKh}`, value: String(w._id) })))
const roomOptions = computed(() => rooms.value.map(r => ({ label: `${r.roomCode} • ${r.roomNameKh}`, value: String(r._id) })))
const editingOccupiedBed = computed(() => modal.value.kind === 'bed' && modal.value.id && form.value.status === 'occupied')

async function save() {
  const { kind, id } = modal.value
  const body: Record<string, any> = { ...form.value }
  if (kind === 'room' && !body.wardId) delete body.wardId
  // An occupied bed keeps its status; sending it back would be refused by the API anyway.
  if (kind === 'bed' && body.status === 'occupied') delete body.status
  for (const key of ['floor', 'capacity', 'dailyRate']) {
    if (key in body) body[key] = Number(body[key])
  }

  isSaving.value = true
  try {
    await $api(id ? `${ENDPOINTS[kind]}/${id}` : ENDPOINTS[kind], { method: id ? 'PUT' : 'POST', body })
    toast.add({ title: t('common.saved'), color: 'success' })
    modal.value.open = false
    await load()
  } catch (err: any) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(err, t('common.saveFailed')), color: 'error' })
  } finally {
    isSaving.value = false
  }
}

async function remove(kind: Kind, entity: any, label: string) {
  if (!window.confirm(t('inpatient.setup.deleteConfirm', { name: label }))) return
  try {
    await $api(`${ENDPOINTS[kind]}/${entity._id}`, { method: 'DELETE' })
    toast.add({ title: t('inpatient.setup.deleted'), color: 'success' })
    await load()
  } catch (err: any) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(err, t('inpatient.setup.deleteFailed')), color: 'error' })
  }
}

function bedBadgeColor(status: string) {
  const s = String(status).toLowerCase()
  if (s === 'available') return 'success'
  if (s === 'occupied') return 'error'
  if (s === 'cleaning' || s === 'reserved') return 'warning'
  return 'neutral'
}
</script>

<template>
  <div class="space-y-6 p-4">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold flex items-center gap-2">
          <UIcon name="i-lucide-hospital" class="text-primary-500" />
          {{ t('inpatient.setup.title') }}
        </h1>
        <p class="text-sm text-muted mt-1">
          {{ t('inpatient.setup.subtitle') }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          :label="t('inpatient.bedBoard')"
          icon="i-lucide-layout-grid"
          color="neutral"
          variant="outline"
          to="/inpatient/bed-board"
        />
        <UButton
          v-if="canWriteRooms"
          :label="t('inpatient.setup.addWard')"
          icon="i-lucide-plus"
          @click="openModal('ward')"
        />
      </div>
    </div>

    <div v-if="isLoading" class="py-16 text-center">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto text-primary-500" />
    </div>

    <UAlert
      v-else-if="loadError"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="loadError"
      :actions="[{ label: t('common.refresh'), onClick: load }]"
    />

    <div v-else-if="wards.length === 0 && rooms.length === 0" class="py-16 text-center text-muted space-y-3">
      <UIcon name="i-lucide-hospital" class="w-10 h-10 mx-auto text-dimmed" />
      <p>{{ t('inpatient.setup.noWards') }}</p>
    </div>

    <div v-else class="space-y-6">
      <UCard v-for="ward in [...wards, ...(unassignedRooms.length ? [null] : [])]" :key="ward?._id || 'unassigned'">
        <template #header>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div v-if="ward" class="flex items-center gap-2">
              <UBadge variant="subtle">
                {{ ward.wardCode }}
              </UBadge>
              <span class="font-bold">{{ ward.nameKh }}</span>
              <span v-if="ward.nameEn" class="text-sm text-muted">{{ ward.nameEn }}</span>
              <UBadge color="neutral" variant="outline" size="sm">
                {{ t(`inpatient.setup.wardCategory.${ward.category}`) }}
              </UBadge>
              <UBadge
                v-if="ward.status !== 'active'"
                color="warning"
                variant="subtle"
                size="sm"
              >
                {{ areaStatusOptions.find(o => o.value === ward.status)?.label }}
              </UBadge>
            </div>
            <span v-else class="font-bold text-toned">{{ t('inpatient.setup.unassignedRooms') }}</span>

            <div v-if="canWriteRooms" class="flex items-center gap-1">
              <UButton
                size="xs"
                icon="i-lucide-plus"
                :label="t('inpatient.setup.addRoom')"
                variant="soft"
                @click="openModal('room', undefined, ward?._id)"
              />
              <template v-if="ward">
                <UButton
                  size="xs"
                  icon="i-lucide-pencil"
                  color="neutral"
                  variant="ghost"
                  :aria-label="t('inpatient.setup.editWard')"
                  @click="openModal('ward', ward)"
                />
                <UButton
                  size="xs"
                  icon="i-lucide-trash-2"
                  color="error"
                  variant="ghost"
                  :aria-label="t('common.delete')"
                  @click="remove('ward', ward, ward.nameKh)"
                />
              </template>
            </div>
          </div>
        </template>

        <p v-if="roomsOf(ward ? String(ward._id) : null).length === 0" class="text-sm text-muted">
          {{ t('inpatient.setup.noRooms') }}
        </p>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div
            v-for="room in roomsOf(ward ? String(ward._id) : null)"
            :key="room._id"
            class="rounded-lg border border-default p-3 space-y-3"
          >
            <div class="flex items-center justify-between gap-2">
              <div>
                <span class="font-semibold">{{ room.roomCode }} • {{ room.roomNameKh }}</span>
                <p class="text-xs text-muted">
                  {{ t(`inpatient.setup.roomType.${room.roomType}`) }} • {{ t('inpatient.setup.bedsCount', { count: bedsOf(String(room._id)).length }) }}
                </p>
              </div>
              <div class="flex items-center gap-1">
                <UButton
                  v-if="canWriteBeds"
                  size="xs"
                  icon="i-lucide-plus"
                  :label="t('inpatient.setup.addBed')"
                  variant="soft"
                  @click="openModal('bed', undefined, room._id)"
                />
                <template v-if="canWriteRooms">
                  <UButton
                    size="xs"
                    icon="i-lucide-pencil"
                    color="neutral"
                    variant="ghost"
                    :aria-label="t('inpatient.setup.editRoom')"
                    @click="openModal('room', room)"
                  />
                  <UButton
                    size="xs"
                    icon="i-lucide-trash-2"
                    color="error"
                    variant="ghost"
                    :aria-label="t('common.delete')"
                    @click="remove('room', room, room.roomCode)"
                  />
                </template>
              </div>
            </div>

            <p v-if="bedsOf(String(room._id)).length === 0" class="text-xs text-muted">
              {{ t('inpatient.setup.noBeds') }}
            </p>
            <div v-else class="flex flex-wrap gap-2">
              <div
                v-for="bed in bedsOf(String(room._id))"
                :key="bed._id"
                class="flex items-center gap-1 rounded-md border border-default pl-2 pr-1 py-1 text-sm"
              >
                <span class="font-medium">{{ bed.bedCode }}</span>
                <UBadge :color="bedBadgeColor(bed.status)" variant="subtle" size="sm">
                  {{ t(`inpatient.setup.bedStatus.${String(bed.status).toLowerCase()}`) }}
                </UBadge>
                <template v-if="canWriteBeds">
                  <UButton
                    size="xs"
                    icon="i-lucide-pencil"
                    color="neutral"
                    variant="ghost"
                    :aria-label="t('inpatient.setup.editBed')"
                    @click="openModal('bed', bed)"
                  />
                  <UButton
                    size="xs"
                    icon="i-lucide-trash-2"
                    color="error"
                    variant="ghost"
                    :disabled="isOccupied(bed)"
                    :aria-label="t('common.delete')"
                    @click="remove('bed', bed, bed.bedCode)"
                  />
                </template>
              </div>
            </div>
          </div>
        </div>
      </UCard>
    </div>

    <UModal v-model:open="modal.open" :title="modalTitle">
      <template #body>
        <div class="space-y-3">
          <template v-if="modal.kind === 'ward'">
            <div class="grid grid-cols-2 gap-3">
              <UFormField :label="t('inpatient.setup.code')" required>
                <UInput v-model="form.wardCode" class="w-full" />
              </UFormField>
              <UFormField :label="t('inpatient.setup.category')">
                <USelect v-model="form.category" :items="options(WARD_CATEGORIES, 'inpatient.setup.wardCategory')" class="w-full" />
              </UFormField>
            </div>
            <UFormField :label="t('inpatient.setup.nameKh')" required>
              <UInput v-model="form.nameKh" class="w-full" />
            </UFormField>
            <UFormField :label="t('inpatient.setup.nameEn')">
              <UInput v-model="form.nameEn" class="w-full" />
            </UFormField>
            <div class="grid grid-cols-3 gap-3">
              <UFormField :label="t('inpatient.setup.floor')">
                <UInput v-model="form.floor" type="number" class="w-full" />
              </UFormField>
              <UFormField :label="t('inpatient.setup.capacity')">
                <UInput
                  v-model="form.capacity"
                  type="number"
                  min="1"
                  class="w-full"
                />
              </UFormField>
              <UFormField :label="t('inpatient.setup.dailyRate')">
                <UInput
                  v-model="form.dailyRate"
                  type="number"
                  min="0"
                  step="0.01"
                  class="w-full"
                />
              </UFormField>
            </div>
            <UFormField :label="t('common.status')">
              <USelect v-model="form.status" :items="areaStatusOptions" class="w-full" />
            </UFormField>
          </template>

          <template v-else-if="modal.kind === 'room'">
            <div class="grid grid-cols-2 gap-3">
              <UFormField :label="t('inpatient.setup.code')" required>
                <UInput v-model="form.roomCode" class="w-full" />
              </UFormField>
              <UFormField :label="t('inpatient.setup.roomTypeLabel')">
                <USelect v-model="form.roomType" :items="options(ROOM_TYPES, 'inpatient.setup.roomType')" class="w-full" />
              </UFormField>
            </div>
            <UFormField :label="t('inpatient.setup.nameKh')" required>
              <UInput v-model="form.roomNameKh" class="w-full" />
            </UFormField>
            <UFormField :label="t('inpatient.setup.nameEn')">
              <UInput v-model="form.roomNameEn" class="w-full" />
            </UFormField>
            <UFormField :label="t('inpatient.setup.ward')">
              <USelect v-model="form.wardId" :items="wardOptions" class="w-full" />
            </UFormField>
            <div class="grid grid-cols-2 gap-3">
              <UFormField :label="t('inpatient.setup.capacity')">
                <UInput
                  v-model="form.capacity"
                  type="number"
                  min="1"
                  class="w-full"
                />
              </UFormField>
              <UFormField :label="t('common.status')">
                <USelect v-model="form.status" :items="areaStatusOptions" class="w-full" />
              </UFormField>
            </div>
          </template>

          <template v-else>
            <UFormField :label="t('inpatient.setup.code')" required>
              <UInput v-model="form.bedCode" class="w-full" />
            </UFormField>
            <UFormField :label="t('inpatient.setup.room')" required>
              <USelect
                v-model="form.roomId"
                :items="roomOptions"
                :disabled="Boolean(editingOccupiedBed)"
                class="w-full"
              />
            </UFormField>
            <div class="grid grid-cols-2 gap-3">
              <UFormField :label="t('inpatient.setup.bedTypeLabel')">
                <USelect v-model="form.bedType" :items="options(BED_TYPES, 'inpatient.setup.bedType')" class="w-full" />
              </UFormField>
              <UFormField :label="t('common.status')" :help="editingOccupiedBed ? t('inpatient.setup.occupiedHint') : undefined">
                <USelect
                  v-model="form.status"
                  :items="options(editingOccupiedBed ? ['occupied'] : BED_STATUSES, 'inpatient.setup.bedStatus')"
                  :disabled="Boolean(editingOccupiedBed)"
                  class="w-full"
                />
              </UFormField>
            </div>
          </template>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            :label="t('common.cancel')"
            color="neutral"
            variant="ghost"
            @click="modal.open = false"
          />
          <UButton
            :label="t('common.save')"
            icon="i-lucide-save"
            :loading="isSaving"
            @click="save"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
