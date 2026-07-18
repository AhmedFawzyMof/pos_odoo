<script setup lang="ts">
import { ref } from "vue";
import BaseReport from "./BaseReport.vue";
const props = defineProps<{ dateFrom: string; dateTo: string; locationId?: number | null }>();
const emit = defineEmits<{ loading: [v: boolean] }>();

const baseRef = ref<InstanceType<typeof BaseReport>>();
defineExpose({
  handleExport: () => baseRef.value?.handleExport?.(),
  refresh: () => baseRef.value?.refresh?.(),
});
</script>
<template>
  <BaseReport ref="baseRef" report-type="stock" :date-from :date-to :location-id @loading="emit('loading', $event)" />
</template>
