/**
 * Read-only access to payroll, staff and clinic data. Saving a payroll stays in
 * the existing payroll page and its AddModal; nothing here writes.
 */
import type { ClinicRef, PayrollRecord, StaffRef } from '~/types/hr'

export const usePayroll = () => {
  /** GET /staff. The list endpoint nests its rows as `{ data: { data, total } }`. */
  async function fetchStaff(limit = 1000): Promise<StaffRef[]> {
    const res: { data?: { data?: StaffRef[] } } = await $api('/staff', { params: { limit } })
    return res?.data?.data ?? []
  }

  /** GET /payrolls for one `YYYY-MM` period. */
  async function fetchPayrolls(period: string): Promise<PayrollRecord[]> {
    const res: { data?: PayrollRecord[] } = await $api('/payrolls', { params: { period } })
    return res?.data ?? []
  }

  /** GET /payrolls/:id, or `null` when it does not exist. */
  async function fetchPayroll(id: string): Promise<PayrollRecord | null> {
    try {
      const res: { data?: PayrollRecord } = await $api(`/payrolls/${id}`)
      return res?.data ?? null
    } catch {
      return null
    }
  }

  /** GET /clinics/:id, or `null` when unavailable. */
  async function fetchClinic(clinicId: string): Promise<ClinicRef | null> {
    try {
      const res: { data?: ClinicRef } = await $api(`/clinics/${clinicId}`)
      return res?.data ?? null
    } catch {
      return null
    }
  }

  return { fetchStaff, fetchPayrolls, fetchPayroll, fetchClinic }
}
