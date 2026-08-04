<script setup lang="ts">
import { ref } from "vue";
import BaseReport from "./BaseReport.vue";
defineProps<{ dateFrom: string; dateTo: string; refreshKey?: number; orderId?: number | null; terminalId?: number | null }>();
const emit = defineEmits<{ loading: [v: boolean] }>();

const baseRef = ref<InstanceType<typeof BaseReport>>();
defineExpose({
  handleExport: () => baseRef.value?.handleExport?.(),
  refresh: () => baseRef.value?.refresh?.(),
});
</script>
<template>
  <BaseReport ref="baseRef"
    report-type="profit_loss"
    :date-from
    :date-to
    :order-id
    :terminal-id
    :refresh-key
    @loading="emit('loading', $event)"
  />
</template>
