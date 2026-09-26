<script setup lang="ts">
import { computed } from 'vue'
import {
  countryLabel, formatYearMonth, QUALIFICATION_LEVELS, yearsOfExperience,
  type StaffExperience, type StaffMember, type StaffPosition, type StaffQualification
} from '~/utils/staffProfile'

/** Read-only staff profile: education and training, work experience, positions at this clinic. */
const props = defineProps<{ staffMember?: StaffMember | null }>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ edit: [staff: StaffMember] }>()
const { t, locale } = useI18n()

const s = computed<Partial<StaffMember>>(() => props.staffMember || {})
const qualifications = computed<StaffQualification[]>(() =>
  // Highest level first, then the most recent.
  [...(s.value.qualifications || [])].sort((a: StaffQualification, b: StaffQualification) =>
    QUALIFICATION_LEVELS.indexOf(b.level) - QUALIFICATION_LEVELS.indexOf(a.level) || (b.endYear || 0) - (a.endYear || 0)))
const experience = computed<StaffExperience[]>(() =>
  [...(s.value.experience || [])].sort((a: StaffExperience, b: StaffExperience) =>
    (b.current ? 1 : 0) - (a.current ? 1 : 0) || String(b.startDate || '').localeCompare(String(a.startDate || ''))))
const history = computed<StaffPosition[]>(() =>
  [...(s.value.positionHistory || [])].sort((a: StaffPosition, b: StaffPosition) => String(b.startDate || '').localeCompare(String(a.startDate || ''))))
const years = computed(() => yearsOfExperience(s.value.experience, s.value.positionHistory))
const abroad = computed(() => [...new Set(
  [...(s.value.qualifications || []), ...(s.value.experience || [])]
    .map((r: { country?: string }) => r.country)
    .filter((c?: string): c is string => !!c && c !== 'KH')
)])

const period = (from?: string, to?: string, current?: boolean) =>
  [formatYearMonth(from), current ? t('staff.profile.present') : formatYearMonth(to) || (from ? t('staff.profile.present') : '')]
    .filter(Boolean).join(' – ')
const yearsRange = (q: StaffQualification) => [q.startYear, q.endYear].filter(Boolean).join(' – ')
</script>

<template>
  <UModal v-model:open="open" :title="t('staff.profile.title')" :ui="{ content: 'sm:max-w-3xl' }">
    <template #body>
      <div class="space-y-6">
        <!-- Summary -->
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-lg font-semibold">
              {{ s.nameKh || s.nameEn }}
            </p>
            <p v-if="s.nameKh && s.nameEn" class="text-sm text-muted">
              {{ s.nameEn }}
            </p>
            <p class="mt-1 text-sm">
              {{ [s.role, s.specialization].filter(Boolean).join(' · ') }}
            </p>
            <p v-if="s.hireDate" class="text-sm text-muted">
              {{ t('staff.profile.hereSince', { date: formatYearMonth(s.hireDate) }) }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <UBadge
              v-if="years"
              color="primary"
              variant="subtle"
              size="lg"
            >
              {{ t('staff.profile.yearsExperience', { n: years }) }}
            </UBadge>
            <UBadge
              v-for="c in abroad"
              :key="c"
              color="neutral"
              variant="outline"
              icon="i-lucide-globe"
            >
              {{ countryLabel(c, locale) }}
            </UBadge>
          </div>
        </div>
        <div v-if="s.skills?.length" class="flex flex-wrap gap-1.5">
          <UBadge
            v-for="skill in s.skills"
            :key="skill"
            color="neutral"
            variant="soft"
          >
            {{ skill }}
          </UBadge>
        </div>

        <!-- Education and training -->
        <section>
          <h3 class="mb-2 flex items-center gap-2 font-semibold">
            <UIcon name="i-lucide-graduation-cap" /> {{ t('staff.tabs.education') }}
          </h3>
          <p v-if="!qualifications.length" class="text-sm text-muted">
            {{ t('staff.profile.none') }}
          </p>
          <ul v-else class="space-y-2">
            <li v-for="(q, i) in qualifications" :key="i" class="rounded-lg border border-default p-3">
              <div class="flex flex-wrap items-center gap-2">
                <UBadge color="primary" variant="subtle" size="sm">
                  {{ t(`staff.level.${q.level}`) }}
                </UBadge>
                <span class="font-medium">{{ q.title }}</span>
                <span v-if="yearsRange(q)" class="ml-auto text-sm text-muted">{{ yearsRange(q) }}</span>
              </div>
              <p v-if="q.field" class="mt-1 text-sm">
                {{ q.field }}
              </p>
              <p class="text-sm text-muted">
                {{ [q.institution, countryLabel(q.country, locale)].filter(Boolean).join(', ') }}
              </p>
            </li>
          </ul>
        </section>

        <!-- Work experience -->
        <section>
          <h3 class="mb-2 flex items-center gap-2 font-semibold">
            <UIcon name="i-lucide-briefcase" /> {{ t('staff.tabs.experience') }}
          </h3>
          <p v-if="!experience.length" class="text-sm text-muted">
            {{ t('staff.profile.none') }}
          </p>
          <ul v-else class="space-y-2">
            <li v-for="(e, i) in experience" :key="i" class="rounded-lg border border-default p-3">
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-medium">{{ e.position }}</span>
                <span class="text-muted">· {{ e.organization }}</span>
                <span class="ml-auto text-sm text-muted">{{ period(e.startDate, e.endDate, e.current) }}</span>
              </div>
              <p v-if="e.country" class="text-sm text-muted">
                {{ countryLabel(e.country, locale) }}
              </p>
              <p v-if="e.duties" class="mt-1 whitespace-pre-line text-sm">
                {{ e.duties }}
              </p>
            </li>
          </ul>
        </section>

        <!-- Positions at this clinic -->
        <section>
          <h3 class="mb-2 flex items-center gap-2 font-semibold">
            <UIcon name="i-lucide-history" /> {{ t('staff.tabs.history') }}
          </h3>
          <p v-if="!history.length" class="text-sm text-muted">
            {{ t('staff.profile.none') }}
          </p>
          <ol v-else class="relative ml-2 space-y-3 border-l border-default pl-4">
            <li v-for="(p, i) in history" :key="i">
              <span class="absolute -left-1.5 mt-1.5 size-3 rounded-full" :class="p.endDate ? 'bg-muted' : 'bg-primary'" />
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-medium">{{ p.position }}</span>
                <span v-if="p.department" class="text-muted">· {{ p.department }}</span>
                <UBadge
                  v-if="!p.endDate"
                  color="success"
                  variant="subtle"
                  size="sm"
                >
                  {{ t('staff.profile.currentPosition') }}
                </UBadge>
                <span class="ml-auto text-sm text-muted">{{ period(p.startDate, p.endDate) }}</span>
              </div>
              <p v-if="p.note" class="text-sm text-muted">
                {{ p.note }}
              </p>
            </li>
          </ol>
        </section>
      </div>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          :label="t('common.close')"
          color="neutral"
          variant="ghost"
          @click="open = false"
        />
        <UButton :label="t('common.edit')" icon="i-lucide-pencil" @click="props.staffMember && emit('edit', props.staffMember)" />
      </div>
    </template>
  </UModal>
</template>
