/**
 * Staff profile: education and training, work experience, positions held at this clinic.
 * Shapes match cms/src/models/hr/staff.model.ts.
 */
export const QUALIFICATION_LEVELS = [
  'short_course', 'certificate', 'diploma', 'associate', 'bachelor', 'md', 'specialist', 'master', 'phd', 'other'
] as const
export type QualificationLevel = typeof QUALIFICATION_LEVELS[number]

export interface StaffQualification {
  level: QualificationLevel
  title: string
  field?: string
  institution?: string
  country?: string
  startYear?: number
  endYear?: number
}

export interface StaffExperience {
  position: string
  organization: string
  country?: string
  startDate?: string
  endDate?: string
  current?: boolean
  duties?: string
}

export interface StaffPosition {
  position: string
  department?: string
  startDate?: string
  endDate?: string
  note?: string
}

/** A staff record as the list returns it (fields used by the profile screens). */
export interface StaffMember {
  _id: string
  nameEn?: string
  nameKh?: string
  role?: string
  specialization?: string
  hireDate?: string
  skills?: string[]
  qualifications?: StaffQualification[]
  experience?: StaffExperience[]
  positionHistory?: StaffPosition[]
}

/** Countries staff most often study or work in; any other name can be typed in the form. */
export const COUNTRIES: Array<{ value: string, en: string, km: string }> = [
  { value: 'KH', en: 'Cambodia', km: 'កម្ពុជា' },
  { value: 'TH', en: 'Thailand', km: 'ថៃ' },
  { value: 'VN', en: 'Vietnam', km: 'វៀតណាម' },
  { value: 'LA', en: 'Laos', km: 'ឡាវ' },
  { value: 'CN', en: 'China', km: 'ចិន' },
  { value: 'SG', en: 'Singapore', km: 'សិង្ហបុរី' },
  { value: 'MY', en: 'Malaysia', km: 'ម៉ាឡេស៊ី' },
  { value: 'JP', en: 'Japan', km: 'ជប៉ុន' },
  { value: 'KR', en: 'South Korea', km: 'កូរ៉េខាងត្បូង' },
  { value: 'FR', en: 'France', km: 'បារាំង' },
  { value: 'AU', en: 'Australia', km: 'អូស្ត្រាលី' },
  { value: 'US', en: 'United States', km: 'សហរដ្ឋអាមេរិក' }
]

export function countryLabel(value: string | undefined, locale: string): string {
  if (!value) return ''
  const known = COUNTRIES.find(c => c.value === value)
  return known ? (locale === 'km' ? known.km : known.en) : value
}

/** "2019-06" → months since year 0; "2019" counts from January (start) or December (end). */
function toMonth(value: string | undefined, end: boolean): number | null {
  const m = /^(\d{4})(?:-(\d{2}))?$/.exec(value || '')
  if (!m) return null
  return Number(m[1]) * 12 + (m[2] ? Number(m[2]) - 1 : end ? 11 : 0)
}

/**
 * Whole years of work, from jobs elsewhere and positions here. Overlapping periods count once;
 * an entry without a start date is skipped, one without an end date runs to today.
 */
export function yearsOfExperience(experience: StaffExperience[] = [], history: StaffPosition[] = [], today = new Date()): number {
  const now = today.getFullYear() * 12 + today.getMonth()
  const ranges = [
    ...experience.map(e => [toMonth(e.startDate, false), e.current ? now : toMonth(e.endDate, true) ?? now] as const),
    ...history.map(p => [toMonth(p.startDate, false), toMonth(p.endDate, true) ?? now] as const)
  ].filter((r): r is readonly [number, number] => r[0] !== null && r[1] >= r[0]).sort((a, b) => a[0] - b[0])
  let months = 0
  let covered = -Infinity
  for (const [start, end] of ranges) {
    const from = Math.max(start, covered + 1)
    if (end >= from) months += end - from + 1
    covered = Math.max(covered, end)
  }
  return Math.floor(months / 12)
}

/** "2019-06" → "06/2019"; "2019" stays. */
export function formatYearMonth(value?: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(value || '')
  return m ? `${m[2]}/${m[1]}` : value || ''
}
