/**
 * Weekly shift roster logic. Pure functions: the component owns the drag and
 * drop, this owns what an assignment means.
 *
 * The backend has no shift model, so assignments are props in and events out;
 * nothing here persists anything.
 */

export interface ShiftDef {
  /** Stable key, also used as the i18n suffix (`hr.shift.MORNING`). */
  code: string
  /** 0 to 24. A shift whose end is before its start runs past midnight. */
  startHour: number
  endHour: number
}

/** Three contiguous 8 hour shifts covering the day. */
export const DEFAULT_SHIFTS: ShiftDef[] = [
  { code: 'MORNING', startHour: 6, endHour: 14 },
  { code: 'AFTERNOON', startHour: 14, endHour: 22 },
  { code: 'NIGHT', startHour: 22, endHour: 6 }
]

/** Night work per the payroll rules: 10pm to 5am. */
export const NIGHT_WINDOW = { startHour: 22, endHour: 5 }

/** Weekly hours above which a row is flagged. Confirm against the clinic's contracts. */
export const DEFAULT_MAX_WEEKLY_HOURS = 48

export interface RosterAssignment {
  staffId: string
  /** `YYYY-MM-DD`. */
  date: string
  /** A `ShiftDef.code`. */
  shift: string
}

/** Length of a shift in hours. Equal start and end is read as a full 24 hours. */
export function shiftLength(shift: ShiftDef): number {
  return ((shift.endHour - shift.startHour + 24) % 24) || 24
}

/** Hours of a shift that fall inside the night window (paid at the night multiplier). */
export function nightHoursOf(shift: ShiftDef, window = NIGHT_WINDOW): number {
  const length = shiftLength(shift)
  let night = 0
  // Walk in half hours so a shift starting on the half hour is still exact.
  for (let t = 0; t < length; t += 0.5) {
    const hour = (shift.startHour + t) % 24
    const inNight = window.startHour > window.endHour
      ? hour >= window.startHour || hour < window.endHour
      : hour >= window.startHour && hour < window.endHour
    if (inNight) night += 0.5
  }
  return night
}

export function findShift(list: RosterAssignment[], staffId: string, date: string): string | undefined {
  return list.find(a => String(a.staffId) === String(staffId) && a.date === date)?.shift
}

/** Give a person a shift on a day. One shift per person per day, so this replaces any existing one. */
export function assignShift(list: RosterAssignment[], staffId: string, date: string, shift: string): RosterAssignment[] {
  return [
    ...list.filter(a => !(String(a.staffId) === String(staffId) && a.date === date)),
    { staffId: String(staffId), date, shift }
  ]
}

export function clearShift(list: RosterAssignment[], staffId: string, date: string): RosterAssignment[] {
  return list.filter(a => !(String(a.staffId) === String(staffId) && a.date === date))
}

/** Move a shift from one cell to another; the destination's previous shift is replaced. */
export function moveShift(
  list: RosterAssignment[],
  from: { staffId: string, date: string },
  to: { staffId: string, date: string }
): RosterAssignment[] {
  const shift = findShift(list, from.staffId, from.date)
  if (!shift) return list
  return assignShift(clearShift(list, from.staffId, from.date), to.staffId, to.date, shift)
}

function localDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null
}

function isoOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** The seven ISO dates of the week containing `anyIso`, Monday first. */
export function weekDates(anyIso: string): string[] {
  const date = localDate(anyIso)
  if (!date) return []
  const sinceMonday = (date.getDay() + 6) % 7
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - sinceMonday)
  return Array.from({ length: 7 }, (_, i) => isoOf(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)))
}

/** Move a week forward or back. */
export function shiftWeek(anyIso: string, weeks: number): string {
  const date = localDate(anyIso)
  if (!date) return anyIso
  return isoOf(new Date(date.getFullYear(), date.getMonth(), date.getDate() + weeks * 7))
}

/** Total scheduled hours for one person across the given dates. */
export function weeklyHours(
  list: RosterAssignment[],
  staffId: string,
  dates: string[],
  shifts: ShiftDef[] = DEFAULT_SHIFTS
): number {
  const byCode = new Map(shifts.map(s => [s.code, s]))
  return dates.reduce((total, date) => {
    const code = findShift(list, staffId, date)
    const def = code ? byCode.get(code) : undefined
    return total + (def ? shiftLength(def) : 0)
  }, 0)
}
