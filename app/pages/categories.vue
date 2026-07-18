<script setup lang="ts">
import { ref, computed } from "vue";
import {
  Search,
  RefreshCw,
  Plus,
  CloudOff,
  Folder,
  Package,
  Gauge,
  LoaderCircle,
} from "@lucide/vue";
import CategoriesTable from "~/components/categories/CategoriesTable.vue";
import CategoryDrawer from "~/components/categories/CategoryDrawer.vue";
import { usePermissions } from "~/composables/usePermissions";

const route = useRoute();
const { can, canViewPage } = usePermissions();

if (import.meta.client) {
  if (!canViewPage(route.path)) {
    navigateTo('/')
  }
}

interface Category {
  id?: number;
  name: string;
  parent_id?: { id: number; name: string } | null;
  sequence?: number;
  image?: string | null;
  productsCount?: number;
  status?: string;
}

const currentPage = ref(1);
const searchQuery = ref("");

const {
  data: apiResponse,
  status,
  error,
  refresh,
  pending,
} = useFetch<{
  success: boolean;
  totalItems: number;
  totalProducts: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
  data: Category[];
}>("/api/pos/categories", {
  lazy: true,
  query: { page: currentPage, search: searchQuery },
  watch: [currentPage, searchQuery],
  transform: (response) => {
    if (!response.data) response.data = [];
    return response;
  },
});

const categories = computed<Category[]>(() => apiResponse.value?.data || []);
const totalPages = computed(() => apiResponse.value?.totalPages || 1);
const totalItems = computed(() => apiResponse.value?.totalItems || 0);
const totalProducts = computed(() => apiResponse.value?.totalProducts || 0);

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++;
};

const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--;
};

// Drawer System Management
const drawerOpen = ref(false);
const drawerMode = ref<"add" | "edit">("add");
const selectedCategory = ref<Category | null>(null);
const isSaving = ref(false);

const openAddDrawer = () => {
  drawerMode.value = "add";
  selectedCategory.value = null;
  drawerOpen.value = true;
};

const handleEdit = (category: Category) => {
  drawerMode.value = "edit";
  selectedCategory.value = category;
  drawerOpen.value = true;
};

const handleDelete = async (category: Category) => {
  const targetCategory = category;
  if (!targetCategory || !targetCategory.id) {
    alert("لم يتم العثور على معرّف هذا القسم بالنظام");
    return;
  }

  if (
    confirm(
      `⚠️ تحذير: هل أنت متأكد من رغبتك في حذف قسم "${targetCategory.name}" نهائياً من النظام؟ لا يمكن التراجع عن هذه الخطوة.`,
    )
  ) {
    try {
      isSaving.value = true;

      const response = await $fetch<{ success: boolean; message: string }>(
        "/api/pos/categories/delete",
        {
          method: "DELETE",
          body: { id: targetCategory.id },
        },
      );

      if (response.success) {
        await refresh();
        drawerOpen.value = false;
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || err.statusMessage || "خطأ في الاتصال بالنظام، لم يتم حذف القسم.");
    } finally {
      isSaving.value = false;
    }
  }
};

const handleSave = async (payload: {
  id?: number;
  name: string;
  sequence: number;
  parent_id: number | null;
  image: string | null;
}) => {
  isSaving.value = true;

  try {
    const response = await $fetch<{
      success: boolean;
      message: string;
      id: number;
    }>("/api/pos/categories/save", {
      method: "POST",
      body: payload,
    });

    if (response.success) {
      await refresh();
      drawerOpen.value = false;
    }
  } catch (err: any) {
    console.error("Failed to save POS Category:", err);
    alert(err.message || err.statusMessage || "خطأ في حفظ القسم بالنظام.");
  } finally {
    isSaving.value = false;
  }
};

const handleDeleteFromDrawer = async () => {
  if (selectedCategory.value) {
    await handleDelete(selectedCategory.value);
  }
};
</script>

