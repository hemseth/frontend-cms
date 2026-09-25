import { DEFAULT_PAYROLL_RULES, type PayrollRules, type TaxBracket } from '~/utils/payroll'

export interface StoredTaxBracket {
  min: number
  /** null (JSON has no Infinity), 0 or anything not above `min` means "no upper limit". */
  max: number | null
  /** Percent, so 5% is 5. */
  rate: number
  description?: string
}

export interface StoredTaxSettings {
  currency?: string
  period?: 'monthly' | 'annual'
  brackets?: StoredTaxBracket[]
}

export const isOpenEnded = (bracket: StoredTaxBracket) =>
  bracket.max == null || !Number.isFinite(bracket.max) || bracket.max <= bracket.min

// The server taxes every payroll with the clinic's saved settings (Settings > Tax). Converting
// them here keeps the calculator and payslip showing the tax the server actually stores.
export function toPayrollRules(settings: StoredTaxSettings | null | undefined): PayrollRules {
  const brackets = [...(settings?.brackets ?? [])].sort((a, b) => a.min - b.min)
  if (!brackets.length) return DEFAULT_PAYROLL_RULES
  const perMonth = settings?.period === 'annual' ? 12 : 1
  const taxBrackets: TaxBracket[] = brackets.map(bracket => ({
    upTo: isOpenEnded(bracket) ? null : (bracket.max as number) / perMonth,
    rate: bracket.rate / 100
  }))
  return { ...DEFAULT_PAYROLL_RULES, taxBrackets }
}

export const usePayrollRules = () => {
  const settings = ref<StoredTaxSettings | null>(null)
  const rules = computed(() => toPayrollRules(settings.value))

  async function load() {
    const res: { data?: StoredTaxSettings } = await $api('/tax-settings')
    settings.value = res?.data ?? null
  }

  return { settings, rules, load }
}
