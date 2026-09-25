export const useKhmerUtils = () => {
  const toKhmerNumber = (num: number | string | undefined | null): string => {
    if (num === null || num === undefined) return ''
    const khmerNumbers = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩']
    return String(num).replace(
      /[0-9]/g,
      digit => khmerNumbers[parseInt(digit)] ?? digit
    )
  }

  const formatKhmerDate = (date: string | Date | undefined): string => {
    if (!date) return '...'
    try {
      const d = new Date(date!)
      if (isNaN(d.getTime())) return String(date)

      const day = String(d.getDate()).padStart(2, '0')
      const year = d.getFullYear()
      const khmerMonths = [
        'មករា',
        'កុម្ភៈ',
        'មីនា',
        'មេសា',
        'ឧសភា',
        'មិថុនា',
        'កក្កដា',
        'សីហា',
        'កញ្ញា',
        'តុលា',
        'វិច្ឆិកា',
        'ធ្នូ'
      ]

      return `ថ្ងៃទី${toKhmerNumber(day)} ខែ${khmerMonths[d.getMonth()]} ឆ្នាំ${toKhmerNumber(year)}`
    } catch (e) {
      return String(date)
    }
  }

  const formatNumericKhmerDate = (date: string | Date | undefined): string => {
    if (!date) return '...'
    try {
      const d = new Date(date!)
      if (isNaN(d.getTime())) return String(date)

      const day = String(d.getDate()).padStart(2, '0')
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const year = d.getFullYear()

      return `${toKhmerNumber(day)}-${toKhmerNumber(month)}-${toKhmerNumber(year)}`
    } catch (e) {
      return String(date)
    }
  }

  return {
    toKhmerNumber,
    formatKhmerDate,
    formatNumericKhmerDate
  }
}
