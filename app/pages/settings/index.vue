<script setup lang="ts">
// Redirect to medicine-type as it's the only settings page left
definePageMeta({
  middleware: [
    function (to, from) {
      return navigateTo('/settings/medicine-type')
    }
  ]
})
</script>
