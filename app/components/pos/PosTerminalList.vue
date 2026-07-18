<script setup lang="ts">
import { Monitor } from "@lucide/vue";
import PosTerminalCard from "./PosTerminalCard.vue";
import type { POSRegister } from "~/types/pos";

defineProps<{
  registers: POSRegister[];
}>();

const emit = defineEmits<{
  select: [register: POSRegister];
}>();
</script>

<template>
  <div
    v-if="registers.length === 0"
    class="flex flex-col items-center justify-center py-16 border border-dashed rounded-2xl bg-muted/10"
  >
    <Monitor class="h-12 w-12 text-muted-foreground/40 mb-3" />
    <p class="text-sm text-muted-foreground">
      لا يوجد أجهزة مسجلة حالياً. انقر على زر إضافة في الأعلى لبناء أول كاشير.
    </p>
  </div>

  <div
    v-else
    class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
  >
    <PosTerminalCard
      v-for="reg in registers"
      :key="reg.id"
      :register="reg"
      @select="emit('select', $event)"
    />
  </div>
</template>
