<script setup lang="ts">
defineProps<{ lines: string[] }>()
</script>

<template>
  <div class="space-y-1">
    <div v-for="line in lines" :key="line" class="flex">
      <span class="mr-2">•</span>
      <p class="font-khmer-moul text-[11pt]">
        {{ line }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.font-khmer-moul {
  font-family: 'Moul', serif;
}
</style>
