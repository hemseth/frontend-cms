<script setup lang="ts">
import { ref, computed, watch, onBeforeUnmount } from 'vue'

/**
 * Family & dependents of one staff member (GET/PUT /staff-family/:staffId, family:* permissions).
 * Recorded entries are never removed: a past spouse gets a status (divorced, widowed ...), a
 * child or dependent that no longer counts is marked ended. Documents are stored privately and
 * opened with the login token.
 */
interface Row {
  _id?: string
  nameKh?: string
  nameEn?: string
  gender?: string
  dob?: string
  status?: string
  relationship?: string
  marriageDate?: string
  occupation?: string
  employer?: string
  nationalId?: string
  phone?: string
  school?: string
  educationLevel?: string
  birthCertificateNo?: string
  dependencyStart?: string
  dependencyEnd?: string
  isCurrent?: boolean
  hasIncome?: boolean
  isDependent?: boolean
  taxDependent?: boolean
  insuranceEligible?: boolean
  benefitEligible?: boolean
}
interface FamilyDocument { fileId: string, type: string, memberId?: string, originalName?: string, mimeType?: string }
interface Family {
  spouses: Row[]
  children: Row[]
  dependents: Row[]
  documents: FamilyDocument[]
  summary?: { hasSpouse: boolean, children: number, otherDependents: number, dependents: number, taxDependents: number, insuranceEligible: number, benefitEligible: number }
}

const props = defineProps<{ staffId: string }>()
const { t } = useI18n()
const toast = useToast()
const auth = useAuth()
const canEdit = computed(() => auth.can('family', 'update'))

const family = ref<Family>({ spouses: [], children: [], dependents: [], documents: [] })
const loading = ref(false)
const saving = ref(false)
const dirty = ref(false)

const SPOUSE_STATUSES = ['married', 'separated', 'divorced', 'widowed', 'deceased']
const CHILD_RELATIONSHIPS = ['son', 'daughter', 'adopted', 'stepchild', 'other']
const DEPENDENT_RELATIONSHIPS = ['father', 'mother', 'grandparent', 'sibling', 'disabled', 'other']
const MEMBER_STATUSES = ['active', 'ended', 'deceased']
const DOCUMENT_TYPES = ['marriage_certificate', 'birth_certificate', 'adoption_certificate', 'national_id', 'passport', 'insurance', 'dependent_proof', 'other']
const options = (prefix: string, values: string[]) => values.map(value => ({ label: t(`staff.family.${prefix}.${value}`), value }))
const genderOptions = computed(() => [
  { label: t('patient.male'), value: 'male' },
  { label: t('patient.female'), value: 'female' },
  { label: t('common.other'), value: 'other' }
])
const FLAGS = ['isDependent', 'taxDependent', 'insuranceEligible', 'benefitEligible'] as const

async function load() {
  if (!props.staffId) return
  loading.value = true
  try {
    const res = await $api<{ data: Family }>(`/staff-family/${props.staffId}`)
    family.value = { spouses: [], children: [], dependents: [], documents: [], ...res.data }
    dirty.value = false
  } catch (error) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(error, t('messages.errorOccurred')), color: 'error' })
  } finally {
    loading.value = false
  }
}
watch(() => props.staffId, load, { immediate: true })

function add(list: 'spouses' | 'children' | 'dependents') {
  const base: Row = { nameKh: '', nameEn: '' }
  if (list === 'spouses') Object.assign(base, { status: 'married', isCurrent: true })
  else Object.assign(base, { status: 'active', relationship: list === 'children' ? 'son' : 'mother' })
  family.value[list].push(base)
  dirty.value = true
}
/** Only an entry not saved yet can be taken out; saved ones keep their history. */
function removeNew(list: 'spouses' | 'children' | 'dependents', index: number) {
  family.value[list].splice(index, 1)
}

/** Blank text is left out; the server keeps what it validates. */
function clean(rows: Row[]) {
  return rows.map(row => Object.fromEntries(Object.entries(row)
    .filter(([k, v]) => k !== 'createdAt' && k !== 'updatedAt' && v !== '' && v !== null && v !== undefined)
    .map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])))
}

