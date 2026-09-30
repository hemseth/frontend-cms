<script setup lang="ts">
import { ref, computed } from 'vue'

const { t, locale } = useI18n()
const route = useRoute()
const toast = useToast()
const staffId = computed(() => String(route.params.id || ''))

const { data: staffResult, refresh } = await useAsyncData(
  () => `staff-profile-${staffId.value}`,
  () => $api(`/staff/${staffId.value}`),
  { watch: [staffId] }
)
const staff = computed<any>(() => (staffResult.value as any)?.data || null)

const displayName = computed(() =>
  locale.value === 'km'
    ? (staff.value?.nameKh || staff.value?.nameEn)
    : (staff.value?.nameEn || staff.value?.nameKh)
)

const genderLabel = (g?: string) => (g === '1' ? t('patient.male') : g === '2' ? t('patient.female') : '-')
const dateLabel = (d?: string) => (d ? new Date(d).toLocaleDateString() : '-')

const breadcrumbItems = computed(() => [
  { label: t('nav.home'), to: '/' },
  { label: t('staff.title'), to: '/staff' },
  { label: displayName.value || t('staff.profile') }
])

const genderItems = computed(() => [
  { label: t('patient.male'), value: '1' },
  { label: t('patient.female'), value: '2' }
])

const tabItems = computed(() => [
  { label: t('staff.tabInformation'), value: 'information', icon: 'i-lucide-user', slot: 'information' },
  { label: t('staff.spouse'), value: 'spouse', icon: 'i-lucide-heart', slot: 'spouse' },
  { label: t('staff.children'), value: 'children', icon: 'i-lucide-baby', slot: 'children' },
  { label: t('staff.tabExperience'), value: 'experience', icon: 'i-lucide-briefcase', slot: 'experience' },
  { label: t('staff.tabEducation'), value: 'education', icon: 'i-lucide-graduation-cap', slot: 'education' },
  { label: t('staff.tabTraining'), value: 'training', icon: 'i-lucide-award', slot: 'training' },
  { label: t('payroll.title'), value: 'salary', icon: 'i-lucide-banknote', slot: 'salary' },
  { label: t('staff.tabDocuments'), value: 'documents', icon: 'i-lucide-paperclip', slot: 'documents' },
  { label: t('staff.tabEmergency'), value: 'emergency', icon: 'i-lucide-phone-call', slot: 'emergency' }
])
const selectedTab = ref('information')

// ---- field definitions for the generic record sections -------------------
const spouseFields = computed(() => [
  { key: 'nameEn', label: t('common.nameEn'), required: true },
  { key: 'nameKh', label: t('common.nameKh') },
  { key: 'gender', label: t('staff.gender'), type: 'select' as const, items: genderItems.value },
  { key: 'dob', label: t('staff.dob'), type: 'date' as const },
  { key: 'phone', label: t('staff.phone') },
  { key: 'occupation', label: t('staff.occupation') }
])
const spouseColumns = computed(() => [
  { key: 'nameEn', label: t('common.nameEn') },
  { key: 'nameKh', label: t('common.nameKh') },
  { key: 'gender', label: t('staff.gender'), format: 'gender' as const },
  { key: 'phone', label: t('staff.phone') },
  { key: 'occupation', label: t('staff.occupation') }
])

const childFields = computed(() => [
  { key: 'nameEn', label: t('common.nameEn'), required: true },
  { key: 'nameKh', label: t('common.nameKh') },
  { key: 'gender', label: t('staff.gender'), type: 'select' as const, items: genderItems.value },
  { key: 'dob', label: t('staff.dob'), type: 'date' as const }
])
const childColumns = computed(() => [
  { key: 'nameEn', label: t('common.nameEn') },
  { key: 'nameKh', label: t('common.nameKh') },
  { key: 'gender', label: t('staff.gender'), format: 'gender' as const },
  { key: 'dob', label: t('staff.dob'), format: 'date' as const }
])

const experienceFields = computed(() => [
  { key: 'employer', label: t('staff.employer'), required: true },
  { key: 'position', label: t('position.title') },
  { key: 'startDate', label: t('staff.startDate'), type: 'date' as const },
  { key: 'endDate', label: t('staff.endDate'), type: 'date' as const },
  { key: 'description', label: t('common.description'), type: 'textarea' as const, full: true }
])
const experienceColumns = computed(() => [
  { key: 'employer', label: t('staff.employer') },
  { key: 'position', label: t('position.title') },
  { key: 'startDate', label: t('staff.startDate'), format: 'date' as const },
  { key: 'endDate', label: t('staff.endDate'), format: 'date' as const }
])

