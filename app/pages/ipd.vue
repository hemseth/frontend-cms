<script setup lang="ts">
import OpdPage from '~/components/opd/OpdPage.vue'
import IpdAdmissionBoard from '~/components/ipd/IpdAdmissionBoard.vue'
</script>

<template>
  <div class="space-y-4 p-2">
    <IpdAdmissionBoard />
    <OpdPage dept="IPD" />
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Battambang&family=Hanuman&display=swap');

body {
  font-family: 'Battambang', sans-serif;
}

.khmer-label {
  font-family: 'Hanuman', serif;
  font-weight: bold;
}

table {
  table-layout: fixed;
}
</style>
