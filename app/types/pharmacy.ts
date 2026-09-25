/**
 * Shapes returned by the pharmacy and inventory endpoints.
 *
 * These mirror the backend models loosely: every field the frontend does not
 * rely on is left out, and everything optional is marked optional, because the
 * list endpoints project different subsets per route.
 */

export interface MedicineRef {
  _id: string
  code?: string
  /** The generic name; there is no separate genericName field. */
  nameEn?: string
  nameKh?: string
  brandName?: string
  strength?: string
  /** Smallest unit, the one stock is counted in. */
  baseUnit?: string
  unit?: string
  /** The reorder threshold; the model has no reorderLevel field. */
  minStockAlert?: number
  wholesalePrice?: number
  retailPrice?: number
  conversionRate?: number
  /** Controlled medicine: only dispensed from a pharmacist-verified prescription line. */
  controlled?: boolean
  highAlert?: boolean
}

export interface BatchRef {
  _id?: string
  batchNo?: string
  expiryDate?: string
  qualityStatus?: string
}

export interface WarehouseRef {
  _id: string
  code?: string
  nameEn?: string
  nameKh?: string
  type?: string
}

/** One row of stock_balances, joined with its medicine, batch and warehouse. */
export interface StockRow {
  _id: string
  qtyBase: number
  stockStatus: string
  updatedAt?: string
  warehouse?: Partial<WarehouseRef>
  medicine?: MedicineRef
  batch?: BatchRef
}

/** A medicine enriched with its stock summary, as the autocomplete shows it. */
export interface MedicineSuggestion extends MedicineRef {
  _stockBase: number
  _nearestExpiry: Date | null
  _warehouses: string[]
}

export interface SupplierRef {
  _id: string
  name?: string
  nameEn?: string
  code?: string
}

export interface PurchaseOrderRef {
  _id: string
  purchaseNo?: string
  code?: string
  grandTotal?: number
}

export type PrescriptionStatus = 'PENDING' | 'VERIFIED' | 'PARTIALLY_DISPENSED' | 'DISPENSED' | 'CANCELLED'

/**
 * A prescription row. One medicine per document, with its dosing schedule.
 * GET /prescriptions adds the base-unit quantities and the medicine's safety flags.
 */
export interface PrescriptionLine {
  _id?: string
  medicineId?: string
  medication?: string
  unit?: string
  quantity?: number
  isWholesale?: boolean
  morning?: number
  afternoon?: number
  evening?: number
  night?: number
  days?: number
  notes?: string
  status?: PrescriptionStatus
  prescribedBaseQty?: number
  dispensedBaseQty?: number
  remainingBaseQty?: number
  verifiedAt?: string
  verifiedBy?: string
  verificationNote?: string
  allergyConflict?: string
  allergyOverrideReason?: string
  medicine?: MedicineRef
}

export interface BatchSummary {
  _id: string
  batchNo?: string
  expiryDate?: string
  qtyBase?: number
  qualityStatus?: string
}

export interface FefoAllocationView {
  batchId: string
  batchNo?: string
  qtyBase: number
  expiryDate?: string | null
  locationId?: string | null
}

export interface FefoPreviewRow {
  itemIndex: number
  medicineId: string
  requestedBaseQty: number
  available: number
  allocations: FefoAllocationView[]
}

export interface DispensingDoc {
  _id: string
  dispensingNo?: string
  status?: 'DRAFT' | 'PREPARED' | 'DISPENSED' | 'PARTIAL' | 'CANCELLED' | 'RETURNED' | 'REVERSED'
  source?: 'MANUAL' | 'AUTO'
  visitId?: string
  patientId?: string
  invoiceNumber?: string
  dispensedAt?: string
  items?: Array<{ medicineId: string, requestedBaseQty: number, dispensedBaseQty: number, returnedBaseQty?: number }>
}

export interface DispenseShortage {
  itemIndex: number
  medicineId: string
  requestedBaseQty: number
  dispensedBaseQty: number
}

/** GET /dispensings/:id/labels */
export interface MedicineLabelData {
  dispensingNo?: string
  dispensedAt?: string
  invoiceNumber?: string
  patient: { nameKh?: string, nameEn?: string, gender?: number, dob?: string, pId?: number } | null
  labels: Array<{
    medicineName?: string
    medicineNameKh?: string
    strength?: string
    route?: string
    quantityBase: number
    baseUnit?: string
    schedule: { morning: number, afternoon: number, evening: number, night: number, days: number | null } | null
    dose?: string
    frequency?: string
    notes?: string
    instructionEn?: string
    instructionKh?: string
    batchNos: string[]
    expiryDate: string | null
  }>
}

/** One medicine in GET /controlled-drugs/register */
export interface ControlledRegisterMedicine {
  medicine: { _id: string, code?: string, nameEn?: string, nameKh?: string, strength?: string, baseUnit?: string }
  openingBalance: number
  totalIn: number
  totalOut: number
  closingBalance: number
  stockOnHand?: number
  reconciled?: boolean
  entries: Array<{
    occurredAt: string
    movementType: string
    stockStatus?: string
    qtyIn: number
    qtyOut: number
    balance: number
    batchNo?: string
    referenceType: string
    referenceNo?: string
    patientName?: string
    by?: string
    reasonCode?: string
  }>
}

export interface GoodsReceiptDoc {
  _id: string
  grnNo?: string
  status?: string
  items?: Array<{ _id?: string }>
}

export interface StockCountDoc {
  _id: string
  countNo?: string
  status?: string
  lines?: Array<{ _id?: string }>
}
