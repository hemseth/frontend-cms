/**
 * Dispensing workflow.
 *
 * The frontend NEVER picks batches. FEFO allocation and the stock deduction
 * both happen server-side (fefo-allocation.service.ts -> stock-posting.service.ts),
 * so the sequence is always:
 *
 *   create (PREPARED) -> previewFefo (read-only) -> confirm (posts stock)
 *
 * The server also enforces the safety rules (docs/PHARMACY.md): prescribed
 * quantity, pharmacist verification, controlled medicines and allergies. The
 * checks here only give earlier feedback.
 */
import type { DispenseShortage, DispensingDoc, FefoPreviewRow, MedicineLabelData, PrescriptionLine } from '~/types/pharmacy'

export interface DispenseLineInput {
  medicineId: string
  prescriptionItemId?: string
  /** Inpatient medication order this ward supply is for (docs/IPD.md). */
  inpatientOrderId?: string
  /** Quantity in the unit `conversionFactorSnapshot` converts from. */
  requestedQty: number
  /** Base units per requested unit. 1 when the form already works in base units. */
  conversionFactorSnapshot: number
  /** Walk-in item matching the patient's allergy: why it is dispensed anyway. */
  allergyOverrideReason?: string
}

export interface DispensePayload {
  warehouseId: string
  patientId?: string
  visitId?: string
  prescriptionId?: string
  /** Ward supply for an admitted patient, charged to the admission's bill. */
  admissionId?: string
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
      body: { ...payload, items }
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
  async function confirmDispensing(id: string): Promise<{ data?: DispensingDoc, shortages?: DispenseShortage[] }> {
    return await $api(`/dispensings/${id}/confirm`, { method: 'POST' })
  }

  async function cancelDispensing(id: string): Promise<unknown> {
    return await $api(`/dispensings/${id}/cancel`, { method: 'POST' })
  }

  /**
   * Create -> preview -> confirm in one go. Throws on any step so the caller can
   * surface the real error instead of reporting a success that never happened.
   * A dispensing whose confirm was refused (e.g. not verified) is cancelled so it
   * does not linger as PREPARED.
   */
  async function dispense(payload: DispensePayload) {
    isSubmitting.value = true
    error.value = null
    let createdId: string | undefined
    let confirmed = false
    try {
      const created = await createDispensing(payload)
      createdId = created?._id
      if (!createdId) throw new Error('Dispensing was created without an id')

      await previewFefo(createdId)
      const result = await confirmDispensing(createdId)
      confirmed = true
      const shortages = result?.shortages ?? []
      const status = result?.data?.status

      return { id: createdId, shortages, status }
    } catch (e) {
      error.value = getApiErrorMessage(e, 'Failed to dispense')
      if (createdId && !confirmed) await cancelDispensing(createdId).catch(() => undefined)
      throw e
    } finally {
      isSubmitting.value = false
    }
  }

  /** GET /prescriptions — lines for a visit or patient, with remaining quantities and status. */
  async function fetchPrescriptions(params: { visitId?: string, patientId?: string }): Promise<PrescriptionLine[]> {
    return unwrapList<PrescriptionLine>(await $api('/prescriptions', { params: { ...params, limit: 200 } }))
  }

  /** POST /prescriptions/:id/verify — pharmacist verification (prescription:approve). */
  async function verifyPrescription(id: string, note?: string): Promise<PrescriptionLine | undefined> {
    const res: { data?: PrescriptionLine } = await $api(`/prescriptions/${id}/verify`, {
      method: 'POST',
      body: note ? { note } : {}
    })
    return res?.data
  }

  /** GET /dispensings/:id/labels — what to print on the medicine labels. */
  async function fetchLabels(id: string): Promise<MedicineLabelData | undefined> {
    const res: { data?: MedicineLabelData } = await $api(`/dispensings/${id}/labels`)
    return res?.data
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
    fetchPrescriptions,
    verifyPrescription,
    fetchLabels
  }
}
