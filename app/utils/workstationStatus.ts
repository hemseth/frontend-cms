import type { WorkStatus, QueuePatient } from '~/types/workstation'

type ChipColor = 'neutral' | 'info' | 'primary' | 'warning' | 'success' | 'error'

/** The one status → color map every workstation page uses. */
export const WORK_STATUS_COLOR: Record<WorkStatus, ChipColor> = {
  waiting: 'neutral',
  triaged: 'info',
  in_consultation: 'primary',
  awaiting_results: 'warning',
  results_ready: 'success',
  awaiting_payment: 'warning',
  paid: 'success',
  requested: 'neutral',
  draft: 'info',
  result_entered: 'primary',
  verified: 'success',
  dispensed: 'success',
  completed: 'success',
  cancelled: 'error'
}

/** Lab/echo order status from the backend's four values (no sample or verify states exist yet). */
export function orderStatus(status: string): WorkStatus {
  if (status === 'in-progress') return 'draft'
  if (status === 'completed') return 'result_entered'
  if (status === 'cancelled') return 'cancelled'
  return 'requested'
}

export function ageOf(dob?: string | Date | null): number | null {
  if (!dob) return null
  const birth = new Date(dob)
  if (Number.isNaN(birth.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const beforeBirthday = now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  if (beforeBirthday) age--
  return age
}

export function patientCode(patient?: QueuePatient | null): string {
  if (!patient) return ''
  if (patient.pId) return `P-${String(patient.pId).padStart(6, '0')}`
  return patient.code || ''
}

/** Minutes since `from`, for the queue's waiting time. */
export function minutesSince(from?: string, now = Date.now()): number {
  if (!from) return 0
  return Math.max(0, Math.floor((now - new Date(from).getTime()) / 60000))
}

export function isSameLocalDay(value: string | Date | undefined, day: string): boolean {
  if (!value) return false
  const d = new Date(value)
  const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return local === day
}

export function todayLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
