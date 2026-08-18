<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'

const props = defineProps<{
  medicine?: any
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits(['success'])

const { t, locale } = useI18n()
const toast = useToast()

// ── Steps ────────────────────────────────────────────────────────────────────
const activeStep = ref('basic')

const steps = computed(() => [
  { key: 'basic', label: t('medicine.stepBasicInfo'), icon: 'i-lucide-clipboard-list' },
  { key: 'clinical', label: t('medicine.stepDrugInfo'), icon: 'i-lucide-pill' },
  { key: 'packaging', label: t('medicine.stepPackUnit'), icon: 'i-lucide-package' },
  { key: 'stock', label: t('medicine.stepStock'), icon: 'i-lucide-warehouse' },
  { key: 'registration', label: t('medicine.stepRegistration'), icon: 'i-lucide-file-check' }
])

const activeStepIndex = computed(() => steps.value.findIndex(s => s.key === activeStep.value))
const isFirstStep = computed(() => activeStepIndex.value === 0)
const isLastStep = computed(() => activeStepIndex.value === steps.value.length - 1)

function goNext() {
  const next = steps.value[activeStepIndex.value + 1]
  if (next) activeStep.value = next.key
}
function goBack() {
  const prev = steps.value[activeStepIndex.value - 1]
  if (prev) activeStep.value = prev.key
}

// ── Remote data ──────────────────────────────────────────────────────────────

const { data: categoriesResult } = await useAsyncData('medicine-categories-modal', () => $api('/medicine-categories'), {
  default: () => ({ data: [] })
})

const medicineCategoryOptions = computed(() =>
  ((categoriesResult.value as any)?.data || []).map((c: any) => ({
    label: locale.value === 'km' ? c.nameKh : c.nameEn,
    value: c._id,
    nameEn: c.nameEn,
    nameKh: c.nameKh,
    code: c.code
  }))
)

const { data: dosageFormsResult } = await useAsyncData('dosage-forms-modal', () => $api('/dosage-forms'), {
  default: () => ({ data: [] })
})

const dosageFormOptions = computed(() =>
  ((dosageFormsResult.value as any)?.data || []).map((d: any) => ({
    label: locale.value === 'km' ? d.nameKh : d.nameEn,
    value: d._id
  }))
)

const { data: unitsResult } = await useAsyncData('units-list-modal', () => $api('/units'), {
  default: () => ({ data: [] })
})

const unitOptions = computed(() =>
  ((unitsResult.value as any)?.data || []).map((u: any) => ({
    label: locale.value === 'km' ? u.nameKh : u.nameEn,
    value: u._id
  }))
)

// ── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  code: z.string().min(1, 'Code is required'),
  atcCode: z.string().optional(),
  nameEn: z.string().min(1, 'English name is required'),
  nameKh: z.string().min(1, 'Khmer name is required'),
  brandName: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  dosageForm: z.string().min(1, 'Dosage form is required'),
  route: z.string().default('Oral'),
  strength: z.string().min(1, 'Strength is required'),
  unit: z.string().min(1, 'Unit is required'),
  retailPrice: z.number().min(0, 'Retail price is required'),
  wholesalePrice: z.number().min(0).default(0),
  currency: z.string().min(1, 'Currency is required'),
  stock: z.number().int().min(0),
  conversionRate: z.number().min(1).default(1),
  baseUnit: z.string().optional().default('pill'),
  saleUnit: z.string().optional().default('unit'),
  minStockAlert: z.number().int().default(10),
  instructionEn: z.string().optional(),
  instructionKh: z.string().optional(),
  sideEffects: z.array(z.string()).default([]),
  status: z.enum(['active', 'inactive']).default('active')
})

type Schema = z.output<typeof schema>

// ── State ────────────────────────────────────────────────────────────────────

const state = reactive({
  code: '',
  atcCode: '',
  nameEn: '',
  nameKh: '',
  brandName: '',
  category: '',
  dosageForm: '',
  route: 'Oral',
  strength: '',
  unit: '',
  retailPrice: 0,
  wholesalePrice: 0,
  currency: 'USD',
  stock: 0,
  conversionRate: 1,
  baseUnit: 'pill',
  saleUnit: 'unit',
  minStockAlert: 10,
  instructionEn: '',
  instructionKh: '',
  sideEffects: [] as string[],
  status: 'active' as 'active' | 'inactive'
})

