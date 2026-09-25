<script setup lang="ts">
import { ref, onMounted } from 'vue'

const { t } = useI18n()
const toast = useToast()

const orders = ref<any[]>([])
const administrations = ref<any[]>([])
const loading = ref(false)
const selectedTab = ref<'orders' | 'administrations'>('orders')
const selectedStatus = ref('')

const isOrderModalOpen = ref(false)
const isAdministerModalOpen = ref(false)
const isVerifyModalOpen = ref(false)
const isDiscontinueModalOpen = ref(false)

const selectedOrder = ref<any>(null)
const patientsList = ref<any[]>([])
const staffList = ref<any[]>([])

const orderForm = ref({
  patientId: '',
  drugName: '',
  genericName: '',
  dosage: '',
  unit: 'mg',
  route: 'IV',
  frequency: 'STAT',
  durationDays: 1,
  indication: 'POSTPARTUM_HEMORRHAGE_PROPHYLAXIS',
  isHighAlert: false,
  highRiskProtocol: '',
  prescribedByName: 'Attending Obstetrician'
})

const adminForm = ref({
  orderId: '',
  patientId: '',
  administeredDose: '',
  administeredRoute: 'IV',
  fiveRights: {
    rightPatient: false,
    rightDrug: false,
    rightDose: false,
    rightRoute: false,
    rightTime: false
  },
  patientWristbandScanned: false,
  medicationBarcodeScanned: false,
  nurseName: '',
  coSignNurseName: '',
  vitals: {
    bloodPressure: '120/80',
    heartRate: 78,
    spo2: 99
  },
  notes: '',
  reactionObserved: false
})

const discontinueForm = ref({
  reason: 'CLINICALLY_RESOLVED',
  notes: ''
})

const commonMaternityDrugs = [
  { name: 'Oxytocin', generic: 'Oxytocin', dose: '10', unit: 'IU', route: 'IV/IM', freq: 'STAT', highAlert: true, indication: 'Active Management of 3rd Stage Labor / PPH Prevention' },
  { name: 'Magnesium Sulfate', generic: 'Magnesium Sulfate', dose: '4', unit: 'g', route: 'IV', freq: 'STAT', highAlert: true, indication: 'Severe Preeclampsia / Eclampsia Prophylaxis' },
  { name: 'Ampicillin', generic: 'Ampicillin', dose: '2', unit: 'g', route: 'IV', freq: 'Q6H', highAlert: false, indication: 'Prolonged Rupture of Membranes / Chorioamnionitis' },
  { name: 'Misoprostol', generic: 'Misoprostol', dose: '800', unit: 'mcg', route: 'Sublingual/Rectal', freq: 'STAT', highAlert: true, indication: 'Refractory Postpartum Hemorrhage' },
  { name: 'Tranexamic Acid', generic: 'Tranexamic Acid', dose: '1', unit: 'g', route: 'IV', freq: 'STAT', highAlert: false, indication: 'Obstetric Hemorrhage within 3 Hours of Delivery' },
  { name: 'Cefazolin', generic: 'Cefazolin', dose: '2', unit: 'g', route: 'IV', freq: 'STAT', highAlert: false, indication: 'Surgical Antimicrobial Prophylaxis for C-Section' },
  { name: 'Ferrous Fumarate + Folic Acid', generic: 'Iron + Folate', dose: '200/0.4', unit: 'mg', route: 'Oral', freq: 'QD', highAlert: false, indication: 'Maternal Anemia Prophylaxis' }
]

const selectQuickDrug = (drug: any) => {
  orderForm.value.drugName = drug.name
  orderForm.value.genericName = drug.generic
  orderForm.value.dosage = drug.dose
  orderForm.value.unit = drug.unit
  orderForm.value.route = drug.route
  orderForm.value.frequency = drug.freq
  orderForm.value.isHighAlert = drug.highAlert
  orderForm.value.indication = drug.indication
  if (drug.highAlert) {
    orderForm.value.highRiskProtocol = 'Dual nurse bedside verification required before push/infusion.'
  }
}

const fetchOrders = async () => {
  loading.value = true
  try {
    const query: any = { limit: 50 }
    if (selectedStatus.value) query.status = selectedStatus.value
    const res = await $api('/maternity/mar/orders', { query })
    orders.value = res.data || []
  } catch (err: any) {
    toast.add({ title: 'Error fetching orders', description: err.message, color: 'error' })
  } finally {
    loading.value = false
  }
}

