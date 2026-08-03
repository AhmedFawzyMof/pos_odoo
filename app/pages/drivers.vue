<script setup lang="ts">
import { ref, computed } from "vue";
import { CloudOff, LoaderCircle } from "@lucide/vue";
import type { Driver, DriverApiResponse } from "~/types/driver";
import { usePermissions } from "~/composables/usePermissions";

const route = useRoute();
const { canViewPage } = usePermissions();

if (import.meta.client) {
  if (!canViewPage(route.path)) {
    navigateTo("/");
  }
}

const currentPage = ref(1);
const searchQuery = ref("");

const {
  data: apiResponse,
  status,
  error,
  refresh,
  pending,
} = useFetch<DriverApiResponse>("/api/drivers", {
  lazy: true,
  query: { page: currentPage, search: searchQuery },
  watch: [currentPage, searchQuery],
  transform: (response) => {
    if (!response.data) response.data = [];
    return response;
  },
});

const driversList = computed<Driver[]>(() => apiResponse.value?.data || []);
const totalPages = computed(() => apiResponse.value?.totalPages || 1);
const totalItems = computed(() => apiResponse.value?.totalItems || 0);

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++;
};

const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--;
};

const drawerOpen = ref(false);
const drawerMode = ref<"add" | "edit">("add");
const selectedDriver = ref<Driver | null>(null);
const isSaving = ref(false);
const actionError = ref("");

const openAddDriver = () => {
  drawerMode.value = "add";
  selectedDriver.value = null;
  actionError.value = "";
  drawerOpen.value = true;
};

const openEditDriver = (driver: Driver) => {
  drawerMode.value = "edit";
  selectedDriver.value = driver;
  actionError.value = "";
  drawerOpen.value = true;
};

const closeDrawer = () => {
  drawerOpen.value = false;
  actionError.value = "";
};

const saveDriver = async (payload: Record<string, any>) => {
  isSaving.value = true;
  actionError.value = "";

  try {
    const response = await $fetch<{
      success: boolean;
      id: number;
      message: string;
    }>("/api/drivers/save", { method: "POST", body: payload });

    if (response.success) {
      await refresh();
      drawerOpen.value = false;
    }
  } catch (err: any) {
    actionError.value =
      err.message || err.statusMessage || "خطأ في الاتصال بالنظام";
  } finally {
    isSaving.value = false;
  }
};
</script>

<template>
  <div class="space-y-8 max-w-7xl mx-auto">
    <div
      v-if="pending && driversList.length === 0"
      class="h-[calc(100vh-200px)] flex items-center justify-center"
    >
      <div class="flex flex-col items-center gap-3 text-on-white-variant">
        <LoaderCircle class="w-8 h-8 animate-spin text-primary" />
        <span class="text-[13px]">جاري تحميل السائقين...</span>
      </div>
    </div>

    <template v-else>
      <DriversDriverToolbar :status @add="openAddDriver" @refresh="refresh" />

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

      <DriversDriverTable
        :drivers="driversList"
        :status
        :current-page="currentPage"
        :total-pages="totalPages"
        :total-items="totalItems"
        @edit="openEditDriver"
        @next-page="nextPage"
        @prev-page="prevPage"
        @page-change="currentPage = $event"
      >
        <template #filters>
          <DriversDriverFilters v-model:searchQuery="searchQuery" />
        </template>
      </DriversDriverTable>

      <DriversDriverDrawer
        v-model:isOpen="drawerOpen"
        :mode="drawerMode"
        :driver="selectedDriver"
        :is-saving="isSaving"
        :action-error="actionError"
        @save="saveDriver"
        @update:actionError="actionError = $event"
      />
    </template>
  </div>
</template>
