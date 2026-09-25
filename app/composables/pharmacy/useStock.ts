/**
 * Read-only stock queries. Nothing here writes stock: every mutation goes
 * through a posting endpoint (goods receipt, dispensing, count), because
 * stock-posting.service.ts is the only writer of stock balances.
 */
import type { StockRow, BatchSummary, WarehouseRef } from '~/types/pharmacy'

export interface MedicineStockSummary {
  medicineId: string
  totalBase: number
  nearestExpiry: Date | null
  warehouses: string[]
  rows: StockRow[]
}

interface StockResponse {
  data?: StockRow[]
  total?: number
}

export const useStock = () => {
  const rows = ref<StockRow[]>([])
  const total = ref(0)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /** GET /inventory/stock — balances joined with medicine, batch and warehouse. */
  async function fetchStock(params: {
    search?: string
    medicineId?: string
    warehouseId?: string
    batchId?: string
    stockStatus?: string
    expiryBefore?: string
    limit?: number
    skip?: number
  } = {}): Promise<StockRow[]> {
    isLoading.value = true
    error.value = null
    try {
      const res: StockResponse = await $api('/inventory/stock', { params })
      rows.value = res?.data || []
      total.value = res?.total ?? rows.value.length
      return rows.value
    } catch (e) {
      error.value = getApiErrorMessage(e, 'Failed to load stock')
      rows.value = []
      total.value = 0
      throw e
    } finally {
      isLoading.value = false
    }
  }

  /** Group balance rows by medicine so a list can show one line per medicine. */
  function summarise(source: StockRow[] = rows.value): Map<string, MedicineStockSummary> {
    const map = new Map<string, MedicineStockSummary>()
    for (const row of source) {
      const id = String(row.medicine?._id || '')
      if (!id) continue
      const entry = map.get(id) || { medicineId: id, totalBase: 0, nearestExpiry: null, warehouses: [], rows: [] }
      // Only AVAILABLE stock is issuable; quarantined or damaged stock must not
      // be counted as on hand.
      if (row.stockStatus === 'AVAILABLE') entry.totalBase += Number(row.qtyBase) || 0
      entry.rows.push(row)
      const wh = row.warehouse?.nameEn || row.warehouse?.code
      if (wh && !entry.warehouses.includes(wh)) entry.warehouses.push(wh)
      map.set(id, entry)
    }
    for (const entry of map.values()) {
      entry.nearestExpiry = nearestExpiry(
        entry.rows
          .filter(r => r.stockStatus === 'AVAILABLE' && (Number(r.qtyBase) || 0) > 0)
          .map(r => ({ expiryDate: r.batch?.expiryDate }))
      )
    }
    return map
  }

  /** GET /inventory/batches — batches for one medicine, nearest expiry first. */
  async function fetchBatches(
    medicineId: string,
    params: { warehouseId?: string, nearExpiryDays?: number, limit?: number } = {}
  ): Promise<BatchSummary[]> {
    const res: { data?: BatchSummary[] } = await $api('/inventory/batches', { params: { medicineId, ...params } })
    return res?.data || []
  }

  /** GET /inventory/near-expiry — batches expiring within `days`. */
  async function fetchNearExpiry(days = NEAR_EXPIRY_DAYS): Promise<StockRow[]> {
    const res: { data?: StockRow[] } = await $api('/inventory/near-expiry', { params: { days } })
    return res?.data || []
  }

  /** GET /warehouses — needed by every posting form. */
  async function fetchWarehouses(): Promise<WarehouseRef[]> {
    return unwrapList<WarehouseRef>(await $api('/warehouses'))
  }

  return { rows, total, isLoading, error, fetchStock, summarise, fetchBatches, fetchNearExpiry, fetchWarehouses }
}
