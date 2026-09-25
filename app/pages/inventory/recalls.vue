<script setup lang="ts">
import InventoryDocumentPage from '~/components/inventory/InventoryDocumentPage.vue'
import type { DocumentConfig } from '~/types/inventoryDocs'

// Activating a recall blocks the chosen batches from being issued anywhere in the clinic.
const config: DocumentConfig = {
  endpoint: '/inventory/recalls',
  resource: 'recall',
  titleKey: 'nav.recalls',
  numberField: 'recallNo',
  headerFields: [
    { key: 'medicineId', labelKey: 'pharmacy.medicine', type: 'medicine', required: true },
    {
      key: 'severity',
      labelKey: 'pharmacy.docs.severity',
      type: 'select',
      options: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      optionPrefix: 'pharmacy.docs.severityLevel',
      default: 'HIGH',
      required: true
    },
    { key: 'reason', labelKey: 'pharmacy.docs.reason', type: 'text', required: true }
  ],
  linesKey: 'batches',
  lineMode: 'batchOnly',
  actions: {
    DRAFT: [
      { action: 'activate', labelKey: 'pharmacy.docs.activate', color: 'error', permission: 'create', confirmKey: 'pharmacy.docs.activateConfirm' },
      { action: 'cancel', labelKey: 'common.cancel', color: 'neutral', permission: 'create', confirmKey: 'pharmacy.docs.cancelConfirm' }
    ],
    ACTIVE: [{ action: 'complete', labelKey: 'pharmacy.docs.complete', color: 'success', permission: 'create', confirmKey: 'pharmacy.docs.completeConfirm' }]
  }
}
</script>

<template>
  <InventoryDocumentPage :config="config" />
</template>
