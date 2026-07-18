<script setup lang="ts">
import { ref, computed } from "vue";
import {
  Plus,
  LoaderCircle,
  CloudOff,
  CheckCheck,
  AlertCircle,
  Banknote,
  TrendingUp,
} from "@lucide/vue";
import { usePermissions } from "~/composables/usePermissions";

const route = useRoute();
const { canViewPage, can } = usePermissions();

if (import.meta.client) {
  if (!canViewPage(route.path)) {
    navigateTo('/')
  }
}

const now = new Date();
const defaultDateFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
const defaultDateTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

const showCreateModal = ref(false);
const currentPage = ref(1);
const searchQuery = ref("");
const filterCategory = ref("");
const filterState = ref("posted");
const dateFrom = ref(defaultDateFrom);
const dateTo = ref(defaultDateTo);
const showToast = ref(false);
const toastMessage = ref("");
const toastType = ref<"success" | "error">("success");

const {
  data: apiResponse,
  status,
  error,
  refresh,
  pending,
} = useFetch<any>("/api/operational-expenses", {
  query: {
    page: currentPage,
    search: searchQuery,
    category: filterCategory,
    state: filterState,
    date_from: dateFrom,
    date_to: dateTo,
  },
  watch: [currentPage, searchQuery, filterCategory, filterState, dateFrom, dateTo],
  transform: (response: any) => {
    if (!response.data) response.data = [];
    return response;
  },
});

const { data: categoriesData } = useFetch<any>("/api/operational-expenses/categories");

const expenseList = computed(() => apiResponse.value?.data || []);
const totalPages = computed(() => apiResponse.value?.totalPages || 1);
const totalItems = computed(() => apiResponse.value?.totalItems || 0);
const categories = computed(() => categoriesData.value?.data || []);

const totalAmount = computed(() =>
  expenseList.value.reduce((s: number, e: any) => s + e.amount, 0),
);

function showToastMessage(message: string, type: "success" | "error") {
  toastMessage.value = message;
  toastType.value = type;
  showToast.value = true;
  setTimeout(() => {
    showToast.value = false;
  }, 3000);
}

const stateText = (state: string) => {
  const map: Record<string, string> = { draft: "مسودة", posted: "مسجل", cancel: "ملغي" };
  return map[state] || state;
};

const stateClass = (state: string) => {
  if (state === "posted") return "bg-emerald-100 text-emerald-800";
  if (state === "draft") return "bg-slate-100 text-slate-600";
  if (state === "cancel") return "bg-red-100 text-red-800";
  return "bg-slate-100 text-slate-600";
};

// Create form
const formName = ref("");
const formAmount = ref(0);
const formCategory = ref("other");
const formDate = ref(new Date().toISOString().slice(0, 10));
const formNotes = ref("");
const submitting = ref(false);

function resetForm() {
  formName.value = "";
  formAmount.value = 0;
  formCategory.value = "other";
  formDate.value = new Date().toISOString().slice(0, 10);
  formNotes.value = "";
}

