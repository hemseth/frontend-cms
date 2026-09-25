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

/** A prescription row. One medicine per document, with its dosing schedule. */
export interface PrescriptionLine {
  _id?: string
  medicineId?: string
  medication?: string
  unit?: string
  quantity?: number
  morning?: number
  afternoon?: number
  evening?: number
  night?: number
  days?: number
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
  status?: string
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
