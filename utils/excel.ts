import ExcelJS from "exceljs";

export interface ExcelHeader {
  header: string;
  key: string;
  width?: number;
}

export async function exportToExcel(
  filename: string,
  sheetName: string,
  headers: ExcelHeader[],
  data: any[]
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  worksheet.columns = headers.map((h) => ({
    header: h.header,
    key: h.key,
    width: h.width || 20,
  }));

  data.forEach((row) => {
    worksheet.addRow(row);
  });

  // Apply basic header styling
  worksheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

export async function readExcelFile<T = any>(
  file: File,
  maxRows = 10000,
  maxSizeBytes = 10 * 1024 * 1024
): Promise<T[]> {
  if (file.size > maxSizeBytes) {
    throw new Error(`File exceeds maximum size limit of ${maxSizeBytes / (1024 * 1024)}MB`);
  }

  const workbook = new ExcelJS.Workbook();
  const arrayBuffer = await file.arrayBuffer();
  await workbook.xlsx.load(arrayBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  const results: T[] = [];
  const headers: string[] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      row.eachCell((cell) => {
        headers.push(String(cell.value || "").trim());
      });
    } else {
      if (results.length >= maxRows) return;
      const rowData: any = {};
      row.eachCell((cell, colNumber) => {
        const headerKey = headers[colNumber - 1] || `col_${colNumber}`;
        let value = cell.value;
        if (value && typeof value === "object" && "result" in value) {
          value = (value as any).result;
        }
        rowData[headerKey] = value;
      });
      if (Object.keys(rowData).length > 0) {
        results.push(rowData as T);
      }
    }
  });

  return results;
}
