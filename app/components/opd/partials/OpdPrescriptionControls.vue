<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const props = defineProps<{
  medicines: any[]
  categories: any[]
  dosageForms: any[]
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'add', id: string, qty: number, isWholesale: boolean): void
  (e: 'focus-table'): void
}>()

const medSearch = ref('')
const medCategory = ref<any>(null)
const medDosageForm = ref<any>(null)
const medQty = ref(1)

const selectedCategoryId = computed(() => (medCategory.value as any)?.value ?? '')
const selectedDosageFormId = computed(() => (medDosageForm.value as any)?.value ?? '')

const isLoadingFilters = computed(() => props.loading ?? false)

const categoryItems = computed(() => {
  return [
    { value: '', label: 'All Categories', nameEn: 'All Categories', nameKh: '' },
    ...props.categories.map((c: any) => ({
      value: c._id,
      label: c.nameEn + (c.nameKh ? ` / ${c.nameKh}` : ''),
      nameEn: c.nameEn,
      nameKh: c.nameKh
    }))
  ]
})

const dosageFormItems = computed(() => {
  return [
    { value: '', label: 'All Dosage Forms', nameEn: 'All Dosage Forms', nameKh: '' },
    ...props.dosageForms.map((d: any) => ({
      value: d._id,
      label: d.nameEn + (d.nameKh ? ` / ${d.nameKh}` : ''),
      nameEn: d.nameEn,
      nameKh: d.nameKh
    }))
  ]
})

const filteredMedicines = computed(() => {
  const search = medSearch.value.trim().toLowerCase()
  const catFilter = selectedCategoryId.value
  const dfFilter = selectedDosageFormId.value

  return props.medicines.filter((m) => {
    // Search filter
    const nameMatch = !search
      || m.nameEn?.toLowerCase().includes(search)
      || m.nameKh?.toLowerCase().includes(search)
      || m.code?.toLowerCase().includes(search)

    // Category filter - compare as strings
    const medCatId = String(m.category?._id || m.categoryId || '')
    const catMatch = !catFilter || medCatId === catFilter

    // Dosage Form filter - compare as strings
    const medDfId = String(m.dosageForm?._id || m.dosageFormId || '')
    const dfMatch = !dfFilter || medDfId === dfFilter

    return nameMatch && catMatch && dfMatch
  })
})

const hasFilters = computed(() =>
  medSearch.value || selectedCategoryId.value || selectedDosageFormId.value
)

function clearFilters() {
  medSearch.value = ''
  medCategory.value = null
  medDosageForm.value = null
}

function addMedicine(id: string, qty: number) {
  emit('add', id, qty, false)
  medQty.value = 1
  medSearch.value = ''
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    const first = filteredMedicines.value[0]
    if (first) addMedicine(first._id, Math.max(1, Math.floor(Number(medQty.value) || 1)))
  } else if (e.key === 'Tab') {
    e.preventDefault()
    emit('focus-table')
  }
}
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="flex items-center justify-between bg-primary px-3 py-2 rounded-t">
      <span class="text-white font-bold khmer-label">{{ t('medicine.title') }}</span>
      <UButton
        v-if="hasFilters"
        size="xs"
        color="neutral"
        variant="ghost"
        icon="i-lucide-x"
        @click="clearFilters"
      />
    </div>

    <div class="flex-1 flex flex-col gap-3 p-3 min-h-0">
      <div class="flex gap-2">
        <USelectMenu
          v-model="medCategory"
          :items="categoryItems"
          size="md"
          :loading="isLoadingFilters"
          class="flex-1"
          placeholder="Category"
        >
          <template #item="{ item }">
            <div class="flex flex-col text-left min-w-0">
              <span class="font-medium text-sm text-gray-800 dark:text-gray-200 truncate">{{ item.nameEn
              }}</span>
              <span v-if="item.nameKh" class="text-xs text-gray-500 dark:text-gray-400 truncate">{{
                item.nameKh }}</span>
            </div>
          </template>
        </USelectMenu>
      </div>

      <div class="flex gap-2">
        <USelectMenu
          v-model="medDosageForm"
          :items="dosageFormItems"
          size="md"
          :loading="isLoadingFilters"
          class="flex-1"
          placeholder="Dosage Form"
        >
          <template #item="{ item }">
            <div class="flex flex-col text-left min-w-0">
              <span class="font-medium text-sm text-gray-800 dark:text-gray-200 truncate">{{ item.nameEn
              }}</span>
              <span v-if="item.nameKh" class="text-xs text-gray-500 dark:text-gray-400 truncate">{{
                item.nameKh }}</span>
            </div>
          </template>
        </USelectMenu>
      </div>

      <div class="flex gap-2">
        <UInput
          v-model="medSearch"
          icon="i-lucide-search"
          :placeholder="t('medicine.search') + '...'"
          class="flex-1"
          size="md"
          clearable
          autofocus
          @keydown="onKeydown"
        />
        <!-- <UInput v-model.number="medQty" type="number" :min="1" size="md" class="w-16"
                    :placeholder="t('common.qty')" /> -->
      </div>

      <div v-if="isLoadingFilters" class="flex-1 flex justify-center items-center">
        <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin text-primary-500" />
      </div>

      <div
        v-else-if="filteredMedicines.length === 0"
        class="flex-1 flex flex-col items-center justify-center text-gray-400"
      >
        <UIcon name="i-lucide-search-x" class="w-12 h-12 mb-2 opacity-50" />
        <span class="text-sm">{{ t('common.noData') }}</span>
      </div>

      <div v-else class="flex-1 min-h-0 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
        <div
          v-for="m in filteredMedicines"
          :key="m._id"
          class="p-3 hover:bg-primary-50 dark:hover:bg-primary-900/20 cursor-pointer border-b border-gray-100 dark:border-gray-800 last:border-b-0 transition-colors"
          @click="addMedicine(m._id, Number(medQty) || 1)"
        >
          <div class="flex justify-between items-start gap-2">
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm text-gray-800 dark:text-gray-200 truncate">
                {{ m.nameEn }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400 truncate">
                {{ m.nameKh || '-' }}
              </div>
            </div>
            <div class="flex flex-col items-end gap-1">
              <span class="text-sm font-bold text-green-600 dark:text-green-400">${{ m.price }}</span>
              <span class="text-xs text-gray-400">{{ m.code }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.khmer-label {
    font-family: 'Hanuman', serif;
}
</style>
