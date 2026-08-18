<script setup lang="ts">
import OpdPage from '~/components/opd/OpdPage.vue'
</script>

<template>
  <OpdPage dept="ECHO" />
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