async function save() {
  saving.value = true
  try {
    const res = await $api<{ data: Family }>(`/staff-family/${props.staffId}`, {
      method: 'PUT',
      body: { spouses: clean(family.value.spouses), children: clean(family.value.children), dependents: clean(family.value.dependents) }
    })
    family.value = { ...family.value, ...res.data }
    dirty.value = false
    toast.add({ title: t('staff.family.saved'), color: 'success' })
  } catch (error) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(error, t('messages.errorOccurred')), color: 'error' })
  } finally {
    saving.value = false
  }
}

// Documents
const docType = ref('birth_certificate')
const docMember = ref<string | undefined>()
const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const memberOptions = computed(() => [
  ...family.value.spouses, ...family.value.children, ...family.value.dependents
].filter(m => m._id).map(m => ({ label: String(m.nameKh || m.nameEn), value: String(m._id) })))
const memberName = (id?: string) => memberOptions.value.find(m => m.value === id)?.label || ''
const blobUrls: string[] = []
onBeforeUnmount(() => blobUrls.forEach(u => URL.revokeObjectURL(u)))

async function upload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (file.size > 10 * 1024 * 1024) {
    toast.add({ title: t('workstation.attachments.tooLarge', { name: file.name }), color: 'warning' })
    return
  }
  uploading.value = true
  try {
    const form = new FormData()
    form.append('file', file)
    form.append('type', docType.value)
    if (docMember.value) form.append('memberId', docMember.value)
    const res = await $api<{ data: Family }>(`/staff-family/${props.staffId}/documents`, { method: 'PUT', body: form })
    family.value.documents = res.data.documents
  } catch (error) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(error, t('workstation.attachments.uploadFailed')), color: 'error' })
  } finally {
    uploading.value = false
  }
}

async function openDocument(doc: FamilyDocument) {
  const win = window.open('', '_blank')
  try {
    const blob = await $api<Blob>(`/staff-family/${props.staffId}/documents/${doc.fileId}`, { responseType: 'blob' })
    const url = URL.createObjectURL(blob)
    blobUrls.push(url)
    if (win) win.location.href = url
    else window.location.assign(url)
  } catch (error) {
    win?.close()
    toast.add({ title: t('common.error'), description: getApiErrorMessage(error, t('workstation.attachments.openFailed')), color: 'error' })
  }
}

async function removeDocument(doc: FamilyDocument) {
  if (!window.confirm(t('workstation.attachments.removeConfirm', { name: doc.originalName || doc.fileId }))) return
  try {
    const res = await $api<{ data: Family }>(`/staff-family/${props.staffId}/documents/${doc.fileId}/remove`, { method: 'PUT' })
    family.value.documents = res.data.documents
  } catch (error) {
    toast.add({ title: t('common.error'), description: getApiErrorMessage(error, t('messages.errorOccurred')), color: 'error' })
  }
}
</script>

