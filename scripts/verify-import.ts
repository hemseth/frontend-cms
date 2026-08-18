import ExcelJS from 'exceljs'
import {
  IMPORT_REQUIRED_COLUMNS,
  excelCellToText,
  findColumnIndex,
  parseImportRows,
  readWorksheetHeaders,
  validateImportRows,
} from '../app/utils/specializationImport.ts'

let passed = 0
let failed = 0

function check(name: string, ok: boolean, detail: string) {
  if (ok) {
    passed++
    console.log(`PASS  ${name}`)
  } else {
    failed++
    console.log(`FAIL  ${name} — ${detail}`)
  }
}

async function buildAndRun(headers: unknown[], rows: unknown[][]) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Specializations')
  ws.addRow(headers)
  for (const r of rows) ws.addRow(r)

  const buffer = await wb.xlsx.writeBuffer()
  const wb2 = new ExcelJS.Workbook()
  await wb2.xlsx.load(buffer)
  const worksheet = wb2.worksheets[0]!

  const indexByName = readWorksheetHeaders(worksheet)
  const missing = IMPORT_REQUIRED_COLUMNS.filter((c) => findColumnIndex(indexByName, c) === undefined)
  const parsed = parseImportRows(worksheet, indexByName)
  const { valid, errors } = validateImportRows(parsed, (key) => key)
  return { missing, parsed, valid, errors }
}

const HEADERS = ['ID', 'Name (KH)', 'Name (EN)', 'Status']

async function main() {
  // Test 1 — Valid
  {
    const { missing, valid, errors } = await buildAndRun(HEADERS, [['', 'ឯកទេសធ្មេញ', 'Dentistry', 'active']])
    check('1. Valid row imports', missing.length === 0 && valid.length === 1 && errors.length === 0,
      `missing=${missing.length} valid=${valid.length} errors=${errors.length}`)
    check('1. Khmer value preserved', valid[0]?.nameKh === 'ឯកទេសធ្មេញ', `got=${JSON.stringify(valid[0]?.nameKh)}`)
  }

  // Test 2 — Blank Khmer
  {
    const { valid, errors } = await buildAndRun(HEADERS, [['', '', 'Dentistry', 'active']])
    check('2. Blank Khmer rejected, no API row', valid.length === 0 && errors.some((e) => e.field === 'Name (KH)'),
      `valid=${valid.length} errors=${JSON.stringify(errors)}`)
  }

  // Test 3 — Whitespace Khmer
  {
    const { valid, errors } = await buildAndRun(HEADERS, [['', '    ', 'Dentistry', 'active']])
    check('3. Whitespace Khmer rejected', valid.length === 0 && errors.some((e) => e.field === 'Name (KH)'),
      `valid=${valid.length} errors=${JSON.stringify(errors)}`)
  }

  // Test 4 — Missing Name (KH) header
  {
    const { missing } = await buildAndRun(['ID', 'Name (EN)', 'Status'], [['', 'Dentistry', 'active']])
    check('4. Missing header detected (import stops)', missing.includes('Name (KH)'), `missing=${missing}`)
  }

  // Test 5 — Empty spreadsheet row
  {
    const { parsed, valid } = await buildAndRun(HEADERS, [
      ['', 'ឯកទេសធ្មេញ', 'Dentistry', 'active'],
      ['', '', '', ''],
    ])
    check('5. Empty row ignored', parsed.length === 1 && valid.length === 1, `parsed=${parsed.length} valid=${valid.length}`)
  }

  // Test 6 — Invalid status
  {
    const { valid, errors } = await buildAndRun(HEADERS, [['', 'ឯកទេសធ្មេញ', 'Dentistry', 'test']])
    check('6. Invalid status rejected', valid.length === 0 && errors.some((e) => e.field === 'Status' && e.message === 'specialization.importStatusInvalid'),
      `valid=${valid.length} errors=${JSON.stringify(errors)}`)
  }

  // Test 7 — Status casing normalized
  {
    const { valid } = await buildAndRun(HEADERS, [['', 'ឯកទេសធ្មេញ', 'Dentistry', 'Active']])
    check('7. "Active" normalized to active', valid[0]?.status === 'active', `status=${valid[0]?.status}`)
  }

  // Test 8 — Invalid ID
  {
    const { valid, errors } = await buildAndRun(HEADERS, [['abc', 'ឯកទេសធ្មេញ', 'Dentistry', 'active']])
    check('8. Invalid ID rejected, no PUT row', valid.length === 0 && errors.some((e) => e.field === 'ID' && e.message === 'specialization.importIdInvalid'),
      `valid=${valid.length} errors=${JSON.stringify(errors)}`)
  }

  // Test 9 — 201-character name
  {
    const { valid, errors } = await buildAndRun(HEADERS, [['', 'x'.repeat(201), 'Dentistry', 'active']])
    check('9. >200 char name rejected', valid.length === 0 && errors.some((e) => e.field === 'Name (KH)' && e.message === 'specialization.importNameTooLong'),
      `valid=${valid.length} errors=${JSON.stringify(errors)}`)
  }

  // Test 10 — Khmer Unicode round-trip through a real .xlsx load
  {
    const khmer = 'ឯកទេសធ្មេញ'
    const { parsed } = await buildAndRun(HEADERS, [['', khmer, 'Dentistry', 'active']])
    check('10. Khmer Unicode intact after xlsx round-trip', parsed[0]?.nameKh === khmer, `got=${JSON.stringify(parsed[0]?.nameKh)}`)
  }

  // Extra — Duplicate ID within the workbook
  {
    const id = '507f1f77bcf86cd799439011'
    const { valid, errors } = await buildAndRun(HEADERS, [
      [id, 'ឯកទេសធ្មេញ', 'Dentistry', 'active'],
      [id, 'ឯកទេសបេះដូង', 'Cardiology', 'active'],
    ])
    check('11. Duplicate ID rejected on 2nd occurrence', valid.length === 1 && errors.some((e) => e.field === 'ID' && e.message === 'specialization.importIdDuplicate'),
      `valid=${valid.length} errors=${JSON.stringify(errors)}`)
  }

  // Extra — header whitespace/case normalization
  {
    const { missing, valid } = await buildAndRun(['ID', 'Name (KH) ', 'Name (EN)', 'Status'], [['', 'ឯកទេសធ្មេញ', 'Dentistry', 'active']])
    check('12. Header whitespace normalized (Name (KH) )', missing.length === 0 && valid.length === 1, `missing=${missing} valid=${valid.length}`)
  }

  // Extra — rich text cell content
  {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Specializations')
    ws.addRow(HEADERS)
    const row = ws.addRow(['', 'ឯកទេសធ្មេញ', 'Dentistry', 'active'])
    row.getCell(2).value = { richText: [{ text: 'ឯកទេស' }, { text: 'ធ្មេញ' }] } as any
    const buffer = await wb.xlsx.writeBuffer()
    const wb2 = new ExcelJS.Workbook()
    await wb2.xlsx.load(buffer)
    const text = excelCellToText(wb2.worksheets[0]!.getCell('B2').value)
    check('13. Rich-text cell joined to text', text === 'ឯកទេសធ្មេញ', `got=${JSON.stringify(text)}`)
  }

  console.log(`\n${passed} passed, ${failed} failed`)
  process.exitCode = failed > 0 ? 1 : 0
}

main().catch((err) => {
  console.error('Harness error:', err)
  process.exitCode = 1
})
