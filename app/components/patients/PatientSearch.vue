<script setup lang="ts">
import { ref, computed, onMounted, reactive, watch } from 'vue'
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import type { Patient } from '~/types/models'

const props = defineProps<{
  open?: boolean
  buttonLabel?: string
  buttonSize?: 'sm' | 'md' | 'lg'
  // optional patient to pre-fill location filters
  patient?: { proCode?: string, disCode?: string, comCode?: string } | null
}>()

const { t } = useI18n()
const emit = defineEmits(['select', 'update:open'])

const patients = ref<Patient[]>([])
const loading = ref(false)
const search = ref('')
const province = ref<string>('')
const district = ref<string>('')
const commune = ref<string>('')
const village = ref<string>('')

// Location items loaded from API
const provinceItems = ref<any[]>([])
const districtItems = ref<any[]>([])
const communeItems = ref<any[]>([])
const villageItems = ref<any[]>([])

// Load location lists
async function loadProvinces() {
  try {
    const res = await $api<{ data: any[] }>('/locations/provinces')
    provinceItems.value = res.data || []
  } catch (err) {
    console.error('Failed to load provinces:', err)
  }
}

async function fetchDistricts(pCode: string) {
  if (!pCode) {
    districtItems.value = []
    return
  }
  try {
    const res = await $api<{ data: any[] }>(`/locations/districts/byProCode/${pCode}`)
    districtItems.value = res.data || []
  } catch (err) {
    console.error('Failed to load districts:', err)
  }
}

async function fetchCommunes(dCode: string) {
  if (!dCode) {
    communeItems.value = []
    return
  }
  try {
    const res = await $api<{ data: any[] }>(`/locations/communes/byDisCode/${dCode}`)
    communeItems.value = res.data || []
  } catch (err) {
    console.error('Failed to load communes:', err)
  }
}

async function fetchVillages(cCode: string) {
  if (!cCode) {
    villageItems.value = []
    return
  }
  try {
    const res = await $api<{ data: any[] }>(`/locations/villages/byComCode/${cCode}`)
    villageItems.value = res.data || []
  } catch (err) {
    console.error('Failed to load villages:', err)
  }
}

// Modal state (supports external v-model or internal trigger)
const internalOpen = ref(false)
const isOpen = computed<boolean>({
  get: () => (typeof props.open === 'undefined' ? internalOpen.value : !!props.open),
  set: (v: boolean) => {
    if (typeof props.open === 'undefined') internalOpen.value = v
    else emit('update:open', v)
  }
})

// watch location changes
watch(province, (newVal) => {
  district.value = ''
  commune.value = ''
  village.value = ''
  if (newVal) fetchDistricts(newVal)
  else districtItems.value = []
})

watch(district, (newVal) => {
  commune.value = ''
  village.value = ''
  if (newVal) fetchCommunes(newVal)
  else communeItems.value = []
})

watch(commune, (newVal) => {
  village.value = ''
  if (newVal) fetchVillages(newVal)
  else villageItems.value = []
})

onMounted(async () => {
  loading.value = true
  try {
    await performSearch()
  } catch (err) {
    console.error('Failed to load patients', err)
    patients.value = []
  } finally {
    loading.value = false
  }

  await loadProvinces()

  if (props.patient) {
    if (props.patient.proCode) {
      province.value = props.patient.proCode
      await fetchDistricts(props.patient.proCode)
      if (props.patient.disCode) {
        district.value = props.patient.disCode
        await fetchCommunes(props.patient.disCode)
        if (props.patient.comCode) commune.value = props.patient.comCode
      }
    }
  }
})

// Server-side search
async function performSearch() {
  loading.value = true
  try {
    const res = await $api<{ data: any | any[] }>(`/patients`, {
      params: {
        search: search.value || undefined,
        proCode: province.value || undefined,
        disCode: district.value || undefined,
        comCode: commune.value || undefined,
        limit: 20
      }
    })

    if (res?.data?.data && Array.isArray(res.data.data)) {
      patients.value = res.data.data.map((p: any) => ({ ...p, id: p._id || p.id }))
    } else if (res?.data && Array.isArray(res.data)) {
      patients.value = res.data.map((p: any) => ({ ...p, id: p._id || p.id }))
    } else if (Array.isArray(res)) {
      patients.value = (res as any[]).map((p: any) => ({ ...p, id: p._id || p.id }))
    } else {
      patients.value = []
    }
    page.value = 1
  } catch (err) {
    console.warn('Server search failed', err)
  } finally {
    loading.value = false
  }
}

