<script setup lang="ts">
// This page used to simulate beds in local state (admit, discharge and "add bed" never reached the
// API). The bed board is the real one, so keep the old URL working by forwarding to it.
definePageMeta({
  redirect: to => ({ path: '/inpatient/bed-board', query: to.query })
})
</script>

<template>
  <div />
</template>
