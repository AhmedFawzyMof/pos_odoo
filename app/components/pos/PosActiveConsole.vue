<script setup lang="ts">
import { Receipt, Lock, Unlock } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import PosSessionPanel from "./PosSessionPanel.vue";
import type { POSRegister } from "~/types/pos";

defineProps<{
  register: POSRegister | null;
  configId: string;
  configName: string;
  openingCash: number;
  sessionLoading: boolean;
}>();

const emit = defineEmits<{
  "change-terminal": [];
  "open-session": [configId: number];
  "go-to-sales": [configId: number];
  "update:openingCash": [value: number];
}>();
</script>

<template>
  <div class="w-full max-w-3xl mx-auto space-y-6">
    <div
      class="flex items-center justify-between bg-card border border-outline-variant/60 rounded-xl p-4 shadow-sm"
    >
      <div class="flex items-center gap-3">
        <div
          class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"
        >
          <Receipt class="h-6 w-6" />
        </div>
        <div>
          <h2 class="text-lg font-bold">{{ configName }}</h2>
          <p class="text-xs text-muted-foreground">
            المحطة الحالية النشطة بالمستعرض • معرف #{{ configId }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <div
          v-if="register?.session_state === 'opened'"
          class="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 border border-emerald-500/20"
        >
          <Unlock class="h-3 w-3" /> وردية مفتوحة
        </div>
        <div
          v-else
          class="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 border border-amber-500/20"
        >
          <Lock class="h-3 w-3" /> وردية مغلقة
        </div>

        <Button
          variant="ghost"
          size="sm"
          @click="emit('change-terminal')"
          class="text-muted-foreground hover:text-foreground text-xs"
        >
          تغيير المحطة
        </Button>
      </div>
    </div>

    <PosSessionPanel
      :register="register"
      :opening-cash="openingCash"
      :loading="sessionLoading"
      @open-session="(id: number) => emit('open-session', id)"
      @go-to-sales="(id: number) => emit('go-to-sales', id)"
      @update:opening-cash="(v: number) => emit('update:openingCash', v)"
    />
  </div>
</template>
