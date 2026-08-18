<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { Patient } from '~/types/models'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits(['update:visible', 'select'])

const patients = ref<Patient[]>([])
const loading = ref(false)
const search = ref('')
const province = ref<string | null>(null)
const district = ref<string | null>(null)
const commune = ref<string | null>(null)
const village = ref<string | null>(null)

// pagination
const page = ref(1)
const perPage = ref(5)

onMounted(async () => {
  loading.value = true
  try {
    const res = await fetch('/mock/patients.json')
    const data = await res.json()
    if (Array.isArray(data)) patients.value = data
  } catch (err) {
    console.error('Failed to load patients mock', err)
  } finally {
    loading.value = false
  }
})

const provinces = computed(() => Array.from(new Set(patients.value.map(p => p.address || '').filter(Boolean))))

const filtered = computed(() => {
  let list = patients.value.slice()
  const q = search.value.trim().toLowerCase()
  if (q) list = list.filter(p => (p.nameEn || '').toLowerCase().includes(q) || (p.id || '').toLowerCase().includes(q))
  if (province.value) list = list.filter(p => (p.address || '') === province.value)
  // district/commune/village not present in mock; left for future
  return list
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / perPage.value)))
const paged = computed(() => filtered.value.slice((page.value - 1) * perPage.value, page.value * perPage.value))

function close() {
  emit('update:visible', false)
}

function selectPatient(p: Patient) {
  emit('select', p)
  close()
}

function prev() { if (page.value > 1) page.value-- }
function next() { if (page.value < totalPages.value) page.value++ }
</script>

<template>
  <div v-if="props.visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div class="bg-white w-11/12 md:w-3/4 lg:w-2/3 max-h-[80vh] overflow-auto rounded shadow-lg p-4">
      <div class="flex justify-between items-center mb-3">
        <h3 class="text-lg font-semibold">
          Search Patient
        </h3>
        <button class="text-gray-600" @click="close">
          ✕
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
        <input v-model="search" placeholder="Name or ID" class="p-2 border rounded">
        <select v-model="province" class="p-2 border rounded">
          <option value="">
            All provinces
          </option>
          <option v-for="pr in provinces" :key="pr" :value="pr">
            {{ pr }}
          </option>
        </select>
        <select v-model="district" class="p-2 border rounded">
          <option value="">
            All districts
          </option>
        </select>
        <select v-model="commune" class="p-2 border rounded">
          <option value="">
            All communes
          </option>
        </select>
      </div>

      <div class="overflow-auto">
        <table class="w-full border-collapse">
          <thead class="bg-gray-100">
            <tr>
              <th class="p-2 text-left">
                Patient ID
              </th>
              <th class="p-2 text-left">
                Name
              </th>
              <th class="p-2 text-left">
                DOB
              </th>
              <th class="p-2 text-left">
                Phone
              </th>
              <th class="p-2">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in paged" :key="p.id" class="border-t">
              <td class="p-2">
                {{ p.id }}
              </td>
              <td class="p-2">
                {{ p.nameEn }}
              </td>
              <td class="p-2">
                {{ p.dob ?? '-' }}
              </td>
              <td class="p-2">
                {{ p.phone ?? '-' }}
              </td>
              <td class="p-2 text-center">
                <button class="bg-blue-600 text-white px-3 py-1 rounded" @click="selectPatient(p)">
                  Select
                </button>
              </td>
            </tr>
            <tr v-if="!paged.length">
              <td class="p-2 text-center" colspan="5">
                No patients found
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex items-center justify-between mt-3">
        <div class="text-sm text-gray-600">
          Showing page {{ page }} / {{ totalPages }}
        </div>
        <div class="flex gap-2">
          <button class="px-3 py-1 border rounded" :disabled="page===1" @click="prev">
            Prev
          </button>
          <button class="px-3 py-1 border rounded" :disabled="page>=totalPages" @click="next">
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.border-collapse { border-collapse: collapse; }
</style>
