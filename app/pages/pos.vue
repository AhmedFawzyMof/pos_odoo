<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { RefreshCw, Plus, AlertCircle } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import PosRegisterForm from "~/components/pos/PosRegisterForm.vue";
import PosTerminalList from "~/components/pos/PosTerminalList.vue";
import PosActiveConsole from "~/components/pos/PosActiveConsole.vue";
import type { POSRegister } from "~/types/pos";
import { usePermissions } from "~/composables/usePermissions";

const route = useRoute();
const { canViewPage } = usePermissions();

if (import.meta.client) {
  if (!canViewPage(route.path)) {
    navigateTo('/')
  }
}

const POS_CONFIG_KEY = "pos_config_id";
const POS_NAME_KEY = "pos_config_name";

const router = useRouter();

let fetchRequestId = 0;

const registers = ref<POSRegister[]>([]);
const activeConfigId = ref<string | null>(null);
const activeConfigName = ref<string>("");
const showRegistrationForm = ref(false);
const openingCash = ref<number>(0);
const globalLoading = ref(false);
const actionLoading = ref<Record<string, boolean>>({});
const error = ref("");

const hasSelectedTerminal = computed(() => !!activeConfigId.value);

const currentActiveRegister = computed(() => {
  if (!activeConfigId.value) return null;
  return (
    registers.value.find((r) => String(r.id) === activeConfigId.value) || null
  );
});

async function fetchAllRegistersFromOdoo() {
  const requestId = ++fetchRequestId;
  globalLoading.value = true;
  error.value = "";
  try {
    const res = await $fetch<{ success: boolean; data: POSRegister[] }>(
      "/api/pos/registers",
    );
    if (res.success && requestId === fetchRequestId) {
      registers.value = res.data;
    }
  } catch (err: any) {
    if (requestId === fetchRequestId) {
      error.value = "فشل تحميل أجهزة الكاشير من النظام";
    }
  } finally {
    if (requestId === fetchRequestId) {
      globalLoading.value = false;
    }
  }
}

function loadFromStorage() {
  if (import.meta.client) {
    activeConfigId.value = localStorage.getItem(POS_CONFIG_KEY);
    activeConfigName.value = localStorage.getItem(POS_NAME_KEY) || "";
    fetchAllRegistersFromOdoo();
  }
}

async function refreshAllStatuses() {
  await fetchAllRegistersFromOdoo();
}

function selectTerminal(reg: POSRegister) {
  localStorage.setItem(POS_CONFIG_KEY, String(reg.id));
  localStorage.setItem(POS_NAME_KEY, reg.name);
  activeConfigId.value = String(reg.id);
  activeConfigName.value = reg.name;
}

function changeActiveTerminal() {
  activeConfigId.value = null;
  activeConfigName.value = "";
  localStorage.removeItem(POS_CONFIG_KEY);
  localStorage.removeItem(POS_NAME_KEY);
}

async function handleCreateRegister(name: string) {
  if (!name) return;
  globalLoading.value = true;
  error.value = "";
  try {
    const data = await $fetch<{
      success: boolean;
      config_id: number;
      name: string;
      message: string;
    }>("/api/pos/register", {
      method: "POST",
      body: { name },
    });

    if (data.success) {
      showRegistrationForm.value = false;
      await fetchAllRegistersFromOdoo();
      const newReg = registers.value.find(r => r.id === data.config_id);
      if (newReg) {
        selectTerminal(newReg);
      }
    }
  } catch (err: any) {
    error.value = err.message || err.statusMessage || "تعذر إعداد جهاز جديد حالياً";
  } finally {
    globalLoading.value = false;
  }
}

async function handleOpenSession(regId: number) {
  actionLoading.value[regId] = true;
  error.value = "";
  try {
    const sessionData = await $fetch<{ success: boolean; session: any }>(
      "/api/pos/session-control",
      {
        method: "POST",
        body: {
          config_id: regId,
          action: "open",
          opening_cash: openingCash.value,
        },
      },
    );

    const reg = registers.value.find((r) => r.id === regId);
    if (reg) {
      reg.session_state = "opened";
      reg.session_id = sessionData.session?.session_id ?? null;
    }

    if (reg) {
      activeConfigId.value = String(reg.id);
      activeConfigName.value = reg.name;
    }

    const query: Record<string, any> = { config_id: regId };
    if (sessionData.session?.session_id) {
      query.session_id = sessionData.session.session_id;
    }
    router.push({ path: '/cashier', query });
  } catch (err: any) {
    error.value = err.message || err.statusMessage || "فشل معالجة فتح صندوق اليومية";
  } finally {
    actionLoading.value[regId] = false;
  }
}

onMounted(loadFromStorage);
</script>

<template>
  <div class="min-h-[calc(100vh-8rem)] p-6 max-w-6xl mx-auto space-y-6">
    <Transition name="fade">
      <div
        v-if="error"
        class="flex items-start gap-3 rounded-lg bg-destructive/10 p-4 text-sm text-destructive border border-destructive/20 mb-4"
      >
        <AlertCircle class="h-5 w-5 shrink-0" />
        <p class="flex-1 leading-relaxed">{{ error }}</p>
      </div>
    </Transition>

    <!-- Terminal Picker -->
    <div v-if="!hasSelectedTerminal" class="space-y-6">
      <div
        class="flex items-center justify-between border-b border-outline-variant/60 pb-4"
      >
        <div>
          <h1 class="text-2xl font-bold tracking-tight">
            إدارة أجهزة ونقاط البيع
          </h1>
          <p class="text-sm text-muted-foreground">
            اختر جهاز الكاشير لبدء عمليات البيع السريع أو سجل محطة جديدة
          </p>
        </div>

        <div class="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            class="gap-1.5"
            @click="refreshAllStatuses"
            :disabled="globalLoading"
          >
            <RefreshCw
              class="h-4 w-4"
              :class="{ 'animate-spin': globalLoading }"
            />
            <span>تحديث الحالة</span>
          </Button>

          <Button
            @click="showRegistrationForm = !showRegistrationForm"
            class="gap-1.5 cursor-pointer"
          >
            <Plus class="h-4 w-4" />
            <span>تسجيل جهاز جديد</span>
          </Button>
        </div>
      </div>

      <PosRegisterForm
        :show="showRegistrationForm"
        :loading="globalLoading"
        @create="handleCreateRegister"
        @close="showRegistrationForm = false"
      />

      <PosTerminalList :registers="registers" @select="selectTerminal" />
    </div>

    <!-- Active Console -->
    <PosActiveConsole
      v-else
      :register="currentActiveRegister"
      :config-id="activeConfigId!"
      :config-name="activeConfigName"
      :opening-cash="openingCash"
      :session-loading="actionLoading[activeConfigId!] || false"
      @change-terminal="changeActiveTerminal"
      @open-session="handleOpenSession"
      @go-to-sales="(id: number) => router.push({ path: '/cashier', query: { config_id: id } })"
      @update:opening-cash="openingCash = $event"
    />
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
