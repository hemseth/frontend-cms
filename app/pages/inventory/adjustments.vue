<script setup lang="ts">
import InventoryDocumentPage from '~/components/inventory/InventoryDocumentPage.vue'
import type { DocumentConfig } from '~/types/inventoryDocs'

// Draft -> submit -> approve (stockAdjustment:approve) -> post. Only posting changes stock.
const config: DocumentConfig = {
  endpoint: '/inventory/adjustments',
  resource: 'stockAdjustment',
  titleKey: 'nav.stockAdjustments',
  numberField: 'adjustmentNo',
  headerFields: [
    { key: 'warehouseId', labelKey: 'pharmacy.warehouse', type: 'warehouse', required: true },
    {
      key: 'reason',
      labelKey: 'pharmacy.docs.reason',
      type: 'select',
      options: ['COUNT', 'DAMAGE', 'LOSS', 'FOUND', 'CORRECTION', 'OTHER'],
      optionPrefix: 'pharmacy.docs.adjustmentReason',
      default: 'OTHER',
      required: true
    }
  ],
  linesKey: 'lines',
  lineMode: 'medicineBatchQty',
  qtyKey: 'qtyBaseSigned',
  allowNegativeQty: true,
  batchWarehouseKey: 'warehouseId',
  actions: {
    DRAFT: [{ action: 'submit', labelKey: 'pharmacy.docs.submit', permission: 'create' }],
    SUBMITTED: [
      { action: 'approve', labelKey: 'pharmacy.docs.approve', permission: 'approve' },
      { action: 'reject', labelKey: 'pharmacy.docs.reject', color: 'error', permission: 'create', confirmKey: 'pharmacy.docs.rejectConfirm' }
    ],
    APPROVED: [{ action: 'post', labelKey: 'pharmacy.docs.post', color: 'success', permission: 'create', confirmKey: 'pharmacy.docs.postConfirm' }]
  }
}
</script>

<template>
  <InventoryDocumentPage :config="config" />
</template>
