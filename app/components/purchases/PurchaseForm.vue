<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  initialData?: any
}>()

const emit = defineEmits(['success', 'cancel'])

const { t } = useI18n()
const toast = useToast()
const submitting = ref(false)

// Data fetching
const { data: suppliersResult } = await useAsyncData('suppliers-list-form', () => $api('/suppliers'), {
  default: () => ({ data: [] })
})

const { data: medicinesResult } = await useAsyncData('medicines-list-form', () => $api('/medicines', { params: { limit: 1000 } }), {
  default: () => ({ data: [] })
})

const supplierOptions = computed(() => {
  return ((suppliersResult.value as any)?.data || []).map((s: any) => ({
    label: s.name,
    value: s._id,
    address: s.address
  }))
})

const medicines = computed(() => (medicinesResult.value as any)?.data || [])

// Form state
const form = ref({
  invoiceNumber: 'INV-' + Math.floor(1000 + Math.random() * 9000),
  supplierId: '',
  supplierName: '',
  supplierAddress: '',
  date: new Date().toISOString().split('T')[0],
  paymentType: 'cash', // non-debt
  items: [] as any[],
  discount: 0,
  tax: 0,
  receivedAmount: 0,
  notes: '',
  status: 'pending'
})

// Search and Filter for Products
const productSearch = ref('')
const selectedCategory = ref<any>()
const selectedBrand = ref<any>()

const filteredProducts = computed(() => {
  return medicines.value.filter((m: any) => {
    const matchesSearch = !productSearch.value
      || m.nameEn.toLowerCase().includes(productSearch.value.toLowerCase())
      || m.nameKh.includes(productSearch.value)
      || m.code?.toLowerCase().includes(productSearch.value.toLowerCase())

    // Assuming category and brand might exist or adding placeholders
    const matchesCategory = !selectedCategory.value || m.category === selectedCategory.value
    const matchesBrand = !selectedBrand.value || m.brand === selectedBrand.value

    return matchesSearch && matchesCategory && matchesBrand
  }).slice(0, 10) // Limit display
})

// Totals
const subtotal = computed(() => {
  return form.value.items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0)
})

const grandTotal = computed(() => {
  return subtotal.value - form.value.discount + form.value.tax
})

const balance = computed(() => {
  return grandTotal.value - form.value.receivedAmount
})

// Actions
function addProduct(product: any) {
  const existing = form.value.items.find((item: any) => item.medicineId === product._id)
  if (existing) {
    existing.quantity++
  } else {
    // Determine unit name from object or string
    let unitName = 'Box'
    if (product.unit) {
      if (typeof product.unit === 'object') {
        unitName = product.unit.nameKh || product.unit.nameEn || 'Box'
      } else {
        unitName = product.unit
      }
    }

    form.value.items.push({
      medicineId: product._id,
      medicineName: product.nameKh || product.nameEn,
      image: product.image,
      unit: unitName,
      quantity: 1,
      unitCost: product.price || 0
    })
  }
}

function removeItem(index: number) {
  form.value.items.splice(index, 1)
}

function selectSupplier(id: string) {
  const s = supplierOptions.value.find((opt: any) => opt.value === id)
  if (s) {
    form.value.supplierName = s.label
    form.value.supplierAddress = s.address || ''
  }
}

async function handleSave() {
  if (!form.value.supplierId) {
    toast.add({ title: t('common.error'), description: 'Please select a supplier', color: 'error' })
    return
  }
  if (form.value.items.length === 0) {
    toast.add({ title: t('common.error'), description: 'Please add at least one product', color: 'error' })
    return
  }

  submitting.value = true
  try {
    const payload = {
      ...form.value,
      totalAmount: subtotal.value,
      grandTotal: grandTotal.value,
      paidAmount: form.value.receivedAmount,
      date: new Date(form.value.date || new Date().toISOString())
    }

    await $api('/purchases', {
      method: 'POST',
      body: payload
    })

    toast.add({ title: t('common.success'), description: t('messages.saveSuccess'), color: 'success' })
    emit('success')
  } catch (error: any) {
    toast.add({ title: t('common.error'), description: error.data?.message || t('messages.errorOccurred'), color: 'error' })
  } finally {
    submitting.value = false
  }
}

watch(() => props.initialData, (val) => {
  if (val) {
    form.value = { ...form.value, ...val }
  }
}, { immediate: true })

defineExpose({ handleSave })
</script>

