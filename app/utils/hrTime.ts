/**
 * Time helpers for HR screens. Attendance is recorded in the clinic's time (the server uses
 * CLINIC_TZ_OFFSET_MINUTES, Cambodia by default), so times are shown in that zone whatever the
 * browser's own zone is.
 */
export const CLINIC_TIME_ZONE = 'Asia/Phnom_Penh'

/** ISO instant → "HH:mm" in the clinic's time zone. */
export function clinicHm(iso?: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: CLINIC_TIME_ZONE })
}

/** Today's date in the clinic, "YYYY-MM-DD". */
export function clinicToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: CLINIC_TIME_ZONE })
}

/** 485 → "8h 05m"; 0 → "–". */
export function formatMinutes(minutes?: number | null): string {
  const m = Math.max(0, Math.round(Number(minutes) || 0))
  if (!m) return '–'
  const h = Math.floor(m / 60)
  const r = m % 60
  return h ? `${h}h ${String(r).padStart(2, '0')}m` : `${r}m`
}

export const ATTENDANCE_STATUS_COLOR: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  present: 'success',
  late: 'warning',
  incomplete: 'warning',
  absent: 'error',
  leave: 'info',
  holiday: 'neutral',
  off: 'neutral'
}
