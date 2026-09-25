import type { MedicineSuggestion } from '~/types/pharmacy'

/** Every status a workstation queue can show. One color map covers all pages (utils/workstationStatus.ts). */
export type WorkStatus
  = | 'waiting'
    | 'triaged'
    | 'in_consultation'
    | 'awaiting_results'
    | 'results_ready'
    | 'awaiting_payment'
    | 'paid'
    | 'requested'
    | 'draft'
    | 'result_entered'
    | 'verified'
    | 'dispensed'
    | 'completed'
    | 'cancelled'

export interface QueuePatient {
  _id: string
  nameKh?: string
  nameEn?: string
  phone?: string
  pId?: number
  code?: string
  dob?: string
  gender?: number
  allergies?: string[]
  coverageType?: string
  bloodGroup?: string
}

/** One row in a department worklist. `id` is the visit, or the order for lab/echo. */
export interface WorklistItem {
  id: string
  visitId: string
  patientId: string
  patient: QueuePatient
  /** Position in the day's arrival order; the backend has no queue number yet. */
  queueNo: number
  arrivedAt: string
  status: WorkStatus
  /** Extra line under the name, e.g. the ordered service. */
  subtitle?: string
}

export interface LabParameter {
  name?: string
  labelEn?: string
  labelKh?: string
  unit?: string
  refRange?: string
  value?: string
}

export interface LabOrder {
  _id: string
  visitId: string
  patientId: string | QueuePatient
  serviceId?: string
  serviceName: string
  serviceNameKh?: string
  category?: 'laboratory' | 'imaging' | 'other'
  price?: number
  parameters?: LabParameter[]
  result?: string
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled'
  requestedAt?: string
  completedAt?: string
}

export interface Vitals {
  bp?: string
  heartRate?: string
  respRate?: string
  temp?: string
  oxygen?: string
  weight?: string
  height?: string
  bsl?: string
  painScore?: string
}

export interface VisitDiagnosis {
  diagnosisId?: string
  sourceType?: 'ICD_MASTER' | 'CLINIC_LOCAL' | 'FREE_TEXT'
  code?: string
  nameEn?: string
  nameKh?: string
  isPrimary?: boolean
  [key: string]: unknown
}

export interface PrescriptionLine {
  _id?: string
  medicineId?: string
  medication: string
  unit?: string
  morning: number
  afternoon: number
  evening: number
  night: number
  days: number
  quantity?: number
  unitPrice?: number
  totalPrice?: number
}

export interface PaymentItem {
  itemId?: string
  name: string
  price: number
  quantity: number
  category?: 'medicine' | 'laboratory' | 'imaging' | 'consultation' | 'nursing' | 'other'
  subtotal?: number
}

export interface VisitPayment {
  _id: string
  invoiceNumber?: string
  receiptNumber?: string
  amount: number
  subtotal?: number
  discount?: number
  totalReceived: number
  balance: number
  currency?: string
  method?: string
  status: 'pending' | 'paid' | 'partially_paid' | 'cancelled'
  items: PaymentItem[]
}

/** GET /api/visits/:id */
export interface VisitDetail {
  _id: string
  visitId?: string
  patientId: string
  dateIn: string
  type?: 'opd' | 'ipd'
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled'
  notes?: string
  vitals?: Vitals
  diagnosis?: VisitDiagnosis[]
  bodyMarkers?: unknown[]
  doctorId?: string
  patient: QueuePatient | null
  medications: PrescriptionLine[]
  labRequests: LabOrder[]
  payment: VisitPayment | null
}

/** A medicine picked in the doctor's prescription form, before it is sent. */
export interface MedicineLineDraft {
  medicine: MedicineSuggestion
  morning: number
  afternoon: number
  evening: number
  night: number
  days: number
}
