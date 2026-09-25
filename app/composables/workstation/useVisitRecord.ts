import { ref } from 'vue'
import type { LabOrder, PrescriptionLine, VisitDetail, Vitals, VisitDiagnosis, PaymentItem } from '~/types/workstation'

/**
 * One visit as a workstation sees it, plus the narrow writes each department is allowed to make.
 * Each write sends only that department's fields; nothing here uses POST /opd/transaction, which
 * re-syncs the whole visit and would overwrite other departments' lines.
 */
export function useVisitRecord() {
  const visit = ref<VisitDetail | null>(null)
  const isLoading = ref(false)
  const error = ref('')

  async function load(visitId: string) {
    isLoading.value = true
    error.value = ''
    try {
      const res: { data?: VisitDetail } = await $api(`/visits/${visitId}`)
      visit.value = res?.data ?? null
    } catch (err) {
      visit.value = null
      error.value = getApiErrorMessage(err, 'Could not load the visit')
    } finally {
      isLoading.value = false
    }
  }

  const base = () => {
    if (!visit.value) throw new Error('No visit loaded')
    return `/patients/${visit.value.patientId}/visits/${visit.value._id}`
  }

  /** Visit PUT stores only the fields sent. */
  async function updateVisit(patch: { vitals?: Vitals, notes?: string, diagnosis?: VisitDiagnosis[], bodyMarkers?: unknown[], bodyChartSnapshot?: string, status?: VisitDetail['status'], doctorId?: string }) {
    await $api(base(), { method: 'PUT', body: patch })
  }

  async function addOrder(service: { _id: string, nameEn: string, nameKh?: string, price?: number, parameters?: LabOrder['parameters'] }, category: 'laboratory' | 'imaging') {
    const v = visit.value!
    await $api(`${base()}/labs`, {
      method: 'POST',
      // visitId and patientId are required by the validator even though the route sets them.
      body: {
        visitId: v._id,
        patientId: v.patientId,
        serviceId: service._id,
        serviceName: service.nameEn,
        serviceNameKh: service.nameKh,
        category,
        price: service.price ?? 0,
        parameters: (service.parameters || []).map(p => ({ labelEn: p.labelEn, labelKh: p.labelKh, unit: p.unit, refRange: p.refRange }))
      }
    })
  }

  async function updateOrder(orderId: string, patch: { status?: LabOrder['status'], parameters?: LabOrder['parameters'], result?: string }) {
    await $api(`/labs/${orderId}`, { method: 'PUT', body: patch })
  }

  /** Quantity is left out so the server computes it from the schedule. */
  async function addPrescription(line: Omit<PrescriptionLine, '_id' | 'quantity' | 'totalPrice'>) {
    await $api(`${base()}/prescriptions`, { method: 'POST', body: line })
  }

  async function removePrescription(prescriptionId: string) {
    await $api(`${base()}/prescriptions/${prescriptionId}`, { method: 'DELETE' })
  }

  async function createPayment(items: PaymentItem[], discount: number) {
    const amount = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    return $api(`${base()}/payments`, {
      method: 'POST',
      // The server recalculates subtotal, amount and balance from the items.
      body: { items, discount, amount, referenceId: `INV-${Date.now()}`, status: 'pending', totalReceived: 0 }
    })
  }

  async function updatePayment(paymentId: string, patch: { items?: PaymentItem[], discount?: number, totalReceived?: number, method?: string, currency?: string }) {
    return $api(`${base()}/payments/${paymentId}`, { method: 'PUT', body: patch })
  }

  return { visit, isLoading, error, load, updateVisit, addOrder, updateOrder, addPrescription, removePrescription, createPayment, updatePayment }
}
