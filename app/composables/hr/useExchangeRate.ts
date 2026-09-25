/**
 * The clinic's KHR per USD rate, used for every KHR figure on payslips and
 * exports.
 *
 * There is no clinic-settings field for this in the backend, so it is kept in
 * this browser's localStorage. That means it is per device, not per clinic:
 * two people on two machines can show different KHR amounts. Moving it into
 * clinic settings is the proper fix.
 */
export const DEFAULT_KHR_PER_USD = 4100

export const useExchangeRate = () => {
  // initOnMounted avoids an SSR/client hydration mismatch when a saved value exists.
  const stored = useLocalStorage<number>('hr_khr_per_usd', DEFAULT_KHR_PER_USD, { initOnMounted: true })

  /** Always usable, even while the input box is empty or holds junk. */
  const rate = computed(() => {
    const value = Number(stored.value)
    return Number.isFinite(value) && value > 0 ? value : DEFAULT_KHR_PER_USD
  })

  return { stored, rate }
}