<template>
  <div class="h-full flex flex-col gap-4 p-1">
    <!-- Header Section: Parameters -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <!-- Supplier Info -->
      <UCard :ui="{ body: 'p-3' }" class="md:col-span-1">
        <template #header>
          <div class="text-sm font-bold text-primary-600 dark:text-primary-400">
            {{ t('supplier.title') }}
          </div>
        </template>
        <div class="space-y-3">
          <div class="flex gap-1">
            <USelectMenu
              v-model="form.supplierId"
              :items="supplierOptions"
              value-key="value"
              label-key="label"
              :placeholder="t('supplier.search')"
              class="flex-1"
              @update:model-value="selectSupplier"
            />
            <UButton
              icon="i-lucide-plus"
              size="sm"
              color="neutral"
              variant="outline"
            />
          </div>
          <UTextarea
            v-model="form.supplierAddress"
            :placeholder="t('supplier.address')"
            :rows="2"
            variant="subtle"
            class="text-xs"
          />
        </div>
      </UCard>

      <!-- Purchase Type -->
      <UCard :ui="{ body: 'p-3' }" class="md:col-span-1">
        <template #header>
          <div class="text-sm font-bold text-primary-600 dark:text-primary-400">
            {{ t('purchase.type') }}
          </div>
        </template>
        <div class="flex flex-col gap-2 py-2">
          <URadioGroup
            v-model="form.paymentType"
            value-key="value"
            :items="[
              { label: t('purchase.cash'), value: 'cash' },
              { label: t('purchase.debt'), value: 'debt' }
            ]"
          />
        </div>
      </UCard>

      <!-- Invoice Info -->
      <UCard :ui="{ body: 'p-3' }" class="md:col-span-1">
        <template #header>
          <div class="text-sm font-bold text-primary-600 dark:text-primary-400">
            {{ t('purchase.title') }}
          </div>
        </template>
        <div class="space-y-2">
          <UFormField size="sm">
            <UInput v-model="form.invoiceNumber" :placeholder="t('purchase.invoiceNumber')" icon="i-lucide-file-text" />
          </UFormField>
          <UFormField size="sm">
            <UInput v-model="form.date" type="date" icon="i-lucide-calendar" />
          </UFormField>
        </div>
      </UCard>

      <!-- Search Filters -->
      <UCard :ui="{ body: 'p-3' }" class="md:col-span-1 border-primary-100 dark:border-primary-900">
        <template #header>
          <div class="text-sm font-bold text-primary-600 dark:text-primary-400">
            {{ t('common.search') }}
          </div>
        </template>
        <div class="space-y-2">
          <USelectMenu
            v-model="selectedCategory"
            :items="[]"
            :placeholder="t('purchase.productCategory')"
            size="sm"
            clearable
          />
          <USelectMenu
            v-model="selectedBrand"
            :items="[]"
            :placeholder="t('purchase.productBrand')"
            size="sm"
            clearable
          />
        </div>
      </UCard>
    </div>

    <!-- Main Section: Table and Search -->
    <div class="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 min-h-0">
      <!-- Left: Items Table -->
      <UCard class="md:col-span-8 flex flex-col" :ui="{ body: 'p-0 flex-1 overflow-auto' }">
        <table class="w-full text-sm text-left border-collapse">
          <thead class="sticky top-0 bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-800 z-10">
            <tr>
              <th class="px-3 py-2 font-bold w-12 text-center">
                {{ t('common.number') }}
              </th>
              <th class="px-3 py-2 font-bold">
                {{ t('common.itemName') }}
              </th>
              <th class="px-3 py-2 font-bold w-16 text-center">
                {{ t('common.photo') }}
              </th>
              <th class="px-3 py-2 font-bold w-20">
                {{ t('common.unit') }}
              </th>
              <th class="px-3 py-2 font-bold w-24">
                {{ t('common.qty') }}
              </th>
              <th class="px-3 py-2 font-bold w-24">
                {{ t('common.price') }}
              </th>
              <th class="px-3 py-2 font-bold w-24">
                {{ t('common.total') }}
              </th>
              <th class="px-3 py-2 font-bold w-10" />
            </tr>
          </thead>
          <tbody class="divide-y dark:divide-gray-800">
            <tr
              v-for="(item, index) in form.items"
              :key="index"
              class="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <td class="px-3 py-2 text-center">
                {{ index + 1 }}
              </td>
              <td class="px-3 py-2 font-medium">
                {{ item.medicineName }}
              </td>
              <td class="px-3 py-2 text-center">
                <div
                  class="w-8 h-8 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden mx-auto"
                >
                  <img v-if="item.image" :src="item.image" class="w-full h-full object-cover">
                  <UIcon v-else name="i-lucide-image" class="text-gray-400" />
                </div>
              </td>
              <td class="px-3 py-2 text-gray-500">
                {{ item.unit }}
              </td>
              <td class="px-3 py-2">
                <UInput
                  v-model.number="item.quantity"
                  type="number"
                  size="sm"
                  min="1"
                  class="w-20"
                />
              </td>
              <td class="px-3 py-2">
                <UInput
                  v-model.number="item.unitCost"
                  type="number"
                  size="sm"
                  min="0"
                  step="0.01"
                  class="w-24"
                />
              </td>
              <td class="px-3 py-2 font-semibold">
                ${{ (item.quantity * item.unitCost).toFixed(2) }}
              </td>
              <td class="px-3 py-2">
                <UButton
                  icon="i-lucide-trash-2"
                  color="error"
                  variant="ghost"
                  size="xs"
                  @click="removeItem(index)"
                />
              </td>
            </tr>
            <tr v-if="form.items.length === 0">
              <td colspan="8" class="px-3 py-10 text-center text-gray-400 italic">
                {{ t('common.noItemsAdded') }}
              </td>
            </tr>
          </tbody>
        </table>
      </UCard>

      <!-- Right: Product Search & Summary -->
      <div class="md:col-span-4 flex flex-col gap-4">
        <!-- Product Search List -->
        <UCard class="flex-1 overflow-hidden" :ui="{ body: 'p-0 flex flex-col h-full' }">
          <div class="p-3 border-b dark:border-gray-800">
            <UInput
              v-model="productSearch"
              :placeholder="t('purchase.productSearch')"
              icon="i-lucide-search"
              size="sm"
              trailing
            />
          </div>
          <div class="flex-1 overflow-y-auto p-2 space-y-2">
            <div
              v-for="product in filteredProducts"
              :key="product._id"
              class="flex items-center gap-3 p-2 rounded-lg border border-transparent hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-950 transition-all cursor-pointer group"
              @click="addProduct(product)"
            >
              <div
                class="w-10 h-10 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0"
              >
                <img v-if="product.image" :src="product.image" class="w-full h-full object-cover">
                <UIcon v-else name="i-lucide-package" class="text-gray-400" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium truncate group-hover:text-primary-600">
                  {{ product.nameKh || product.nameEn }}
                </div>
                <div class="text-xs text-gray-500 flex justify-between">
                  <span>{{ product.code }}</span>
                  <span class="font-bold text-primary-600">${{ product.price?.toFixed(2) }}</span>
                </div>
              </div>
              <UIcon name="i-lucide-plus-circle" class="text-gray-300 group-hover:text-primary-500" />
            </div>
            <div v-if="filteredProducts.length === 0" class="py-4 text-center text-xs text-gray-500 italic">
              {{ t('purchase.noProduct') }}
            </div>
          </div>
        </UCard>

        <!-- Payment Summary -->
        <UCard :ui="{ body: 'p-4' }" class="border-t-4 border-t-primary-500">
          <div class="space-y-3">
            <div class="flex justify-between items-center text-sm">
              <span class="text-gray-500">{{ t('payment.subtotal') }}</span>
              <span class="font-medium">${{ subtotal.toFixed(2) }}</span>
            </div>
            <div class="flex justify-between items-center text-sm">
              <span class="text-gray-500">{{ t('payment.discount') }}</span>
              <UInput
                v-model.number="form.discount"
                type="number"
                size="sm"
                class="w-24 text-right"
              />
            </div>
            <div class="flex justify-between items-center text-sm">
              <span class="text-gray-500">{{ t('payment.tax') }}</span>
              <UInput
                v-model.number="form.tax"
                type="number"
                size="sm"
                class="w-24 text-right"
              />
            </div>
            <UDivider />
            <div class="flex justify-between items-center">
              <span class="font-bold text-lg">{{ t('payment.grandTotal') }}</span>
              <span class="font-bold text-xl text-primary-600">${{ grandTotal.toFixed(2) }}</span>
            </div>
            <div class="space-y-1">
              <div class="flex justify-between items-center text-sm font-bold">
                <span>{{ t('purchase.receivedAmount') }}</span>
                <UInput
                  v-model.number="form.receivedAmount"
                  type="number"
                  size="md"
                  class="w-32"
                />
              </div>
              <div
                class="flex justify-between items-center text-sm font-bold"
                :class="balance > 0 ? 'text-error-600' : 'text-success-600'"
              >
                <span>{{ t('purchase.balance') }}</span>
                <span>${{ Math.abs(balance).toFixed(2) }}</span>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2 pt-2">
              <UButton
                color="primary"
                size="lg"
                class="justify-center font-bold"
                :loading="submitting"
                @click="handleSave"
              >
                <UIcon name="i-lucide-dollar-sign" />
                {{ t('purchase.pay') }}
              </UButton>
              <UButton
                color="neutral"
                variant="outline"
                size="lg"
                class="justify-center font-bold"
              >
                <UIcon name="i-lucide-printer" />
                {{ t('purchase.print') }}
              </UButton>
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Glassmorphism subtle effect */
.dark .UCard {
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(8px);
}
</style>
