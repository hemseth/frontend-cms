/**
 * Pure pharmacy/inventory helpers. No Nuxt or network access, so they can be
 * unit tested directly.
 *
 * Quantities from the backend are always BASE units (`qtyBase`). A medicine's
 * `conversionRate` is how many base units make one sale unit.
 */

export type StockLevel = 'out' | 'low' | 'ok'
export type ExpiryLevel = 'expired' | 'near' | 'ok' | 'unknown'

/** Nuxt UI v4 semantic colours. 'gray' is not one of them; use 'neutral'. */
export type UiColor = 'error' | 'warning' | 'success' | 'neutral' | 'primary' | 'info' | 'secondary'

/** Warn when a batch expires within this many days. */
export const NEAR_EXPIRY_DAYS = 30

/**
 * The medicine model has no `reorderLevel`; the equivalent field is
 * `minStockAlert` (default 10).
 */
export const DEFAULT_REORDER_LEVEL = 10

/** Midnight today, so "expires today" is still dispensable — matches fefo-allocation.service.ts. */
function startOfToday(now: Date = new Date()): Date {
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d
}

/** Whole days from today until `date`. Negative once the date has passed. */
export function daysUntil(date: string | Date | null | undefined, now: Date = new Date()): number | null {
  if (!date) return null
  const target = new Date(date)
  if (Number.isNaN(target.getTime())) return null
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - startOfToday(now).getTime()) / 86_400_000)
}

/**
 * red = nothing on hand, yellow = at or below the reorder level, green = above it.
 */
export function stockLevel(qty: number | null | undefined, reorderLevel: number = DEFAULT_REORDER_LEVEL): StockLevel {
  const n = Number(qty)
  if (!Number.isFinite(n) || n <= 0) return 'out'
  return n <= reorderLevel ? 'low' : 'ok'
}

export function stockLevelColor(level: StockLevel): UiColor {
  return level === 'out' ? 'error' : level === 'low' ? 'warning' : 'success'
}

/**
 * A batch is expired the day AFTER its expiry date, near-expiry inside
 * NEAR_EXPIRY_DAYS, and `unknown` when it carries no expiry date at all.
 */
export function expiryLevel(
  expiryDate: string | Date | null | undefined,
  nearDays: number = NEAR_EXPIRY_DAYS,
  now: Date = new Date()
): ExpiryLevel {
  const days = daysUntil(expiryDate, now)
  if (days === null) return 'unknown'
  if (days < 0) return 'expired'
  return days <= nearDays ? 'near' : 'ok'
}

export function expiryLevelColor(level: ExpiryLevel): UiColor {
  return level === 'expired' ? 'error' : level === 'near' ? 'warning' : level === 'ok' ? 'success' : 'neutral'
}

/** Expired stock can never be dispensed; the FEFO allocator excludes it server-side too. */
export function isDispensable(expiryDate: string | Date | null | undefined, now: Date = new Date()): boolean {
  return expiryLevel(expiryDate, NEAR_EXPIRY_DAYS, now) !== 'expired'
}

/** Sale units -> base units. */
export function toBaseQty(qty: number, conversionRate: number | null | undefined): number {
  const rate = Number(conversionRate)
  return Number(qty) * (Number.isFinite(rate) && rate > 0 ? rate : 1)
}

/** Base units -> sale units (may be fractional). */
export function toSaleQty(qtyBase: number, conversionRate: number | null | undefined): number {
  const rate = Number(conversionRate)
  return Number(qtyBase) / (Number.isFinite(rate) && rate > 0 ? rate : 1)
}

/**
 * Prescription total from the dosing schedule:
 * (morning + afternoon + evening + night) x days
 * (CLINIC_WORKFLOW_CAMBODIA.md).
 */
export function prescriptionTotalQty(line: {
  morning?: number
  afternoon?: number
  evening?: number
  night?: number
  days?: number
}): number {
  const perDay = (Number(line.morning) || 0) + (Number(line.afternoon) || 0)
    + (Number(line.evening) || 0) + (Number(line.night) || 0)
  const days = Number(line.days) || 0
  return perDay * days
}

/** Earliest expiry date among a medicine's batches, or null when none carry one. */
export function nearestExpiry(batches: Array<{ expiryDate?: string | Date | null }>): Date | null {
  const dates = (batches || [])
    .map(b => (b?.expiryDate ? new Date(b.expiryDate) : null))
    .filter((d): d is Date => d !== null && !Number.isNaN(d.getTime()))
  if (!dates.length) return null
  return dates.reduce((min, d) => (d < min ? d : min))
}

/**
 * List endpoints are inconsistent: some return `{ data: [...] }` and others
 * `{ data: { data: [...], total } }`. This narrows both without casting.
 */
export function unwrapList<T>(res: unknown): T[] {
  if (!res || typeof res !== 'object') return []
  const data = (res as { data?: unknown }).data
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === 'object') {
    const inner = (data as { data?: unknown }).data
    if (Array.isArray(inner)) return inner as T[]
  }
  return []
}

/** DD/MM/YYYY — the Cambodian convention used across this app. */
export function formatKhDate(date: string | Date | null | undefined): string {
  if (!date) return '-'
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return '-'
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}