async function submitExpense() {
  if (!formName.value.trim() || formAmount.value <= 0) return;
  submitting.value = true;
  try {
    const res = await $fetch<{ success: boolean; message?: string }>(
      "/api/operational-expenses",
      {
        method: "POST",
        body: {
          name: formName.value.trim(),
          amount: formAmount.value,
          category: formCategory.value,
          date: formDate.value,
          notes: formNotes.value,
        },
      },
    );
    if (res.success) {
      showToastMessage(res.message || "تم تسجيل المصروف بنجاح", "success");
      showCreateModal.value = false;
      resetForm();
      refresh();
    } else {
      showToastMessage(res.message || "فشل تسجيل المصروف", "error");
    }
  } catch (e: any) {
    showToastMessage(e?.data?.statusMessage || e?.message || "خطأ في الاتصال بالخادم", "error");
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="space-y-8 max-w-7xl mx-auto">
    <div
      v-if="pending && expenseList.length === 0"
      class="h-[calc(100vh-200px)] flex items-center justify-center"
    >
      <div class="flex flex-col items-center gap-3 text-on-white-variant">
        <LoaderCircle class="w-8 h-8 animate-spin text-primary" />
        <span class="text-[13px]">جاري تحميل المصروفات...</span>
      </div>
    </div>

    <template v-else>
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-headline-lg font-bold text-on-white">المصروفات التشغيلية</h1>
          <p class="text-on-white-variant text-label-md">
            تسجيل مصروفات التشغيل (إيجار، كهرباء، رواتب، تسويق، ...)
          </p>
        </div>
        <div class="flex gap-2">
          <button
            v-if="can('expense.create')"
            @click="showCreateModal = true"
            class="h-11 px-4 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 flex items-center gap-2 cursor-pointer"
          >
            <Plus class="w-4 h-4" /> تسجيل مصروف
          </button>
          <button
            @click="refresh()"
            class="px-4 py-2 border border-outline-variant rounded-lg font-bold hover:bg-white-low cursor-pointer"
          >
            تحديث
          </button>
        </div>
      </div>

      <!-- Date Filter -->
      <div class="flex items-center gap-4 bg-white border border-outline-variant rounded-xl p-4">
        <span class="text-label-md text-on-white-variant">من</span>
        <input v-model="dateFrom" type="date" class="h-10 px-3 border border-outline-variant rounded-lg text-sm" />
        <span class="text-label-md text-on-white-variant">إلى</span>
        <input v-model="dateTo" type="date" class="h-10 px-3 border border-outline-variant rounded-lg text-sm" />
      </div>

      <!-- KPI Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-white border border-outline-variant rounded-xl p-6">
          <div class="flex items-center gap-3 mb-2">
            <div class="w-10 h-10 rounded-lg bg-primary-container/20 flex items-center justify-center text-primary">
              <Banknote class="w-6 h-6" />
            </div>
          </div>
          <p class="text-on-white-variant text-label-md">إجمالي المصروفات</p>
          <h3 class="text-price-display font-bold text-primary">
            {{ totalAmount.toLocaleString("en-US") }} ج.م
          </h3>
        </div>
        <div class="bg-white border border-outline-variant rounded-xl p-6">
          <div class="flex items-center gap-3 mb-2">
            <div class="w-10 h-10 rounded-lg bg-secondary-container/20 flex items-center justify-center text-secondary">
              <TrendingUp class="w-6 h-6" />
            </div>
          </div>
          <p class="text-on-white-variant text-label-md">عدد المصروفات</p>
          <h3 class="text-price-display font-bold text-secondary">{{ totalItems }}</h3>
        </div>
        <div class="bg-white border border-outline-variant rounded-xl p-6">
          <div class="flex items-center gap-3 mb-2">
            <div class="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-600">
              <Banknote class="w-6 h-6" />
            </div>
          </div>
          <p class="text-on-white-variant text-label-md">متوسط المصروف</p>
          <h3 class="text-price-display font-bold text-amber-600">
            {{ totalItems > 0 ? (totalAmount / totalItems).toLocaleString("en-US") : 0 }} ج.م
          </h3>
        </div>
      </div>

      <div
        v-if="status === 'error'"
        class="bg-error/10 border border-error text-error p-6 rounded-2xl text-center"
      >
        <CloudOff class="w-10 h-10 mb-2 inline-block" />
        <p class="font-bold">فشل الاتصال بالخادم</p>
        <button @click="refresh()" class="mt-4 px-6 py-2 bg-error text-on-error rounded-full font-bold cursor-pointer">
          إعادة المحاولة
        </button>
      </div>

      <!-- Search & Filter -->
      <div class="flex gap-4">
        <input
          v-model="searchQuery"
          class="flex-1 h-11 px-4 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white"
          placeholder="بحث..."
          type="text"
        />
        <select v-model="filterCategory" class="h-11 px-3 bg-white border border-outline-variant rounded-lg text-sm cursor-pointer min-w-[140px]">
          <option value="">جميع التصنيفات</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
        </select>
        <select v-model="filterState" class="h-11 px-3 bg-white border border-outline-variant rounded-lg text-sm cursor-pointer min-w-[120px]">
          <option value="">جميع الحالات</option>
          <option value="draft">مسودة</option>
          <option value="posted">مسجل</option>
          <option value="cancel">ملغي</option>
        </select>
      </div>

      <!-- Expenses Table -->
      <div class="bg-white border border-outline-variant rounded-xl overflow-hidden">
        <div v-if="expenseList.length === 0" class="p-12 text-center text-on-white-variant">
          <p class="font-bold">لا توجد مصروفات في هذه الفترة</p>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-right border-collapse">
            <thead class="bg-white-low text-on-white-variant">
              <tr>
                <th class="p-4 text-label-md font-bold">البيان</th>
                <th class="p-4 text-label-md font-bold">التصنيف</th>
                <th class="p-4 text-label-md font-bold">التاريخ</th>
                <th class="p-4 text-label-md font-bold">المبلغ</th>
                <th class="p-4 text-label-md font-bold">الحالة</th>
                <th class="p-4 text-label-md font-bold">ملاحظات</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant/45 text-body-md text-on-white">
              <tr v-for="exp in expenseList" :key="exp.id" class="hover:bg-primary/5 transition-colors">
                <td class="p-4 font-bold">{{ exp.name }}</td>
                <td class="p-4">
                  <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
                    {{ exp.category_label }}
                  </span>
                </td>
                <td class="p-4 text-on-white-variant">{{ exp.date }}</td>
                <td class="p-4 font-bold text-primary">{{ exp.amount.toLocaleString("en-US") }} ج.م</td>
                <td class="p-4">
                  <span class="px-2.5 py-0.5 rounded-full text-xs font-bold" :class="stateClass(exp.state)">
                    {{ stateText(exp.state) }}
                  </span>
                </td>
                <td class="p-4 text-on-white-variant">{{ exp.notes || "-" }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex justify-center gap-4">
        <button @click="currentPage--" :disabled="currentPage <= 1"
          class="px-4 py-2 border border-outline-variant rounded-lg disabled:opacity-40 cursor-pointer">السابق</button>
        <span class="flex items-center text-on-white-variant">الصفحة {{ currentPage }} من {{ totalPages }}</span>
        <button @click="currentPage++" :disabled="currentPage >= totalPages"
          class="px-4 py-2 border border-outline-variant rounded-lg disabled:opacity-40 cursor-pointer">التالي</button>
      </div>
    </template>
  </div>

  <!-- Create Modal -->
  <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    @click.self="showCreateModal = false">
    <div class="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
      <h3 class="text-headline-sm font-bold mb-4">تسجيل مصروف تشغيلي</h3>
      <div class="space-y-4">
        <div>
          <label class="block text-label-md text-on-white-variant mb-1">البيان</label>
          <input v-model="formName" type="text"
            class="w-full h-11 px-3 border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div>
          <label class="block text-label-md text-on-white-variant mb-1">التصنيف</label>
          <select v-model="formCategory"
            class="w-full h-11 px-3 border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary">
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-label-md text-on-white-variant mb-1">المبلغ</label>
          <input v-model.number="formAmount" type="number" step="0.01" min="0"
            class="w-full h-11 px-3 border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div>
          <label class="block text-label-md text-on-white-variant mb-1">التاريخ</label>
          <input v-model="formDate" type="date"
            class="w-full h-11 px-3 border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div>
          <label class="block text-label-md text-on-white-variant mb-1">ملاحظات</label>
          <textarea v-model="formNotes" rows="3"
            class="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary"></textarea>
        </div>
        <div class="flex gap-3 pt-2">
          <button @click="showCreateModal = false"
            class="flex-1 h-11 border border-outline-variant rounded-lg font-bold cursor-pointer hover:bg-white-low">إلغاء</button>
          <button @click="submitExpense" :disabled="submitting || !formName.trim() || formAmount <= 0"
            class="flex-1 h-11 bg-primary text-white rounded-lg font-bold cursor-pointer hover:bg-primary/90 disabled:opacity-40 flex items-center justify-center gap-2">
            <Plus class="w-4 h-4" /> {{ submitting ? 'جاري التسجيل...' : 'تسجيل' }}
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Toast -->
  <div class="fixed bottom-10 left-1/2 -translate-x-1/2 z-100 transition-all duration-500"
    :class="showToast ? 'translate-y-0 opacity-100' : 'translate-y-32 opacity-0 pointer-events-none'">
    <div class="px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3"
      :class="toastType === 'success' ? 'bg-on-white text-white' : 'bg-error text-on-error'">
      <component :is="toastType === 'success' ? CheckCheck : AlertCircle" class="w-5 h-5 shrink-0" />
      <p class="font-bold text-sm">{{ toastMessage }}</p>
    </div>
  </div>
</template>
