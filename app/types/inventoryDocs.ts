// Configuration for components/inventory/InventoryDocumentPage.vue, one per document kind.

export type Permission = 'create' | 'update' | 'approve'

export interface HeaderField {
  key: string
  labelKey: string
  type: 'warehouse' | 'select' | 'text' | 'medicine'
  options?: string[]
  /** i18n prefix for option labels: `${optionPrefix}.${value}`. */
  optionPrefix?: string
  required?: boolean
  default?: string
}

export interface WorkflowAction {
  action: string
  labelKey: string
  color?: 'primary' | 'error' | 'neutral' | 'success' | 'warning'
  permission: Permission
  confirmKey?: string
}

export interface DocumentConfig {
  endpoint: string
  resource: string
  titleKey: string
  numberField: string
  headerFields: HeaderField[]
  /** Body key of the line array. */
  linesKey: 'items' | 'lines' | 'batches'
  /** 'batches' mode picks batches of the header medicine only (recalls). */
  lineMode: 'medicineBatchQty' | 'batchOnly'
  qtyKey?: 'qtyBase' | 'qtyBaseSigned'
  allowNegativeQty?: boolean
  batchRequired?: boolean
  /** Header field whose warehouse limits the batch list. */
  batchWarehouseKey?: string
  actions: Record<string, WorkflowAction[]>
}