function resolveId(val: any, list: any[]) {
  if (!val) return ''
  if (/^[0-9a-fA-F]{24}$/.test(val)) return val
  const found = list.find((x: any) =>
    x.nameEn?.toLowerCase() === String(val).toLowerCase() || x.nameKh === val
  )
  return found ? found._id : val
}

function resetState() {
  Object.assign(state, {
    code: '', atcCode: '', nameEn: '', nameKh: '', brandName: '',
    category: '', dosageForm: '', route: 'Oral', strength: '', unit: '',
    retailPrice: 0, wholesalePrice: 0, currency: 'USD', stock: 0,
    conversionRate: 1, baseUnit: 'pill', saleUnit: 'unit', minStockAlert: 10,
    instructionEn: '', instructionKh: '', sideEffects: [], status: 'active'
  })
  activeStep.value = 'basic'
}

watch(() => props.medicine, (medicine) => {
  if (!medicine) {
    resetState()
    return
  }
  state.code = medicine.code || ''
  state.atcCode = medicine.atcCode || ''
  state.nameEn = medicine.nameEn || ''
  state.nameKh = medicine.nameKh || ''
  state.brandName = medicine.brandName || ''
  state.category = resolveId(
    medicine.category?._id || medicine.category,
    (categoriesResult.value as any)?.data || []
  )
  state.dosageForm = resolveId(
    medicine.dosageForm?._id || medicine.dosageForm,
    (dosageFormsResult.value as any)?.data || []
  )
  state.route = medicine.route || 'Oral'
  state.strength = medicine.strength || ''
  state.unit = resolveId(
    medicine.unit?._id || medicine.unit,
    (unitsResult.value as any)?.data || []
  )
  state.retailPrice = medicine.retailPrice ?? medicine.price ?? 0
  state.wholesalePrice = medicine.wholesalePrice ?? 0
  state.currency = medicine.currency || 'USD'
  state.stock = medicine.stock ?? 0
  state.conversionRate = medicine.conversionRate ?? 1
  state.baseUnit = medicine.baseUnit || 'pill'
  state.saleUnit = medicine.saleUnit || 'unit'
  state.minStockAlert = medicine.minStockAlert ?? 10
  state.instructionEn = medicine.instructionEn || ''
  state.instructionKh = medicine.instructionKh || ''
  state.sideEffects = Array.isArray(medicine.sideEffects)
    ? medicine.sideEffects
    : medicine.sideEffects
      ? String(medicine.sideEffects).split(',').map((s: string) => s.trim()).filter(Boolean)
      : []
  state.status = medicine.status || 'active'
  activeStep.value = 'basic'
}, { immediate: true })

// ── Submit ───────────────────────────────────────────────────────────────────

const isSubmitting = ref(false)

