export type RangeFlag = 'H' | 'L' | null

/**
 * Flags a result against a reference range written the way the service catalogue stores it:
 * "3.5-5.5", "3.5 - 5.5", "< 200", "<=200", "> 40", ">=40". Anything else (text ranges such as
 * "Negative", sex-specific ranges) is not flagged rather than guessed.
 */
export function flagValue(value: string | number | undefined | null, refRange?: string): RangeFlag {
  if (value === undefined || value === null || value === '' || !refRange) return null
  const n = Number(String(value).replace(',', '.'))
  if (!Number.isFinite(n)) return null
  const range = refRange.replace(/,/g, '.').trim()

  const between = range.match(/^(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)$/)
  if (between) {
    const low = Number(between[1])
    const high = Number(between[2])
    if (n < low) return 'L'
    if (n > high) return 'H'
    return null
  }
  const upper = range.match(/^<\s*=?\s*(-?\d+(?:\.\d+)?)$/)
  if (upper) return n > Number(upper[1]) ? 'H' : null
  const lower = range.match(/^>\s*=?\s*(-?\d+(?:\.\d+)?)$/)
  if (lower) return n < Number(lower[1]) ? 'L' : null
  return null
}

/** Vital-sign ranges for adults, used to highlight triage values. Not diagnostic thresholds. */
export const VITAL_LIMITS = {
  temp: { min: 34, max: 43, low: 36, high: 37.5 },
  heartRate: { min: 20, max: 250, low: 60, high: 100 },
  respRate: { min: 4, max: 80, low: 12, high: 20 },
  oxygen: { min: 50, max: 100, low: 95, high: 100 },
  weight: { min: 0.5, max: 300, low: 0.5, high: 300 },
  height: { min: 20, max: 250, low: 20, high: 250 },
  bsl: { min: 10, max: 800, low: 70, high: 180 },
  painScore: { min: 0, max: 10, low: 0, high: 3 },
  systolic: { min: 50, max: 260, low: 90, high: 140 },
  diastolic: { min: 30, max: 160, low: 60, high: 90 }
} as const

export type VitalKey = keyof typeof VITAL_LIMITS

/** 'invalid' = outside what can be measured (a typo); 'high'/'low' = abnormal but plausible. */
export function vitalState(key: VitalKey, value: string | number | undefined): 'invalid' | 'high' | 'low' | null {
  if (value === undefined || value === null || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n)) return 'invalid'
  const limit = VITAL_LIMITS[key]
  if (n < limit.min || n > limit.max) return 'invalid'
  if (n > limit.high) return 'high'
  if (n < limit.low) return 'low'
  return null
}

/** "120/80" -> [120, 80]; anything else -> nulls. */
export function splitBp(bp?: string): [number | null, number | null] {
  const m = String(bp || '').match(/^\s*(\d{2,3})\s*\/\s*(\d{2,3})\s*$/)
  return m ? [Number(m[1]), Number(m[2])] : [null, null]
}
