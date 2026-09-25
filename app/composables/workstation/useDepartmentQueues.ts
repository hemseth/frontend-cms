import type { LabOrder, QueuePatient, VisitPayment, WorklistItem, WorkStatus } from '~/types/workstation'

interface VisitRow {
  _id: string
  patientId: string | QueuePatient
  dateIn?: string
  createdAt?: string
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled'
  vitals?: Record<string, string>
  type?: string
}

interface PaymentRow extends VisitPayment {
  visitId?: string
  createdAt?: string
}

interface DispensingRow {
  visitId?: string
  status?: string
}

const idOf = (ref: string | { _id?: string } | undefined) => (typeof ref === 'object' ? String(ref?._id || '') : String(ref || ''))
const hasVitals = (v: VisitRow) => Object.values(v.vitals || {}).some(value => String(value || '').trim())

/**
 * Worklist loaders for each department. They read existing endpoints only; the backend has no
 * worklist endpoint, visit workflow statuses or queue numbers yet, so those are derived here.
 */
export function useDepartmentQueues() {
  const { ensure, get } = usePatientCache()

  /** All visits of one day, oldest first, with their arrival-order number. */
  async function visitsOfDay(day: string): Promise<Array<VisitRow & { queueNo: number, patient: QueuePatient }>> {
    const res: { data?: VisitRow[] } = await $api('/visits', { params: { limit: 300 } })
    const rows = (res?.data ?? [])
      // An admission's IPD visit (docs/IPD.md) is not an outpatient waiting in a queue.
      .filter(v => (v as { type?: string }).type !== 'ipd')
      .filter(v => isSameLocalDay(v.dateIn || v.createdAt, day))
      .sort((a, b) => new Date(a.dateIn || a.createdAt || 0).getTime() - new Date(b.dateIn || b.createdAt || 0).getTime())
    await ensure(rows.map(v => idOf(v.patientId)))
    return rows.map((v, index) => {
      const pid = idOf(v.patientId)
      const base: QueuePatient = typeof v.patientId === 'object' ? v.patientId : { _id: pid }
      return { ...v, queueNo: index + 1, patient: get(pid, { ...base, _id: pid }) }
    })
  }

  async function ordersOfDay(day: string): Promise<LabOrder[]> {
    const res: { data?: LabOrder[] } = await $api('/labs', { params: { dateFrom: day, dateTo: day } })
    return res?.data ?? []
  }

  // The payment list endpoint caps at 100, newest first; enough for one small clinic's day.
  async function paymentsByVisit(): Promise<Map<string, PaymentRow>> {
    const res: { data?: PaymentRow[] } = await $api('/payments', { params: { limit: 100 } })
    const map = new Map<string, PaymentRow>()
    for (const payment of res?.data ?? []) {
      if (payment.visitId && payment.status !== 'cancelled' && !map.has(payment.visitId)) map.set(payment.visitId, payment)
    }
    return map
  }

  const toItem = (v: VisitRow & { queueNo: number, patient: QueuePatient }, status: WorkStatus, subtitle?: string): WorklistItem => ({
    id: v._id,
    visitId: v._id,
    patientId: v.patient._id,
    patient: v.patient,
    queueNo: v.queueNo,
    arrivedAt: v.dateIn || v.createdAt || '',
    status,
    subtitle
  })

  function clinicalStatus(v: VisitRow): WorkStatus {
    if (v.status === 'cancelled') return 'cancelled'
    if (v.status === 'completed') return 'completed'
    if (v.status === 'in-progress') return 'in_consultation'
    return hasVitals(v) ? 'triaged' : 'waiting'
  }

  async function triageQueue(day: string): Promise<WorklistItem[]> {
    return (await visitsOfDay(day)).map(v => toItem(v, clinicalStatus(v)))
  }

  /** Doctor queue: a visit whose orders are all back returns with a "results ready" status. */
  async function doctorQueue(day: string): Promise<WorklistItem[]> {
    const [visits, orders] = await Promise.all([visitsOfDay(day), ordersOfDay(day)])
    const byVisit = new Map<string, LabOrder[]>()
    for (const order of orders) {
      if (order.status === 'cancelled') continue
      byVisit.set(order.visitId, [...(byVisit.get(order.visitId) || []), order])
    }
    return visits.map((v) => {
      let status = clinicalStatus(v)
      const visitOrders = byVisit.get(v._id) || []
      if (visitOrders.length && status !== 'completed' && status !== 'cancelled') {
        status = visitOrders.every(o => o.status === 'completed') ? 'results_ready' : 'awaiting_results'
      }
      return toItem(v, status)
    })
  }

  /** Lab or echo queue: one row per order, so each department sees only its own orders. */
  async function orderQueue(day: string, category: 'laboratory' | 'imaging'): Promise<WorklistItem[]> {
    const [visits, orders] = await Promise.all([visitsOfDay(day), ordersOfDay(day)])
    const visitById = new Map(visits.map(v => [v._id, v]))
    const mine = orders.filter(o => (o.category || 'laboratory') === category)
    await ensure(mine.map(o => idOf(o.patientId)))
    return mine
      .sort((a, b) => new Date(a.requestedAt || 0).getTime() - new Date(b.requestedAt || 0).getTime())
      .map((order) => {
        const pid = idOf(order.patientId)
        const base: QueuePatient = typeof order.patientId === 'object' ? order.patientId : { _id: pid }
        return {
          id: order._id,
          visitId: order.visitId,
          patientId: pid,
          patient: get(pid, { ...base, _id: pid }),
          queueNo: visitById.get(order.visitId)?.queueNo ?? 0,
          arrivedAt: order.requestedAt || '',
          status: orderStatus(order.status),
          subtitle: order.serviceNameKh || order.serviceName
        }
      })
  }

  async function cashierQueue(day: string): Promise<WorklistItem[]> {
    const [visits, payments] = await Promise.all([visitsOfDay(day), paymentsByVisit()])
    return visits
      .filter(v => v.status !== 'cancelled')
      .map((v) => {
        const payment = payments.get(v._id)
        return toItem(v, payment?.status === 'paid' ? 'paid' : 'awaiting_payment', payment?.invoiceNumber)
      })
  }

  /**
   * Pharmacy sees paid visits only. The backend does not enforce this: dispensing does not check
   * payment, so this filter is a workflow aid, not a control.
   */
  async function pharmacyQueue(day: string): Promise<WorklistItem[]> {
    const [visits, payments, dispensings] = await Promise.all([
      visitsOfDay(day),
      paymentsByVisit(),
      $api('/dispensings') as Promise<{ data?: DispensingRow[] }>
    ])
    const dispensed = new Set((dispensings?.data ?? []).filter(d => d.status === 'DISPENSED').map(d => d.visitId))
    return visits
      .filter((v) => {
        const payment = payments.get(v._id)
        return payment?.status === 'paid' && payment.items?.some(item => item.category === 'medicine')
      })
      .map(v => toItem(v, dispensed.has(v._id) ? 'dispensed' : 'paid'))
  }

  return { triageQueue, doctorQueue, orderQueue, cashierQueue, pharmacyQueue }
}
