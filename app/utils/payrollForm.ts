export interface PayrollForm {
  staffId: string
  staffName: string
  period: string
  year: number
  month: number
  baseSalary: number
  positionAllowance: number
  transportAllowance: number
  housingAllowance: number
  otherAllowances: number
  overtime: number
  bonus: number
  absenceDeduction: number
  lateDeduction: number
  otherDeductions: number
  notes: string
}

// Year and month are always derived from the period, so they can never disagree with it.
const COPIED_KEYS = [
  'staffId', 'staffName', 'period', 'baseSalary', 'positionAllowance', 'transportAllowance',
  'housingAllowance', 'otherAllowances', 'overtime', 'bonus', 'absenceDeduction', 'lateDeduction',
  'otherDeductions', 'notes'
] as const satisfies ReadonlyArray<keyof PayrollForm>

function periodParts(period: string, now: Date) {
  const [year, month] = period.split('-').map(Number)
  return { year: year || now.getFullYear(), month: month || now.getMonth() + 1 }
}

export function blankPayrollForm(period?: string, now = new Date()): PayrollForm {
  const chosen = period || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return {
    staffId: '',
    staffName: '',
    period: chosen,
    ...periodParts(chosen, now),
    baseSalary: 0,
    positionAllowance: 0,
    transportAllowance: 0,
    housingAllowance: 0,
    otherAllowances: 0,
    overtime: 0,
    bonus: 0,
    absenceDeduction: 0,
    lateDeduction: 0,
    otherDeductions: 0,
    notes: ''
  }
}

// The payroll page lists a placeholder row (`_id: null`, `status: 'unpaid'`, computed totals) for staff
// who have no record yet. Only the editable fields are copied, so none of that reaches the request.
export function payrollFormFrom(
  payroll: Partial<Record<keyof PayrollForm, unknown>>,
  fallbackPeriod?: string,
  now = new Date()
): PayrollForm {
  const period = typeof payroll.period === 'string' && payroll.period ? payroll.period : fallbackPeriod
  const form = blankPayrollForm(period, now)
  const target: Record<string, unknown> = form as unknown as Record<string, unknown>
  for (const key of COPIED_KEYS) {
    const value = payroll[key]
    if (value !== undefined && value !== null) target[key] = value
  }
  return { ...form, ...periodParts(form.period, now) }
}
