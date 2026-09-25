/**
 * Dispensing workflow.
 *
 * The frontend NEVER picks batches. FEFO allocation and the stock deduction
 * both happen server-side (fefo-allocation.service.ts -> stock-posting.service.ts),
 * so the sequence is always:
 *
 *   create (DRAFT/PREPARED) -> previewFefo (read-only) -> confirm (posts stock)
 */
import type { DispensingDoc, FefoPreviewRow, PrescriptionLine } from '~/types/pharmacy'

export interface DispenseLineInput {
  medicineId: string
  prescriptionItemId?: string
  /** Quantity in the unit `conversionFactorSnapshot` converts from. */
  requestedQty: number
  /** Base units per requested unit. 1 when the form already works in base units. */
  conversionFactorSnapshot: number
  sellingPriceSnapshot?: number
  currency?: string
}

export interface DispensePayload {
  warehouseId: string
  patientId?: string
  visitId?: string
  prescriptionId?: string
  items: DispenseLineInput[]
}

export const useDispensing = () => {
  const isSubmitting = ref(false)
  const preview = ref<FefoPreviewRow[]>([])
  const error = ref<string | null>(null)

  /** POST /dispensings — records intent only, no stock movement yet. */
  async function createDispensing(payload: DispensePayload): Promise<DispensingDoc | undefined> {
    const items = payload.items.map(item => ({
      ...item,
      requestedBaseQty: toBaseQty(item.requestedQty, item.conversionFactorSnapshot)
    }))
    const res: { data?: DispensingDoc } = await $api('/dispensings', {
      method: 'POST',
      body: { ...payload, items, status: 'PREPARED' }
    })
    return res?.data
  }

  /** POST /dispensings/:id/preview-fefo — read-only; shows which batches would be used. */
  async function previewFefo(id: string): Promise<FefoPreviewRow[]> {
    const res: { data?: FefoPreviewRow[] } = await $api(`/dispensings/${id}/preview-fefo`, { method: 'POST' })
    preview.value = res?.data || []
    return preview.value
  }

  /** POST /dispensings/:id/confirm — the only call that deducts stock. */
  async function confirmDispensing(id: string): Promise<unknown> {
    return await $api(`/dispensings/${id}/confirm`, { method: 'POST' })
  }

  async function cancelDispensing(id: string): Promise<unknown> {
    return await $api(`/dispensings/${id}/cancel`, { method: 'POST' })
  }

  /**
   * Create -> preview -> confirm in one go. Throws on any step so the caller can
   * surface the real error instead of reporting a success that never happened.
   */
  async function dispense(payload: DispensePayload) {
    isSubmitting.value = true
    error.value = null
    try {
      const created = await createDispensing(payload)
      const id = created?._id
      if (!id) throw new Error('Dispensing was created without an id')

      const rows = await previewFefo(id)
      const shortages = rows.filter(r => r.available < r.requestedBaseQty)
      const result = await confirmDispensing(id)

      return { id, shortages, result }
    } catch (e) {
      error.value = getApiErrorMessage(e, 'Failed to dispense')
      throw e
    } finally {
      isSubmitting.value = false
    }
  }

  /** GET /prescriptions — lines for a visit or patient, used to seed the form. */
  async function fetchPrescriptions(params: { visitId?: string, patientId?: string }): Promise<PrescriptionLine[]> {
    return unwrapList<PrescriptionLine>(await $api('/prescriptions', { params }))
  }

  return {
    isSubmitting,
    preview,
    error,
    createDispensing,
    previewFefo,
    confirmDispensing,
    cancelDispensing,
    dispense,
    fetchPrescriptions
  }
}