watch([search, province, district, commune], () => {
  performSearch()
})

watch(isOpen, async (newVal) => {
  if (newVal) {
    search.value = ''
    await loadProvinces()
    if (!props.patient) {
      province.value = ''
      district.value = ''
      commune.value = ''
      village.value = ''
    } else {
      province.value = props.patient.proCode || ''
      district.value = props.patient.disCode || ''
      commune.value = props.patient.comCode || ''
    }
    performSearch()
  }
})

// New patient modal state
const newPatientOpen = ref(false)

const schema = z.object({
  name: z.string().min(2, 'Too short'),
  email: z.string().email('Invalid email')
})

type Schema = z.output<typeof schema>

const newState = reactive<Partial<Schema>>({
  name: undefined,
  email: undefined
})

const toast = useToast()
async function onSubmit(event: FormSubmitEvent<Schema>) {
  toast.add({ title: 'Success', description: `New patient ${event.data.name} added`, color: 'success' })
  newPatientOpen.value = false
}

// pagination
const page = ref(1)
const perPage = ref<number>(10)

const provinces = computed(() => Array.from(new Set(patients.value.map(p => p.address || '').filter(Boolean))))

const filtered = computed(() => {
  if (!Array.isArray(patients.value)) return []
  let list = patients.value.slice()
  const q = search.value.trim().toLowerCase()

  if (q) {
    list = list.filter(p =>
      (p.nameEn || '').toLowerCase().includes(q)
      || (p.nameKh || '').toLowerCase().includes(q)
      || (p.id || '').toLowerCase().includes(q)
      || (p.pId?.toString() || '').includes(q)
    )
  }

  const pCode = province.value
  const dCode = district.value
  const cCode = commune.value

  if (pCode) list = list.filter(p => (p.proCode || '') === pCode)
  if (dCode) list = list.filter(p => (p.disCode || '') === dCode)
  if (cCode) list = list.filter(p => (p.comCode || '') === cCode)

  return list
})

function getPageSize(): number {
  return Number(perPage.value) || 10
}

const totalPages = computed(() => {
  const size = getPageSize()
  return Math.max(1, Math.ceil(filtered.value.length / size))
})
const paged = computed(() => {
  const size = getPageSize()
  return filtered.value.slice((page.value - 1) * size, page.value * size)
})

watch([search, province, district, commune, perPage], () => {
  page.value = 1
})

function close() {
  isOpen.value = false
}

function resetFilters() {
  search.value = ''
  province.value = ''
  district.value = ''
  commune.value = ''
  performSearch()
}

function selectPatient(p: Patient) {
  emit('select', p)
  close()
}

function prev() { if (page.value > 1) page.value-- }
function next() { if (page.value < totalPages.value) page.value++ }

function formatGender(p: any) {
  const g = p.gender ?? p.sex
  if (g == 1 || g === '1' || g === 'M' || g === 'Male') return 'ប្រុស'
  if (g == 2 || g === '2' || g === 'F' || g === 'Female') return 'ស្រី'
  return g || '-'
}
</script>

