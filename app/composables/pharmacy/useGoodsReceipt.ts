/**
 * Goods receipt (GRN).
 *
 * Creating a receipt stores the document; POST /:id/post is what creates the
 * batches and stock, through stock-posting.service.ts. Nothing else may write
 * stock, so the frontend always does create -> post.
 */
import type { GoodsReceiptDoc, PurchaseOrderRef, SupplierRef } from '~/types/pharmacy'

export interface GoodsReceiptLineInput {
  medicineId: string
  receivedQty: number
  conversionFactorSnapshot: number
  batchNo?: string
  manufactureDate?: string
  expiryDate?: string
  unitCost?: number
  currency?: string
  acceptedBaseQty?: number
  inspectionStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'QUARANTINE'
}

export interface GoodsReceiptPayload {
  warehouseId: string
  purchaseOrderId: string
  supplierId: string
  supplierInvoiceNo?: string
  deliveryNoteNo?: string
  receivedAt?: string
  items: GoodsReceiptLineInput[]
}

export const useGoodsReceipt = () => {
  const isSubmitting = ref(false)
  const error = ref<string | null>(null)

  async function fetchSuppliers(): Promise<SupplierRef[]> {
    return unwrapList<SupplierRef>(await $api('/suppliers'))
  }

  /** A receipt must reference a purchase order; the backend requires purchaseOrderId. */
  async function fetchPurchaseOrders(supplierId?: string): Promise<PurchaseOrderRef[]> {
    return unwrapList<PurchaseOrderRef>(await $api('/purchases', { params: supplierId ? { supplierId } : {} }))
  }

  async function createReceipt(payload: GoodsReceiptPayload): Promise<GoodsReceiptDoc | undefined> {
    const items = payload.items.map((item) => {
      const receivedBaseQty = toBaseQty(item.receivedQty, item.conversionFactorSnapshot)
      return {
        ...item,
        receivedBaseQty,
        // Without an inspection step everything received is accepted, otherwise
        // posting would create a batch holding zero stock.
        acceptedBaseQty: item.acceptedBaseQty ?? receivedBaseQty,
        inspectionStatus: item.inspectionStatus ?? 'ACCEPTED'
      }
    })
    const res: { data?: GoodsReceiptDoc } = await $api('/goods-receipts', { method: 'POST', body: { ...payload, items } })
    return res?.data
  }

  /** POST /goods-receipts/:id/post — creates batches and stock. */
  async function postReceipt(id: string): Promise<unknown> {
    return await $api(`/goods-receipts/${id}/post`, { method: 'POST' })
  }

  /** Create then post, surfacing whichever step fails. */
  async function receiveAndPost(payload: GoodsReceiptPayload) {
    isSubmitting.value = true
    error.value = null
    try {
      const created = await createReceipt(payload)
      const id = created?._id
      if (!id) throw new Error('Goods receipt was created without an id')
      const posted = await postReceipt(id)
      return { id, grnNo: created?.grnNo, posted }
    } catch (e) {
      error.value = getApiErrorMessage(e, 'Failed to post goods receipt')
      throw e
    } finally {
      isSubmitting.value = false
    }
  }

  return { isSubmitting, error, fetchSuppliers, fetchPurchaseOrders, createReceipt, postReceipt, receiveAndPost }
}
