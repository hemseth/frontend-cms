<template>
  <div class="h-full flex flex-col font-khmer space-y-3.5 p-1">
    <div>
      <label class="block mb-2 font-bold text-xs text-default uppercase tracking-wider">
        វិធីសាស្រ្តទូទាត់ប្រាក់ (Payment Method)
      </label>

      <!-- Payment Methods Grid -->
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="method in methods"
          :key="method.value"
          type="button"
          class="p-2.5 border rounded-lg text-xs text-center transition-all flex flex-col items-center justify-center gap-1.5 shadow-2xs"
          :class="paymentMethod === method.value
            ? 'bg-primary-500 text-white border-primary-500 font-bold shadow-xs'
            : 'bg-default border-default text-default hover:border-primary-400'"
          @click="selectMethod(method.value)"
        >
          <UIcon :name="method.icon" class="w-5 h-5" />
          <span>{{ method.label }}</span>
        </button>
      </div>
    </div>

    <!-- KHQR Bakong Dynamic Payment Box -->
    <div
      v-if="paymentMethod === 'KHQR' || paymentMethod === 'ABA QR'"
      class="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-gradient-to-b from-rose-50/50 to-white dark:from-rose-950/20 dark:to-gray-900 text-center space-y-2.5"
    >
      <div class="flex items-center justify-center gap-2">
        <div class="px-2 py-0.5 rounded bg-rose-600 text-white text-[11px] font-bold tracking-widest uppercase">
          KHQR
        </div>
        <span class="text-xs font-bold text-highlighted">ស្កេនទូទាត់ប្រាក់ (Bakong / ABA)</span>
      </div>

      <!-- Live Dynamic QR Code -->
      <div class="inline-block p-2 bg-white rounded-xl shadow-md border border-default">
        <img
          :src="qrUrl"
          alt="KHQR Code"
          class="w-40 h-40 mx-auto object-contain rounded-lg"
        >
      </div>

      <div class="text-xs space-y-1">
        <div class="font-bold text-sm text-primary">
          {{ formatCurrency(amount || 0) }} (៛{{ formatKhr(amount || 0) }})
        </div>
        <p class="text-[11px] text-muted">
          គាំទ្រការស្កេនពីគ្រប់ធនាគារក្នុងប្រទេសកម្ពុជា (Bakong, ABA, ACLEDA, Wing, Canadia...)
        </p>
      </div>
    </div>

    <!-- NSSF (ប.ស.ស / HEF) Billing Support Box -->
    <div
      v-else-if="paymentMethod === 'NSSF'"
      class="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-2.5 text-xs"
    >
      <div class="flex items-center gap-2 font-bold text-indigo-700 dark:text-indigo-300">
        <UIcon name="i-lucide-shield-check" class="w-5 h-5 text-indigo-600" />
        <span>ទូទាត់តាមកាត ប.ស.ស (NSSF Coverage)</span>
      </div>

      <div class="space-y-2">
        <div>
          <label class="block font-medium text-toned mb-1">លេខប័ណ្ណ ប.ស.ស (NSSF Card No.) *</label>
          <UInput
            v-model="nssfCardNo"
            placeholder="ឧ. NSSF-88992211"
            size="sm"
            class="w-full"
          />
        </div>
        <div>
          <label class="block font-medium text-toned mb-1">ប្រភេទគ្របដណ្តប់ (Scheme Type)</label>
          <select
            v-model="nssfScheme"
            class="w-full p-2 border border-default rounded-lg bg-default text-xs"
          >
            <option value="health">ថែទាំសុខភាព (Health Care Scheme - 100%)</option>
            <option value="occupational">ហានិភ័យការងារ (Occupational Risk - 100%)</option>
            <option value="hef">មូលនិធិសមធម៌សុខាភិបាល (HEF/IDPoor - 100%)</option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { generateKhqrString, getKhqrQrUrl } from '~/utils/khqr'

const props = defineProps<{
  paymentMethod: string
  amount?: number
}>()

const emit = defineEmits<{
  (e: 'update:paymentMethod', value: string): void
}>()

const methods = [
  { value: 'Cash', label: 'សាច់ប្រាក់ (Cash)', icon: 'i-lucide-banknote' },
  { value: 'KHQR', label: 'KHQR Bakong', icon: 'i-lucide-qr-code' },
  { value: 'NSSF', label: 'ប.ស.ស (NSSF)', icon: 'i-lucide-shield-check' }
]

const nssfCardNo = ref('NSSF-10928374')
const nssfScheme = ref('health')

const qrUrl = computed(() => {
  const payload = generateKhqrString({
    bakongAccountId: 'metrey_hospital@aba',
    merchantName: 'METREY CLINIC & HOSPITAL',
    merchantCity: 'PHNOM PENH',
    amount: props.amount || 25,
    currency: 'USD',
    billNumber: `INV-${Date.now().toString().slice(-6)}`
  })
  return getKhqrQrUrl(payload, 250)
})

function selectMethod(val: string) {
  emit('update:paymentMethod', val)
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0)
}

function formatKhr(val: number) {
  const khr = Math.round((val || 0) * 4100)
  return new Intl.NumberFormat('en-US').format(khr)
}
</script>

<style scoped>
.font-khmer {
  font-family: 'Battambang', 'Noto Sans Khmer', serif;
}
</style>
