<template>
  <div class="max-w-4xl mx-auto p-8 bg-white text-black font-khmer space-y-6 print:p-0 print:m-0">
    <!-- Action Bar (Hidden on print) -->
    <div class="flex items-center justify-between pb-4 border-b border-gray-200 print:hidden">
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-file-text" class="w-5 h-5 text-primary-500" />
        <span class="font-bold">ទម្រង់ស្នើសុំសំណងថ្លៃព្យាបាល ប.ស.ស (NSSF Official Claim Form)</span>
      </div>
      <div class="flex items-center gap-2">
        <UButton
          label="ត្រឡប់ក្រោយ"
          color="neutral"
          variant="outline"
          size="sm"
          @click="$router.back()"
        />
        <UButton
          label="បោះពុម្ព (Print)"
          icon="i-lucide-printer"
          color="primary"
          size="sm"
          :disabled="!invoice"
          @click="printDoc"
        />
      </div>
    </div>

    <div v-if="isLoading" class="py-16 text-center text-gray-400 print:hidden">
      <UIcon name="i-lucide-loader-2" class="w-8 h-8 animate-spin mx-auto" />
    </div>
    <UAlert
      v-else-if="errorMsg"
      color="error"
      variant="subtle"
      icon="i-lucide-circle-alert"
      :title="errorMsg"
    />

    <template v-else-if="invoice">
      <UAlert
        v-if="!nssfNumber"
        class="print:hidden"
        color="warning"
        variant="subtle"
        icon="i-lucide-triangle-alert"
        title="អ្នកជំងឺនេះមិនមានលេខប័ណ្ណ ប.ស.ស ទេ (This patient has no NSSF member number on file)"
      />

      <!-- Official Header -->
      <div class="text-center space-y-1">
        <h2 class="text-sm font-bold tracking-widest uppercase">
          ព្រះរាជាណាចក្រកម្ពុជា
        </h2>
        <h3 class="text-xs font-bold tracking-wider">
          ជាតិ សាសនា ព្រះមហាក្សត្រ
        </h3>
        <div class="pt-2">
          <h1 class="text-base font-bold text-gray-900 uppercase">
            ប័ណ្ណស្នើសុំទូទាត់សំណងសេវាព្យាបាល និងថែទាំវេជ្ជសាស្ត្រ
          </h1>
          <p class="text-xs text-gray-600">
            បេឡាជាតិសន្តិសុខសង្គម (National Social Security Fund - NSSF)
          </p>
        </div>
      </div>

      <!-- Health Facility & Member Details -->
      <div class="border border-gray-400 rounded p-4 text-xs space-y-3">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <span class="font-semibold text-gray-600">ឈ្មោះមូលដ្ឋានសុខាភិបាល៖</span>
            <span class="font-bold ml-2">{{ profile.title }}<template v-if="profile.subtitle"> ({{ profile.subtitle }})</template></span>
          </div>
          <div>
            <!-- The facility's NSSF contract number is not stored in the system; it is filled in by hand. -->
            <span class="font-semibold text-gray-600">លេខកូដកិច្ចសន្យា៖</span>
            <span class="inline-block ml-2 w-40 border-b border-dotted border-gray-500">&nbsp;</span>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-4 pt-2 border-t border-gray-200">
          <div>
            <span class="font-semibold text-gray-600">ឈ្មោះសមាជិក ប.ស.ស៖</span>
            <span class="font-bold ml-2">{{ patientName }}</span>
          </div>
          <div>
            <span class="font-semibold text-gray-600">ភេទ៖</span>
            <span class="font-bold ml-2">{{ gender || '-' }}</span>
          </div>
          <div>
            <span class="font-semibold text-gray-600">លេខប័ណ្ណ ប.ស.ស៖</span>
            <span class="font-bold ml-2 text-indigo-700">{{ nssfNumber || '-' }}</span>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200">
          <div>
            <span class="font-semibold text-gray-600">កាលបរិច្ឆេទចូលពិនិត្យ៖</span>
            <span class="font-bold ml-2">{{ formatDate(invoice.visit?.dateIn || invoice.date) }}</span>
          </div>
          <div>
            <span class="font-semibold text-gray-600">ផ្នែកពិនិត្យ៖</span>
            <span class="font-bold ml-2">{{ department }}</span>
          </div>
        </div>
      </div>

      <!-- Clinical Details & Diagnosis -->
      <div class="border border-gray-400 rounded p-4 text-xs space-y-2">
        <h4 class="font-bold text-gray-800 uppercase">
          ១. រោគវិនិច្ឆ័យ (Diagnosis / ICD-10)
        </h4>
        <p class="font-medium pl-4">
          {{ diagnosis || '-' }}
        </p>
      </div>

      <!-- Services & Medications Claim Table -->
      <div class="border border-gray-400 rounded overflow-hidden text-xs">
        <table class="w-full text-left">
          <thead class="bg-gray-100 font-bold border-b border-gray-400">
            <tr>
              <th class="p-2 border-r border-gray-300">
                ល.រ
              </th>
              <th class="p-2 border-r border-gray-300">
                បរិយាយសេវា / ថ្នាំព្យាបាល
              </th>
              <th class="p-2 border-r border-gray-300 text-center">
                ចំនួន
              </th>
              <th class="p-2 border-r border-gray-300 text-right">
                តម្លៃឯកតា
              </th>
              <th class="p-2 text-right">
                សរុប
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-300">
            <tr v-for="(item, idx) in invoice.items" :key="idx">
              <td class="p-2 border-r border-gray-300 text-center">
                {{ Number(idx) + 1 }}
              </td>
              <td class="p-2 border-r border-gray-300 font-medium">
                {{ item.name }}
              </td>
              <td class="p-2 border-r border-gray-300 text-center">
                {{ item.quantity || 1 }}
              </td>
              <td class="p-2 border-r border-gray-300 text-right">
                {{ formatMoney(item.price) }}
              </td>
              <td class="p-2 text-right font-bold">
                {{ formatMoney(item.subtotal ?? (item.price * (item.quantity || 1))) }}
              </td>
            </tr>
          </tbody>
          <tfoot class="bg-gray-50 font-bold border-t border-gray-400">
            <tr>
              <td colspan="4" class="p-2 text-right border-r border-gray-300">
                សរុបទឹកប្រាក់ស្នើសុំទូទាត់ពី ប.ស.ស (Total NSSF Claim):
              </td>
              <td class="p-2 text-right text-indigo-700 text-sm">
                {{ formatMoney(invoice.total) }}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Signatures -->
      <div class="grid grid-cols-3 gap-8 pt-8 text-center text-xs">
        <div class="space-y-16">
          <span class="font-bold">ហត្ថលេខាសមាជិក / អ្នកជំងឺ</span>
          <div class="border-t border-gray-400 pt-1 font-medium">
            {{ patientName }}
          </div>
        </div>
        <div class="space-y-16">
          <span class="font-bold">គ្រូពេទ្យព្យាបាល</span>
          <div class="border-t border-gray-400 pt-1 font-medium">
