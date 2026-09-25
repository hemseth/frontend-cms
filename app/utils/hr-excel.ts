/**
 * Payroll workbook builder (exceljs).
 *
 * Two sheets: the payroll register and the NSSF contribution summary. Labels
 * arrive from the caller so this file stays free of i18n and can run in Node
 * for verification.
 *
 * Text is always written as a string, never as a formula object, so a staff
 * name that starts with `=`, `+`, `-` or `@` cannot execute when the file is
 * opened. Totals are real SUM formulas with a cached result so viewers that do
 * not recalculate still show the number.
 */
import type { NssfRow, NssfTotals, PayrollSheetRow } from './payroll'

export interface PayrollWorkbookLabels {
  sheetPayroll: string
  sheetNssf: string
  payrollTitle: string
  nssfTitle: string
  period: string
  exchangeRate: string
  total: string
  missingNssfNo: string
  columns: {
    no: string
    employeeId: string
    nameKh: string
    nameEn: string
    nssfNo: string
    base: string
    allowances: string
    overtime: string
    bonus: string
    gross: string
    nssfEmployee: string
    taxable: string
    incomeTax: string
    advance: string
    absence: string
    late: string
    other: string
    totalDeductions: string
    netUsd: string
    netKhr: string
    nssfEmployer: string
    employerCost: string
    status: string
    contributionBase: string
    employee: string
    employer: string
  }
}

export interface PayrollWorkbookOptions {
  clinicName: string
  /** Display text for the period, e.g. "September 2026". */
  periodText: string
  khrPerUsd: number
  rows: PayrollSheetRow[]
  nssfRows: NssfRow[]
  nssfTotals: NssfTotals
  labels: PayrollWorkbookLabels
}

const USD_FORMAT = '#,##0.00'
const KHR_FORMAT = '#,##0'
const HEADER_FILL = 'FFE5E7EB'
const HEADER_ROW = 5

interface ExcelModule {
  Workbook: typeof import('exceljs').Workbook
}

/**
 * exceljs is CommonJS: a bundler exposes `Workbook` as a named export, while
 * plain Node ESM only exposes it on `default`. Accept both.
 */
async function loadExcelJs(): Promise<ExcelModule> {
  const mod = (await import('exceljs')) as unknown as Partial<ExcelModule> & { default?: Partial<ExcelModule> }
  const Workbook = mod.Workbook ?? mod.default?.Workbook
  if (!Workbook) throw new Error('exceljs failed to load')
  return { Workbook }
}

function columnLetter(index: number): string {
  let n = index
  let letters = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    letters = String.fromCharCode(65 + rem) + letters
    n = Math.floor((n - 1) / 26)
  }
  return letters
}

type Sheet = import('exceljs').Worksheet

function styleHeader(sheet: Sheet, columns: number) {
  const row = sheet.getRow(HEADER_ROW)
  row.font = { bold: true }
  row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
  for (let c = 1; c <= columns; c++) {
    const cell = row.getCell(c)
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } }
    cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
  }
  row.height = 32
}

function writeTitleBlock(sheet: Sheet, columns: number, lines: string[]) {
  lines.forEach((text, i) => {
    const rowNumber = i + 1
    sheet.mergeCells(rowNumber, 1, rowNumber, Math.min(columns, 8))
    const cell = sheet.getCell(rowNumber, 1)
    cell.value = text
    cell.font = { bold: i === 0, size: i === 0 ? 14 : 11 }
  })
}

/** Add a bold totals row of SUM formulas under rows `firstRow..lastRow`. */
function writeTotalsRow(
  sheet: Sheet,
  rowNumber: number,
  firstRow: number,
  lastRow: number,
  label: string,
  sums: Array<{ column: number, value: number, format: string }>
) {
  const row = sheet.getRow(rowNumber)
  row.getCell(1).value = label
  row.font = { bold: true }
  for (const { column, value, format } of sums) {
    const letter = columnLetter(column)
    const cell = row.getCell(column)
    cell.value = { formula: `SUM(${letter}${firstRow}:${letter}${lastRow})`, result: value }
    cell.numFmt = format
  }
  for (let c = 1; c <= sheet.columnCount; c++) {
    row.getCell(c).border = { top: { style: 'thin' }, bottom: { style: 'double' } }
  }
}

const sumOf = (rows: PayrollSheetRow[], pick: (r: PayrollSheetRow) => number) =>
  Math.round(rows.reduce((acc, r) => acc + pick(r), 0) * 100) / 100

