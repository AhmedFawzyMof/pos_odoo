<script setup lang="ts">
import { ref, onMounted } from "vue";
import { LoaderCircle, Eye, LogOut, Timer, ShoppingCart } from "@lucide/vue";
import BaseReport from "./BaseReport.vue";
import SessionSummaryModal from "./SessionSummaryModal.vue";
import { usePermissions } from "~/composables/usePermissions";

defineProps<{ dateFrom: string; dateTo: string }>();
const emit = defineEmits<{ loading: [v: boolean] }>();

const baseRef = ref<InstanceType<typeof BaseReport>>();
defineExpose({
  handleExport: () => baseRef.value?.handleExport?.(),
  refresh: () => baseRef.value?.refresh?.(),
});

const { isManager } = usePermissions();

const allSessions = ref<any[]>([]);
const loadingSessions = ref(false);
const closingId = ref<number | null>(null);
const fetchError = ref<string | null>(null);
const summarySessionId = ref<number | null>(null);
const showSummaryModal = ref(false);

const stateLabels: Record<string, string> = {
  draft: "مسودة",
  opening_control: "فتح",
  opened: "مفتوحة",
  closing_control: "غلق",
  closed: "مغلقة",
};

const fetchSessions = async () => {
  loadingSessions.value = true;
  fetchError.value = null;
  try {
    const res: any = await $fetch("/api/pos/sessions");
    if (res?.success) {
      allSessions.value = res.data || [];
    } else {
      fetchError.value = "فشل في تحميل الجلسات";
      allSessions.value = [];
    }
  } catch (e: any) {
    fetchError.value = e.data?.message || e.message || "خطأ في جلب الجلسات";
    allSessions.value = [];
  } finally {
    loadingSessions.value = false;
  }
};

const closeSession = async (sessionId: number) => {
  closingId.value = sessionId;
  try {
    await $fetch("/api/reports/close-session", {
      method: "POST",
      body: { session_id: sessionId },
    });
    await fetchSessions();
    baseRef.value?.refresh?.();
  } catch (e: any) {
    alert(e.data?.message || e.message || "فشل إغلاق الجلسة");
  } finally {
    closingId.value = null;
  }
};

const openSummary = (sessionId: number) => {
  summarySessionId.value = sessionId;
  showSummaryModal.value = true;
};

onMounted(() => {
  fetchSessions();
});
</script>
<template>
  <div class="space-y-6">
    <!-- Sessions List -->
    <div class="bg-white border border-outline-variant rounded-xl overflow-hidden">
      <div class="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Timer class="w-5 h-5 text-primary" />
          <h3 class="text-headline-sm font-bold">الجلسات</h3>
        </div>
        <span v-if="allSessions.length" class="text-label-md text-on-white-variant">{{ allSessions.length }} جلسة</span>
      </div>

      <div v-if="loadingSessions" class="p-8 text-center text-on-white-variant">
        <LoaderCircle class="w-6 h-6 animate-spin mx-auto mb-2" />
        <span class="text-sm">جاري التحميل...</span>
      </div>

      <div v-else-if="fetchError" class="p-8 text-center text-error text-sm">{{ fetchError }}</div>

      <div v-else-if="!allSessions.length" class="p-8 text-center text-on-white-variant text-sm">
        لا توجد جلسات
      </div>

      <div v-else class="divide-y divide-outline-variant">
        <div
          v-for="s in allSessions"
          :key="s.id"
          class="px-5 py-3 flex items-center gap-4 hover:bg-slate-50 transition-colors"
        >
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-0.5">
              <span class="font-semibold text-sm">{{ s.name }}</span>
              <span
                class="text-xs px-2 py-0.5 rounded-full font-medium"
                :class="{
                  'bg-emerald-100 text-emerald-700': s.state === 'opened',
                  'bg-red-100 text-red-700': s.state === 'closed',
                  'bg-amber-100 text-amber-700': s.state === 'closing_control' || s.state === 'opening_control',
                  'bg-slate-100 text-slate-600': s.state === 'draft',
                }"
              >{{ stateLabels[s.state] || s.state }}</span>
            </div>
            <div class="text-xs text-on-white-variant flex items-center gap-3">
              <span>{{ s.config }}</span>
              <span>{{ s.user }}</span>
              <span class="flex items-center gap-1">
                <ShoppingCart class="w-3 h-3" />
                {{ s.order_count }}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <button
              @click="openSummary(s.id)"
              class="h-9 px-4 bg-white border border-outline-variant hover:bg-slate-100 text-slate-700 font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Eye class="w-4 h-4" />
              عرض الملخص
            </button>
            <button
              v-if="isManager && (s.state === 'opened' || s.state === 'closing_control')"
              @click="closeSession(s.id)"
              :disabled="closingId === s.id"
              class="h-9 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-40"
            >
              <LoaderCircle v-if="closingId === s.id" class="w-4 h-4 animate-spin" />
              <LogOut v-else class="w-4 h-4" />
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Shift Report -->
    <BaseReport ref="baseRef" report-type="shift" :date-from :date-to @loading="emit('loading', $event)" />

    <!-- Session Summary Modal -->
    <SessionSummaryModal
      :open="showSummaryModal"
      :session-id="summarySessionId"
      @update:open="showSummaryModal = $event"
    />
  </div>
</template>
