<script setup lang="ts">
import { ref, computed } from 'vue'

definePageMeta({
    layout: 'auth' // Using auth layout which is basically a clean container without sidebar
})

const { t, locale } = useI18n()
const searchQuery = ref('')
const selectedType = ref<string | undefined>()

// Fetch data using the public endpoint
const { data: typesResult } = await useAsyncData('public-medicine-types', () => $api('/public/medicine-types'), {
    default: () => ({ data: [] })
})

const medicineTypeOptions = computed(() => {
    return ((typesResult.value as any)?.data || []).map((t: any) => ({
        label: locale.value === 'km' ? t.nameKh : t.nameEn,
        value: t.nameEn.toLowerCase()
    }))
})

const { data: result, status } = await useAsyncData('public-medicines', () =>
    $api<{ data: any[] }>('/public/medicines', {
        params: {
            search: searchQuery.value,
            type: selectedType.value
        }
    }), {
    watch: [searchQuery, selectedType],
    default: () => ({ data: [] })
}
)

const medicines = computed(() => (result.value as any)?.data || [])

function resetFilters() {
    searchQuery.value = ''
    selectedType.value = undefined
}
</script>

<template>
    <div class="min-h-screen bg-gray-50 dark:bg-gray-950 w-full py-8 px-4 sm:px-6 lg:px-8">
        <div class="max-w-7xl mx-auto space-y-8">
            <!-- Header Section -->
            <div class="text-center space-y-4">
                <h1 class="text-4xl font-extrabold text-gray-900 dark:text-white sm:text-5xl">
                    {{ t('medicine.title') }}
                </h1>
                <p class="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                    Browse our comprehensive catalog of medicines. Search by name, code, or dosage to find what you
                    need.
                </p>
            </div>

            <!-- Search & Filters -->
            <UCard class="sticky top-4 z-10 shadow-lg border-primary/10">
                <div class="flex flex-col md:flex-row gap-4">
                    <div class="flex-1">
                        <UInput v-model="searchQuery" :placeholder="t('medicine.search')" icon="i-lucide-search"
                            size="xl" class="w-full rounded-full" />
                    </div>
                    <div class="flex gap-2">
                        <USelectMenu v-model="selectedType" :items="medicineTypeOptions" value-key="value"
                            label-key="label" size="xl" class="w-48 rounded-full" :placeholder="t('medicine.type')" clearable />
                        <UButton color="error" variant="soft" icon="i-lucide-rotate-ccw" size="xl"
                            class="rounded-full px-6" @click="resetFilters">
                            {{ t('common.reset') }}
                        </UButton>
                    </div>
                </div>
            </UCard>

            <!-- Results Section -->
            <div v-if="status === 'pending'"
                class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
                <UCard v-for="i in 8" :key="i" class="animate-pulse h-64 border-none bg-gray-200 dark:bg-gray-800" />
            </div>

            <div v-else-if="medicines.length === 0" class="text-center py-20 space-y-4">
                <div
                    class="bg-gray-100 dark:bg-gray-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                    <UIcon name="i-lucide-search-x" class="w-10 h-10 text-gray-400" />
                </div>
                <h3 class="text-xl font-medium text-gray-900 dark:text-white">No medicines found</h3>
                <p class="text-gray-500">Try adjusting your search or filters to find what you're looking for.</p>
                <UButton variant="soft" @click="resetFilters">Clear all filters</UButton>
            </div>

            <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8 pb-12">
                <UCard v-for="medicine in medicines" :key="medicine._id"
                    class="group hover:shadow-2xl transition-all duration-300 border-none bg-white dark:bg-gray-900 ring-1 ring-gray-200 dark:ring-gray-800 overflow-hidden"
                    :ui="{ body: 'p-0' }">
                    <!-- Medicine Image Container (Mock) -->
                    <div
                        class="h-40 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center group-hover:from-primary/20 group-hover:to-primary/10 transition-colors">
                        <UIcon name="i-lucide-pill"
                            class="w-16 h-16 text-primary/40 group-hover:scale-110 transition-transform duration-300" />
                        <div class="absolute top-3 right-3">
                            <UBadge :color="medicine.status === 'active' ? 'success' : 'neutral'" variant="subtle"
                                class="rounded-full">
                                {{ medicine.status }}
                            </UBadge>
                        </div>
                    </div>

                    <div class="p-5 space-y-3">
                        <div>
                            <div class="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                                {{ medicine.code }}
                            </div>
                            <h3 class="text-xl font-bold text-gray-900 dark:text-white line-clamp-1">
                                {{ medicine.name }}
                            </h3>
                        </div>

                        <div class="flex items-center gap-2">
                            <UBadge variant="soft" color="neutral" class="rounded-md">
                                {{ medicine.dosage }}
                            </UBadge>
                            <UBadge variant="soft" color="primary" class="rounded-md">
                                {{ medicine.unit }}
                            </UBadge>
                        </div>

                        <div
                            class="pt-4 flex items-center justify-between border-t border-gray-100 dark:border-gray-800">
                            <div class="text-2xl font-black text-primary">
                                ${{ Number(medicine.price).toFixed(2) }}
                            </div>
                            <UButton icon="i-lucide-info" variant="ghost" color="neutral" class="rounded-full"
                                :label="t('common.details')" />
                        </div>
                    </div>
                </UCard>
            </div>
        </div>

        <!-- Back to Login Button for demo purposes -->
        <div class="fixed bottom-4 left-4">
            <UButton to="/login" icon="i-lucide-arrow-left" variant="soft" color="neutral"
                class="rounded-full shadow-lg">
                Portal Login
            </UButton>
        </div>
    </div>
</template>

<style scoped>
.line-clamp-1 {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
</style>
