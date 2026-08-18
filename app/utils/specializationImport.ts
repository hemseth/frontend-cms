import type { CellValue, Worksheet } from 'exceljs'

export type SpecializationStatus = 'active' | 'inactive'

export const IMPORT_REQUIRED_COLUMNS = ['Name (KH)', 'Name (EN)'] as const
export const IMPORT_NAME_MAX_LENGTH = 200
export const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/

export interface ImportRowError {
  row: number
  field: string
  message: string
}

export interface ImportResult {
  totalRows: number
  validRows: number
  importedRows: number
  failedRows: number
  errors: ImportRowError[]
}

export interface ParsedImportRow {
  row: number
  id: string
  nameKh: string
  nameEn: string
  status: string
}

export interface ValidImportRow {
  row: number
  id?: string
  nameKh: string
  nameEn: string
  status: SpecializationStatus
}

function normalizeHeader(value: unknown): string {
  return String(value ?? '').trim()
}

export function excelCellToText(value: CellValue | null | undefined): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') {
    const obj = value as { richText?: Array<{ text?: string }>, result?: unknown }
    if (Array.isArray(obj.richText)) {
      return obj.richText.map(item => item.text ?? '').join('')
    }
    if ('result' in obj) {
      return String(obj.result ?? '')
    }
  }
  return String(value)
}

export function readWorksheetHeaders(worksheet: Worksheet): Record<string, number> {
  const headerRow = worksheet.getRow(1)
  const indexByName: Record<string, number> = {}
  headerRow.eachCell((cell, colNumber) => {
    const header = normalizeHeader(excelCellToText(cell.value))
    if (header && !(header in indexByName)) {
      indexByName[header] = colNumber - 1
    }
  })
  return indexByName
}

export function findColumnIndex(indexByName: Record<string, number>, name: string): number | undefined {
  if (name in indexByName) return indexByName[name]
  const key = Object.keys(indexByName).find(candidate => candidate.toLowerCase() === name.toLowerCase())
  return key === undefined ? undefined : indexByName[key]
}

export function parseImportRows(worksheet: Worksheet, indexByName: Record<string, number>): ParsedImportRow[] {
  const colId = findColumnIndex(indexByName, 'ID')
  const colNameKh = findColumnIndex(indexByName, 'Name (KH)')
  const colNameEn = findColumnIndex(indexByName, 'Name (EN)')
  const colStatus = findColumnIndex(indexByName, 'Status')

  const rows: ParsedImportRow[] = []
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    const data: ParsedImportRow = { row: rowNumber, id: '', nameKh: '', nameEn: '', status: '' }
    if (colId !== undefined) data.id = excelCellToText(row.getCell(colId + 1).value).trim()
    if (colNameKh !== undefined) data.nameKh = excelCellToText(row.getCell(colNameKh + 1).value).trim()
    if (colNameEn !== undefined) data.nameEn = excelCellToText(row.getCell(colNameEn + 1).value).trim()
    if (colStatus !== undefined) data.status = excelCellToText(row.getCell(colStatus + 1).value).trim()
    if (data.id || data.nameKh || data.nameEn || data.status) {
      rows.push(data)
    }
  })
  return rows
}

export function validateImportRows(
  rows: ParsedImportRow[],
  message: (key: string) => string
): { valid: ValidImportRow[], errors: ImportRowError[] } {
  const errors: ImportRowError[] = []
  const valid: ValidImportRow[] = []
  const seenIds = new Set<string>()
  const seenKeys = new Set<string>()

  for (const row of rows) {
    const rowErrors: ImportRowError[] = []
    const pushError = (field: string, messageKey: string) => {
      rowErrors.push({ row: row.row, field, message: message(messageKey) })
    }

    if (row.id) {
      if (!OBJECT_ID_PATTERN.test(row.id)) {
        pushError('ID', 'specialization.importIdInvalid')
      } else if (seenIds.has(row.id)) {
        pushError('ID', 'specialization.importIdDuplicate')
      } else {
        seenIds.add(row.id)
      }
    }

    if (!row.nameKh) {
      pushError('Name (KH)', 'specialization.importNameKhRequired')
    } else if (row.nameKh.length > IMPORT_NAME_MAX_LENGTH) {
      pushError('Name (KH)', 'specialization.importNameTooLong')
    }

    if (!row.nameEn) {
      pushError('Name (EN)', 'specialization.importNameEnRequired')
    } else if (row.nameEn.length > IMPORT_NAME_MAX_LENGTH) {
      pushError('Name (EN)', 'specialization.importNameTooLong')
    }

    let status: SpecializationStatus = 'active'
    if (row.status) {
      const normalized = row.status.toLowerCase()
      if (normalized === 'active' || normalized === 'inactive') {
        status = normalized
      } else {
        pushError('Status', 'specialization.importStatusInvalid')
      }
    }

    const rowKey = `${row.nameKh}|${row.nameEn}`
    if (row.nameKh && row.nameEn) {
      if (seenKeys.has(rowKey)) {
        pushError('Name (EN)', 'specialization.importDuplicateRow')
      } else {
        seenKeys.add(rowKey)
      }
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors)
    } else {
      valid.push({
        row: row.row,
        id: row.id || undefined,
        nameKh: row.nameKh,
        nameEn: row.nameEn,
        status
      })
    }
  }

  return { valid, errors }
}
