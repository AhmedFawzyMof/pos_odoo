<script setup lang="ts">
interface MovementItem {
  product: string;
  reference: string;
  destination: string;
  source: string;
  qty: string;
  type: string;
  typeClass: string;
  badgeColor: string;
  time: string;
}

import {
  History,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Package,
  Activity,
  ReplaceAll,
  Replace,
} from "@lucide/vue";

const props = defineProps<{
  movements: MovementItem[];
}>();

const getIcon = (typeClass: string) => {
  if (typeClass === "incoming") return Package;
  if (typeClass === "outgoing") return Activity;
  if (typeClass === "internal") return ArrowRightLeft;
  if (typeClass === "inbound") return ReplaceAll;
  if (typeClass === "outbound") return Replace;
  if (typeClass === "adjustment") return TrendingUp;
  return ReplaceAll;
};
</script>

<template>
  <div
    class="bg-white rounded-xl border border-outline-variant flex flex-col h-full"
  >
    <div
      class="p-6 border-b border-outline-variant bg-white/50 backdrop-blur-sm"
    >
      <h2 class="text-headline-sm font-bold flex items-center gap-2">
        <History class="text-primary w-6 h-6" />
        حركات المخزون الأخيرة
      </h2>
    </div>
    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      <!-- Movement Row -->
      <div
        v-for="(mv, idx) in movements"
        :key="idx"
        class="flex flex-col items-start gap-4 p-3 rounded-lg hover:bg-white-low transition-colors cursor-pointer"
      >
        <div class="flex w-full">
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            :class="mv.badgeColor"
          >
            <component :is="getIcon(mv.typeClass)" class="w-5 h-5" />
          </div>
          <div class="flex-1">
            <p class="text-label-md font-bold text-on-white">
              {{ mv.destination }}
            </p>
            <p class="text-xs text-on-white-variant">{{ mv.product }}</p>
          </div>
          <div class="text-left">
            <p
              class="font-bold"
              :class="mv.qty.startsWith('+') ? 'text-primary' : 'text-error'"
            >
              {{ mv.qty }}
            </p>
            <p class="text-[10px] text-on-white-variant">
              {{ mv.reference }}
            </p>
          </div>
        </div>
        <p class="text-sm">{{ new Date(mv.time).toLocaleString("ar-eg") }}</p>
      </div>
    </div>
    <div class="p-4 border-t border-outline-variant bg-white-low">
      <NuxtLink
        to="/stock-movements"
        class="block w-full text-center text-label-md text-primary font-bold hover:underline"
      >
        عرض جميع التحركات
      </NuxtLink>
    </div>
  </div>
</template>
