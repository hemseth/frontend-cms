/**
 * Stock count (physical inventory).
 *
 * Lifecycle: DRAFT -> start -> count each line -> review -> approve -> post.
 * Only the final post writes stock, as an adjustment through
 * stock-posting.service.ts.
 */
import type { BatchRef, MedicineRef, StockCountDoc, StockRow } from '~/types/pharmacy'

export interface StockCountLine {
  _id?: string
  medicineId: string
  batchId?: string
  stockStatus?: string
  systemQtyBase: number
  countedQtyBase?: number
  varianceQtyBase?: number
  /** Joined for display; not part of the backend schema. */
  medicine?: MedicineRef
  batch?: BatchRef
}

export const useStockCount = () => {
  const isLoading = ref(false)
  const isSubmitting = ref(false)
  const error = ref<string | null>(null)

  async function fetchCounts(status?: string): Promise<StockCountDoc[]> {
    isLoading.value = true
    try {
      const res: { data?: StockCountDoc[] } = await $api('/inventory/stock-counts', { params: status ? { status } : {} })
      return res?.data || []
    } finally {
      isLoading.value = false
    }
  }

  async function fetchCount(id: string): Promise<StockCountDoc | undefined> {
    const res: { data?: StockCountDoc } = await $api(`/inventory/stock-counts/${id}`)
    return res?.data
  }

  /**
   * Build count lines from current stock so the sheet can be printed and filled
   * in by hand. `systemQtyBase` is the snapshot the variance is measured against.
   */
  function linesFromStock(rows: StockRow[]): StockCountLine[] {
    return rows
      .filter(r => r.stockStatus === 'AVAILABLE')
      .map(r => ({
        medicineId: String(r.medicine?._id || ''),
        batchId: r.batch?._id ? String(r.batch._id) : undefined,
        stockStatus: 'AVAILABLE',
        systemQtyBase: Number(r.qtyBase) || 0,
        medicine: r.medicine,
        batch: r.batch
      }))
      .filter(l => l.medicineId)
  }

  async function createCount(payload: {
    warehouseId: string
    countType?: 'FULL' | 'CYCLE' | 'SPOT' | 'BLIND'
    lines: Array<Pick<StockCountLine, 'medicineId' | 'batchId' | 'stockStatus' | 'systemQtyBase'>>
  }): Promise<StockCountDoc | undefined> {
    const res: { data?: StockCountDoc } = await $api('/inventory/stock-counts', {
      method: 'POST',
      body: { countType: 'FULL', ...payload }
    })
    return res?.data
  }

  async function startCount(id: string): Promise<unknown> {
    return await $api(`/inventory/stock-counts/${id}/start`, { method: 'POST' })
  }

  /** Records one physical count. The backend recomputes the variance. */
  async function countLine(id: string, lineId: string, countedQtyBase: number): Promise<unknown> {
    return await $api(`/inventory/stock-counts/${id}/count`, {
      method: 'POST',
      body: { lineId, countedQtyBase }
    })
  }

  async function reviewCount(id: string): Promise<unknown> {
    return await $api(`/inventory/stock-counts/${id}/review`, { method: 'POST' })
  }

  async function approveCount(id: string): Promise<unknown> {
    return await $api(`/inventory/stock-counts/${id}/approve`, { method: 'POST' })
  }

  /** The only step that changes stock. */
  async function postCount(id: string): Promise<unknown> {
    return await $api(`/inventory/stock-counts/${id}/post`, { method: 'POST' })
  }

  async function cancelCount(id: string): Promise<unknown> {
    return await $api(`/inventory/stock-counts/${id}/cancel`, { method: 'POST' })
  }

  return {
    isLoading,
    isSubmitting,
    error,
    fetchCounts,
    fetchCount,
    linesFromStock,
    createCount,
    startCount,
    countLine,
    reviewCount,
    approveCount,
    postCount,
    cancelCount
  }
}
