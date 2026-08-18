<script setup lang="ts">
import { UModal, UButton } from '#components'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{
  staffName?: string
}>()

const emit = defineEmits(['confirm'])

const { t } = useI18n()

function handleConfirm() {
  emit('confirm')
}

function handleCancel() {
  open.value = false
}
</script>

<template>
  <UModal v-model:open="open" :title="t('common.confirm')">
    <template #body>
      <div class="py-4 text-center">
        {{ t('staff.deleteConfirm', { name: staffName }) }}
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          :label="t('common.cancel')"
          color="neutral"
          variant="ghost"
          @click="handleCancel"
        />
        <UButton :label="t('common.delete')" color="error" @click="handleConfirm" />
      </div>
    </template>
  </UModal>
</template>
