<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { ClinicDiagnosis, ClinicDiagnosisGroup } from '~/types/diagnosis'

const { t } = useI18n()

const props = defineProps<{
  diagnosis?: ClinicDiagnosis | null
  groups: ClinicDiagnosisGroup[]
  loading?: boolean
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ (e: 'save', payload: Record<string, any>): void }>()

const isEditing = computed(() => !!props.diagnosis)

const form = ref<Record<string, any>>({
  localNameKh: '',
  localNameEn: '',
  localSynonymsKh: [] as string[],
  localSynonymsEn: [] as string[],
  favorite: false,
  enabled: true,
  groupIds: [],
  sortOrder: 0
})

const newSynKh = ref('')
const newSynEn = ref('')

const groupItems = computed(() => props.groups.map(g => ({ value: g.id, label: g.nameEn || g.nameKh || g.code })))

const hasOverride = computed(() => Boolean(form.value.localNameKh || form.value.localNameEn))

watch(() => props.diagnosis, (newVal) => {
  if (newVal) {
    form.value = {
      localNameKh: newVal.localNameKh || '',
      localNameEn: newVal.localNameEn || '',
      localSynonymsKh: newVal.localSynonymsKh || [],
      localSynonymsEn: newVal.localSynonymsEn || [],
      favorite: newVal.favorite,
      enabled: newVal.enabled,
      groupIds: newVal.groupIds || [],
      sortOrder: newVal.sortOrder ?? 0
    }
    newSynKh.value = ''
    newSynEn.value = ''
  }
}, { immediate: true })

function addSynonym(lang: 'kh' | 'en') {
  const input = lang === 'kh' ? newSynKh.value : newSynEn.value
  const trimmed = input.trim()
  if (!trimmed) return
  const list = lang === 'kh' ? form.value.localSynonymsKh : form.value.localSynonymsEn
  if (!list.includes(trimmed)) list.push(trimmed)
  if (lang === 'kh') newSynKh.value = ''
  else newSynEn.value = ''
}

function removeSynonym(lang: 'kh' | 'en', value: string) {
  const list = lang === 'kh' ? form.value.localSynonymsKh : form.value.localSynonymsEn
  const idx = list.indexOf(value)
  if (idx !== -1) list.splice(idx, 1)
}

function resetOverride() {
  form.value.localNameKh = ''
  form.value.localNameEn = ''
}

function handleSubmit() {
  const payload: Record<string, any> = {
    localNameKh: form.value.localNameKh || null,
    localNameEn: form.value.localNameEn || null,
    localSynonymsKh: form.value.localSynonymsKh,
    localSynonymsEn: form.value.localSynonymsEn,
    favorite: form.value.favorite,
    enabled: form.value.enabled,
    groupIds: form.value.groupIds,
    sortOrder: Number(form.value.sortOrder) || 0
  }
  emit('save', payload)
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="isEditing ? t('diagnosisSettings.edit') : ''"
    size="lg"
  >
    <template #body>
      <!-- WHO master fields (read only) -->
      <div
        v-if="diagnosis"
        class="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-2"
      >
        <div class="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          {{ t('diagnosisSettings.whoFields') }}
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <UFormField :label="t('diagnosisSettings.code')" class="w-full">
            <UInput :model-value="diagnosis.code || ''" disabled class="w-full" />
          </UFormField>
          <UFormField :label="t('diagnosisSettings.whoNameKh')" class="w-full">
            <UInput :model-value="diagnosis.master.nameKh || '—'" disabled class="w-full" />
          </UFormField>
          <UFormField :label="t('diagnosisSettings.whoNameEn')" class="w-full">
            <UInput :model-value="diagnosis.master.nameEn || '—'" disabled class="w-full" />
          </UFormField>
        </div>
      </div>

      <!-- Clinic override -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UFormField :label="t('diagnosisSettings.localNameKh')" class="w-full">
          <UInput v-model="form.localNameKh" class="w-full" />
        </UFormField>
        <UFormField :label="t('diagnosisSettings.localNameEn')" class="w-full">
          <UInput v-model="form.localNameEn" class="w-full" />
        </UFormField>
      </div>

      <div v-if="hasOverride" class="mt-2">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-rotate-ccw"
          size="sm"
          :label="t('diagnosisSettings.resetOverride')"
          @click="resetOverride"
        />
      </div>

      <!-- Synonyms -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <UFormField :label="t('diagnosisSettings.localSynonymsKh')" class="w-full">
          <div class="flex gap-2">
            <UInput
              v-model="newSynKh"
              class="flex-1"
              :placeholder="t('diagnosisSettings.addSynonym')"
              @keydown.enter.prevent="addSynonym('kh')"
            />
            <UButton
              icon="i-lucide-plus"
              color="neutral"
              variant="outline"
              @click="addSynonym('kh')"
            />
          </div>
          <div class="flex flex-wrap gap-1.5 mt-2">
            <UBadge
              v-for="syn in form.localSynonymsKh"
              :key="syn"
              size="sm"
              color="neutral"
              variant="subtle"
              class="cursor-pointer"
              @click="removeSynonym('kh', syn)"
            >
              {{ syn }} ✕
            </UBadge>
          </div>
        </UFormField>
        <UFormField :label="t('diagnosisSettings.localSynonymsEn')" class="w-full">
          <div class="flex gap-2">
            <UInput
              v-model="newSynEn"
              class="flex-1"
              :placeholder="t('diagnosisSettings.addSynonym')"
              @keydown.enter.prevent="addSynonym('en')"
            />
            <UButton
              icon="i-lucide-plus"
              color="neutral"
              variant="outline"
              @click="addSynonym('en')"
            />
          </div>
          <div class="flex flex-wrap gap-1.5 mt-2">
            <UBadge
              v-for="syn in form.localSynonymsEn"
              :key="syn"
              size="sm"
              color="neutral"
              variant="subtle"
              class="cursor-pointer"
              @click="removeSynonym('en', syn)"
            >
              {{ syn }} ✕
            </UBadge>
          </div>
        </UFormField>
      </div>

      <!-- Groups + sort order -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <UFormField :label="t('diagnosisSettings.group')" class="w-full">
          <USelectMenu
            v-model="form.groupIds"
            :items="groupItems"
            value-key="value"
            label-key="label"
            multiple
            class="w-full"
          />
        </UFormField>
        <UFormField :label="t('diagnosisSettings.sortOrder')" class="w-full">
          <UInput v-model="form.sortOrder" type="number" class="w-full" />
        </UFormField>
      </div>

      <!-- Flags -->
      <div class="flex items-center gap-6 mt-4">
        <div class="flex items-center gap-2">
          <UCheckbox v-model="form.favorite" :label="t('diagnosisSettings.favoriteYes')" />
        </div>
        <div class="flex items-center gap-2">
          <UCheckbox v-model="form.enabled" :label="t('diagnosisSettings.enabled')" />
        </div>
      </div>

      <div class="flex justify-end gap-2 mt-6">
        <UButton
          :label="t('diagnosisSettings.cancel')"
          color="neutral"
          variant="ghost"
          @click="open = false"
        />
        <UButton
          :label="t('diagnosisSettings.save')"
          color="primary"
          :loading="loading"
          @click="handleSubmit"
        />
      </div>
    </template>
  </UModal>
</template>
