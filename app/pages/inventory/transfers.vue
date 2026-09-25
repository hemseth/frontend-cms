<script setup lang="ts">
import InventoryDocumentPage from '~/components/inventory/InventoryDocumentPage.vue'
import type { DocumentConfig } from '~/types/inventoryDocs'

// Stock leaves the source warehouse on dispatch and arrives on receive; approval needs transfer:approve.
const config: DocumentConfig = {
  endpoint: '/inventory/transfers',
  resource: 'transfer',
  titleKey: 'nav.stockTransfers',
  numberField: 'transferNo',
  headerFields: [
    { key: 'sourceWarehouseId', labelKey: 'pharmacy.docs.sourceWarehouse', type: 'warehouse', required: true },
    { key: 'destinationWarehouseId', labelKey: 'pharmacy.docs.destinationWarehouse', type: 'warehouse', required: true },
    { key: 'remarks', labelKey: 'common.notes', type: 'text' }
  ],
  linesKey: 'items',
  lineMode: 'medicineBatchQty',
  qtyKey: 'qtyBase',
  batchRequired: true,
  batchWarehouseKey: 'sourceWarehouseId',
  actions: {
    DRAFT: [
      { action: 'approve', labelKey: 'pharmacy.docs.approve', permission: 'approve' },
      { action: 'cancel', labelKey: 'common.cancel', color: 'neutral', permission: 'create', confirmKey: 'pharmacy.docs.cancelConfirm' }
    ],
    SUBMITTED: [
      { action: 'approve', labelKey: 'pharmacy.docs.approve', permission: 'approve' },
      { action: 'cancel', labelKey: 'common.cancel', color: 'neutral', permission: 'create', confirmKey: 'pharmacy.docs.cancelConfirm' }
    ],
    APPROVED: [
      { action: 'dispatch', labelKey: 'pharmacy.docs.dispatch', permission: 'create', confirmKey: 'pharmacy.docs.dispatchConfirm' },
      { action: 'cancel', labelKey: 'common.cancel', color: 'neutral', permission: 'create', confirmKey: 'pharmacy.docs.cancelConfirm' }
    ],
    IN_TRANSIT: [{ action: 'receive', labelKey: 'pharmacy.docs.receive', color: 'success', permission: 'create', confirmKey: 'pharmacy.docs.receiveConfirm' }],
    PARTIALLY_RECEIVED: [{ action: 'receive', labelKey: 'pharmacy.docs.receive', color: 'success', permission: 'create', confirmKey: 'pharmacy.docs.receiveConfirm' }]
  }
}
</script>

<template>
  <InventoryDocumentPage :config="config" />
</template>
