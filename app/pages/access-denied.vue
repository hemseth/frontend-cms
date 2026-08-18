<script setup lang="ts">
definePageMeta({ layout: false })
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
    <UCard class="w-full max-w-md text-center">
      <UIcon name="i-lucide-shield-x" class="mx-auto size-12 text-error" />
      <h1 class="mt-4 text-xl font-semibold">Access denied</h1>
      <p class="mt-2 text-gray-500">You do not have permission to access this module.</p>
      <UButton class="mt-6" to="/" label="Return to dashboard" />
    </UCard>
  </div>
</template>
