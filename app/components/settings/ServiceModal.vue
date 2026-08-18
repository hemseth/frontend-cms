<script setup lang="ts">
import { ref, watch } from 'vue'
import { z } from 'zod'
import { labPresets } from '~/data/lab-presets'

const props = defineProps<{
  open: boolean
  service?: any
  categories: { label: string, value: string }[]
}>()

const emit = defineEmits(['update:open', 'success'])

const { t } = useI18n()
const toast = useToast()
const isLoading = ref(false)
const isPresetOpen = ref(false)
const selectedPresets = ref<string[]>([])

const schema = z.object({
  code: z.string().min(1, 'Code is required'),
  nameEn: z.string().min(1, 'Name (EN) is required'),
  nameKh: z.string().optional(),
  categoryId: z.string().min(1, 'Category is required'),
  price: z.number().min(0),
  currency: z.enum(['USD', 'KHR']).default('USD'),
  unit: z.string().optional(),
  referenceRange: z.string().optional(),
  parameters: z.array(z.any()).optional(),
  status: z.enum(['active', 'inactive']).default('active')
})

const state = ref({
  code: '',
  nameEn: '',
  nameKh: '',
  categoryId: '',
  price: 0,
  currency: 'USD' as 'USD' | 'KHR',
  unit: '',
  referenceRange: '',
  parameters: [] as any[],
  status: 'active' as 'active' | 'inactive'
})

watch(() => props.service, (newVal) => {
  if (newVal) {
    state.value = {
      code: newVal.code,
      nameEn: newVal.nameEn,
      nameKh: newVal.nameKh || '',
      categoryId: newVal.categoryId,
      price: newVal.price,
      currency: newVal.currency || 'USD',
      unit: newVal.unit || '',
      referenceRange: newVal.referenceRange || '',
      parameters: newVal.parameters ? [...newVal.parameters] : [],
      status: newVal.status || 'active'
    }
  } else {
    state.value = {
      code: '',
      nameEn: '',
      nameKh: '',
      categoryId: '',
      price: 0,
      currency: 'USD',
      unit: '',
      referenceRange: '',
      parameters: [],
      status: 'active'
    }
  }
}, { immediate: true })

function addParameter() {
  state.value.parameters.push({
    labelEn: '',
    labelKh: '',
    unit: '',
    refRange: '',
    value: ''
  })
}

function openPresetModal() {
  isPresetOpen.value = true
  selectedPresets.value = []
}

function togglePreset(labelEn: string) {
  const idx = selectedPresets.value.indexOf(labelEn)
  if (idx === -1) {
    selectedPresets.value.push(labelEn)
  } else {
    selectedPresets.value.splice(idx, 1)
  }
}

function applyPresets() {
  const flattened = Object.values(labPresets).flat()
  const selected = flattened.filter(p => selectedPresets.value.includes(p.labelEn))

  selected.forEach((p) => {
    state.value.parameters.push({
      labelEn: p.labelEn,
      labelKh: p.labelKh,
      unit: p.unit,
      refRange: p.refRange,
      value: ''
    })
  })

  isPresetOpen.value = false
  toast.add({ title: 'Added', description: `${selected.length} parameters added`, color: 'success' })
}

function removeParameter(idx: number) {
  state.value.parameters.splice(idx, 1)
}