export async function buildPayrollWorkbook(options: PayrollWorkbookOptions): Promise<ArrayBuffer> {
  const { Workbook } = await loadExcelJs()
  const { labels, rows, nssfRows, nssfTotals } = options
  const c = labels.columns

  const workbook = new Workbook()
  workbook.creator = options.clinicName
  workbook.created = new Date()

  // -------------------------------------------------------------- payroll ---
  const payroll = workbook.addWorksheet(labels.sheetPayroll, {
    views: [{ state: 'frozen', xSplit: 4, ySplit: HEADER_ROW }]
  })
  const headers = [
    c.no, c.employeeId, c.nameKh, c.nameEn, c.nssfNo,
    c.base, c.allowances, c.overtime, c.bonus, c.gross,
    c.nssfEmployee, c.taxable, c.incomeTax, c.advance, c.absence, c.late, c.other,
    c.totalDeductions, c.netUsd, c.netKhr, c.nssfEmployer, c.employerCost, c.status
  ]

  writeTitleBlock(payroll, headers.length, [
    `${options.clinicName} - ${labels.payrollTitle}`,
    `${labels.period}: ${options.periodText}`,
    `${labels.exchangeRate}: 1 USD = ${options.khrPerUsd.toLocaleString('en-US')} KHR`
  ])
  payroll.getRow(HEADER_ROW).values = headers
  styleHeader(payroll, headers.length)

  const widths = [5, 14, 22, 22, 16, 11, 12, 11, 10, 12, 12, 12, 11, 12, 11, 10, 11, 13, 13, 15, 13, 13, 12]
  widths.forEach((w, i) => {
    payroll.getColumn(i + 1).width = w
  })

  rows.forEach((row, index) => {
    const r = row.result
    const a = row.amounts
    const excelRow = payroll.getRow(HEADER_ROW + 1 + index)
    excelRow.values = [
      index + 1,
      row.employeeCode ?? '',
      row.nameKh ?? '',
      row.nameEn ?? '',
      row.nssfNo ?? '',
      a.baseSalary,
      r.allowances,
      a.overtime,
      a.bonus,
      r.gross,
      r.nssfEmployee,
      r.taxableIncome,
      r.incomeTax,
      a.advanceRepayment,
      a.absenceDeduction,
      a.lateDeduction,
      a.otherDeductions,
      r.totalDeductions,
      r.net,
      row.netKhr,
      r.nssfEmployer,
      r.employerCost,
      row.status ?? ''
    ]
    for (let col = 6; col <= 22; col++) {
      excelRow.getCell(col).numFmt = col === 20 ? KHR_FORMAT : USD_FORMAT
    }
  })

  if (rows.length) {
    const first = HEADER_ROW + 1
    const last = HEADER_ROW + rows.length
    const usd = (column: number, pick: (r: PayrollSheetRow) => number) => ({ column, value: sumOf(rows, pick), format: USD_FORMAT })
    writeTotalsRow(payroll, last + 1, first, last, labels.total, [
      usd(6, r => r.amounts.baseSalary),
      usd(7, r => r.result.allowances),
      usd(8, r => r.amounts.overtime),
      usd(9, r => r.amounts.bonus),
      usd(10, r => r.result.gross),
      usd(11, r => r.result.nssfEmployee),
      usd(12, r => r.result.taxableIncome),
      usd(13, r => r.result.incomeTax),
      usd(14, r => r.amounts.advanceRepayment),
      usd(15, r => r.amounts.absenceDeduction),
      usd(16, r => r.amounts.lateDeduction),
      usd(17, r => r.amounts.otherDeductions),
      usd(18, r => r.result.totalDeductions),
      usd(19, r => r.result.net),
      { column: 20, value: rows.reduce((acc, r) => acc + r.netKhr, 0), format: KHR_FORMAT },
      usd(21, r => r.result.nssfEmployer),
      usd(22, r => r.result.employerCost)
    ])
    payroll.autoFilter = { from: { row: HEADER_ROW, column: 1 }, to: { row: last, column: headers.length } }
  }

  // ----------------------------------------------------------------- NSSF ---
  const nssf = workbook.addWorksheet(labels.sheetNssf, {
    views: [{ state: 'frozen', ySplit: HEADER_ROW }]
  })
  const nssfHeaders = [c.no, c.nssfNo, c.nameKh, c.nameEn, c.contributionBase, c.employee, c.employer, c.totalDeductions]
  // The last column is the combined contribution; reuse the "total" label.
  nssfHeaders[7] = labels.total

  writeTitleBlock(nssf, nssfHeaders.length, [
    `${options.clinicName} - ${labels.nssfTitle}`,
    `${labels.period}: ${options.periodText}`,
    nssfTotals.missingNssfNo > 0 ? `${labels.missingNssfNo}: ${nssfTotals.missingNssfNo}` : ''
  ])
  nssf.getRow(HEADER_ROW).values = nssfHeaders
  styleHeader(nssf, nssfHeaders.length)
  ;[5, 16, 22, 22, 16, 14, 14, 14].forEach((w, i) => {
    nssf.getColumn(i + 1).width = w
  })

  nssfRows.forEach((row, index) => {
    const excelRow = nssf.getRow(HEADER_ROW + 1 + index)
    excelRow.values = [
      index + 1,
      row.nssfNo ?? '',
      row.nameKh ?? '',
      row.nameEn ?? '',
      row.contributionBase,
      row.employee,
      row.employer,
      row.total
    ]
    for (let col = 5; col <= 8; col++) excelRow.getCell(col).numFmt = USD_FORMAT
  })

  if (nssfRows.length) {
    const first = HEADER_ROW + 1
    const last = HEADER_ROW + nssfRows.length
    writeTotalsRow(nssf, last + 1, first, last, labels.total, [
      { column: 5, value: nssfTotals.contributionBase, format: USD_FORMAT },
      { column: 6, value: nssfTotals.employee, format: USD_FORMAT },
      { column: 7, value: nssfTotals.employer, format: USD_FORMAT },
      { column: 8, value: nssfTotals.total, format: USD_FORMAT }
    ])
  }

  return (await workbook.xlsx.writeBuffer()) as ArrayBuffer
}

/** Trigger a browser download. */
export function downloadArrayBuffer(buffer: ArrayBuffer, filename: string): void {
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = window.URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`
  anchor.click()
  window.URL.revokeObjectURL(url)
}
