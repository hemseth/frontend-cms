/**
 * Leave rules and calendar maths. Pure functions, no Nuxt or network.
 *
 * The backend has no leave model, so records arrive as props; nothing here
 * persists anything.
 *
 * Counting rule: maternity leave is counted in calendar days (the 90 days run
 * straight through). Every other type consumes working days only, so Sundays
 * and public holidays inside the range are not charged.
 */

export const LEAVE_TYPES = ['annual', 'sick', 'maternity', 'paternity', 'unpaid', 'other'] as const
export type LeaveType = (typeof LEAVE_TYPES)[number]
export type LeaveStatus = 'pending' | 'approved' | 'rejected'

export interface LeaveRules {
  /** Annual leave earned per month worked. */
  annualDaysPerMonth: number
  maternityDays: number
  paternityDays: number
}

export const DEFAULT_LEAVE_RULES: LeaveRules = {
  annualDaysPerMonth: 1.5,
  maternityDays: 90,
  paternityDays: 10
}

export interface LeaveRecord {
  _id?: string
  staffId: string
  type: LeaveType
  /** `YYYY-MM-DD`; a trailing time part is ignored. */
  startDate: string
  endDate: string
  status?: LeaveStatus
}

/** `YYYY-MM-DD` (or an ISO timestamp) to a local-midnight Date. `null` when invalid. */
export function parseIsoDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getFullYear(), value.getMonth(), value.getDate())
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value))
  if (!match) return null
  const [, y, m, d] = match
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  // Reject overflow such as 2026-02-31, which Date would silently roll into March.
  return date.getMonth() === Number(m) - 1 && date.getDate() === Number(d) ? date : null
}

export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/**
 * `YYYY-MM-DD` to DD/MM/YYYY without going through `new Date(string)`, which
 * reads a date-only string as UTC and shows the previous day west of UTC.
 */
export function formatIsoDmy(value: string | Date | null | undefined): string {
  const date = parseIsoDate(value)
  if (!date) return '-'
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
}