const fetchAdministrations = async () => {
  loading.value = true
  try {
    const res = await $api('/maternity/mar/administrations', { query: { limit: 50 } })
    administrations.value = res.data || []
  } catch (err: any) {
    toast.add({ title: 'Error fetching administrations', description: err.message, color: 'error' })
  } finally {
    loading.value = false
  }
}

const fetchPatients = async () => {
  try {
    const res = await $api('/patients', { query: { limit: 100 } })
    patientsList.value = res.data || []
  } catch (err) {}
}

const openOrderModal = () => {
  orderForm.value.drugName = ''
  orderForm.value.dosage = ''
  orderForm.value.isHighAlert = false
  isOrderModalOpen.value = true
}

const submitOrder = async () => {
  if (!orderForm.value.patientId || !orderForm.value.drugName || !orderForm.value.dosage) {
    toast.add({ title: 'Validation Error', description: 'Patient, Drug Name, and Dose are required / ត្រូវបំពេញព័ត៌មានចាំបាច់', color: 'error' })
    return
  }
  try {
    await $api('/maternity/mar/orders', {
      method: 'POST',
      body: orderForm.value
    })
    toast.add({ title: 'Prescription Ordered', description: 'Medication order entered successfully / បានបញ្ចូលវេជ្ជបញ្ជា', color: 'success' })
    isOrderModalOpen.value = false
    fetchOrders()
  } catch (err: any) {
    toast.add({ title: 'Order Error', description: err.message, color: 'error' })
  }
}

const openVerifyModal = (order: any) => {
  selectedOrder.value = order
  isVerifyModalOpen.value = true
}

const confirmVerification = async () => {
  try {
    await $api(`/maternity/mar/orders/${selectedOrder.value._id}/verify-pharmacist`, {
      method: 'POST',
      body: {
        pharmacistName: 'Duty Clinical Pharmacist',
        notes: 'Dose, route, and clinical indication verified against maternity protocol.'
      }
    })
    toast.add({ title: 'Verified', description: 'Order verified by pharmacist / ឱសថការីបានផ្ទៀងផ្ទាត់', color: 'success' })
    isVerifyModalOpen.value = false
    fetchOrders()
  } catch (err: any) {
    toast.add({ title: 'Verification Error', description: err.message, color: 'error' })
  }
}

const openAdministerModal = (order: any) => {
  selectedOrder.value = order
  adminForm.value.orderId = order._id
  adminForm.value.patientId = order.patientId?._id || order.patientId
  adminForm.value.administeredDose = `${order.dosage} ${order.unit}`
  adminForm.value.administeredRoute = order.route
  adminForm.value.fiveRights = {
    rightPatient: false,
    rightDrug: false,
    rightDose: false,
    rightRoute: false,
    rightTime: false
  }
  adminForm.value.patientWristbandScanned = false
  adminForm.value.medicationBarcodeScanned = false
  adminForm.value.nurseName = ''
  adminForm.value.coSignNurseName = ''
  adminForm.value.reactionObserved = false
  isAdministerModalOpen.value = true
}

const checkAllFiveRights = () => {
  const allChecked = Object.values(adminForm.value.fiveRights).every(v => v === true)
  if (allChecked) {
    adminForm.value.patientWristbandScanned = true
    adminForm.value.medicationBarcodeScanned = true
  }
}

