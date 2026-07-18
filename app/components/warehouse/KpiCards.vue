<script setup lang="ts">
interface KpiItem {
  title: string;
  value: string;
  unit: string;
  change: string;
  changeType: string;
  icon: string;
  color: string;
}

import { Wallet, AlertTriangle, Package, Truck, Activity } from "@lucide/vue";

defineProps<{
  kpis: KpiItem[];
}>();

const getIcon = (iconName: string) => {
  switch (iconName) {
    case "account_balance_wallet":
      return Wallet;
    case "warning":
      return AlertTriangle;
    case "inventory":
      return Package;
    case "local_shipping":
      return Truck;
    default:
      return Activity;
  }
};
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    <div
      v-for="(kpi, idx) in kpis"
      :key="idx"
      class="bg-white p-6 rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow"
    >
      <div class="flex justify-between items-start mb-4">
        <div class="p-3 rounded-lg" :class="kpi.color">
          <component :is="getIcon(kpi.icon)" class="text-primary w-6 h-6" />
        </div>
        <span
          v-if="kpi.change"
          class="text-label-md font-bold"
          :class="kpi.changeType === 'positive' ? 'text-primary' : 'text-error'"
        >
          {{ kpi.change }}
        </span>
      </div>
      <p class="text-on-white-variant text-label-md font-label-md">
        {{ kpi.title }}
      </p>
      <h3 class="text-display-lg font-bold mt-1 text-on-white">
        {{ kpi.value }}
        <span class="text-body-md font-normal text-on-white-variant">{{
          kpi.unit
        }}</span>
      </h3>
    </div>
  </div>
</template>
