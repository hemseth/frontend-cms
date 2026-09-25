/**
 * Cambodia payroll engine. Pure functions only: no Nuxt, no network, so the
 * numbers can be unit tested and every screen (calculator, payslip, NSSF report,
 * Excel export) shares one source of truth.
 *
 * All money is USD unless a name says otherwise; KHR is derived from a
 * configurable exchange rate.
 *
 * Assumptions the clinic's accountant should confirm (each one is a single
 * field in PayrollRules, so changing it is a one-line edit):
 *  - NSSF is charged on the whole gross, with no wage ceiling.
 *  - The employee NSSF contribution does NOT reduce the taxable base.
 *  - Overtime is priced from base salary only (allowances are excluded).
 *  - One month is 26 working days of 8 hours.
 *  - Tax is progressive by slice, applied to monthly taxable pay in USD.
 */
import type { PayrollRecord, PayrollStatus, StaffRef } from '~/types/hr'

/** One slice of the progressive schedule. `upTo: null` means "and above". */
export interface TaxBracket {
  upTo: number | null
  /** Fraction, so 5% is 0.05. */
  rate: number
}

export interface PayrollRules {
  nssfEmployeeRate: number
  nssfEmployerRate: number
  /** Cap on the pay NSSF is charged on. `null` means no cap. */
  nssfWageCeiling: number | null
  nssfReducesTaxableIncome: boolean
  /** Monthly USD schedule. */
  taxBrackets: TaxBracket[]
  otMultipliers: {
    /** Ordinary weekday overtime. */
    weekday: number
    /** Sunday or public holiday. */
    restDay: number
    /** Night work, 10pm to 5am. */
    night: number
  }
  workingDaysPerMonth: number
  hoursPerDay: number
}

/** The schedule from the clinic's brief. */
export const DEFAULT_PAYROLL_RULES: PayrollRules = {
  nssfEmployeeRate: 0.02,
  nssfEmployerRate: 0.026,
  nssfWageCeiling: null,
  nssfReducesTaxableIncome: false,
  taxBrackets: [
    { upTo: 250, rate: 0 },
    { upTo: 500, rate: 0.05 },
    { upTo: 1250, rate: 0.1 },
    { upTo: 8500, rate: 0.15 },
    { upTo: null, rate: 0.2 }
  ],
  otMultipliers: { weekday: 1.5, restDay: 2, night: 1.3 },
  workingDaysPerMonth: 26,
  hoursPerDay: 8
}

/** Everything the engine needs, as money. */
export interface PayrollAmounts {
  baseSalary: number
  positionAllowance: number
  transportAllowance: number
  housingAllowance: number
  otherAllowances: number
  overtime: number
  bonus: number
  absenceDeduction: number
  lateDeduction: number
  /** Salary advance being repaid this month. */
  advanceRepayment: number
  otherDeductions: number
}

export interface OtHours {
  weekday: number
  restDay: number
  night: number
}

export interface TaxSlice {
  from: number
  to: number | null
  rate: number
  taxable: number
  tax: number
}

export interface PayrollResult {
  allowances: number
  gross: number
  nssfBase: number
  nssfEmployee: number
  nssfEmployer: number
  /** What tax is charged on. */
  taxableIncome: number
  incomeTax: number
  taxSlices: TaxSlice[]
  /** Tax as a percentage of taxable income. */
  effectiveTaxRate: number
  /** Everything taken from the employee's gross. */
  totalDeductions: number
  net: number
  /** Gross plus the employer's NSSF share: the clinic's real cost. */
  employerCost: number
}

export const EMPTY_AMOUNTS: PayrollAmounts = {
  baseSalary: 0,
  positionAllowance: 0,
  transportAllowance: 0,
  housingAllowance: 0,
  otherAllowances: 0,
  overtime: 0,
  bonus: 0,
  absenceDeduction: 0,
  lateDeduction: 0,
  advanceRepayment: 0,
  otherDeductions: 0
}