async function onSubmit(event: FormSubmitEvent<Schema>) {
  isSubmitting.value = true
  try {
    const data = { ...event.data }
    if (props.medicine) {
      await $api(`/medicines/${props.medicine._id}`, { method: 'PUT', body: data })
      toast.add({ title: t('messages.updateSuccess'), description: state.nameEn, color: 'success' })
    } else {
      await $api('/medicines', { method: 'POST', body: data })
      toast.add({ title: t('messages.createSuccess'), description: state.nameEn, color: 'success' })
    }
    emit('success')
    open.value = false
    resetState()
  } catch (error: any) {
    toast.add({
      title: t('common.error'),
      description: error.data?.message || t('messages.errorOccurred'),
      color: 'error'
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :transition="false"
    :ui="{
      content: [
        'max-w-none w-[calc(100vw-20px)] sm:w-[calc(100vw-40px)] lg:w-[780px] lg:max-w-[calc(100vw-48px)] xl:w-[820px] xl:max-w-[820px]',
        'max-h-[88vh] overflow-hidden',
        'data-[state=open]:animate-[med-modal-in_220ms_cubic-bezier(0.16,1,0.3,1)]',
        'data-[state=closed]:animate-[med-modal-out_200ms_cubic-bezier(0.16,1,0.3,1)]'
      ].join(' '),
      overlay: 'data-[state=open]:animate-[fade-in_200ms_ease-out] data-[state=closed]:animate-[fade-out_200ms_ease-in]',
      body: 'p-0',
      header: 'p-0 border-b-0'
    }"
  >
    <!-- Header + Stepper (fixed) -->
    <template #header>
      <div class="px-5 sm:px-6 pt-5 pb-0 border-b-0">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3">
            <div
              class="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950 flex items-center justify-center flex-shrink-0"
            >
              <UIcon name="i-lucide-pill" class="text-primary-500 text-xl" />
            </div>
            <div>
              <h2 class="text-base font-semibold text-gray-900 dark:text-white leading-tight">
                {{ medicine ? t('common.edit') : t('common.addNew') }}
              </h2>
              <p v-if="!medicine" class="text-xs text-gray-400 mt-0.5">
                {{ t('medicine.addNew') }}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <UBadge
              v-if="medicine"
              :label="state.status === 'active' ? t('common.active') : t('common.inactive')"
              :color="state.status === 'active' ? 'success' : 'neutral'"
              variant="subtle"
              size="sm"
            />
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              aria-label="Close"
              @click="open = false"
            />
          </div>
        </div>

        <!-- Stepper -->
        <nav class="grid grid-cols-5 gap-2 mt-4 mb-1">
          <button
            v-for="(step, index) in steps"
            :key="step.key"
            type="button"
            class="flex flex-col items-center gap-1.5 min-w-0 rounded-lg px-1 py-2.5 transition-all duration-200 group"
            :class="index === activeStepIndex
              ? 'bg-primary-50 dark:bg-primary-950 ring-1 ring-primary-200 dark:ring-primary-800'
              : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'"
            @click="activeStep = step.key"
          >
            <span
              class="flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors shrink-0"
              :class="index < activeStepIndex
                ? 'bg-primary-500 text-white'
                : index === activeStepIndex
                  ? 'bg-primary-500 text-white ring-2 ring-primary-200 dark:ring-primary-800'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 group-hover:text-gray-500'"
            >
              <UIcon v-if="index < activeStepIndex" name="i-lucide-check" class="size-4" />
              <UIcon v-else :name="step.icon" class="size-4" />
            </span>
            <span
              class="w-full text-[11px] leading-tight font-medium truncate hidden sm:block"
              :class="index <= activeStepIndex
                ? 'text-primary-700 dark:text-primary-300'
                : 'text-gray-400 dark:text-gray-500'"
            >
              {{ step.label }}
            </span>
          </button>
        </nav>
      </div>
    </template>

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="flex flex-col h-full min-h-0"
        @submit="onSubmit"
      >
        <div class="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6">
          <Transition name="step" mode="out-in">
            <div :key="activeStep" class="min-h-[180px]">
              <!-- ── STEP 1: Basic Info ─────────────────────────────────────── -->
              <div v-if="activeStep === 'basic'" class="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-5">
                <UFormField :label="t('medicine.code')" name="code" required>
                  <UInput
                    v-model="state.code"
                    class="w-full font-mono"
                    placeholder="e.g. MED-0042"
                    :ui="{ base: 'h-[42px] rounded-lg font-mono tracking-wide' }"
                  />
                </UFormField>
                <UFormField label="ATC Code" name="atcCode">
                  <UInput
                    v-model="state.atcCode"
                    class="w-full font-mono"
                    placeholder="e.g. A02BC01"
                    :ui="{ base: 'h-[42px] rounded-lg font-mono' }"
                  />
                </UFormField>

                <UFormField :label="t('patient.nameEn')" name="nameEn" required>
                  <UInput
                    v-model="state.nameEn"
                    class="w-full"
                    :placeholder="t('medicine.genericName')"
                    :ui="{ base: 'h-[42px] rounded-lg' }"
                  />
                </UFormField>
                <UFormField :label="t('patient.nameKh')" name="nameKh" required>
                  <UInput
                    v-model="state.nameKh"
                    class="w-full"
                    :placeholder="t('patient.nameKh')"
                    :ui="{ base: 'h-[42px] rounded-lg' }"
                  />
                </UFormField>

                <UFormField :label="t('medicine.brandName')" name="brandName" class="md:col-span-2">
                  <UInput
                    v-model="state.brandName"
                    class="w-full"
                    :placeholder="t('medicine.brandName')"
                    :ui="{ base: 'h-[42px] rounded-lg' }"
                  />
                </UFormField>

                <UFormField :label="t('medicine.category')" name="category" required class="md:col-span-2">
                  <USelectMenu
                    v-model="state.category"
                    :items="medicineCategoryOptions"
                    value-key="value"
                    label-key="label"
                    :filter-fields="['label', 'nameEn', 'nameKh', 'code']"
                    class="w-full"
                    :placeholder="t('common.select')"
                    :ui="{ base: 'h-[42px] rounded-lg' }"
                  />
                </UFormField>

                <UFormField :label="t('common.status')" name="status" class="md:col-span-2">
                  <div class="flex gap-3">
                    <button
                      v-for="opt in [
                        { value: 'active', label: t('common.active'), color: 'bg-primary-50 border-primary-300 text-primary-700 dark:bg-primary-950 dark:border-primary-800 dark:text-primary-300' },
                        { value: 'inactive', label: t('common.inactive'), color: 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300' }
                      ]"
                      :key="opt.value"
                      type="button"
                      class="flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-all"
                      :class="state.status === opt.value
                        ? opt.color + ' ring-1 ring-offset-0 ring-current'
                        : 'bg-white border-gray-200 text-gray-400 dark:bg-gray-900 dark:border-gray-700'"
                      @click="state.status = opt.value as 'active' | 'inactive'"
                    >
                      {{ opt.label }}
                    </button>
                  </div>
                </UFormField>
              </div>

              <!-- ── STEP 2: Drug Info ─────────────────────────────────────── -->
              <div v-else-if="activeStep === 'clinical'" class="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-5">
                <UFormField :label="t('medicine.type')" name="dosageForm" required>
                  <USelectMenu
                    v-model="state.dosageForm"
                    :items="dosageFormOptions"
                    value-key="value"
                    label-key="label"
                    class="w-full"
                    :placeholder="t('common.select')"
                    :ui="{ base: 'h-[42px] rounded-lg' }"
                  />
                </UFormField>
                <UFormField label="Route" name="route">
                  <USelectMenu
                    v-model="state.route"
                    :items="['Oral', 'Topical', 'Intravenous', 'Intramuscular', 'Subcutaneous', 'Inhalation', 'Rectal', 'Sublingual', 'Transdermal', 'Ophthalmic', 'Otic', 'Nasal']"
                    class="w-full"
                    :ui="{ base: 'h-[42px] rounded-lg' }"
                  />
                </UFormField>
                <UFormField :label="t('medicine.dosage')" name="strength" required>
                  <UInput
                    v-model="state.strength"
                    class="w-full"
                    placeholder="e.g. 500mg"
                    :ui="{ base: 'h-[42px] rounded-lg' }"
                  />
                </UFormField>
                <UFormField :label="t('medicine.unit')" name="unit" required>
                  <USelectMenu
                    v-model="state.unit"
                    :items="unitOptions"
                    value-key="value"
                    label-key="label"
                    class="w-full"
                    :placeholder="t('common.select')"
                    :ui="{ base: 'h-[42px] rounded-lg' }"
                  />
                </UFormField>
              </div>

              <!-- ── STEP 3: Pack & Unit ───────────────────────────────────── -->
              <div v-else-if="activeStep === 'packaging'">
                <div class="rounded-xl border border-blue-100 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 p-4 sm:p-5">
                  <div class="flex items-center gap-2 mb-4">
                    <UIcon name="i-lucide-repeat-2" class="text-blue-500 text-base" />
                    <span class="text-sm font-semibold text-blue-700 dark:text-blue-300">Unit Conversion</span>
                    <span class="text-xs text-blue-400 dark:text-blue-500 font-normal ml-1">1 sale unit = ? base
                      units</span>
                  </div>

                  <div
                    class="flex items-center justify-center gap-3 py-3 mb-4 rounded-lg bg-white dark:bg-gray-900 border border-blue-100 dark:border-blue-900"
                  >
                    <div class="text-center">
                      <div class="text-xl font-bold text-gray-700 dark:text-gray-200">
                        1
                      </div>
                      <div class="text-xs text-gray-400 mt-0.5 capitalize">
                        {{ state.saleUnit || 'Sale Unit' }}
                      </div>
                    </div>
                    <div class="flex flex-col items-center gap-0.5">
                      <UIcon name="i-lucide-equal" class="text-gray-300 text-xl" />
                    </div>
                    <div class="text-center">
                      <div class="text-xl font-bold text-blue-600 dark:text-blue-400">
                        {{ state.conversionRate }}
                      </div>
                      <div class="text-xs text-gray-400 mt-0.5 capitalize">
                        {{ state.baseUnit || 'Base Unit' }}
                      </div>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <UFormField label="Sale Unit" name="saleUnit">
                      <UInput
                        v-model="state.saleUnit"
                        class="w-full"
                        placeholder="Strip"
                        :ui="{ base: 'h-[42px] rounded-lg' }"
                      />
                    </UFormField>
                    <UFormField label="Rate" name="conversionRate">
                      <UInput
                        v-model.number="state.conversionRate"
                        type="number"
                        min="1"
                        class="w-full text-center"
                        :ui="{ base: 'h-[42px] rounded-lg' }"
                      />
                    </UFormField>
                    <UFormField label="Base Unit" name="baseUnit">
                      <UInput
                        v-model="state.baseUnit"
                        class="w-full"
                        placeholder="Pill"
                        :ui="{ base: 'h-[42px] rounded-lg' }"
                      />
                    </UFormField>
                  </div>
                </div>
              </div>

              <!-- ── STEP 4: Stock ─────────────────────────────────────────── -->
              <div v-else-if="activeStep === 'stock'" class="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-5">
                <UFormField label="Currency" name="currency" class="md:col-span-2">
                  <div class="flex gap-3">
                    <button
                      v-for="cur in ['USD', 'KHR', 'KH']"
                      :key="cur"
                      type="button"
                      class="flex-1 py-2.5 rounded-lg border text-sm font-semibold transition-all"
                      :class="state.currency === cur
                        ? 'bg-primary-50 border-primary-300 text-primary-700 dark:bg-primary-950 dark:border-primary-700 dark:text-primary-300'
                        : 'bg-white border-gray-200 text-gray-400 dark:bg-gray-900 dark:border-gray-700 hover:border-gray-300'"
                      @click="state.currency = cur"
                    >
                      {{ cur }}
                    </button>
                  </div>
                </UFormField>

                <div class="rounded-xl border border-gray-100 dark:border-gray-800 p-4 space-y-2">
                  <div
                    class="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
                  >
                    <UIcon name="i-lucide-tag" class="text-base" />
                    {{ t('common.retail') }}
                  </div>
                  <UFormField name="retailPrice" class="!space-y-0">
                    <UInput
                      v-model.number="state.retailPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      class="w-full"
                      :ui="{ base: 'h-[42px] rounded-lg text-xl font-bold' }"
                      :placeholder="'0.00'"
                    >
                      <template #trailing>
                        <span class="text-gray-400 text-sm">{{ state.currency }}</span>
                      </template>
                    </UInput>
                  </UFormField>
                </div>

                <div class="rounded-xl border border-gray-100 dark:border-gray-800 p-4 space-y-2">
                  <div
                    class="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide"
                  >
                    <UIcon name="i-lucide-building-2" class="text-base" />
                    {{ t('common.wholesale') }}
                  </div>
                  <UFormField name="wholesalePrice" class="!space-y-0">
                    <UInput
                      v-model.number="state.wholesalePrice"
                      type="number"
                      step="0.01"
                      min="0"
                      class="w-full"
                      :ui="{ base: 'h-[42px] rounded-lg' }"
                      :placeholder="'0.00'"
                    >
                      <template #trailing>
                        <span class="text-gray-400 text-sm">{{ state.currency }}</span>
                      </template>
                    </UInput>
                  </UFormField>
                </div>

                <div
                  class="rounded-xl border border-amber-100 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20 p-4 sm:p-5 space-y-4 md:col-span-2"
                >
                  <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-warehouse" class="text-amber-500 text-base" />
                    <span class="text-sm font-semibold text-amber-700 dark:text-amber-300">Inventory</span>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <UFormField :label="t('medicine.stock')" name="stock">
                      <UInput
                        v-model.number="state.stock"
                        type="number"
                        min="0"
                        class="w-full"
                        :ui="{ base: 'h-[42px] rounded-lg' }"
                      />
                    </UFormField>

                    <UFormField :label="t('medicine.lowStock')" name="minStockAlert">
                      <UInput
                        v-model.number="state.minStockAlert"
                        type="number"
                        min="0"
                        class="w-full"
                        :ui="{ base: 'h-[42px] rounded-lg' }"
                      >
                        <template #trailing>
                          <UIcon name="i-lucide-bell" class="text-amber-400 text-base" />
                        </template>
                      </UInput>
                    </UFormField>
                  </div>

                  <div
                    v-if="state.stock <= state.minStockAlert && state.stock >= 0"
                    class="flex items-center gap-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 px-3 py-2 text-xs text-amber-700 dark:text-amber-300"
                  >
                    <UIcon name="i-lucide-triangle-alert" class="text-base flex-shrink-0" />
                    {{ t('medicine.lowStock') }}
                  </div>
                </div>
              </div>

              <!-- ── STEP 5: Registration ──────────────────────────────────── -->
              <div v-else-if="activeStep === 'registration'" class="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-5">
                <UFormField :label="t('medicine.instructions') + ' (English)'" name="instructionEn">
                  <UTextarea
                    v-model="state.instructionEn"
                    class="w-full"
                    :rows="4"
                    placeholder="Dosage instructions, timing, food interactions..."
                    :ui="{ base: 'rounded-lg' }"
                  />
                </UFormField>
                <UFormField :label="t('medicine.instructions') + ' (ខ្មែរ)'" name="instructionKh">
                  <UTextarea
                    v-model="state.instructionKh"
                    class="w-full"
                    :rows="4"
                    placeholder="ការណែនាំអំពីថ្នាំ..."
                    :ui="{ base: 'rounded-lg' }"
                  />
                </UFormField>

                <UFormField :label="t('medicine.sideEffects')" name="sideEffects" class="md:col-span-2">
                  <UTextarea
                    :model-value="Array.isArray(state.sideEffects) ? state.sideEffects.join(', ') : ''"
                    class="w-full"
                    :rows="3"
                    placeholder="Nausea, dizziness, headache (comma-separated)"
                    :ui="{ base: 'rounded-lg' }"
                    @update:model-value="(val: string) => state.sideEffects = val.split(',').map((s: string) => s.trim()).filter(Boolean)"
                  />
                  <template #hint>
                    <span class="text-xs text-gray-400">Separate each side effect with a comma</span>
                  </template>
                </UFormField>

                <div v-if="state.sideEffects.length" class="flex flex-wrap gap-1.5 md:col-span-2">
                  <span
                    v-for="(se, i) in state.sideEffects"
                    :key="i"
                    class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-100 dark:bg-red-950 dark:text-red-300 dark:border-red-900"
                  >
                    {{ se }}
                    <button
                      type="button"
                      class="hover:text-red-800 dark:hover:text-red-100"
                      @click="state.sideEffects = state.sideEffects.filter((_, j) => j !== i)"
                    >
                      <UIcon name="i-lucide-x" class="text-xs" />
                    </button>
                  </span>
                </div>
              </div>
            </div>
          </Transition>
        </div>

        <!-- ── Footer (sticky) ─────────────────────────────────────────────── -->
        <div
          class="shrink-0 sticky bottom-0 flex items-center justify-between gap-3 px-5 sm:px-6 py-3.5 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900"
        >
          <div class="flex items-center gap-1.5 ml-1 min-w-0">
            <button
              v-for="(tab, i) in steps"
              :key="tab.key"
              type="button"
              class="w-2 h-2 rounded-full transition-all shrink-0"
              :class="activeStepIndex === i
                ? 'bg-primary-500 w-4'
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'"
              @click="activeStep = tab.key"
            />
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            <UButton
              :label="t('common.cancel')"
              color="neutral"
              variant="ghost"
              :disabled="isSubmitting"
              @click="open = false"
            />
            <!-- Back -->
            <UButton
              v-if="!isFirstStep"
              :label="t('common.back')"
              color="neutral"
              variant="soft"
              leading-icon="i-lucide-arrow-left"
              type="button"
              :disabled="isSubmitting"
              @click="goBack"
            />
            <!-- Next (non-last steps) -->
            <UButton
              v-if="!isLastStep"
              :label="t('pagination.next')"
              color="neutral"
              variant="soft"
              trailing-icon="i-lucide-arrow-right"
              type="button"
              :disabled="isSubmitting"
              @click="goNext"
            />
            <!-- Save (final step only) -->
            <UButton
              v-if="isLastStep"
              type="submit"
              :label="medicine ? t('common.update') : t('common.save')"
              color="primary"
              :loading="isSubmitting"
              leading-icon="i-lucide-save"
            />
          </div>
        </div>
      </UForm>
    </template>
  </UModal>
</template>

<style>
@keyframes med-modal-in {
  from {
    transform: translateY(12px) scale(0.985);
    opacity: 0.96;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

@keyframes med-modal-out {
  from {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
  to {
    transform: translateY(12px) scale(0.985);
    opacity: 0.96;
  }
}
</style>

<style scoped>
.step-enter-active,
.step-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.step-enter-from {
  opacity: 0;
  transform: translateX(12px);
}
.step-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}
</style>
