/**
 * Inpatient treatment API (/api/ipd, backend docs/IPD.md).
 *
 * Times: the server may run in UTC, so every call that works in local days sends the
 * browser's timezone offset (Date.getTimezoneOffset()).
 */
import type {
  AdministrationStatus,
  FluidBalance,
  IpdBill,
  IpdChartEntry,
  IpdLabRequest,
  IpdMedicationOrder,
  IpdOrderInput,
  MarOrderRow
} from '~/types/ipd'

export const tzOffset = () => new Date().getTimezoneOffset()

/** Local YYYY-MM-DD for a date. */
export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export const useIpd = (admissionId: string) => {
  const base = `/ipd/admissions/${admissionId}`

  return {
    // Medication orders
    listOrders: async () => ((await $api(`${base}/medication-orders`)) as { data?: IpdMedicationOrder[] })?.data ?? [],
    createOrder: (input: IpdOrderInput) => $api(`${base}/medication-orders`, { method: 'POST', body: input }),
    changeOrder: (orderId: string, input: IpdOrderInput & { reason?: string }) =>
      $api(`/ipd/medication-orders/${orderId}/change`, { method: 'POST', body: input }),
    discontinueOrder: (orderId: string, reason: string) => $api(`/ipd/medication-orders/${orderId}/discontinue`, { method: 'POST', body: { reason } }),
    holdOrder: (orderId: string, reason: string) => $api(`/ipd/medication-orders/${orderId}/hold`, { method: 'POST', body: { reason } }),
    resumeOrder: (orderId: string) => $api(`/ipd/medication-orders/${orderId}/resume`, { method: 'POST', body: {} }),
    verifyOrder: (orderId: string, note?: string) => $api(`/ipd/medication-orders/${orderId}/verify`, { method: 'POST', body: note ? { note } : {} }),

    // MAR
    getMar: async (day: string) =>
      ((await $api(`${base}/mar`, { params: { date: day, tzOffset: tzOffset() } })) as { data?: { orders: MarOrderRow[] } })?.data?.orders ?? [],
    recordDose: (input: { orderId: string, scheduledAt?: string, status: AdministrationStatus, reason?: string, note?: string }) =>
      $api('/ipd/administrations', { method: 'POST', body: { ...input, tzOffset: tzOffset() } }) as Promise<{ supplyShort?: boolean, wardSupplyBaseQty?: number }>,
    markDoseError: (id: string, reason: string) => $api(`/ipd/administrations/${id}/entered-in-error`, { method: 'POST', body: { reason } }),

    // Nursing chart
    listChart: async (type?: string) =>
      ((await $api(`${base}/chart`, { params: type ? { type } : {} })) as { data?: IpdChartEntry[] })?.data ?? [],
    addChartEntry: (input: Record<string, unknown>) => $api(`${base}/chart`, { method: 'POST', body: input }),
    markChartError: (entryId: string, reason: string) => $api(`/ipd/chart/${entryId}/entered-in-error`, { method: 'POST', body: { reason } }),
    fluidBalance: async (day: string) =>
      ((await $api(`${base}/fluid-balance`, { params: { date: day, tzOffset: tzOffset() } })) as { data?: FluidBalance })?.data,

    // Labs
    listLabs: async () => ((await $api(`${base}/labs`)) as { data?: IpdLabRequest[] })?.data ?? [],
    orderLabs: (serviceIds: string[], notes?: string) => $api(`${base}/labs`, { method: 'POST', body: { serviceIds, notes } }),
    cancelLab: (labId: string, reason: string) => $api(`${base}/labs/${labId}/cancel`, { method: 'POST', body: { reason } }),

    // Bill
    getBill: async () => ((await $api(`${base}/bill`, { params: { tzOffset: tzOffset() } })) as { data?: IpdBill })?.data,
    addCharge: (serviceId: string, quantity: number, note?: string) => $api(`${base}/charges`, { method: 'POST', body: { serviceId, quantity, note } }),
    voidCharge: (chargeId: string, reason: string) => $api(`${base}/charges/${chargeId}/void`, { method: 'POST', body: { reason } }),
    addReceipt: (input: { type: 'DEPOSIT' | 'PAYMENT' | 'REFUND', amount: number, method: string, note?: string }) =>
      $api(`${base}/receipts`, { method: 'POST', body: { ...input, tzOffset: tzOffset() } }),
    voidReceipt: (receiptId: string, reason: string) => $api(`${base}/receipts/${receiptId}/void`, { method: 'POST', body: { reason, tzOffset: tzOffset() } }),
    finalizeBill: (discount: number, discountReason?: string) =>
      $api(`${base}/bill/finalize`, { method: 'POST', body: { discount, discountReason, tzOffset: tzOffset() } }),
    reopenBill: (reason: string) => $api(`${base}/bill/reopen`, { method: 'POST', body: { reason } })
  }
}