/** Round to whole cents without the 1.005 -> 1 float trap. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/** Coerce anything typed into a number input to a finite, non-negative number. */
export function toAmount(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function sanitize(input: Partial<PayrollAmounts>): PayrollAmounts {
  const out = { ...EMPTY_AMOUNTS }
  for (const key of Object.keys(EMPTY_AMOUNTS) as Array<keyof PayrollAmounts>) {
    out[key] = toAmount(input[key])
  }
  return out
}

export function hourlyRate(baseSalary: number, rules: PayrollRules = DEFAULT_PAYROLL_RULES): number {
  const divisor = rules.workingDaysPerMonth * rules.hoursPerDay
  return divisor > 0 ? toAmount(baseSalary) / divisor : 0
}

/** Overtime pay from hours worked. Categories are priced separately, never stacked. */
export function overtimeFromHours(
  baseSalary: number,
  hours: Partial<OtHours>,
  rules: PayrollRules = DEFAULT_PAYROLL_RULES
): number {
  const rate = hourlyRate(baseSalary, rules)
  const m = rules.otMultipliers
  return round2(
    rate * (toAmount(hours.weekday) * m.weekday + toAmount(hours.restDay) * m.restDay + toAmount(hours.night) * m.night)
  )
}

/** Pay withheld for unpaid absence days. */
export function absenceFromDays(
  baseSalary: number,
  days: number,
  rules: PayrollRules = DEFAULT_PAYROLL_RULES
): number {
  if (rules.workingDaysPerMonth <= 0) return 0
  return round2((toAmount(baseSalary) / rules.workingDaysPerMonth) * toAmount(days))
}

/** Progressive income tax on monthly taxable pay, with the per-slice working. */
export function calculateIncomeTax(
  monthlyTaxable: number,
  brackets: TaxBracket[] = DEFAULT_PAYROLL_RULES.taxBrackets
): { tax: number, slices: TaxSlice[] } {
  const income = toAmount(monthlyTaxable)
  const slices: TaxSlice[] = []
  let lower = 0
  let tax = 0

  for (const bracket of brackets) {
    if (income <= lower) break
    const upper = bracket.upTo ?? Infinity
    const taxable = Math.min(income, upper) - lower
    const sliceTax = taxable * bracket.rate
    slices.push({ from: lower, to: bracket.upTo, rate: bracket.rate, taxable: round2(taxable), tax: round2(sliceTax) })
    tax += sliceTax
    lower = upper
  }

  return { tax: round2(tax), slices }
}

/**
 * Net pay for one employee-month.
 *
 * Earnings   = base + allowances + overtime + bonus
 * Taxable    = earnings - absence - late   (pay not earned is not taxed)
 * Deductions = NSSF employee + income tax + advance repayment + absence + late + other
 *
 * `net` is deliberately not clamped: a negative net means the deductions exceed
 * the earnings, and hiding that behind a zero would let a payslip go out wrong.
 */
export function computePayroll(input: Partial<PayrollAmounts>, rules: PayrollRules = DEFAULT_PAYROLL_RULES): PayrollResult {
  const a = sanitize(input)

  const allowances = round2(a.positionAllowance + a.transportAllowance + a.housingAllowance + a.otherAllowances)
  const gross = round2(a.baseSalary + allowances + a.overtime + a.bonus)

  const nssfBase = rules.nssfWageCeiling === null ? gross : Math.min(gross, rules.nssfWageCeiling)
  const nssfEmployee = round2(nssfBase * rules.nssfEmployeeRate)
  const nssfEmployer = round2(nssfBase * rules.nssfEmployerRate)

  const earnedGross = Math.max(0, gross - a.absenceDeduction - a.lateDeduction)
  const taxableIncome = round2(Math.max(0, rules.nssfReducesTaxableIncome ? earnedGross - nssfEmployee : earnedGross))
  const { tax: incomeTax, slices } = calculateIncomeTax(taxableIncome, rules.taxBrackets)

  const totalDeductions = round2(
    nssfEmployee + incomeTax + a.advanceRepayment + a.absenceDeduction + a.lateDeduction + a.otherDeductions
  )

  return {
    allowances,
    gross,
    nssfBase: round2(nssfBase),
    nssfEmployee,
    nssfEmployer,
    taxableIncome,
    incomeTax,
    taxSlices: slices,
    effectiveTaxRate: taxableIncome > 0 ? round2((incomeTax / taxableIncome) * 100) : 0,
    totalDeductions,
    net: round2(gross - totalDeductions),
    employerCost: round2(gross + nssfEmployer)
  }
}

/** Map a stored payroll document onto the engine's inputs. */
export function toPayrollAmounts(record: Partial<PayrollRecord>): PayrollAmounts {
  return sanitize({
    baseSalary: record.baseSalary,
    positionAllowance: record.positionAllowance,
    transportAllowance: record.transportAllowance,
    housingAllowance: record.housingAllowance,
    otherAllowances: record.otherAllowances,
    overtime: record.overtime,
    bonus: record.bonus,
    absenceDeduction: record.absenceDeduction,
    lateDeduction: record.lateDeduction,
    // The backend has no advance-repayment field, so it is always 0 here.
    advanceRepayment: 0,
    otherDeductions: record.otherDeductions
  })
}

/**
 * Body for POST /payrolls. The backend model has no advance-repayment field, so
 * it is folded into `otherDeductions`; the backend also recomputes gross, tax
 * and net itself and ignores whatever this sends for those.
 */
export function toBackendPayload(amounts: PayrollAmounts): Record<string, number> {
  const a = sanitize(amounts)
  return {
    baseSalary: a.baseSalary,
    positionAllowance: a.positionAllowance,
    transportAllowance: a.transportAllowance,
    housingAllowance: a.housingAllowance,
    otherAllowances: a.otherAllowances,
    overtime: a.overtime,
    bonus: a.bonus,
    absenceDeduction: a.absenceDeduction,
    lateDeduction: a.lateDeduction,
    otherDeductions: round2(a.otherDeductions + a.advanceRepayment)
  }
}

/** USD to whole riel. */
export function usdToKhr(usd: number, khrPerUsd: number): number {
  const rate = Number.isFinite(khrPerUsd) && khrPerUsd > 0 ? khrPerUsd : 0
  return Math.round(usd * rate)
}

export function formatUsd(n: number): string {
  const value = Number.isFinite(n) ? n : 0
  const sign = value < 0 ? '-' : ''
  return `${sign}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatKhr(n: number): string {
  const value = Number.isFinite(n) ? Math.round(n) : 0
  return `${value.toLocaleString('en-US')} ៛`
}

const KH_MONTHS = ['មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា', 'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ']
const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** `2026-09` to "កញ្ញា 2026" or "September 2026". */
export function periodLabel(period: string, locale: 'km' | 'en' = 'en'): string {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(period)
  if (!match) return period
  const index = Number(match[2]) - 1
  return `${(locale === 'km' ? KH_MONTHS : EN_MONTHS)[index]} ${match[1]}`
}

/** Payroll's stored gross, rebuilt from its parts so it never depends on a stale total. */
export function grossOf(record: Partial<PayrollRecord>): number {
  return computePayroll(toPayrollAmounts(record)).gross
}

// ---------------------------------------------------------------------------
// NSSF monthly contribution rows
// ---------------------------------------------------------------------------

export interface NssfRow {
  payrollId: string
  staffId: string
  nameKh?: string
  nameEn?: string
  nssfNo?: string
  status?: PayrollStatus
  /** The pay NSSF was charged on. */
  contributionBase: number
  employee: number
  employer: number
  total: number
}

export interface NssfTotals {
  count: number
  contributionBase: number
  employee: number
  employer: number
  total: number
  /** Employees with no NSSF number: a filing cannot be completed without it. */
  missingNssfNo: number
  /** Payrolls still in draft: their figures may still change. */
  draftCount: number
}

export function buildNssfRows(
  payrolls: PayrollRecord[],
  staff: StaffRef[],
  rules: PayrollRules = DEFAULT_PAYROLL_RULES
): NssfRow[] {
  const byId = new Map(staff.map(s => [String(s._id), s]))
  return payrolls.map((p) => {
    const result = computePayroll(toPayrollAmounts(p), rules)
    const person = byId.get(String(p.staffId))
    return {
      payrollId: String(p._id),
      staffId: String(p.staffId),
      nameKh: person?.nameKh,
      nameEn: person?.nameEn || p.staffName,
      nssfNo: person?.nssfNo,
      status: p.status,
      contributionBase: result.nssfBase,
      employee: result.nssfEmployee,
      employer: result.nssfEmployer,
      total: round2(result.nssfEmployee + result.nssfEmployer)
    }
  })
}

export function summariseNssf(rows: NssfRow[]): NssfTotals {
  const sum = (pick: (r: NssfRow) => number) => round2(rows.reduce((acc, r) => acc + pick(r), 0))
  return {
    count: rows.length,
    contributionBase: sum(r => r.contributionBase),
    employee: sum(r => r.employee),
    employer: sum(r => r.employer),
    total: sum(r => r.total),
    missingNssfNo: rows.filter(r => !r.nssfNo).length,
    draftCount: rows.filter(r => r.status === 'draft').length
  }
}

// ---------------------------------------------------------------------------
// Payroll sheet rows (Excel export)
// ---------------------------------------------------------------------------

export interface PayrollSheetRow {
  payrollId: string
  staffId: string
  employeeCode?: string
  nameKh?: string
  nameEn?: string
  nssfNo?: string
  status?: PayrollStatus
  amounts: PayrollAmounts
  result: PayrollResult
  netKhr: number
}

export function buildPayrollSheetRows(
  payrolls: PayrollRecord[],
  staff: StaffRef[],
  khrPerUsd: number,
  rules: PayrollRules = DEFAULT_PAYROLL_RULES
): PayrollSheetRow[] {
  const byId = new Map(staff.map(s => [String(s._id), s]))
  return payrolls.map((p) => {
    const person = byId.get(String(p.staffId))
    const amounts = toPayrollAmounts(p)
    const result = computePayroll(amounts, rules)
    return {
      payrollId: String(p._id),
      staffId: String(p.staffId),
      employeeCode: person?.employeeCode,
      nameKh: person?.nameKh,
      nameEn: person?.nameEn || p.staffName,
      nssfNo: person?.nssfNo,
      status: p.status,
      amounts,
      result,
      netKhr: usdToKhr(result.net, khrPerUsd)
    }
  })
}

/**
 * Compare what the backend stored against what the engine computes. The backend
 * has no NSSF deduction and prices tax against KHR brackets, so a stored payroll
 * and a payslip can legitimately disagree; this makes that visible instead of
 * letting a wrong payslip pass quietly.
 */
export function reconcileWithStored(
  record: Partial<PayrollRecord>,
  result: PayrollResult,
  tolerance = 0.01
): { matches: boolean, storedNet: number | null, computedNet: number, delta: number } {
  const stored = typeof record.netSalary === 'number' ? record.netSalary : null
  const delta = stored === null ? 0 : round2(result.net - stored)
  return {
    matches: stored === null || Math.abs(delta) <= tolerance,
    storedNet: stored,
    computedNet: result.net,
    delta
  }
}

/** Everything a payslip renders. Built once by the caller so the document never recomputes. */
export interface PayslipData {
  clinicName: string
  clinicNameKh?: string
  employee: {
    nameKh?: string
    nameEn?: string
    employeeId: string
    /** Absent when the backend has no NSSF number for the person. */
    nssfNo?: string
    position?: string
  }
  /** `YYYY-MM`. */
  period: string
  payrollId?: string
  amounts: PayrollAmounts
  result: PayrollResult
  khrPerUsd: number
  issuedAt?: string | Date
  /** Set when the stored payroll disagrees with the recalculated figures. */
  reconciliation?: { storedNet: number, computedNet: number }
}

/** A short, human-readable id for display when the staff record has no employee code. */
export function displayEmployeeId(staff: Partial<StaffRef> | undefined): string {
  if (staff?.employeeCode) return staff.employeeCode
  return staff?._id ? `EMP-${String(staff._id).slice(-6).toUpperCase()}` : '-'
}
