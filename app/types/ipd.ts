/** Shapes returned by /api/ipd (backend docs/IPD.md). */

export type IpdRoute = 'PO' | 'IV' | 'IM' | 'SC' | 'SL' | 'PR' | 'TOPICAL' | 'INHALATION' | 'NEB' | 'NG' | 'OTHER'
export type IpdFrequency = 'OD' | 'BID' | 'TID' | 'QID' | 'Q4H' | 'Q6H' | 'Q8H' | 'Q12H' | 'QHS' | 'STAT' | 'PRN'
export type IpdOrderStatus = 'ACTIVE' | 'ON_HOLD' | 'DISCONTINUED' | 'COMPLETED'

export const IPD_ROUTES: IpdRoute[] = ['PO', 'IV', 'IM', 'SC', 'SL', 'PR', 'TOPICAL', 'INHALATION', 'NEB', 'NG', 'OTHER']
export const IPD_FREQUENCIES: IpdFrequency[] = ['OD', 'BID', 'TID', 'QID', 'Q4H', 'Q6H', 'Q8H', 'Q12H', 'QHS', 'STAT', 'PRN']

export interface IpdMedicationOrder {
  _id: string
  orderNo?: string
  admissionId: string
  medicineId: string
  medication: string
  doseText: string
  doseBaseQty: number
  route: IpdRoute
  frequency: IpdFrequency
  scheduleTimes: string[]
  prnIndication?: string
  prnMaxPerDay?: number
  instructions?: string
  startAt: string
  endAt?: string
  status: IpdOrderStatus
  discontinuedAt?: string
  discontinueReason?: string
  replacesOrderId?: string
  orderedAt: string
  verifiedAt?: string
  verificationNote?: string
  allergyConflict?: string
  allergyOverrideReason?: string
  medicine?: { nameEn?: string, nameKh?: string, strength?: string, baseUnit?: string, controlled?: boolean, highAlert?: boolean }
  dispensedBaseQty: number
  givenBaseQty: number
  wardSupplyBaseQty: number
  dispensableBaseQty: number
}

export interface IpdOrderInput {
  medicineId: string
  doseText: string
  doseBaseQty: number
  route: IpdRoute
  frequency: IpdFrequency
  scheduleTimes?: string[]
  prnIndication?: string
  prnMaxPerDay?: number
  instructions?: string
  startAt?: string
  durationDays?: number
  allergyOverrideReason?: string
}

export type AdministrationStatus = 'GIVEN' | 'REFUSED' | 'HELD' | 'MISSED'

export interface IpdAdministration {
  _id: string
  orderId: string
  scheduledAt?: string
  status: AdministrationStatus
  administeredAt: string
  reason?: string
  note?: string
  recordedBy?: string
  enteredInError?: boolean
  errorReason?: string
}

export interface MarSlot {
  scheduledAt: string
  localTime: string
  state: AdministrationStatus | 'DUE' | 'OVERDUE' | 'ON_HOLD'
  record: IpdAdministration | null
}

export interface MarOrderRow {
  order: IpdMedicationOrder
  slots: MarSlot[]
  prnGiven: IpdAdministration[]
  errors: IpdAdministration[]
}

export type ChartEntryType = 'OBSERVATION' | 'FLUID' | 'NOTE'

export interface IpdChartEntry {
  _id: string
  entryType: ChartEntryType
  recordedAt: string
  recordedBy?: string
  temperature?: number
  pulse?: number
  respiratoryRate?: number
  systolic?: number
  diastolic?: number
  spo2?: number
  onOxygen?: boolean
  consciousness?: string
  painScore?: number
  bloodGlucose?: number
  weight?: number
  news2Score?: number
  news2Risk?: 'LOW' | 'LOW_MEDIUM' | 'MEDIUM' | 'HIGH'
  direction?: 'IN' | 'OUT'
  fluidCategory?: string
  volumeMl?: number
  noteCategory?: string
  text?: string
  enteredInError?: boolean
  errorReason?: string
}

export interface FluidBalance {
  totalIn: number
  totalOut: number
  balance: number
  byCategory: Array<{ direction: 'IN' | 'OUT', category: string, volumeMl: number }>
}

export interface IpdLabRequest {
  _id: string
  serviceName: string
  serviceNameKh?: string
  category: 'laboratory' | 'imaging' | 'other'
  price?: number
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled'
  requestedAt?: string
  result?: string
  parameters?: Array<{ labelEn?: string, labelKh?: string, unit?: string, refRange?: string, value?: string }>
  notes?: string
}

export interface IpdBillLine {
  kind: 'BED' | 'MEDICINE' | 'LAB' | 'IMAGING' | 'SERVICE'
  refId?: string
  name: string
  nameKh?: string
  quantity: number
  unit?: string
  unitPrice: number
  amount: number
  date?: string
}

export interface IpdCharge {
  _id: string
  name: string
  nameKh?: string
  quantity: number
  unitPrice: number
  chargedAt: string
  note?: string
}

export interface IpdReceipt {
  _id: string
  receiptNo?: string
  type: 'DEPOSIT' | 'PAYMENT' | 'REFUND'
  amount: number
  method: string
  receivedAt: string
  note?: string
  voided?: boolean
  voidReason?: string
}

export interface IpdBill {
  admission: {
    _id: string
    admissionNumber?: string
    status: string
    admissionDate: string
    dischargeDate?: string
    dailyRate: number
    billFinalizedAt?: string
    billPaymentId?: string
  }
  lines: IpdBillLine[]
  charges: IpdCharge[]
  receipts: IpdReceipt[]
  subtotal: number
  discount: number
  discountReason?: string
  total: number
  received: number
  balance: number
}
