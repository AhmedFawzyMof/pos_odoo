<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { AlertCircle, RefreshCcw, CheckCheck } from "@lucide/vue";
import { usePermissions } from "~/composables/usePermissions";
import WarehouseStockTransferModal from "~/components/warehouse/StockTransferModal.vue";
import WarehouseCreateLocationModal from "~/components/warehouse/CreateLocationModal.vue";
import WarehouseInventoryReconciliationModal from "~/components/warehouse/InventoryReconciliationModal.vue";

const route = useRoute();
const { canViewPage, can } = usePermissions();

if (import.meta.client) {
  if (!canViewPage(route.path)) {
    navigateTo("/");
  }
}

const currentPage = ref(1);
const itemsPerPage = ref(5);

const { data, error, pending, refresh } = useFetch("/api/warehouse/dashboard", {
  lazy: true,
  query: {
    page: currentPage,
    limit: itemsPerPage,
  },
  watch: [currentPage],
});

const isError = computed(() => !!error.value || data.value?.success === false);
const errorMessage = computed(() => {
  if (error.value) return "فشل الاتصال بالخادم الداخلي. يرجى التحقق من الشبكة.";
  if (data.value?.success === false)
    return (data.value as any).error || "فشل جلب البيانات من النظام.";
  return "";
});

const kpis = computed(() =>
  data.value?.success ? (data.value as any).kpis : [],
);
const locations = computed(() => {
  return data.value?.success
    ? (data.value as any).locations.filter(
        (loc: any) =>
          loc.name !== "الشركاء" &&
          loc.name !== "المواقع الافتراضية" &&
          loc.name !== "مواقع الشركاء" &&
          loc.name !== "تسوية المخزون",
      )
    : [];
});
const movements = computed(() =>
  data.value?.success ? (data.value as any).movement : [],
); // Aligned to '.moves' key
const stockLevels = computed(() =>
  data.value?.success ? (data.value as any).stockLevels : null,
);

const openTransfer = ref(false);
const openCreateLoctaion = ref(false);
const openReconciliation = ref(false);

const toastMessage = ref("");
const toastType = ref<"success" | "error">("success");

function showToastMessage(message: string, type: "success" | "error") {
  toastMessage.value = message;
  toastType.value = type;
  setTimeout(() => (toastMessage.value = ""), 3000);
}

async function translateLocations() {
  if (!import.meta.client) return;
  try {
    const result = await $fetch("/api/warehouse/translate-locations", {
      method: "POST",
    });
    if ((result as any).translated > 0) {
      showToastMessage((result as any).message, "success");
    }
  } catch {
    // silent fail - translation is non-critical
  }
}

onMounted(async () => {
  await translateLocations();
  refresh();
});
</script>

<template>
  <div class="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" dir="rtl">
    <Transition name="fade">
      <div
        v-if="isError"
        class="bg-error-container/20 border border-error/30 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-on-error-container"
      >
        <div class="flex items-center gap-3">
          <AlertCircle class="text-error w-6 h-6" />
          <div>
            <p class="font-bold text-sm">
              عذراً، حدث خطأ أثناء تحديث بيانات المستودع
            </p>
            <p class="text-xs text-on-white-variant font-mono mt-0.5">
              {{ errorMessage }}
            </p>
          </div>
        </div>
        <button
          @click="refresh()"
          class="flex items-center gap-2 px-4 py-2 bg-error text-white font-medium text-xs rounded-lg hover:bg-error/90 active:scale-95 transition-all self-end sm:self-auto"
        >
          <RefreshCcw class="w-4 h-4" />
          إعادة المحاولة
        </button>
      </div>
    </Transition>

    <div v-if="pending && !data" class="space-y-8 animate-pulse">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          v-for="i in 4"
          :key="i"
          class="h-28 bg-white-low rounded-xl border border-outline-variant"
        ></div>
      </div>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div
          class="lg:grid-cols-1 lg:col-span-2 h-80 bg-white-low rounded-xl border border-outline-variant"
        ></div>
        <div
          class="h-80 bg-white-low rounded-xl border border-outline-variant"
        ></div>
      </div>
      <div
        class="h-96 bg-white-low rounded-xl border border-outline-variant"
      ></div>
    </div>

    <div
      v-else
      class="space-y-8 transition-opacity duration-300"
      :class="{ 'opacity-60 pointer-events-none': pending }"
    >
      <WarehouseKpiCards :kpis="kpis" />

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <WarehouseLocationsList
          :locations="locations"
          @create-location="openCreateLoctaion = true"
          @stock-transfer="openTransfer = true"
          @stock-reconciliation="openReconciliation = true"
        />

        <WarehouseRecentMovements
          :movements="movements"
          @view-all="$router.push('/stock-movements')"
        />
      </div>

      <WarehouseStockLevelsTable
        v-model:currentPage="currentPage"
        :stock-levels="stockLevels?.products || []"
        :total-records="stockLevels?.total_records || 0"
        :total-pages="stockLevels?.total_pages || 1"
        :limit="itemsPerPage"
      />

      <WarehouseCreateLocationModal
        :existing-locations="locations"
        :open="openCreateLoctaion"
        v-on:update:open="(val) => (openCreateLoctaion = val)"
        v-on:created="async () => { await translateLocations(); refresh(); }"
        @close="openCreateLoctaion = false"
      />

      <WarehouseStockTransferModal
        :existing-locations="locations"
        :open="openTransfer"
        v-on:update:open="(val) => (openTransfer = val)"
        @transfer-completed="async () => { await translateLocations(); refresh(); }"
      />

      <WarehouseInventoryReconciliationModal
        :existing-locations="locations"
        :open="openReconciliation"
        v-on:update:open="(val) => (openReconciliation = val)"
        @reconciliation-completed="async () => { await translateLocations(); refresh(); }"
      />
    </div>

    <Transition name="fade">
      <div
        v-if="toastMessage"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-999 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border border-outline-variant"
        :class="
          toastType === 'success'
            ? 'bg-on-white text-white'
            : 'bg-error text-on-error'
        "
      >
        <component
          :is="toastType === 'success' ? CheckCheck : AlertCircle"
          class="w-5 h-5 shrink-0"
        />
        <p class="font-bold text-sm">{{ toastMessage }}</p>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
