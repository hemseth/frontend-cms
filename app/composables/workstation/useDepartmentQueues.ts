import type { LabOrder, QueuePatient, VisitPayment, WorklistItem, WorkStatus } from '~/types/workstation'

interface VisitRow {
  _id: string
  patientId: string | QueuePatient
  dateIn?: string
  createdAt?: string
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled'
  vitals?: Record<string, string>
  type?: string
  queueNo?: number
  triagePriority?: 'EMERGENCY' | 'URGENT' | 'NORMAL'
  chiefComplaint?: string
  doctorId?: string
  doctorName?: string
  consultRoom?: string
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

  /**
   * The day's outpatient queue from the server (GET /visits/queue): queue numbers given at
   * check-in, emergencies first, IPD visits excluded.
   */
  async function visitsOfDay(day: string): Promise<Array<VisitRow & { queueNo: number, patient: QueuePatient }>> {
    const res: { data?: VisitRow[] } = await $api('/visits/queue', { params: { date: day, tzOffset: new Date().getTimezoneOffset() } })
    const rows = res?.data ?? []
    await ensure(rows.map(v => idOf(v.patientId)))
    return rows.map((v, index) => {
      const pid = idOf(v.patientId)
      const base: QueuePatient = typeof v.patientId === 'object' ? v.patientId : { _id: pid }
      return { ...v, queueNo: v.queueNo ?? index + 1, patient: get(pid, { ...base, _id: pid }) }
    })
  }

  async function ordersOfDay(day: string): Promise<LabOrder[]> {
    // The local day's start and end as instants: the server may run in another timezone.
    const [y, m, d] = day.split('-').map(Number)
    const from = new Date(y!, m! - 1, d!, 0, 0, 0, 0).toISOString()
    const to = new Date(y!, m! - 1, d!, 23, 59, 59, 999).toISOString()
    const res: { data?: LabOrder[] } = await $api('/labs', { params: { dateFrom: from, dateTo: to } })
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
    subtitle: subtitle ?? ([v.chiefComplaint, v.doctorName, v.consultRoom].filter(Boolean).join(' · ') || undefined),
    priority: v.triagePriority,
    doctorId: v.doctorId
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
      // Patients whose results are back see the doctor again first (after emergencies).
      .sort((a, b) => rank(a) - rank(b))
  }

  function rank(item: WorklistItem) {
    if (item.priority === 'EMERGENCY') return 0
    return item.status === 'results_ready' ? 1 : 2
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

  /**
   * Cashier: a patient is waiting to pay once the doctor has finished, or when tests were
   * ordered (clinics that take payment before the test). Others show as still with the doctor.
   */
  async function cashierQueue(day: string): Promise<WorklistItem[]> {
    const [visits, payments, orders] = await Promise.all([visitsOfDay(day), paymentsByVisit(), ordersOfDay(day)])
    const withOrders = new Set(orders.filter(o => o.status !== 'cancelled').map(o => o.visitId))
    return visits
      .filter(v => v.status !== 'cancelled')
      .map((v) => {
        const payment = payments.get(v._id)
        const status: WorkStatus = payment?.status === 'paid'
          ? 'paid'
          : v.status === 'completed' || withOrders.has(v._id) ? 'awaiting_payment' : 'in_consultation'
        return toItem(v, status, payment?.invoiceNumber)
      })
  }

  /**
   * Pharmacy sees paid visits only. The backend does not enforce this: dispensing does not check
   * payment, so this filter is a workflow aid, not a control.
   */
  /**
   * Pharmacy: a patient appears as soon as the doctor has finished with a prescription, so the
   * medicine can be prepared while they pay: To prepare → Prepared → Paid (hand over) → Dispensed.
   * The server refuses the hand-over before payment in pharmacy-counter clinics.
   */
  async function pharmacyQueue(day: string): Promise<WorklistItem[]> {
    const visits = await visitsOfDay(day)
    if (!visits.length) return []
    const [payments, dispensings, lines] = await Promise.all([
      paymentsByVisit(),
      $api('/dispensings') as Promise<{ data?: DispensingRow[] }>,
      $api('/prescriptions', { params: { visitIds: visits.map(v => v._id).join(','), limit: 200 } }) as Promise<{ data?: Array<{ visitId?: string }> }>
    ])
    const prescribed = new Set((lines?.data ?? []).map(l => String(l.visitId)))
    const docs = dispensings?.data ?? []
    const dispensed = new Set(docs.filter(d => d.status === 'DISPENSED').map(d => d.visitId))
    const prepared = new Set(docs.filter(d => d.status === 'PREPARED').map(d => d.visitId))
    return visits
      .filter((v) => {
        const paid = payments.get(v._id)?.status === 'paid'
        return prescribed.has(v._id) && (v.status === 'completed' || paid)
      })
      .map((v) => {
        const paid = payments.get(v._id)?.status === 'paid'
        const status: WorkStatus = dispensed.has(v._id) ? 'dispensed' : paid ? 'paid' : prepared.has(v._id) ? 'prepared' : 'to_prepare'
        return toItem(v, status)
      })
  }

  return { triageQueue, doctorQueue, orderQueue, cashierQueue, pharmacyQueue }
}