&nbsp;
          </div>
        </div>
        <div class="space-y-16">
          <span class="font-bold">ប្រធានមន្ទីរពេទ្យ / គណនេយ្យ</span>
          <div class="border-t border-gray-400 pt-1 font-medium">
            ហត្ថលេខា និងត្រា
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// The route id is the payment (invoice) id, the same one /print/invoice/[id] takes.
const route = useRoute()
const { profile, load: loadProfile } = useClinicProfile()
const invoice = ref<any>(null)
const isLoading = ref(true)
const errorMsg = ref('')

const DEPARTMENTS: Record<string, string> = {
  opd: 'OPD / ពិគ្រោះជំងឺក្រៅ',
  ipd: 'IPD / សម្រាកព្យាបាល',
  laboratory: 'មន្ទីរពិសោធន៍ (Laboratory)',
  pharmacy: 'ឱសថស្ថាន (Pharmacy)'
}

const patient = computed(() => invoice.value?.patient || {})
const patientName = computed(() => patient.value.nameKh || patient.value.nameEn || patient.value.name || '')
const nssfNumber = computed(() => patient.value.nssfMemberNumber || '')
const gender = computed(() => patient.value.gender == 2 ? 'ស្រី' : patient.value.gender == 1 ? 'ប្រុស' : '')
const department = computed(() => DEPARTMENTS[invoice.value?.visit?.department] || '-')
const diagnosis = computed(() => (invoice.value?.visit?.diagnosis || [])
  .filter((dx: any) => dx.status !== 'ruled-out')
  .map((dx: any) => [dx.code, dx.nameKh || dx.nameEn].filter(Boolean).join(' • '))
  .filter(Boolean)
  .join(', '))

function formatMoney(value: unknown) {
  const currency = invoice.value?.currency || 'USD'
  return new Intl.NumberFormat(currency === 'KHR' ? 'km-KH' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'KHR' ? 0 : 2,
    maximumFractionDigits: currency === 'KHR' ? 0 : 2
  }).format(Number(value || 0))
}

function formatDate(date: any) {
  if (!date) return '-'
  const d = new Date(date)
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`
}

onMounted(async () => {
  await loadProfile()
  try {
    const res: any = await $api(`/reports/invoice/${route.params.id}`)
    invoice.value = res?.data || null
    if (!invoice.value) errorMsg.value = 'រកមិនឃើញវិក្កយបត្រនេះទេ (Invoice not found)'
  } catch (err: any) {
    errorMsg.value = getApiErrorMessage(err, 'រកមិនឃើញវិក្កយបត្រនេះទេ (Invoice not found)')
  } finally {
    isLoading.value = false
  }
})

function printDoc() {
  window.print()
}
</script>