<template>
  <UModal
    v-model:open="isOpen"
    :prevent-close="false"
    :title="t('common.search') + t('patient.title')"
    :ui="{ content: 'max-w-4xl' }"
  >
    <slot name="trigger">
      <UButton
        v-if="props.buttonLabel"
        :label="props.buttonLabel"
        color="primary"
        variant="solid"
        :size="props.buttonSize ?? 'md'"
        @click="isOpen = true"
      />
      <UButton
        v-else
        icon="i-lucide-search"
        color="primary"
        variant="solid"
        :size="props.buttonSize ?? 'md'"
        @click="isOpen = true"
      />
    </slot>

    <template #body>
      <div class="flex justify-between items-center mb-3">
        <div class="flex items-center gap-3">
          <UButton
            :label="t('common.add') + t('patient.title')"
            color="primary"
            variant="soft"
            icon="i-lucide-plus"
            @click="newPatientOpen = true"
          />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
        <UFormField :label="t('patient.province')" class="w-full">
          <USelectMenu
            v-model="province"
            :items="provinceItems"
            value-key="proCode"
            label-key="nameKh"
            :placeholder="t('patient.province')"
            clearable
            class="w-full"
          />
        </UFormField>
        <UFormField :label="t('patient.district')" class="w-full">
          <USelectMenu
            v-model="district"
            :items="districtItems"
            value-key="disCode"
            label-key="nameKh"
            :placeholder="t('patient.district')"
            :disabled="!province"
            clearable
            class="w-full"
          />
        </UFormField>
        <UFormField :label="t('patient.commune')" class="w-full">
          <USelectMenu
            v-model="commune"
            :items="communeItems"
            value-key="comCode"
            label-key="nameKh"
            :placeholder="t('patient.commune')"
            :disabled="!district"
            clearable
            class="w-full"
          />
        </UFormField>
      </div>
      <div class="flex gap-2 mb-3">
        <UInput
          v-model="search"
          :placeholder="t('common.search') + t('patient.title')"
          icon="i-lucide-search"
          class="flex-1"
          @keyup.enter="performSearch"
        />

        <UButton :label="t('common.search')" color="primary" @click="performSearch" />
        <UButton
          color="error"
          variant="soft"
          icon="i-lucide-rotate-ccw"
          @click="resetFilters"
        />
      </div>
      <div class="overflow-auto max-h-[60vh]">
        <table class="w-full border-collapse text-sm">
          <thead class="bg-gray-100 dark:bg-gray-800 sticky top-0">
            <tr>
              <th class="p-2 text-left">
                {{ t('patient.id') }}
              </th>
              <th class="p-2 text-left">
                {{ t('patient.name') }}
              </th>
              <th class="p-2 text-left">
                {{ t('patient.gender') }}
              </th>
              <th class="p-2 text-left">
                {{ t('patient.dob') }}
              </th>
              <th class="p-2 text-left">
                {{ t('patient.phone') }}
              </th>
              <th class="p-2 text-left">
                {{ t('patient.address') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="p in paged"
              :key="p.id"
              class="border-t border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
              @click="selectPatient(p)"
            >
              <td class="p-2 font-mono text-xs">
                {{ p.pId || p.id }}
              </td>
              <td class="p-2 font-medium">
                {{ p.nameEn }}
                <span v-if="p.nameKh" class="text-gray-500 text-xs ml-1">/ {{ p.nameKh }}</span>
              </td>
              <td class="p-2">
                {{ formatGender(p) }}
              </td>
              <td class="p-2">
                {{ p.dob ? new Date(p.dob).toLocaleDateString() : '-' }}
              </td>
              <td class="p-2">
                {{ p.phone ?? '-' }}
              </td>
              <td class="p-2 text-xs text-gray-500">
                {{ [p.villageName, p.communeName, p.districtName, p.provinceName].filter(Boolean).join(', ') || '-' }}
              </td>
            </tr>
            <tr v-if="!paged.length">
              <td class="p-2 text-center text-gray-500" colspan="6">
                No patients found
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex items-center justify-between mt-3 pt-2 border-t border-gray-200 dark:border-gray-800">
        <div class="flex items-center gap-2">
          <USelectMenu
            v-model="perPage"
            :items="[10, 20, 50, 100]"
            class="w-20 cursor-pointer"
            size="sm"
          />
          <span class="text-sm text-gray-600 dark:text-gray-400">Total: {{ filtered.length }}</span>
        </div>
        <div class="flex items-center gap-4">
          <div class="text-sm text-gray-600 dark:text-gray-400">
            Page {{ page }} of {{ totalPages }}
          </div>
          <div class="flex gap-2">
            <UButton
              size="sm"
              color="neutral"
              variant="outline"
              label="Prev"
              :disabled="page === 1"
              @click="prev"
            />
            <UButton
              size="sm"
              color="neutral"
              variant="outline"
              label="Next"
              :disabled="page >= totalPages"
              @click="next"
            />
          </div>
        </div>
      </div>
    </template>
  </UModal>

  <!-- New patient modal -->
  <UModal v-model:open="newPatientOpen" title="New patient" description="Add a new patient to the database">
    <template #body>
      <UForm
        :schema="schema"
        :state="newState"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Name" placeholder="ឈ្មោះ" name="name">
          <UInput v-model="newState.name" class="w-full" />
        </UFormField>
        <UFormField label="Email" placeholder="example@domain.com" name="email">
          <UInput v-model="newState.email" class="w-full" />
        </UFormField>
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            @click="newPatientOpen = false"
          />
          <UButton
            label="Create"
            color="primary"
            variant="solid"
            type="submit"
          />
        </div>
      </UForm>
    </template>
  </UModal>
</template>

<style scoped>
.border-collapse {
  border-collapse: collapse;
}
</style>