const educationFields = computed(() => [
  { key: 'school', label: t('staff.school'), required: true },
  { key: 'degree', label: t('staff.degree') },
  { key: 'fieldOfStudy', label: t('staff.fieldOfStudy') },
  { key: 'startYear', label: t('staff.startYear'), type: 'number' as const },
  { key: 'endYear', label: t('staff.endYear'), type: 'number' as const },
  { key: 'grade', label: t('staff.grade') }
])
const educationColumns = computed(() => [
  { key: 'school', label: t('staff.school') },
  { key: 'degree', label: t('staff.degree') },
  { key: 'fieldOfStudy', label: t('staff.fieldOfStudy') },
  { key: 'endYear', label: t('staff.endYear') }
])

const trainingFields = computed(() => [
  { key: 'title', label: t('staff.trainingTitle'), required: true },
  { key: 'provider', label: t('staff.provider') },
  { key: 'certificateNo', label: t('staff.certificateNo') },
  { key: 'issueDate', label: t('staff.issueDate'), type: 'date' as const },
  { key: 'expiryDate', label: t('staff.expiryDate'), type: 'date' as const },
  { key: 'notes', label: t('common.notes'), type: 'textarea' as const, full: true }
])
const trainingColumns = computed(() => [
  { key: 'title', label: t('staff.trainingTitle') },
  { key: 'provider', label: t('staff.provider') },
  { key: 'issueDate', label: t('staff.issueDate'), format: 'date' as const },
  { key: 'expiryDate', label: t('staff.expiryDate'), format: 'date' as const }
])

const salaryFields = computed(() => [
  { key: 'baseSalary', label: t('payroll.baseSalary'), type: 'number' as const, required: true },
  { key: 'effectiveDate', label: t('staff.effectiveDate'), type: 'date' as const },
  { key: 'positionAllowance', label: t('payroll.positionAllowance'), type: 'number' as const },
  { key: 'transportAllowance', label: t('payroll.transportAllowance'), type: 'number' as const },
  { key: 'notes', label: t('common.notes'), type: 'textarea' as const, full: true }
])
const salaryColumns = computed(() => [
  { key: 'effectiveDate', label: t('staff.effectiveDate'), format: 'date' as const },
  { key: 'baseSalary', label: t('payroll.baseSalary') },
  { key: 'positionAllowance', label: t('payroll.positionAllowance') },
  { key: 'notes', label: t('common.notes') }
])

const documentCategories = computed(() => [
  { label: t('staff.docContract'), value: 'contract' },
  { label: t('staff.docId'), value: 'id' },
  { label: t('staff.docCertificate'), value: 'certificate' },
  { label: t('staff.docCv'), value: 'cv' },
  { label: t('medicine.medicineTypes.other'), value: 'other' }
])
const documentFields = computed(() => [
  { key: 'title', label: t('staff.docTitle'), required: true },
  { key: 'category', label: t('staff.docCategory'), type: 'select' as const, items: documentCategories.value },
  { key: 'fileUrl', label: t('staff.docFileUrl'), required: true, full: true },
  { key: 'notes', label: t('common.notes'), type: 'textarea' as const, full: true }
])
const documentColumns = computed(() => [
  { key: 'title', label: t('staff.docTitle') },
  { key: 'category', label: t('staff.docCategory') },
  { key: 'fileUrl', label: t('staff.docFileUrl') },
  { key: 'createdAt', label: t('common.date'), format: 'date' as const }
])

// ---- emergency contact: fields on the staff record itself ---------------
const emergency = ref({ emergencyName: '', emergencyRelation: '', emergencyPhone: '', emergencyAddress: '' })
const savingEmergency = ref(false)

watch(staff, (value) => {
  if (!value) return
  emergency.value = {
    emergencyName: value.emergencyName || '',
    emergencyRelation: value.emergencyRelation || '',
    emergencyPhone: value.emergencyPhone || '',
    emergencyAddress: value.emergencyAddress || ''
  }
}, { immediate: true })

async function saveEmergency() {
  savingEmergency.value = true
  try {
    await $api(`/staff/${staffId.value}`, { method: 'PUT', body: { ...emergency.value } })
    toast.add({ title: t('common.success'), description: t('messages.updateSuccess'), color: 'success' })
    await refresh()
  } catch (error: any) {
    toast.add({ title: t('common.error'), description: error.data?.message || t('messages.errorOccurred'), color: 'error' })
  } finally {
    savingEmergency.value = false
  }
}

