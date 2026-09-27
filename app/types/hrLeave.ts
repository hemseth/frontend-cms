/** Shapes of the leave and overtime API (cms/src/models/hr/leave.model.ts). */
export type LeaveCategory = 'annual' | 'sick' | 'maternity' | 'paternity' | 'unpaid' | 'other'
export type LeaveRequestStatus = 'pending_supervisor' | 'pending_hr' | 'approved' | 'rejected' | 'cancelled'

export interface LeaveTypeRow {
  _id: string
  code: string
  nameEn: string
  nameKh?: string
  category: LeaveCategory
  annualDays: number
  accruesPerMonth?: number
  payPercent: number
  countCalendarDays: boolean
  requiresDocument: boolean
  onlyFor: 'any' | 'female' | 'male'
  status: 'active' | 'inactive'
}

export interface Decision {
  step: 'supervisor' | 'hr'
  decision: 'approve' | 'reject' | 'cancel'
  byName?: string
  at: string
  note?: string
}

export interface LeaveRequestRow {
  _id: string
  staffId: string
  leaveTypeId: string
  fromDate: string
  toDate: string
  halfDay: 'none' | 'am' | 'pm'
  days: number
  reason?: string
  status: LeaveRequestStatus
  decisions: Decision[]
  source: 'self' | 'hr'
  createdAt: string
}

export interface LeaveBalanceRow {
  staffId: string
  employeeCode?: string
  nameEn?: string
  nameKh?: string
  leaveTypeId: string
  code: string
  category: LeaveCategory
  entitlement: number
  used: number
  pending: number
  remaining: number | null
}

export type OvertimeType = 'normal' | 'weekend' | 'holiday' | 'night' | 'emergency'
export interface OvertimeRow {
  _id: string
  staffId: string
  date: string
  startTime: string
  endTime: string
  minutes: number
  type: OvertimeType
  reason?: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  decisions: Decision[]
  source: 'self' | 'hr'
}

export const LEAVE_STATUS_COLOR: Record<string, 'warning' | 'info' | 'success' | 'error' | 'neutral'> = {
  pending_supervisor: 'warning',
  pending_hr: 'info',
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
  cancelled: 'neutral'
}
