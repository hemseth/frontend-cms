<script setup lang="ts">
import type { PrintProfile } from '~/composables/clinic/useClinicProfile'

const props = withDefaults(defineProps<{ profile: PrintProfile, showNote?: boolean }>(), { showNote: true })

const online = computed(() => [props.profile.email, props.profile.website].filter(Boolean).join(' · '))
const note = computed(() => props.showNote ? props.profile.footerNote : '')
const hasContent = computed(() => !!(props.profile.address || props.profile.phone || online.value || note.value))
</script>

<template>
  <div v-if="hasContent">
    <p v-if="profile.address || profile.phone">
      <template v-if="profile.address">
        អាសយដ្ឋាន៖ {{ profile.address }}
      </template>
      <template v-if="profile.phone">
        ទូរស័ព្ទទំនាក់ទំនង៖ {{ profile.phone }}
      </template>
    </p>
    <p v-if="online">
      {{ online }}
    </p>
    <p v-if="note">
      {{ note }}
    </p>
  </div>
</template>
