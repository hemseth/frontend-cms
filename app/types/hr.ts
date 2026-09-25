/**
 * Shapes for the HR and payroll screens.
 *
 * These mirror the backend loosely. The backend Staff model has NO `nssfNo` or
 * `employeeCode`, and there is no leave or shift model at all; those fields and
 * records are optional here so the UI shows a dash instead of inventing data.
 */

export type PayrollStatus = 'draft' | 'calculated' | 'approved' | 'paid'

export interface StaffRef {
  _id: string
  nameEn?: string
  nameKh?: string
  gender?: string
  role?: string
  /** Not stored by the backend yet. */
  nssfNo?: string
  /** Not stored by the backend yet. */
  employeeCode?: string
}

/** A payroll document as the backend returns it. */
export interface PayrollRecord {
  _id: string
  staffId: string
  staffName?: string
  /** `YYYY-MM`. */
  period: string
  year?: number
  month?: number
  baseSalary: number
  positionAllowance?: number
  transportAllowance?: number
  housingAllowance?: number
  otherAllowances?: number
  overtime?: number
  bonus?: number
  absenceDeduction?: number
  lateDeduction?: number
  otherDeductions?: number
  grossSalary?: number
  totalDeductions?: number
  taxableIncome?: number
  taxAmount?: number
  netSalary?: number
  status?: PayrollStatus
  paymentDate?: string
  paymentMethod?: string
  notes?: string
}

/** The clinic, as far as a payslip header needs it. */
export interface ClinicRef {
  _id?: string
  name?: string
  nameKh?: string
}