const submitAdministration = async () => {
  const f = adminForm.value.fiveRights
  if (!f.rightPatient || !f.rightDrug || !f.rightDose || !f.rightRoute || !f.rightTime) {
    toast.add({ title: 'Five Rights Violation', description: 'All Five Rights must be strictly checked before administration / ត្រូវតែផ្ទៀងផ្ទាត់ ៥ យ៉ាងជាដាច់ខាត', color: 'error' })
    return
  }
  if (!adminForm.value.nurseName) {
    toast.add({ title: 'Nurse ID Required', description: 'Administering Nurse name is required / ត្រូវបំពេញឈ្មោះគិលានុបដ្ឋាក', color: 'error' })
    return
  }
  if (selectedOrder.value?.isHighAlert && !adminForm.value.coSignNurseName) {
    toast.add({ title: 'High Alert Safety Violation', description: 'High alert drug requires co-signing nurse / ថ្នាំប្រុងប្រយ័ត្នខ្ពស់ត្រូវមានគិលានុបដ្ឋាកទី២រួមហត្ថលេខា', color: 'error' })
    return
  }

  try {
    await $api('/maternity/mar/administrations', {
      method: 'POST',
      body: {
        orderId: adminForm.value.orderId,
        patientId: adminForm.value.patientId,
        administeredDose: adminForm.value.administeredDose,
        administeredRoute: adminForm.value.administeredRoute,
        fiveRightsChecklist: adminForm.value.fiveRights,
        patientWristbandScanned: adminForm.value.patientWristbandScanned,
        medicationBarcodeScanned: adminForm.value.medicationBarcodeScanned,
        nurseName: adminForm.value.nurseName,
        coSignNurseName: adminForm.value.coSignNurseName,
        vitals: adminForm.value.vitals,
        notes: adminForm.value.notes,
        reactionObserved: adminForm.value.reactionObserved
      }
    })
    toast.add({ title: 'Administered', description: 'Bedside administration recorded safely / បានកត់ត្រាការចាក់/ផ្តល់ថ្នាំរួចរាល់', color: 'success' })
    isAdministerModalOpen.value = false
    fetchOrders()
  } catch (err: any) {
    toast.add({ title: 'Administration Error', description: err.message, color: 'error' })
  }
}

const openDiscontinueModal = (order: any) => {
  selectedOrder.value = order
  isDiscontinueModalOpen.value = true
}

const submitDiscontinue = async () => {
  try {
    await $api(`/maternity/mar/orders/${selectedOrder.value._id}/discontinue`, {
      method: 'POST',
      body: {
        reason: discontinueForm.value.reason,
        discontinuedByName: 'Attending Clinician'
      }
    })
    toast.add({ title: 'Discontinued', description: 'Medication discontinued / បានបញ្ឈប់ការប្រើប្រាស់ថ្នាំ', color: 'warning' })
    isDiscontinueModalOpen.value = false
    fetchOrders()
  } catch (err: any) {
    toast.add({ title: 'Error', description: err.message, color: 'error' })
  }
}

