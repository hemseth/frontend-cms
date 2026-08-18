interface ExportColumn {
  key: string
  label: string
}

interface ExportOptions {
  filename: string
  title?: string
}

export function useExport() {
  function generateCSV(data: any[], columns: ExportColumn[]): string {
    const headers = columns.map(col => `"${col.label}"`).join(',')
    const rows = data.map(row =>
      columns
        .map((col) => {
          const value = row[col.key]
          if (value === null || value === undefined) return '""'
          const str = String(value).replace(/"/g, '""')
          return `"${str}"`
        })
        .join(',')
    )
    return [headers, ...rows].join('\n')
  }

  function downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const link = window.document.createElement('a')
    link.href = url
    link.download = filename
    window.document.body.appendChild(link)
    link.click()
    window.document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  function exportToCSV(data: any[], columns: ExportColumn[], filename: string): void {
    const csv = generateCSV(data, columns)
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' })
    downloadFile(blob, `${filename}.csv`)
  }

  function exportToXLSX(data: any[], columns: ExportColumn[], filename: string, title?: string): void {
    const headers = columns.map(col => col.label)
    const rows = data.map(row => columns.map((col) => {
      const val = row[col.key]
      if (val === null || val === undefined) return ''
      if (typeof val === 'object') return JSON.stringify(val)
      return String(val)
    }))

    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:x="urn:schemas-microsoft-com:office:excel"
            xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8">
          <style>
            table { border-collapse: collapse; width: 100%; font-size: 12px; }
            th { background: #e0e0e0; font-weight: bold; border: 1px solid #ccc; padding: 8px; text-align: left; }
            td { border: 1px solid #ccc; padding: 8px; }
            h1 { font-size: 18px; margin-bottom: 10px; font-family: Arial, sans-serif; }
            .header-row { background: #f5f5f5; font-weight: bold; }
          </style>
        </head>
        <body>
          ${title ? `<h1>${title}</h1>` : ''}
          <table>
            <tr class="header-row">${headers.map(h => `<th>${h}</th>`).join('')}</tr>
            ${rows.map(row => `<tr>${row.map((cell: string) => `<td>${cell}</td>`).join('')}</tr>`).join('')}
          </table>
        </body>
      </html>
    `

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' })
    downloadFile(blob, `${filename}.xls`)
  }

  function exportToPDF(data: any[], columns: ExportColumn[], filename: string, title?: string): void {
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${filename}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; margin: 0; }
            h1 { text-align: center; margin-bottom: 20px; font-size: 18px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { background: #f5f5f5; border: 1px solid #ddd; padding: 10px; text-align: left; font-weight: bold; }
            td { border: 1px solid #ddd; padding: 10px; }
            tr:nth-child(even) { background: #f9f9f9; }
            .print-header { text-align: center; margin-bottom: 20px; }
            .print-footer { margin-top: 30px; text-align: right; font-size: 10px; color: #666; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h1>${title || filename}</h1>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
          </div>
          <table>
            <thead>
              <tr>${columns.map(col => `<th>${col.label}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${data.map(row => `<tr>${columns.map(col => `<td>${row[col.key] ?? ''}</td>`).join('')}</tr>`).join('')}
            </tbody>
          </table>
          <div class="print-footer">
            <p>Page 1 of 1</p>
          </div>
        </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
      }, 250)
    }
  }

  function printTable(data: any[], columns: ExportColumn[], title?: string): void {
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title || 'Report'}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; margin: 0; }
            h1 { text-align: center; margin-bottom: 5px; font-size: 18px; }
            .subtitle { text-align: center; margin-bottom: 20px; color: #666; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { background: #e0e0e0; border: 1px solid #ddd; padding: 10px; text-align: left; font-weight: bold; }
            td { border: 1px solid #ddd; padding: 10px; }
            tr:nth-child(even) { background: #f9f9f9; }
            .signature-section { margin-top: 50px; display: flex; justify-content: space-between; }
            .signature-box { width: 45%; text-align: center; }
            .signature-line { border-top: 1px solid #000; margin-top: 50px; padding-top: 5px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>${title || 'Report'}</h1>
          <p class="subtitle">Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          <table>
            <thead>
              <tr>${columns.map(col => `<th>${col.label}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${data.map(row => `<tr>${columns.map(col => `<td>${row[col.key] ?? ''}</td>`).join('')}</tr>`).join('')}
            </tbody>
          </table>
          <div class="signature-section">
            <div class="signature-box">
              <div class="signature-line">Doctor Signature</div>
            </div>
            <div class="signature-box">
              <div class="signature-line">Admin Signature</div>
            </div>
          </div>
        </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
      }, 250)
    }
  }

  return {
    exportToCSV,
    exportToXLSX,
    exportToPDF,
    printTable,
    generateCSV
  }
}
