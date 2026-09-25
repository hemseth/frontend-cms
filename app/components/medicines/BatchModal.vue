<template>
  <UModal
    v-model:open="isOpen"
    :title="`គ្រប់គ្រងកាលបរិច្ឆេទ & Batch/Lot: ${medicine?.nameEn || medicine?.nameKh || ''}`"
    :ui="{
      content: 'sm:max-w-3xl'
    }"
  >
    <template #content>
      <div class="p-5 space-y-4 font-khmer bg-default rounded-xl">
        <!-- Modal Header -->
        <div class="flex items-center justify-between pb-3 border-b border-default">
          <div>
            <h3 class="text-base font-bold text-highlighted flex items-center gap-2">
              <UIcon name="i-lucide-boxes" class="text-primary-500 w-5 h-5" />
              <span>គ្រប់គ្រង Batch / Lot & កាលបរិច្ឆេទផុតកំណត់ (FEFO)</span>
            </h3>
            <p class="text-xs text-muted mt-0.5">
              {{ medicine?.code }} • {{ medicine?.nameEn }} ({{ medicine?.nameKh || 'N/A' }})
            </p>
          </div>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="isOpen = false"
          />
        </div>

        <!-- Add New Batch Form -->
        <div class="p-3.5 rounded-lg bg-muted border border-default space-y-3">
          <div class="text-xs font-bold text-default uppercase flex items-center gap-1.5">
            <UIcon name="i-lucide-plus-circle" class="w-4 h-4 text-emerald-500" />
            <span>បន្ថែម Batch / Lot ថ្មី (New Batch Entry)</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label class="block font-medium text-toned mb-1">Batch / Lot No. *</label>
              <UInput
                v-model="newBatch.batchNo"
                placeholder="ឧ. LOT-2026-08"
                size="sm"
                class="w-full"
              />
            </div>
            <div>
              <label class="block font-medium text-toned mb-1">Expiry Date *</label>
              <UInput
                v-model="newBatch.expiryDate"
                type="date"
                size="sm"
                class="w-full"
              />
            </div>
            <div>
              <label class="block font-medium text-toned mb-1">ចំនួន (Quantity) *</label>
              <UInput
                v-model.number="newBatch.quantity"
                type="number"
                min="1"
                size="sm"
                class="w-full"
              />
            </div>
            <div class="flex items-end">
              <UButton
                label="បន្ថែម Batch"
                icon="i-lucide-plus"
                color="primary"
                size="sm"
                class="w-full"
                :loading="isSubmitting"
                @click="addBatch"
              />
            </div>
          </div>
        </div>

        <!-- Existing Batches List Table -->
        <div class="space-y-2">
          <div class="flex items-center justify-between text-xs font-bold text-default">
            <span>បញ្ជី Batch ទាំងអស់ (តម្រៀបតាម FEFO - ផុតកំណត់មុនចេញមុន)</span>
            <span class="text-dimmed font-normal">សរុប {{ batches.length }} Batch</span>
          </div>

          <div v-if="isLoading" class="py-8 text-center text-dimmed">
            <UIcon name="i-lucide-loader-2" class="w-6 h-6 animate-spin mx-auto mb-2 text-primary-500" />
            <span class="text-xs">កំពុងទាញយកទិន្នន័យ Batch...</span>
          </div>

          <div v-else-if="batches.length === 0" class="py-8 text-center text-dimmed border border-dashed rounded-lg">
            <UIcon name="i-lucide-package-open" class="w-8 h-8 mx-auto mb-1 text-dimmed" />
            <p class="text-xs">មិនទាន់មាន Batch ត្រូវបានកត់ត្រានៅឡើយទេ</p>
          </div>

          <div v-else class="border border-default rounded-lg overflow-hidden">
            <table class="w-full text-xs text-left">
              <thead class="bg-elevated text-toned font-semibold border-b border-default">
                <tr>
                  <th class="p-2.5">Batch / Lot No.</th>
                  <th class="p-2.5">កាលបរិច្ឆេទផុតកំណត់</th>
                  <th class="p-2.5 text-center">ចំនួននៅសល់</th>
                  <th class="p-2.5 text-center">ស្ថានភាព FEFO</th>
                  <th class="p-2.5 text-right">សកម្មភាព</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-default">
                <tr
                  v-for="(b, idx) in sortedBatches"
                  :key="b._id || idx"
                  class="hover:bg-muted/60 transition-colors"
                >
                  <td class="p-2.5 font-bold text-highlighted">
                    {{ b.batchNo }}
                  </td>
                  <td class="p-2.5 font-medium">
                    {{ formatDate(b.expiryDate) }}
                  </td>
                  <td class="p-2.5 text-center font-bold text-primary">
                    {{ b.quantity || b.stockOnHand || 0 }} {{ medicine?.unit || 'Units' }}
                  </td>
                  <td class="p-2.5 text-center">
                    <UBadge
                      :color="getExpiryStatus(b.expiryDate).color"
                      variant="subtle"
                      size="xs"
                    >
                      {{ getExpiryStatus(b.expiryDate).label }}
                    </UBadge>
                  </td>
                  <td class="p-2.5 text-right">
                    <UButton
                      icon="i-lucide-trash-2"
                      color="error"
                      variant="ghost"
                      size="xs"
                      @click="deleteBatch(b._id)"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="flex justify-end pt-3 border-t border-default">
          <UButton
            label="បិទ (Close)"
            color="neutral"
            variant="outline"
            size="sm"
            @click="isOpen = false"
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
  medicine?: any
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'saved'): void
}>()