async function onSubmit() {
  isLoading.value = true
  try {
    if (props.service?._id) {
      await $api(`/services/${props.service._id}`, {
        method: 'PUT',
        body: state.value
      })
      toast.add({ title: 'Success', description: 'Service updated', color: 'success' })
    } else {
      await $api('/services', {
        method: 'POST',
        body: state.value
      })
      toast.add({ title: 'Success', description: 'Service created', color: 'success' })
    }
    emit('success')
    emit('update:open', false)
  } catch (error: any) {
    toast.add({ title: 'Error', description: error.data?.message || 'Something went wrong', color: 'error' })
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <UModal :open="open" :title="service ? 'Edit Service' : 'Add Service'" @update:open="$emit('update:open', $event)">
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Code" name="code">
            <UInput v-model="state.code" placeholder="e.g. B001" class="w-full" />
          </UFormField>
          <UFormField label="Category" name="categoryId">
            <USelectMenu
              v-model="state.categoryId"
              :items="categories"
              value-key="value"
              label-key="label"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField label="Name (EN)" name="nameEn">
          <UInput v-model="state.nameEn" placeholder="e.g. CBC (Complete Blood Count)" class="w-full" />
        </UFormField>

        <UFormField label="Name (KH)" name="nameKh">
          <UInput v-model="state.nameKh" placeholder="e.g. រាប់គ្រាប់ឈាម" class="w-full" />
        </UFormField>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Price" name="price">
            <UInput
              v-model.number="state.price"
              type="number"
              step="0.01"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Currency" name="currency">
            <USelectMenu v-model="state.currency" :options="['USD', 'KHR']" class="w-full" />
          </UFormField>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Unit" name="unit">
            <UInput v-model="state.unit" placeholder="e.g. cells/mcL" class="w-full" />
          </UFormField>
          <UFormField label="Reference Range" name="referenceRange">
            <UInput v-model="state.referenceRange" placeholder="e.g. 4.5-5.5" class="w-full" />
          </UFormField>
        </div>

        <div class="space-y-4 border p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50">
          <div class="flex items-center justify-between">
            <h3 class="font-medium text-sm text-gray-700 dark:text-gray-200">
              Parameters / Sub-Tests
            </h3>
            <div class="flex gap-2">
              <UButton
                size="xs"
                color="primary"
                variant="soft"
                icon="i-lucide-list-plus"
                label="Presets"
                @click="openPresetModal"
              />
              <UButton
                size="xs"
                color="neutral"
                variant="soft"
                icon="i-lucide-plus"
                label="Add Parameter"
                @click="addParameter"
              />
            </div>
          </div>

          <div class="space-y-3 max-h-[300px] overflow-y-auto">
            <div
              v-for="(param, idx) in state.parameters"
              :key="idx"
              class="flex flex-col gap-2 p-3 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-800"
            >
              <div class="flex gap-2">
                <UFormField label="Label (EN)" class="flex-1">
                  <UInput v-model="param.labelEn" placeholder="e.g. RBC" size="sm" />
                </UFormField>
                <UFormField label="Label (KH)" class="flex-1">
                  <UInput v-model="param.labelKh" placeholder="Khmer label" size="sm" />
                </UFormField>
              </div>
              <div class="flex gap-2">
                <UFormField label="Unit" class="flex-1">
                  <UInput v-model="param.unit" placeholder="Unit" size="sm" />
                </UFormField>
                <UFormField label="Ref Range" class="flex-1">
                  <UInput v-model="param.refRange" placeholder="Range" size="sm" />
                </UFormField>
                <div class="flex items-end pb-1">
                  <UButton
                    icon="i-lucide-trash"
                    color="error"
                    variant="ghost"
                    size="sm"
                    @click="removeParameter(idx)"
                  />
                </div>
              </div>
            </div>
            <div v-if="state.parameters.length === 0" class="text-center text-sm text-gray-500 py-4">
              No parameters added. Result will be free text.
            </div>
          </div>
        </div>

        <UFormField label="Status" name="status">
          <USelectMenu v-model="state.status" :options="['active', 'inactive']" class="w-full" />
        </UFormField>

        <div class="flex justify-end gap-2 pt-4">
          <UButton
            label="Cancel"
            color="neutral"
            variant="ghost"
            @click="$emit('update:open', false)"
          />
          <UButton type="submit" :label="service ? 'Update' : 'Create'" :loading="isLoading" />
        </div>
      </UForm>
    </template>
  </UModal>

  <UModal v-model:open="isPresetOpen" title="Select Parameters">
    <template #header>
      <h3 class="font-semibold">
        Select Presets
      </h3>
    </template>
    <div class="p-4 space-y-4 max-h-[400px] overflow-y-auto">
      <div v-for="(items, group) in labPresets" :key="group">
        <h4 class="font-bold text-sm uppercase text-gray-500 mb-2">
          {{ group }}
        </h4>
        <div class="grid grid-cols-1 gap-2">
          <UCheckbox
            v-for="item in items"
            :key="item.labelEn"
            :model-value="selectedPresets.includes(item.labelEn)"
            :label="`${item.labelEn} (${item.labelKh})`"
            @update:model-value="togglePreset(item.labelEn)"
          />
        </div>
      </div>
    </div>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton label="Cancel" variant="ghost" @click="isPresetOpen = false" />
        <UButton label="Add Selected" @click="applyPresets" />
      </div>
    </template>
  </UModal>
</template>