<template>
  <div class="space-y-6 max-w-7xl mx-auto">
    <div
      class="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-white p-4 rounded-xl border border-outline-variant shadow-sm"
    >
      <div class="relative flex-1 max-w-md">
        <Search
          class="absolute right-3 top-1/2 -translate-y-1/2 text-on-white-variant w-5 h-5"
        />
        <input
          v-model="searchQuery"
          class="w-full h-11 pr-10 pl-4 bg-white rounded-full border-none focus:ring-2 focus:ring-primary text-label-md outline-none"
          placeholder="بحث بالاسم..."
          type="text"
        />
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="refresh()"
          class="p-2.5 rounded-full border border-outline-variant hover:bg-white transition-all active:scale-95 text-on-white-variant cursor-pointer flex items-center justify-center"
          title="تحديث البيانات"
        >
          <RefreshCw
            :class="{ 'animate-spin': status === 'pending' }"
            class="w-5 h-5"
          />
        </button>
        <button
          v-if="can('category.create')"
          @click="openAddDrawer"
          class="text-white flex items-center justify-center gap-2 bg-primary text-white px-6 py-2.5 rounded-full font-bold hover:bg-primary/95 transition-all active:scale-95 cursor-pointer shadow-sm"
        >
          <Plus class="w-5 h-5" />
          إضافة قسم جديد
        </button>
      </div>
    </div>

    <!-- Loading spinner -->
    <div
      v-if="pending && categories.length === 0"
      class="h-[calc(100vh-200px)] flex items-center justify-center"
    >
      <div class="flex flex-col items-center gap-3 text-on-white-variant">
        <LoaderCircle class="w-8 h-8 animate-spin text-primary" />
        <span class="text-[13px]">جاري تحميل الأقسام...</span>
      </div>
    </div>

    <template v-else>
      <div
        v-if="status === 'error'"
        class="bg-error/10 border border-error text-error p-6 rounded-2xl text-center"
      >
        <CloudOff class="w-10 h-10 mb-2 inline-block" />
        <p class="font-bold">فشل الاتصال بخادم</p>
        <p class="text-sm opacity-80">{{ error?.message }}</p>
      </div>

      <CategoriesTable
        v-else
        :categories="categories"
        :status="status"
        :all-categories-count="totalItems"
        :current-page="currentPage"
        :total-pages="totalPages"
        @edit="handleEdit"
        @delete="handleDelete"
        @next-page="nextPage"
        @prev-page="prevPage"
      />

      <CategoryDrawer
        v-model:isOpen="drawerOpen"
        :mode="drawerMode"
        :category="selectedCategory"
        :is-saving="isSaving"
        @save="handleSave"
        @delete="handleDeleteFromDrawer"
      />

      <!-- Analytics Section -->
      <div
        class="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-outline-variant"
      >
        <!-- Total Categories Card -->
        <div
          class="bg-white-low p-6 rounded-2xl border border-outline-variant flex items-center gap-6 shadow-sm"
        >
          <div
            class="w-14 h-14 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container"
          >
            <Folder class="w-7 h-7" />
          </div>
          <div>
            <p class="text-label-md text-on-white-variant">إجمالي الأقسام</p>
            <h4 class="text-display-lg font-bold text-on-white">
              {{ totalItems }}
            </h4>
          </div>
        </div>
        <!-- Total Products Card -->
        <div
          class="bg-white-low p-6 rounded-2xl border border-outline-variant flex items-center gap-6 shadow-sm"
        >
          <div
            class="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center text-white-container"
          >
            <Package class="w-7 h-7" />
          </div>
          <div>
            <p class="text-label-md text-on-white-variant">
              إجمالي المنتجات المدرجة
            </p>
            <h4 class="text-display-lg font-bold text-on-white">
              {{ totalProducts }}
            </h4>
          </div>
        </div>
        <!-- Shelf Efficiency Card -->
        <div
          class="bg-white-low p-6 rounded-2xl border border-outline-variant flex items-center gap-6 shadow-sm"
        >
          <div
            class="w-14 h-14 rounded-full bg-tertiary-container flex items-center justify-center text-on-tertiary-container"
          >
            <Gauge class="w-7 h-7" />
          </div>
          <div>
            <p class="text-label-md text-on-white-variant">
              كفاءة مساحات العرض
            </p>
            <h4 class="text-display-lg font-bold text-on-white">94%</h4>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
