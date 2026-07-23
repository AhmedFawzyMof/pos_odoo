<script setup lang="ts">
import { watch } from "vue";
import { AlertCircle, RefreshCw, Circle } from "@lucide/vue";
import { useSessionPoller, type SessionStatus } from "~/composables/useSessionPoller";

const props = defineProps<{
  configId: string;
  sessionId: number | null;
}>();

const emit = defineEmits<{
  "session-expired": [];
}>();

const { start, stop, status, lastCheck } = useSessionPoller();

function formatTime(date: Date | null): string {
  if (!date) return "";
  return date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}

function statusColor(s: SessionStatus): string {
  if (s === "active") return "text-emerald-500";
  if (s === "checking") return "text-amber-400";
  if (s === "expired") return "text-red-500";
  return "text-muted-foreground";
}

function statusLabel(s: SessionStatus): string {
  if (s === "active") return "الوردية نشطة";
  if (s === "checking") return "جاري التحقق...";
  if (s === "expired") return "الوردية منتهية";
  return "خطأ في الاتصال";
}

watch(
  () => [props.configId, props.sessionId] as const,
  ([cId, sId]) => {
    if (cId && sId) {
      start(cId, sId, () => emit("session-expired"));
    }
  },
  { immediate: true },
);

function handleRefresh() {
  window.location.reload();
}
</script>

<template>
  <div class="fixed bottom-4 right-4 z-50 flex items-center gap-2">
    <div
      class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium border bg-background/80 backdrop-blur-sm shadow-xs transition-all"
      :class="{
        'border-emerald-500/30': status === 'active',
        'border-red-500/40': status === 'expired',
        'border-amber-400/30': status === 'checking',
        'border-muted-foreground/20': status === 'error',
      }"
      :title="lastCheck ? `آخر فحص: ${formatTime(lastCheck)}` : ''"
    >
      <Circle
        class="w-2 h-2 fill-current"
        :class="statusColor(status)"
      />
      <span :class="statusColor(status)">{{ statusLabel(status) }}</span>
    </div>
  </div>

  <Teleport to="body">
    <div
      v-if="status === 'expired'"
      class="fixed inset-0 z-60 flex items-center justify-center bg-black/40"
    >
      <div
        class="mx-4 max-w-sm w-full rounded-2xl border border-red-500/30 bg-card p-6 shadow-2xl text-center space-y-4"
      >
        <div
          class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10"
        >
          <AlertCircle class="h-7 w-7 text-red-500" />
        </div>
        <div class="space-y-1.5">
          <p class="text-base font-bold text-foreground">الوردية منتهية</p>
          <p class="text-sm text-muted-foreground leading-relaxed">
            تم إغلاق الوردية عن بُعد أو انتهت صلاحيتها. يرجى فتح وردية جديدة
            للمتابعة.
          </p>
        </div>
        <div class="flex gap-2 justify-center">
          <button
            @click="handleRefresh"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium cursor-pointer hover:bg-primary/90 transition-colors"
          >
            <RefreshCw class="h-4 w-4" />
            تحديث الصفحة
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
