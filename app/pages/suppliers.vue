<script setup lang="ts">
import { ref, computed } from "vue";
import { CloudOff, LoaderCircle, Search } from "@lucide/vue";
import type { Supplier, SupplierApiResponse } from "~/types/supplier";
import { usePermissions } from "~/composables/usePermissions";

const route = useRoute();
const { canViewPage, can } = usePermissions();

if (import.meta.client) {
  if (!canViewPage(route.path)) {
    navigateTo('/')
  }
}

const currentPage = ref(1);
const searchQuery = ref("");
const filterStatus = ref("all");

const {
  data: apiResponse,
  status,
  error,
  refresh,
  pending,
} = useFetch<SupplierApiResponse>("/api/suppliers", {
  lazy: true,
  query: { page: currentPage, search: searchQuery, status: filterStatus },
  watch: [currentPage, searchQuery, filterStatus],
  transform: (response) => {
    if (!response.data) response.data = [];
    return response;
  },
});

const suppliersList = computed<Supplier[]>(() => apiResponse.value?.data || []);
const totalPages = computed(() => apiResponse.value?.totalPages || 1);
const totalItems = computed(() => apiResponse.value?.totalItems || 0);
const totalPurchased = computed(() =>
  suppliersList.value.reduce((s, c) => s + c.total_purchased, 0),
);
const outstanding = computed(() =>
  suppliersList.value.reduce((s, c) => s + c.outstanding, 0),
);
const overdue = computed(() =>
  suppliersList.value.reduce((s, c) => s + c.overdue, 0),
);

const drawerOpen = ref(false);
const drawerMode = ref<"add" | "edit">("add");
const selectedSupplier = ref<Supplier | null>(null);
const isSaving = ref(false);
const actionError = ref("");

const openAddSupplier = () => {
  drawerMode.value = "add";
  selectedSupplier.value = null;
  actionError.value = "";
  drawerOpen.value = true;
};

const openEditSupplier = (supplier: Supplier) => {
  drawerMode.value = "edit";
  selectedSupplier.value = supplier;
  actionError.value = "";
  drawerOpen.value = true;
};

const closeDrawer = () => {
  drawerOpen.value = false;
  actionError.value = "";
};

const saveSupplier = async (payload: Record<string, any>) => {
  isSaving.value = true;
  actionError.value = "";
  try {
    const response = await $fetch<{
      success: boolean;
      id: number;
      message: string;
    }>("/api/suppliers/save", { method: "POST", body: payload });
    if (response.success) {
      await refresh();
      drawerOpen.value = false;
    }
  } catch (err: any) {
    actionError.value = err.message || err.statusMessage || "خطأ في الاتصال بالنظام";
  } finally {
    isSaving.value = false;
  }
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++;
};
const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--;
};
</script>

<template>
  <div class="space-y-8 max-w-7xl mx-auto">
    <div
      v-if="pending && suppliersList.length === 0"
      class="h-[calc(100vh-200px)] flex items-center justify-center"
    >
      <div class="flex flex-col items-center gap-3 text-on-white-variant">
        <LoaderCircle class="w-8 h-8 animate-spin text-primary" />
        <span class="text-[13px]">جاري تحميل الموردين...</span>
      </div>
    </div>

    <template v-else>
      <SuppliersSupplierToolbar
        :status="status"
        @add="openAddSupplier"
        @refresh="refresh()"
      />

      <div
        v-if="status === 'error'"
        class="bg-error/10 border border-error text-error p-6 rounded-2xl text-center"
      >
        <CloudOff class="w-10 h-10 mb-2 inline-block" />
        <p class="font-bold">فشل الاتصال بالخادم</p>
        <p class="text-sm opacity-80">{{ error?.message }}</p>
        <button
          @click="refresh()"
          class="mt-4 px-6 py-2 bg-error text-on-error rounded-full font-bold cursor-pointer"
        >
          إعادة المحاولة
        </button>
      </div>

      <div class="relative w-full">
        <Search
          class="absolute right-4 top-1/2 -translate-y-1/2 text-on-white-variant w-5 h-5"
        />
        <input
          v-model="searchQuery"
          class="w-full h-12 pr-12 pl-4 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white"
          placeholder="بحث بالاسم أو رقم الهاتف أو البريد..."
          type="text"
        />
      </div>

      <SuppliersSupplierKpiCards
        :total-items="totalItems"
        :total-purchased="totalPurchased"
        :outstanding="outstanding"
        :overdue="overdue"
      />

      <SuppliersTable
        :suppliers="suppliersList"
        :status="status"
        :current-page="currentPage"
        :total-pages="totalPages"
        @edit="openEditSupplier"
        @next-page="nextPage"
        @prev-page="prevPage"
      />

      <SuppliersSupplierDrawer
        :is-open="drawerOpen"
        :mode="drawerMode"
        :supplier="selectedSupplier"
        :is-saving="isSaving"
        :action-error="actionError"
        @update:is-open="drawerOpen = $event"
        @update:action-error="actionError = $event"
        @save="saveSupplier"
      />
    </template>
  </div>
</template>
