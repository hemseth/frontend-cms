<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  role: any
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits(['success'])

const { t } = useI18n()
const toast = useToast()
const loading = ref(false)

async function confirm() {
  if (!props.role) return
  loading.value = true
  try {
    await $api(`/roles/${props.role._id}`, { method: 'DELETE' })
    toast.add({ title: t('common.success'), color: 'success' })
    emit('success')
    open.value = false
  } catch (error: any) {
    toast.add({ title: t('common.error'), description: error.data?.message, color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open">
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">
          {{ t('common.confirm') }}
        </h3>
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-heroicons-x-mark-20-solid"
          class="-my-1"
          @click="open = false"
        />
      </div>
    </template>

    <template #body>
      <p>{{ t('roles.deleteConfirm') }}</p>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          :label="t('common.cancel')"
          @click="open = false"
        />
        <UButton
          color="error"
          :label="t('common.delete')"
          :loading="loading"
          @click="confirm"
        />
      </div>
    </template>
  </UModal>
</template>