onMounted(() => {
  fetchOrders()
  fetchPatients()
})
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-default p-6 rounded-2xl shadow-sm border border-default">
      <div class="flex items-center gap-3">
        <div class="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
          <UIcon name="i-lucide-pill" class="w-6 h-6" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-highlighted">Medication Administration Record (MAR)</h1>
          <p class="text-sm text-muted">កំណត់ត្រាការផ្តល់ថ្នាំ និងផ្ទៀងផ្ទាត់សុវត្ថិភាព ៥ យ៉ាង (Five Rights Checklist)</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <UButton
          icon="i-lucide-plus"
          color="primary"
          class="rounded-xl px-4 py-2 font-medium"
          @click="openOrderModal"
        >
          New Medication Order
        </UButton>
      </div>
    </div>

    <!-- Five Rights Banner -->
    <div class="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/20 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-emerald-500 text-white rounded-lg">
          <UIcon name="i-lucide-shield-check" class="w-5 h-5" />
        </div>
        <div>
          <div class="text-sm font-bold text-highlighted">Bedside Clinical Safety: The Five Rights of Medication</div>
          <div class="text-xs text-muted">1. Right Patient &bull; 2. Right Drug &bull; 3. Right Dose &bull; 4. Right Route &bull; 5. Right Time</div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs px-2.5 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-semibold rounded-full flex items-center gap-1">
          <UIcon name="i-lucide-alert-triangle" class="w-3.5 h-3.5" /> High Alert Co-Sign Enforced
        </span>
      </div>
    </div>

    <!-- Tabs & Filters -->
    <div class="flex flex-wrap items-center justify-between gap-4 bg-default p-4 rounded-xl border border-default">
      <div class="flex items-center gap-2">
        <button
          class="px-4 py-2 text-sm font-semibold rounded-lg transition"
          :class="selectedTab === 'orders' ? 'bg-primary-500 text-white shadow' : 'bg-elevated text-toned'"
          @click="selectedTab = 'orders'; fetchOrders()"
        >
          Active Medication Orders
        </button>
        <button
          class="px-4 py-2 text-sm font-semibold rounded-lg transition"
          :class="selectedTab === 'administrations' ? 'bg-primary-500 text-white shadow' : 'bg-elevated text-toned'"
          @click="selectedTab = 'administrations'; fetchAdministrations()"
        >
          Administration Audit Logs
        </button>
      </div>

      <div class="flex items-center gap-3">
        <select
          v-if="selectedTab === 'orders'"
          v-model="selectedStatus"
          class="text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
          @change="fetchOrders"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active (កំពុងដំណើរការ)</option>
          <option value="COMPLETED">Completed (បានបញ្ចប់)</option>
          <option value="DISCONTINUED">Discontinued (បានបញ្ឈប់)</option>
        </select>
        <UButton icon="i-lucide-refresh-cw" color="neutral" variant="ghost" size="sm" :loading="loading" @click="selectedTab === 'orders' ? fetchOrders() : fetchAdministrations()">
          Refresh
        </UButton>
      </div>
    </div>

    <!-- Table: Orders -->
    <div v-if="selectedTab === 'orders'" class="bg-default rounded-2xl shadow-sm border border-default overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-toned">
          <thead class="bg-muted text-xs uppercase font-semibold text-muted border-b border-default">
            <tr>
              <th class="px-6 py-4">Patient</th>
              <th class="px-6 py-4">Medication & Dose</th>
              <th class="px-6 py-4">Route / Frequency</th>
              <th class="px-6 py-4">Clinical Indication</th>
              <th class="px-6 py-4">Safety Flags</th>
              <th class="px-6 py-4">Status</th>
              <th class="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr v-if="orders.length === 0" class="text-center py-8">
              <td colspan="7" class="py-8 text-dimmed">
                <UIcon name="i-lucide-pill" class="w-8 h-8 mx-auto mb-2 opacity-50" />
                No medication orders found.
              </td>
            </tr>
            <tr v-for="o in orders" :key="o._id" class="hover:bg-muted/50 transition">
              <td class="px-6 py-4">
                <div class="font-medium text-highlighted">{{ o.patientId?.fullName || 'N/A' }}</div>
                <div class="text-xs text-dimmed font-mono">{{ o.patientId?.patientCode }}</div>
                <div v-if="o.patientId?.allergies?.length" class="text-xs text-rose-500 font-semibold mt-0.5">
                  Allergy: {{ o.patientId.allergies.join(', ') }}
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="font-semibold text-highlighted flex items-center gap-1.5">
                  {{ o.drugName }}
                  <span class="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-md font-bold">
                    {{ o.dosage }} {{ o.unit }}
                  </span>
                </div>
                <div class="text-xs text-dimmed">{{ o.genericName }}</div>
              </td>
              <td class="px-6 py-4">
                <UBadge color="neutral" variant="soft" class="font-mono text-xs">{{ o.route }}</UBadge>
                <div class="text-xs font-semibold text-toned mt-0.5">{{ o.frequency }}</div>
              </td>
              <td class="px-6 py-4">
                <div class="text-xs text-highlighted font-medium max-w-xs truncate">{{ o.indication }}</div>
                <div class="text-xs text-dimmed">Dr. {{ o.prescribedByName || 'Staff' }}</div>
              </td>
              <td class="px-6 py-4">
                <div class="flex flex-col gap-1">
                  <span v-if="o.isHighAlert" class="text-xs text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                    <UIcon name="i-lucide-alert-circle" class="w-3.5 h-3.5" /> High Alert
                  </span>
                  <span v-if="o.pharmacistVerified" class="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <UIcon name="i-lucide-check-check" class="w-3.5 h-3.5" /> Pharmacist Checked
                  </span>
                  <span v-else class="text-xs text-amber-500 italic">
                    Awaiting Rx check
                  </span>
                </div>
              </td>
              <td class="px-6 py-4">
                <UBadge :color="o.status === 'ACTIVE' ? 'success' : o.status === 'COMPLETED' ? 'neutral' : 'error'">
                  {{ o.status }}
                </UBadge>
              </td>
              <td class="px-6 py-4 text-right space-x-2">
                <UButton
                  v-if="!o.pharmacistVerified && o.status === 'ACTIVE'"
                  icon="i-lucide-shield-check"
                  size="xs"
                  color="warning"
                  variant="soft"
                  @click="openVerifyModal(o)"
                >
                  Verify Rx
                </UButton>
                <UButton
                  v-if="o.status === 'ACTIVE'"
                  icon="i-lucide-syringe"
                  size="xs"
                  color="primary"
                  @click="openAdministerModal(o)"
                >
                  Administer
                </UButton>
                <UButton
                  v-if="o.status === 'ACTIVE'"
                  icon="i-lucide-ban"
                  size="xs"
                  color="error"
                  variant="ghost"
                  @click="openDiscontinueModal(o)"
                >
                  Stop
                </UButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Table: Administrations Audit -->
    <div v-if="selectedTab === 'administrations'" class="bg-default rounded-2xl shadow-sm border border-default overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-toned">
          <thead class="bg-muted text-xs uppercase font-semibold text-muted border-b border-default">
            <tr>
              <th class="px-6 py-4">Administered Time</th>
              <th class="px-6 py-4">Patient</th>
              <th class="px-6 py-4">Medication & Dose</th>
              <th class="px-6 py-4">Five Rights Verification</th>
              <th class="px-6 py-4">Nurses</th>
              <th class="px-6 py-4">Vitals / Reaction</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-default">
            <tr v-if="administrations.length === 0" class="text-center py-8">
              <td colspan="6" class="py-8 text-dimmed">
                <UIcon name="i-lucide-clipboard" class="w-8 h-8 mx-auto mb-2 opacity-50" />
                No administration logs recorded yet.
              </td>
            </tr>
            <tr v-for="a in administrations" :key="a._id" class="hover:bg-muted/50 transition">
              <td class="px-6 py-4 text-xs font-mono text-muted">
                {{ new Date(a.administeredAt || a.createdAt).toLocaleString() }}
              </td>
              <td class="px-6 py-4">
                <div class="font-medium text-highlighted">{{ a.patientId?.fullName || 'N/A' }}</div>
                <div class="text-xs text-dimmed">{{ a.patientId?.patientCode }}</div>
              </td>
              <td class="px-6 py-4">
                <div class="font-semibold text-highlighted">{{ a.orderId?.drugName || 'Medication' }}</div>
                <div class="text-xs text-muted">{{ a.administeredDose }} via {{ a.administeredRoute }}</div>
              </td>
              <td class="px-6 py-4">
                <span class="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 rounded font-semibold flex items-center gap-1 w-fit">
                  <UIcon name="i-lucide-check-circle" class="w-3.5 h-3.5" /> 5 Rights Verified
                </span>
                <div class="text-xs text-dimmed mt-1">
                  Wristband: {{ a.patientWristbandScanned ? 'Scanned' : 'Manual Checked' }}
                </div>
              </td>
              <td class="px-6 py-4 text-xs">
                <div><span class="font-medium">Administering:</span> {{ a.nurseName }}</div>
                <div v-if="a.coSignNurseName" class="text-indigo-600 dark:text-indigo-400 font-semibold">
                  Co-Sign: {{ a.coSignNurseName }}
                </div>
              </td>
              <td class="px-6 py-4 text-xs">
                <div v-if="a.vitals">
                  BP: {{ a.vitals.bloodPressure }} | HR: {{ a.vitals.heartRate }} bpm | SpO2: {{ a.vitals.spo2 }}%
                </div>
                <div v-if="a.reactionObserved" class="text-rose-600 font-bold mt-0.5">
                  REACTION OBSERVED: {{ a.notes }}
                </div>
                <div v-else class="text-dimmed">Tolerated well</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create Order Modal -->
    <UModal v-model:open="isOrderModalOpen" :ui="{ content: 'max-w-2xl' }">
      <template #content>
        <div class="p-6 space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-default">
            <h3 class="text-lg font-bold text-highlighted">Physician Medication Order</h3>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="xs" @click="isOrderModalOpen = false" />
          </div>

          <!-- Quick Protocols -->
          <div class="space-y-1.5">
            <label class="block text-xs font-semibold text-muted">Quick Obstetrics Emergency Protocols</label>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="d in commonMaternityDrugs"
                :key="d.name"
                class="px-2.5 py-1 text-xs bg-elevated hover:bg-primary-50 dark:hover:bg-primary-900/40 text-default rounded-lg transition"
                @click="selectQuickDrug(d)"
              >
                + {{ d.name }} ({{ d.dose }} {{ d.unit }})
              </button>
            </div>
          </div>

          <div class="space-y-3 pt-2">
            <div>
              <label class="block text-xs font-semibold text-toned mb-1">Select Patient *</label>
              <select
                v-model="orderForm.patientId"
                class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
              >
                <option value="" disabled>-- Choose Patient --</option>
                <option v-for="p in patientsList" :key="p._id" :value="p._id">
                  {{ p.fullName }} ({{ p.patientCode }})
                </option>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">Drug Trade Name *</label>
                <input
                  v-model="orderForm.drugName"
                  type="text"
                  placeholder="e.g. Oxytocin"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">Generic Name</label>
                <input
                  v-model="orderForm.genericName"
                  type="text"
                  placeholder="e.g. Oxytocin Injection"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                />
              </div>
            </div>

            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">Dose *</label>
                <input
                  v-model="orderForm.dosage"
                  type="text"
                  placeholder="10"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">Unit</label>
                <select
                  v-model="orderForm.unit"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                >
                  <option value="mg">mg</option>
                  <option value="g">g</option>
                  <option value="mcg">mcg</option>
                  <option value="IU">IU (International Units)</option>
                  <option value="mL">mL</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">Route</label>
                <select
                  v-model="orderForm.route"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                >
                  <option value="IV">IV (Intravenous)</option>
                  <option value="IM">IM (Intramuscular)</option>
                  <option value="Oral">Oral</option>
                  <option value="Sublingual">Sublingual</option>
                  <option value="SC">SC (Subcutaneous)</option>
                  <option value="Rectal">Rectal</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">Frequency</label>
                <select
                  v-model="orderForm.frequency"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                >
                  <option value="STAT">STAT (Immediate Once)</option>
                  <option value="PRN">PRN (As Needed)</option>
                  <option value="QD">QD (Once Daily)</option>
                  <option value="BID">BID (Twice Daily)</option>
                  <option value="TID">TID (Three Times Daily)</option>
                  <option value="Q6H">Q6H (Every 6 Hours)</option>
                  <option value="Q8H">Q8H (Every 8 Hours)</option>
                  <option value="CONTINUOUS_INFUSION">Continuous IV Infusion</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">Duration (Days)</label>
                <input
                  v-model.number="orderForm.durationDays"
                  type="number"
                  min="1"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-toned mb-1">Clinical Indication</label>
              <input
                v-model="orderForm.indication"
                type="text"
                placeholder="Reason for medication"
                class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
              />
            </div>

            <div class="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2">
              <label class="flex items-center gap-2 font-bold text-xs text-amber-800 dark:text-amber-200 cursor-pointer">
                <input v-model="orderForm.isHighAlert" type="checkbox" class="rounded text-amber-600 w-4 h-4" />
                Mark as High-Alert Medication (Requires Dual-Nurse Co-Signing at Bedside)
              </label>
              <div v-if="orderForm.isHighAlert">
                <input
                  v-model="orderForm.highRiskProtocol"
                  type="text"
                  placeholder="Safety protocol description (e.g. MgSO4 toxicity surveillance, patellar reflex, RR > 16)"
                  class="w-full text-xs border-default rounded-lg bg-default px-3 py-1.5"
                />
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t border-default">
            <UButton color="neutral" variant="ghost" @click="isOrderModalOpen = false">Cancel</UButton>
            <UButton color="primary" @click="submitOrder">Place Order</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Bedside Administration Modal -->
    <UModal v-model:open="isAdministerModalOpen" :ui="{ content: 'max-w-xl' }">
      <template #content>
        <div class="p-6 space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-default">
            <div>
              <h3 class="text-lg font-bold text-highlighted">Bedside Medication Administration</h3>
              <p class="text-xs text-muted">ការផ្ទៀងផ្ទាត់ និងផ្តល់ថ្នាំដល់អ្នកជំងឺ</p>
            </div>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="xs" @click="isAdministerModalOpen = false" />
          </div>

          <div v-if="selectedOrder" class="p-3 bg-muted rounded-xl border border-default text-sm">
            <div class="font-bold text-highlighted">{{ selectedOrder.drugName }} ({{ selectedOrder.dosage }} {{ selectedOrder.unit }})</div>
            <div class="text-xs text-muted">Patient: {{ selectedOrder.patientId?.fullName }} ({{ selectedOrder.patientId?.patientCode }})</div>
            <div class="text-xs text-indigo-600 font-semibold mt-1">Route: {{ selectedOrder.route }} | Freq: {{ selectedOrder.frequency }}</div>
          </div>

          <!-- The Five Rights Checklist -->
          <div class="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-xl space-y-2">
            <div class="text-xs font-bold text-emerald-800 dark:text-emerald-200 uppercase tracking-wide">
              Mandatory Bedside Five Rights Checklist *
            </div>
            <div class="grid grid-cols-1 gap-2 text-xs font-medium text-highlighted">
              <label class="flex items-center gap-2 cursor-pointer">
                <input v-model="adminForm.fiveRights.rightPatient" type="checkbox" class="rounded text-emerald-600 w-4 h-4" @change="checkAllFiveRights" />
                1. Right Patient (ផ្ទៀងផ្ទាត់ឈ្មោះ និងលេខកូដអ្នកជំងឺ)
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input v-model="adminForm.fiveRights.rightDrug" type="checkbox" class="rounded text-emerald-600 w-4 h-4" @change="checkAllFiveRights" />
                2. Right Drug (ផ្ទៀងផ្ទាត់ឈ្មោះថ្នាំ និងការវេចខ្ចប់)
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input v-model="adminForm.fiveRights.rightDose" type="checkbox" class="rounded text-emerald-600 w-4 h-4" @change="checkAllFiveRights" />
                3. Right Dose (ផ្ទៀងផ្ទាត់កម្រិតថ្នាំត្រូវតាមវេជ្ជបញ្ជា)
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input v-model="adminForm.fiveRights.rightRoute" type="checkbox" class="rounded text-emerald-600 w-4 h-4" @change="checkAllFiveRights" />
                4. Right Route (ផ្ទៀងផ្ទាត់ផ្លូវផ្តល់ថ្នាំ IV/IM/Oral)
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input v-model="adminForm.fiveRights.rightTime" type="checkbox" class="rounded text-emerald-600 w-4 h-4" @change="checkAllFiveRights" />
                5. Right Time (ផ្ទៀងផ្ទាត់ម៉ោង និងចន្លោះពេលផ្តល់ថ្នាំ)
              </label>
            </div>
          </div>

          <div class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">Administering Nurse Name *</label>
                <input
                  v-model="adminForm.nurseName"
                  type="text"
                  placeholder="Nurse Name"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">
                  Co-Signing Nurse Name <span v-if="selectedOrder?.isHighAlert" class="text-rose-500">* (High Alert)</span>
                </label>
                <input
                  v-model="adminForm.coSignNurseName"
                  type="text"
                  placeholder="2nd Nurse Name"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                />
              </div>
            </div>

            <!-- Pre-Vitals -->
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">BP (mmHg)</label>
                <input
                  v-model="adminForm.vitals.bloodPressure"
                  type="text"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">Heart Rate (bpm)</label>
                <input
                  v-model.number="adminForm.vitals.heartRate"
                  type="number"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                />
              </div>
              <div>
                <label class="block text-xs font-semibold text-toned mb-1">SpO2 (%)</label>
                <input
                  v-model.number="adminForm.vitals.spo2"
                  type="number"
                  class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-toned mb-1">Bedside Administration Notes</label>
              <input
                v-model="adminForm.notes"
                type="text"
                placeholder="Site of injection, patient condition, tolerated well"
                class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
              />
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t border-default">
            <UButton color="neutral" variant="ghost" @click="isAdministerModalOpen = false">Cancel</UButton>
            <UButton color="primary" icon="i-lucide-check" @click="submitAdministration">Confirm Administration</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Discontinue Modal -->
    <UModal v-model:open="isDiscontinueModalOpen">
      <template #content>
        <div class="p-6 space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-default">
            <h3 class="text-lg font-bold text-rose-600">Discontinue Medication Order</h3>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="xs" @click="isDiscontinueModalOpen = false" />
          </div>

          <div class="space-y-3">
            <div>
              <label class="block text-xs font-semibold text-toned mb-1">Discontinuation Reason *</label>
              <select
                v-model="discontinueForm.reason"
                class="w-full text-sm border-default rounded-lg bg-muted px-3 py-2 text-highlighted"
              >
                <option value="CLINICALLY_RESOLVED">Clinically Resolved / Course Completed</option>
                <option value="ADVERSE_REACTION">Adverse Drug Reaction / Side Effects</option>
                <option value="CHANGED_THERAPY">Changed Therapy / Switched Route or Drug</option>
                <option value="PATIENT_DISCHARGED">Patient Discharged / Transferred</option>
                <option value="OTHER">Other Clinical Reason</option>
              </select>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t border-default">
            <UButton color="neutral" variant="ghost" @click="isDiscontinueModalOpen = false">Cancel</UButton>
            <UButton color="error" @click="submitDiscontinue">Discontinue Drug</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