const isEditOpen = ref(false)
function onEdited() {
  isEditOpen.value = false
  refresh()
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <UBreadcrumb :items="breadcrumbItems" />
      <UButton icon="i-lucide-pencil" :label="t('common.edit')" @click="isEditOpen = true" />
    </div>

    <UCard v-if="staff">
      <div class="flex flex-wrap items-center gap-4">
        <UAvatar :alt="displayName" size="xl" icon="i-lucide-user" />
        <div class="flex-1 min-w-0">
          <h2 class="text-xl font-semibold truncate">
            {{ displayName }}
          </h2>
          <p class="text-sm text-gray-500">
            {{ staff.role || '-' }}<span v-if="staff.specialization"> · {{ staff.specialization }}</span>
          </p>
        </div>
        <UBadge
          :label="staff.active === 1 ? t('staff.active') : t('staff.inactive')"
          :color="staff.active === 1 ? 'success' : 'neutral'"
          variant="subtle"
        />
      </div>
    </UCard>

    <UCard :ui="{ body: 'p-4' }">
      <UTabs v-model="selectedTab" :items="tabItems" class="w-full">
        <template #information>
          <dl class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div
              v-for="item in [
                { label: t('common.nameKh'), value: staff?.nameKh },
                { label: t('common.nameEn'), value: staff?.nameEn },
                { label: t('staff.gender'), value: genderLabel(staff?.gender) },
                { label: t('staff.dob'), value: dateLabel(staff?.dob) },
                { label: t('staff.phone'), value: staff?.phone },
                { label: t('staff.email'), value: staff?.email },
                { label: t('staff.telegram'), value: staff?.telegram },
                { label: t('staff.whatApp'), value: staff?.whatApp },
                { label: t('staff.role'), value: staff?.role },
                { label: t('staff.specialization'), value: staff?.specialization },
                { label: t('staff.houseNum'), value: staff?.houseNum },
                { label: t('staff.streetNum'), value: staff?.streetNum }
              ]"
              :key="item.label"
            >
              <dt class="text-xs uppercase tracking-wide text-gray-500">
                {{ item.label }}
              </dt>
              <dd class="text-sm mt-1">
                {{ item.value || '-' }}
              </dd>
            </div>
          </dl>
        </template>

        <template #spouse>
          <StaffProfileRecordSection
            class="pt-4"
            :staff-id="staffId"
            endpoint="staff-spouses"
            :fields="spouseFields"
            :columns="spouseColumns"
          />
        </template>

        <template #children>
          <StaffProfileRecordSection
            class="pt-4"
            :staff-id="staffId"
            endpoint="staff-children"
            :fields="childFields"
            :columns="childColumns"
          />
        </template>

        <template #experience>
          <StaffProfileRecordSection
            class="pt-4"
            :staff-id="staffId"
            endpoint="staff-experiences"
            :fields="experienceFields"
            :columns="experienceColumns"
          />
        </template>

        <template #education>
          <StaffProfileRecordSection
            class="pt-4"
            :staff-id="staffId"
            endpoint="staff-educations"
            :fields="educationFields"
            :columns="educationColumns"
          />
        </template>

        <template #training>
          <StaffProfileRecordSection
            class="pt-4"
            :staff-id="staffId"
            endpoint="staff-trainings"
            :fields="trainingFields"
            :columns="trainingColumns"
          />
        </template>

        <template #salary>
          <StaffProfileRecordSection
            class="pt-4"
            :staff-id="staffId"
            endpoint="salaries"
            :fields="salaryFields"
            :columns="salaryColumns"
          />
        </template>

        <template #documents>
          <StaffProfileRecordSection
            class="pt-4"
            :staff-id="staffId"
            endpoint="staff-documents"
            :fields="documentFields"
            :columns="documentColumns"
          />
        </template>

        <template #emergency>
          <div class="pt-4 space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormField :label="t('staff.emergencyName')">
                <UInput v-model="emergency.emergencyName" class="w-full" />
              </UFormField>
              <UFormField :label="t('staff.emergencyRelation')">
                <UInput v-model="emergency.emergencyRelation" class="w-full" />
              </UFormField>
              <UFormField :label="t('staff.emergencyPhone')">
                <UInput v-model="emergency.emergencyPhone" class="w-full" />
              </UFormField>
              <UFormField :label="t('staff.emergencyAddress')">
                <UInput v-model="emergency.emergencyAddress" class="w-full" />
              </UFormField>
            </div>
            <div class="flex justify-end">
              <UButton :label="t('common.save')" :loading="savingEmergency" @click="saveEmergency" />
            </div>
          </div>
        </template>
      </UTabs>
    </UCard>

    <StaffAddModal
      v-model:open="isEditOpen"
      :staff-member="staff"
      @save="onEdited"
    />
  </div>
</template>