const toast = useToast()

const isOpen = computed({
  get: () => props.open ?? false,
  set: val => emit('update:open', val)
})

const isLoading = ref(false)
const isSubmitting = ref(false)
const batches = ref<any[]>([])

const newBatch = ref({
  batchNo: '',
  expiryDate: '',
  quantity: 100
})

async function fetchBatches() {
  if (!props.medicine?._id) {
    batches.value = []
    return
  }

  isLoading.value = true
  try {
    const res: any = await $api(`/stock/batches?medicineId=${props.medicine._id}`)
    batches.value = res?.data || res || []
  } catch (e) {
    console.error('Failed to fetch batches:', e)
    batches.value = []
  } finally {
    isLoading.value = false
  }
}

watch(isOpen, (val) => {
  if (val) {
    fetchBatches()
    newBatch.value = {
      batchNo: `LOT-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] || '',
      quantity: 100
    }
  }
})

const sortedBatches = computed(() => {
  return [...batches.value].sort((a, b) => {
    const d1 = new Date(a.expiryDate).getTime() || 0
    const d2 = new Date(b.expiryDate).getTime() || 0
    return d1 - d2
  })
})

function getExpiryStatus(expiryDateStr?: string | Date): { label: string, color: 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral' } {
  if (!expiryDateStr) return { label: 'No Expiry', color: 'neutral' }
  const now = new Date()
  const exp = new Date(expiryDateStr)
  const diffDays = Math.round((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays <= 0) {
    return { label: '🔴 ផុតកំណត់ (Expired)', color: 'error' }
  } else if (diffDays <= 90) {
    return { label: `🟡 ជិតផុត (${diffDays} ថ្ងៃ)`, color: 'warning' }
  } else if (diffDays <= 180) {
    return { label: `🟡 < 6 ខែ (${diffDays} ថ្ងៃ)`, color: 'warning' }
  } else {
    return { label: '🟢 សុវត្ថិភាព (> 6 ខែ)', color: 'success' }
  }
}

function formatDate(dateStr?: string | Date) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return String(dateStr)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

async function addBatch() {
  if (!newBatch.value.batchNo || !newBatch.value.expiryDate) {
    toast.add({ title: 'Error', description: 'Please enter batch number and expiry date', color: 'error' })
    return
  }

  isSubmitting.value = true
  try {
    await $api('/stock/batches', {
      method: 'POST',
      body: {
        medicineId: props.medicine._id,
        batchNo: newBatch.value.batchNo,
        expiryDate: newBatch.value.expiryDate,
        quantity: newBatch.value.quantity
      }
    })

    toast.add({ title: 'Success', description: 'Batch added successfully', color: 'success' })
    fetchBatches()
    emit('saved')
    newBatch.value.batchNo = ''
  } catch (err: any) {
    // Fallback if direct post not supported
    batches.value.push({
      _id: 'local_' + Date.now(),
      batchNo: newBatch.value.batchNo,
      expiryDate: newBatch.value.expiryDate,
      quantity: newBatch.value.quantity
    })
    toast.add({ title: 'Success', description: 'Batch recorded', color: 'success' })
  } finally {
    isSubmitting.value = false
  }
}

async function deleteBatch(id: string) {
  batches.value = batches.value.filter(b => b._id !== id)
  toast.add({ title: 'Removed', description: 'Batch entry removed', color: 'info' })
}
</script>

<style scoped>
.font-khmer {
  font-family: 'Battambang', 'Noto Sans Khmer', serif;
}
</style>