<template>
  <div class="space-y-5 pt-4" @input="dirty = true" @change="dirty = true">
    <p v-if="loading" class="text-sm text-muted">
      {{ t('common.loading') }}
    </p>
    <div v-if="family.summary" class="flex flex-wrap gap-2">
      <UBadge color="neutral" variant="subtle">
        {{ t('staff.family.summary.children', { n: family.summary.children }) }}
      </UBadge>
      <UBadge color="neutral" variant="subtle">
        {{ t('staff.family.summary.dependents', { n: family.summary.dependents }) }}
      </UBadge>
      <UBadge color="primary" variant="subtle">
        {{ t('staff.family.summary.taxDependents', { n: family.summary.taxDependents }) }}
      </UBadge>
      <UBadge color="neutral" variant="subtle">
        {{ t('staff.family.summary.insurance', { n: family.summary.insuranceEligible }) }}
      </UBadge>
    </div>

    <!-- Spouse -->
    <section class="space-y-3">
      <h4 class="font-semibold">
        {{ t('staff.family.spouse') }}
      </h4>
      <div
        v-for="(row, i) in family.spouses"
        :key="row._id || `new-s-${i}`"
        class="grid grid-cols-1 gap-3 rounded-lg border border-default p-3 md:grid-cols-4"
      >
        <UFormField :label="t('common.nameKh')">
          <UInput v-model="row.nameKh" :disabled="!canEdit" class="w-full" />
        </UFormField>
        <UFormField :label="t('common.nameEn')">
          <UInput v-model="row.nameEn" :disabled="!canEdit" class="w-full" />
        </UFormField>
        <UFormField :label="t('staff.family.statusLabel')">
          <USelect
            v-model="row.status"
            :items="options('spouseStatus', SPOUSE_STATUSES)"
            :disabled="!canEdit"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="t('staff.family.marriageDate')">
          <UInput
            v-model="row.marriageDate"
            type="date"
            :disabled="!canEdit"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="t('staff.gender')">
          <USelect
            v-model="row.gender"
            :items="genderOptions"
            :placeholder="t('common.select')"
            :disabled="!canEdit"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="t('staff.dob')">
          <UInput
            v-model="row.dob"
            type="date"
            :disabled="!canEdit"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="t('staff.family.occupation')">
          <UInput v-model="row.occupation" :disabled="!canEdit" class="w-full" />
        </UFormField>
        <UFormField :label="t('staff.family.employer')">
          <UInput v-model="row.employer" :disabled="!canEdit" class="w-full" />
        </UFormField>
        <UFormField :label="t('staff.private.nationalId')">
          <UInput v-model="row.nationalId" :disabled="!canEdit" class="w-full" />
        </UFormField>
        <UFormField :label="t('staff.phone')">
          <UInput v-model="row.phone" :disabled="!canEdit" class="w-full" />
        </UFormField>
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2 md:col-span-2">
          <UCheckbox v-model="row.isCurrent" :label="t('staff.family.isCurrent')" :disabled="!canEdit" />
          <UCheckbox v-model="row.hasIncome" :label="t('staff.family.hasIncome')" :disabled="!canEdit" />
          <UCheckbox
            v-for="flag in FLAGS"
            :key="flag"
            v-model="row[flag]"
            :label="t(`staff.family.flags.${flag}`)"
            :disabled="!canEdit"
          />
        </div>
        <div v-if="!row._id" class="flex justify-end md:col-span-4">
          <UButton
            size="xs"
            color="error"
            variant="ghost"
            icon="i-lucide-x"
            :label="t('common.delete')"
            @click="removeNew('spouses', i)"
          />
        </div>
      </div>
      <UButton
        v-if="canEdit"
        size="sm"
        variant="soft"
        icon="i-lucide-plus"
        :label="t('staff.family.addSpouse')"
        @click="add('spouses')"
      />
    </section>

    <!-- Children and other dependents -->
    <section v-for="list in (['children', 'dependents'] as const)" :key="list" class="space-y-3">
      <h4 class="font-semibold">
        {{ t(`staff.family.${list}`) }}
      </h4>
      <div
        v-for="(row, i) in family[list]"
        :key="row._id || `new-${list}-${i}`"
        class="grid grid-cols-1 gap-3 rounded-lg border border-default p-3 md:grid-cols-4"
      >
        <UFormField :label="t('common.nameKh')">
          <UInput v-model="row.nameKh" :disabled="!canEdit" class="w-full" />
        </UFormField>
        <UFormField :label="t('common.nameEn')">
          <UInput v-model="row.nameEn" :disabled="!canEdit" class="w-full" />
        </UFormField>
        <UFormField :label="t('staff.family.relationshipLabel')">
          <USelect
            v-model="row.relationship"
            :items="list === 'children' ? options('childRelationship', CHILD_RELATIONSHIPS) : options('dependentRelationship', DEPENDENT_RELATIONSHIPS)"
            :disabled="!canEdit"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="t('staff.family.statusLabel')">
          <USelect
            v-model="row.status"
            :items="options('memberStatus', MEMBER_STATUSES)"
            :disabled="!canEdit"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="t('staff.gender')">
          <USelect
            v-model="row.gender"
            :items="genderOptions"
            :placeholder="t('common.select')"
            :disabled="!canEdit"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="t('staff.dob')">
          <UInput
            v-model="row.dob"
            type="date"
            :disabled="!canEdit"
            class="w-full"
          />
        </UFormField>
        <UFormField v-if="list === 'children'" :label="t('staff.family.school')">
          <UInput v-model="row.school" :disabled="!canEdit" class="w-full" />
        </UFormField>
        <UFormField v-if="list === 'children'" :label="t('staff.family.educationLevel')">
          <UInput v-model="row.educationLevel" :disabled="!canEdit" class="w-full" />
        </UFormField>
        <UFormField v-if="list === 'children'" :label="t('staff.family.birthCertificateNo')">
          <UInput v-model="row.birthCertificateNo" :disabled="!canEdit" class="w-full" />
        </UFormField>
        <UFormField v-if="list === 'dependents'" :label="t('staff.private.nationalId')">
          <UInput v-model="row.nationalId" :disabled="!canEdit" class="w-full" />
        </UFormField>
        <UFormField v-if="list === 'dependents'" :label="t('staff.phone')">
          <UInput v-model="row.phone" :disabled="!canEdit" class="w-full" />
        </UFormField>
        <UFormField :label="t('staff.family.dependencyStart')">
          <UInput
            v-model="row.dependencyStart"
            type="date"
            :disabled="!canEdit"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="t('staff.family.dependencyEnd')">
          <UInput
            v-model="row.dependencyEnd"
            type="date"
            :disabled="!canEdit"
            class="w-full"
          />
        </UFormField>
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2 md:col-span-4">
          <UCheckbox
            v-for="flag in FLAGS"
            :key="flag"
            v-model="row[flag]"
            :label="t(`staff.family.flags.${flag}`)"
            :disabled="!canEdit"
          />
          <UButton
            v-if="!row._id"
            class="ml-auto"
            size="xs"
            color="error"
            variant="ghost"
            icon="i-lucide-x"
            :label="t('common.delete')"
            @click="removeNew(list, i)"
          />
        </div>
      </div>
      <UButton
        v-if="canEdit"
        size="sm"
        variant="soft"
        icon="i-lucide-plus"
        :label="t(list === 'children' ? 'staff.family.addChild' : 'staff.family.addDependent')"
        @click="add(list)"
      />
    </section>

    <p class="text-xs text-muted">
      {{ t('staff.family.flagsHelp') }}
    </p>
    <div v-if="canEdit" class="flex justify-end">
      <UButton
        :loading="saving"
        :disabled="!dirty"
        icon="i-lucide-save"
        :label="t('staff.family.save')"
        @click="save"
      />
    </div>

    <!-- Documents -->
    <section class="space-y-3 border-t border-default pt-4">
      <h4 class="font-semibold">
        {{ t('staff.family.documents') }}
      </h4>
      <div v-if="canEdit" class="flex flex-wrap items-end gap-2">
        <UFormField :label="t('staff.family.documentType')">
          <USelect v-model="docType" :items="options('documentType', DOCUMENT_TYPES)" class="w-56" />
        </UFormField>
        <UFormField :label="t('staff.family.member')">
          <USelect
            v-model="docMember"
            :items="memberOptions"
            :placeholder="t('staff.family.wholeFamily')"
            class="w-56"
          />
        </UFormField>
        <input
          ref="fileInput"
          type="file"
          class="hidden"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          @change="upload"
        >
        <UButton
          icon="i-lucide-upload"
          variant="outline"
          :loading="uploading"
          :label="t('workstation.attachments.upload')"
          @click="fileInput?.click()"
        />
      </div>
      <p v-if="!family.documents.length" class="text-sm text-muted">
        {{ t('staff.profile.none') }}
      </p>
      <ul v-else class="divide-y divide-default rounded-lg border border-default">
        <li v-for="doc in family.documents" :key="doc.fileId" class="flex flex-wrap items-center gap-2 px-3 py-2">
          <UIcon :name="doc.mimeType === 'application/pdf' ? 'i-lucide-file-text' : 'i-lucide-image'" class="text-muted" />
          <button type="button" class="truncate text-sm text-primary hover:underline" @click="openDocument(doc)">
            {{ doc.originalName || doc.fileId }}
          </button>
          <UBadge color="neutral" variant="subtle" size="sm">
            {{ t(`staff.family.documentType.${doc.type}`) }}
          </UBadge>
          <span v-if="doc.memberId" class="text-xs text-muted">{{ memberName(doc.memberId) }}</span>
          <UButton
            v-if="canEdit"
            class="ml-auto"
            size="xs"
            color="error"
            variant="ghost"
            icon="i-lucide-trash-2"
            :aria-label="t('workstation.attachments.remove')"
            @click="removeDocument(doc)"
          />
        </li>
      </ul>
    </section>
  </div>
</template>
