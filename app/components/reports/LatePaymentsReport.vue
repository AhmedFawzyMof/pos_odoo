<script setup lang="ts">
import { ref } from "vue";
import BaseReport from "./BaseReport.vue";
defineProps<{ dateFrom: string; dateTo: string; refreshKey?: number }>();
const emit = defineEmits<{ loading: [v: boolean] }>();

const baseRef = ref<InstanceType<typeof BaseReport>>();
defineExpose({
  handleExport: () => baseRef.value?.handleExport?.(),
  refresh: () => baseRef.value?.refresh?.(),
});
</script>
<template>
  <BaseReport ref="baseRef" report-type="late_payments" :date-from :date-to :refresh-key @loading="emit('loading', $event)" />
</template>
