<script setup lang="ts">
import InventoryDocumentPage from '~/components/inventory/InventoryDocumentPage.vue'
import type { DocumentConfig } from '~/types/inventoryDocs'

// Posting a return books the stock back in; patient returns land in QUARANTINE, not AVAILABLE,
// and must name the dispensing they came from.
const config: DocumentConfig = {
  endpoint: '/inventory/returns',
  resource: 'inventoryReturn',
  titleKey: 'nav.inventoryReturns',
  numberField: 'returnNo',
  headerFields: [
    { key: 'warehouseId', labelKey: 'pharmacy.warehouse', type: 'warehouse', required: true },
    {
      key: 'sourceType',
      labelKey: 'pharmacy.docs.returnSource',
      type: 'select',
      options: ['PATIENT', 'DEPARTMENT', 'BRANCH', 'SUPPLIER'],
      optionPrefix: 'pharmacy.docs.returnSourceType',
      default: 'PATIENT',
      required: true
    },
    // Required by the server for a PATIENT return: the dispensing slip number (DSP-...).
    // The patient, invoice, batches and refund are then taken from that dispensing.
    { key: 'dispensingNo', labelKey: 'pharmacy.docs.dispensingNo', type: 'text' },
    { key: 'reasonCode', labelKey: 'pharmacy.docs.reason', type: 'text' }
  ],
  linesKey: 'items',
  lineMode: 'medicineBatchQty',
  qtyKey: 'qtyBase',
  batchWarehouseKey: 'warehouseId',
  actions: {
    DRAFT: [
      { action: 'post', labelKey: 'pharmacy.docs.post', color: 'success', permission: 'create', confirmKey: 'pharmacy.docs.postConfirm' },
      { action: 'cancel', labelKey: 'common.cancel', color: 'neutral', permission: 'create', confirmKey: 'pharmacy.docs.cancelConfirm' }
    ]
  }
}
</script>

<template>
  <InventoryDocumentPage :config="config" />
</template>
