<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{
  collapsed?: boolean
}>()

const auth = useAuth()
const branch = useBranch()
const clinicContext = useClinicContext()
const isDeveloper = computed(() => auth.user.value?.role === 'developer')

const { data: clinicsResult } = await useAsyncData('developer-clinic-context-options', () =>
  isDeveloper.value ? $api('/clinics', { params: { limit: 1000 } }) : Promise.resolve({ data: [] }),
{ default: () => ({ data: [] }), getCachedData: () => undefined })

const clinics = computed(() => (clinicsResult.value as any)?.data || [])
const selectedClinic = computed(() => clinics.value.find((item: any) => item._id === clinicContext.selectedClinicId.value))

const selectedBranch = computed(() => {
  if (branch.currentBranch.value) {
    return {
      label: `${selectedClinic.value?.nameKh || selectedClinic.value?.name || ''} / ${branch.currentBranch.value.nameKh || branch.currentBranch.value.name || 'Select Branch'}`,
      icon: 'i-lucide-git-branch'
    }
  }
  return {
    label: selectedClinic.value?.nameKh || selectedClinic.value?.name || (isDeveloper.value ? 'Select Clinic' : 'All Branches'),
    icon: selectedClinic.value ? 'i-lucide-hospital' : 'i-lucide-building-2'
  }
})

async function selectClinic(clinicId: string | null) {
  clinicContext.setSelectedClinicId(clinicId)
  branch.setCurrentBranchId(null)
  await branch.fetchBranches(clinicId, auth.accessToken.value)
  await refreshNuxtData()
}

const items = computed<DropdownMenuItem[][]>(() => {
  const clinicItems = isDeveloper.value
    ? [
        {
          label: 'All Clinics (view only)',
          icon: 'i-lucide-layout-grid',
          onSelect: () => selectClinic(null)
        },
        ...clinics.value.map((clinic: any) => ({
          label: clinic.nameKh || clinic.name,
          icon: clinic._id === clinicContext.selectedClinicId.value ? 'i-lucide-circle-check' : 'i-lucide-hospital',
          onSelect: () => selectClinic(clinic._id)
        }))
      ]
    : []

  const branchItems = branch.branches.value.map(b => ({
    label: b.nameKh || b.name || b.code,
    icon: b.isMain ? 'i-lucide-star' : 'i-lucide-git-branch',
    chip: b.isMain ? 'yellow' : undefined,
    onSelect() {
      branch.setCurrentBranchId(b._id)
      refreshNuxtData()
    }
  }))

  return [
    clinicItems,
    branchItems,
    [{
      label: 'View All Branches',
      icon: 'i-lucide-layout-grid',
      to: '/settings/branches'
    }]
  ]
})

onMounted(() => {
  const activeClinicId = isDeveloper.value ? clinicContext.selectedClinicId.value : auth.clinicId.value
  branch.fetchBranches(activeClinicId, auth.accessToken.value)
})
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-40' : 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      v-bind="{
        ...selectedBranch,
        label: collapsed ? undefined : selectedBranch?.label,
        trailingIcon: collapsed ? undefined : 'i-lucide-chevrons-up-down'
      }"
      color="neutral"
      variant="ghost"
      block
      :square="collapsed"
      class="data-[state=open]:bg-elevated"
      :class="[!collapsed && 'py-2']"
      :ui="{
        trailingIcon: 'text-dimmed',
        leadingIcon: 'text-primary'
      }"
    />
  </UDropdownMenu>
</template>