/** `2026-09` to `{ year: 2026, month: 9 }`. */
export function parsePeriod(period: string): { year: number, month: number } | null {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(period)
  return match ? { year: Number(match[1]), month: Number(match[2]) } : null
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function isSunday(date: Date): boolean {
  return date.getDay() === 0
}

/** Annual leave earned after `monthsServed` months. */
export function annualLeaveAccrued(monthsServed: number, rules: LeaveRules = DEFAULT_LEAVE_RULES): number {
  const months = Number.isFinite(monthsServed) && monthsServed > 0 ? monthsServed : 0
  return Math.round(months * rules.annualDaysPerMonth * 100) / 100
}

/**
 * Annual leave balance. Carry-over is allowed and uncapped, as specified, so the
 * previous year's unused days simply add to this year's entitlement.
 */
export function annualLeaveBalance(
  input: { carriedOver?: number, monthsServed: number, taken?: number },
  rules: LeaveRules = DEFAULT_LEAVE_RULES
): { accrued: number, carriedOver: number, entitlement: number, taken: number, available: number } {
  const carriedOver = Math.max(0, Number(input.carriedOver) || 0)
  const taken = Math.max(0, Number(input.taken) || 0)
  const accrued = annualLeaveAccrued(input.monthsServed, rules)
  const entitlement = Math.round((carriedOver + accrued) * 100) / 100
  return { accrued, carriedOver, entitlement, taken, available: Math.round((entitlement - taken) * 100) / 100 }
}

/** The statutory cap for a type, or `null` when the type has none. */
export function limitFor(type: LeaveType, rules: LeaveRules = DEFAULT_LEAVE_RULES): number | null {
  if (type === 'maternity') return rules.maternityDays
  if (type === 'paternity') return rules.paternityDays
  return null
}

function eachDay(start: Date, end: Date): Date[] {
  const days: Date[] = []
  for (let d = new Date(start); d <= end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    days.push(d)
  }
  return days
}

/** Whether a day is charged against leave of this type. */
function isChargeable(day: Date, type: LeaveType, holidays: Set<string>): boolean {
  if (type === 'maternity') return true
  return !isSunday(day) && !holidays.has(toIsoDate(day))
}

/** Days a leave range consumes. 0 when the dates are invalid or reversed. */
export function leaveDayCount(
  record: Pick<LeaveRecord, 'type' | 'startDate' | 'endDate'>,
  holidays: string[] = []
): number {
  const start = parseIsoDate(record.startDate)
  const end = parseIsoDate(record.endDate)
  if (!start || !end || end < start) return 0
  const holidaySet = new Set(holidays)
  return eachDay(start, end).filter(d => isChargeable(d, record.type, holidaySet)).length
}

export type LeaveProblem = 'invalid_dates' | 'no_chargeable_days' | 'exceeds_limit' | 'exceeds_balance'

/** Check a request before it is submitted. */
export function validateLeave(
  record: Pick<LeaveRecord, 'type' | 'startDate' | 'endDate'>,
  options: { rules?: LeaveRules, holidays?: string[], availableAnnual?: number } = {}
): { ok: boolean, days: number, problem?: LeaveProblem, limit?: number } {
  const rules = options.rules ?? DEFAULT_LEAVE_RULES
  const start = parseIsoDate(record.startDate)
  const end = parseIsoDate(record.endDate)
  if (!start || !end || end < start) return { ok: false, days: 0, problem: 'invalid_dates' }

  const days = leaveDayCount(record, options.holidays)
  if (days === 0) return { ok: false, days, problem: 'no_chargeable_days' }

  const limit = limitFor(record.type, rules)
  if (limit !== null && days > limit) return { ok: false, days, problem: 'exceeds_limit', limit }

  if (record.type === 'annual' && options.availableAnnual !== undefined && days > options.availableAnnual) {
    return { ok: false, days, problem: 'exceeds_balance', limit: options.availableAnnual }
  }
  return { ok: true, days }
}

/**
 * One row per staff member, one slot per day of the month. A slot holds the
 * leave type covering that day, or `null`. Rejected requests are ignored; when
 * two records overlap the later one in the list wins the slot.
 */
export function buildMonthGrid(
  records: LeaveRecord[],
  year: number,
  month: number
): Map<string, Array<LeaveType | null>> {
  const length = daysInMonth(year, month)
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month - 1, length)
  const grid = new Map<string, Array<LeaveType | null>>()

  for (const record of records) {
    if (record.status === 'rejected') continue
    const start = parseIsoDate(record.startDate)
    const end = parseIsoDate(record.endDate)
    if (!start || !end || end < start) continue

    const from = start > monthStart ? start : monthStart
    const to = end < monthEnd ? end : monthEnd
    if (from > to) continue

    const key = String(record.staffId)
    const row = grid.get(key) ?? new Array<LeaveType | null>(length).fill(null)
    for (const day of eachDay(from, to)) row[day.getDate() - 1] = record.type
    grid.set(key, row)
  }
  return grid
}

/** Leave days charged inside one month, optionally for a single type. */
export function leaveDaysInMonth(
  records: LeaveRecord[],
  staffId: string,
  year: number,
  month: number,
  holidays: string[] = [],
  type?: LeaveType
): number {
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month - 1, daysInMonth(year, month))
  const holidaySet = new Set(holidays)
  let total = 0

  for (const record of records) {
    if (record.status === 'rejected' || String(record.staffId) !== String(staffId)) continue
    if (type && record.type !== type) continue
    const start = parseIsoDate(record.startDate)
    const end = parseIsoDate(record.endDate)
    if (!start || !end || end < start) continue
    const from = start > monthStart ? start : monthStart
    const to = end < monthEnd ? end : monthEnd
    if (from > to) continue
    total += eachDay(from, to).filter(d => isChargeable(d, record.type, holidaySet)).length
  }
  return total
}
