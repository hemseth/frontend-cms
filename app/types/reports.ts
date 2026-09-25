export interface ReportColumn {
  key: string
  labelKey: string
  format?: 'money' | 'number' | 'date' | 'percent' | 'text'
}
