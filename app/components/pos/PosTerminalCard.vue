<script setup lang="ts">
import { Lock, Unlock } from "@lucide/vue";
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { POSRegister } from "~/types/pos";

defineProps<{
  register: POSRegister;
}>();

const emit = defineEmits<{
  select: [register: POSRegister];
}>();
</script>

<template>
  <Card
    class="hover:border-primary/40 transition-all shadow-sm flex flex-col justify-between"
  >
    <CardHeader class="pb-3">
      <div class="flex items-start justify-between">
        <div class="space-y-1">
          <CardTitle class="text-base font-bold">{{ register.name }}</CardTitle>
          <CardDescription class="text-xs">
            المعرف الذكي: #{{ register.id }}
          </CardDescription>
        </div>

        <div
          v-if="register.session_state === 'opened'"
          class="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 border border-emerald-500/20"
        >
          <Unlock class="h-3 w-3" /> مفتوح
        </div>
        <div
          v-else
          class="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600 border border-amber-500/20"
        >
          <Lock class="h-3 w-3" /> مغلق
        </div>
      </div>
    </CardHeader>

    <CardFooter class="pt-2 border-t bg-muted/10 flex items-center justify-between gap-2">
      <p class="text-xs text-muted-foreground">الوضعية الافتراضية</p>
      <Button
        size="sm"
        variant="secondary"
        @click="emit('select', register)"
        class="h-8 text-xs font-semibold"
      >
        دخول لغرفة التحكم
      </Button>
    </CardFooter>
  </Card>
</template>
