<script setup lang="ts">
import { ref, computed } from "vue";
import { CloudOff, LoaderCircle } from "@lucide/vue";
import type { Customer, CustomerApiResponse } from "~/types/customer";
import { usePermissions } from "~/composables/usePermissions";

const route = useRoute();
const { canViewPage } = usePermissions();

if (import.meta.client) {
  if (!canViewPage(route.path)) {
    navigateTo('/')
  }
}

const currentPage = ref(1);
const searchQuery = ref("");
const filterType = ref("الكل");
const filterTier = ref("الكل");

const {
  data: apiResponse,
  status,
  error,
  refresh,
  pending,
} = useFetch<CustomerApiResponse>("/api/customers", {
  lazy: true,
  query: { page: currentPage, search: searchQuery, type: filterType },
  watch: [currentPage, searchQuery, filterType],
  transform: (response) => {
    if (!response.data) response.data = [];
    return response;
  },
});

const customersList = computed<Customer[]>(() => apiResponse.value?.data || []);
const totalPages = computed(() => apiResponse.value?.totalPages || 1);
const totalItems = computed(() => apiResponse.value?.totalItems || 0);
const meta = computed(
  () =>
    apiResponse.value?.meta || {
      totalB2B: 0,
      activeRecent: 0,
      loyaltyCount: 0,
    },
);

const filteredCustomers = computed(() => {
  const list = customersList.value;
  if (filterTier.value === "الكل") return list;
  return list.filter((c) => c.tier === filterTier.value);
});

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++;
};

const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--;
};

const drawerOpen = ref(false);
const drawerMode = ref<"view" | "add" | "edit">("view");
const selectedCustomer = ref<Customer | null>(null);
const isSaving = ref(false);
const actionError = ref("");

const openAddCustomer = () => {
  drawerMode.value = "add";
  selectedCustomer.value = null;
  actionError.value = "";
  drawerOpen.value = true;
};

const openEditCustomer = (cust: Customer) => {
  drawerMode.value = "edit";
  selectedCustomer.value = cust;
  actionError.value = "";
  drawerOpen.value = true;
};

const closeDrawer = () => {
  drawerOpen.value = false;
  actionError.value = "";
};

const saveCustomer = async (payload: Record<string, any>) => {
  isSaving.value = true;
  actionError.value = "";

  try {
    const response = await $fetch<{
      success: boolean;
      id: number;
      message: string;
    }>("/api/customers/save", { method: "POST", body: payload });

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
</script>

<template>
  <div class="space-y-8 max-w-7xl mx-auto">
    <div
      v-if="pending && customersList.length === 0"
      class="h-[calc(100vh-200px)] flex items-center justify-center"
    >
      <div class="flex flex-col items-center gap-3 text-on-white-variant">
        <LoaderCircle class="w-8 h-8 animate-spin text-primary" />
        <span class="text-[13px]">جاري تحميل العملاء...</span>
      </div>
    </div>

    <template v-else>
      <CustomersCustomerToolbar
        :status
        @add="openAddCustomer"
        @refresh="refresh"
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
          class="mt-4 px-6 py-2 bg-error text-on-error rounded-full font-bold active:scale-95 transition-all cursor-pointer"
        >
          إعادة المحاولة
        </button>
      </div>

      <CustomersCustomerKpiCards :total-items="totalItems" :meta="meta" />

      <CustomersTable
        :customers="filteredCustomers"
        :status="status"
        :current-page="currentPage"
        :total-pages="totalPages"
        :total-items="totalItems"
        @edit="openEditCustomer"
        @next-page="nextPage"
        @prev-page="prevPage"
        @page-change="currentPage = $event"
      >
        <template #filters>
          <CustomersCustomerFilters
            v-model:searchQuery="searchQuery"
            v-model:filterType="filterType"
            v-model:filterTier="filterTier"
          />
        </template>
      </CustomersTable>

      <CustomersCustomerDrawer
        v-model:isOpen="drawerOpen"
        :mode="drawerMode"
        :customer="selectedCustomer"
        :is-saving="isSaving"
        :action-error="actionError"
        @save="saveCustomer"
        @update:actionError="actionError = $event"
      />
    </template>
  </div>
</template>
