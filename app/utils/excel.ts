/**
 * Excel import/export on exceljs (xlsx/SheetJS is not used: it has unfixed prototype-pollution
 * and ReDoS advisories). Limits follow pages/settings/specializations.vue: 10 MB file, 5000 data
 * rows, 500 characters per cell, and formula-injection escaping on export.
 */

export const EXCEL_MAX_FILE_BYTES = 10 * 1024 * 1024
export const EXCEL_MAX_ROWS = 5000
export const EXCEL_MAX_CELL_LENGTH = 500

export interface ExcelHeader {
  header: string
  key: string
  width?: number
}

export type ExcelImportErrorCode = 'fileTooLarge' | 'invalidWorkbook' | 'tooManyRows' | 'cellTooLong'

/** Thrown by readExcelFile; `code` and `params` map to the `excel.errors.*` i18n keys. */
export class ExcelImportError extends Error {
  constructor(public code: ExcelImportErrorCode, public params: Record<string, string | number> = {}) {
    super(code)
    this.name = 'ExcelImportError'
  }
}

/** The message to show for an import failure, translated when it is one of ours. */
export function excelImportErrorMessage(err: unknown, t: (key: string, params?: Record<string, unknown>) => string): string {
  if (err instanceof ExcelImportError) return t(`excel.errors.${err.code}`, err.params)
  return t('excel.errors.invalidWorkbook')
}

/**
 * A spreadsheet opens a cell starting with = + - @ as a formula (CSV/formula injection), so such
 * text is prefixed with an apostrophe. Numbers, dates and booleans are left as typed values.
 */
export function sanitizeExcelCell(value: unknown): unknown {
  if (typeof value !== 'string') return value
  return /^[=+\-@]/.test(value) ? `'${value}` : value
}

// Header names that would write onto Object.prototype when used as keys.
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

export async function downloadExcel(
  filename: string,
  sheetName: string,
  headers: ExcelHeader[],
  data: Record<string, unknown>[]
): Promise<void> {
  const { Workbook } = await import('exceljs')
  const workbook = new Workbook()
  const worksheet = workbook.addWorksheet(sheetName)

  worksheet.columns = headers.map(h => ({
    header: String(sanitizeExcelCell(h.header)),
    key: h.key,
    width: h.width || 20
  }))

  data.forEach((row) => {
    const safeRow: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(row)) safeRow[key] = sanitizeExcelCell(value)
    worksheet.addRow(safeRow)
  })

  worksheet.getRow(1).font = { bold: true }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  })
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`
  anchor.click()
  window.URL.revokeObjectURL(url)
}

export async function downloadExcelRows(
  filename: string,
  sheetName: string,
  data: Record<string, unknown>[]
): Promise<void> {
  const headers: ExcelHeader[] = (data && data.length
    ? Object.keys(data[0] || {})
    : []).map(key => ({ header: key, key }))
  await downloadExcel(filename, sheetName, headers, data)
}

/** Plain value of a cell: formula results, rich text and hyperlinks become their text. */
function cellValue(value: unknown): unknown {
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const v = value as { result?: unknown, richText?: Array<{ text?: string }>, text?: string }
    if ('result' in v) return v.result
    if (Array.isArray(v.richText)) return v.richText.map(part => part.text || '').join('')
    if (typeof v.text === 'string') return v.text
  }
  return value
}

/**
 * Reads the first sheet into objects keyed by the header row. Throws ExcelImportError when the
 * file is over 10 MB, cannot be parsed, has more than 5000 data rows or a cell longer than
 * 500 characters. Nothing is truncated silently.
 */
export async function readExcelFile<T = Record<string, unknown>>(
  file: File,
  maxRows = EXCEL_MAX_ROWS,
  maxSizeBytes = EXCEL_MAX_FILE_BYTES
): Promise<T[]> {
  if (file.size > maxSizeBytes) {
    throw new ExcelImportError('fileTooLarge', { max: Math.round(maxSizeBytes / (1024 * 1024)) })
  }

  const { Workbook } = await import('exceljs')
  const workbook = new Workbook()
  try {
    await workbook.xlsx.load(await file.arrayBuffer())
  } catch {
    throw new ExcelImportError('invalidWorkbook')
  }

  const worksheet = workbook.worksheets[0]
  if (!worksheet) return []

  // actualRowCount counts rows that hold values, header included.
  if (worksheet.actualRowCount - 1 > maxRows) {
    throw new ExcelImportError('tooManyRows', { max: maxRows })
  }

  const results: T[] = []
  const headers: string[] = []
  let failure: ExcelImportError | null = null

  worksheet.eachRow((row, rowNumber) => {
    if (failure) return
    if (rowNumber === 1) {
      row.eachCell((cell, colNumber) => {
        headers[colNumber - 1] = String(cellValue(cell.value) ?? '').trim()
      })
      return
    }
    const rowData: Record<string, unknown> = {}
    row.eachCell((cell, colNumber) => {
      if (failure) return
      const headerKey = headers[colNumber - 1] || `col_${colNumber}`
      if (UNSAFE_KEYS.has(headerKey)) return
      const value = cellValue(cell.value)
      if (typeof value === 'string' && value.length > EXCEL_MAX_CELL_LENGTH) {
        failure = new ExcelImportError('cellTooLong', { row: rowNumber, column: headerKey, max: EXCEL_MAX_CELL_LENGTH })
        return
      }
      rowData[headerKey] = value
    })
    if (Object.keys(rowData).length > 0) results.push(rowData as T)
  })

  if (failure) throw failure
  return results
}
