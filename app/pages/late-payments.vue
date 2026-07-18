<script setup lang="ts">
import { ref, computed } from "vue";
import {
  LoaderCircle,
  CloudOff,
  CheckCheck,
  AlertCircle,
  Banknote,
  TrendingUp,
  Clock,
} from "@lucide/vue";
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
const filterType = ref("");
const filterAging = ref("");
const showToast = ref(false);
const toastMessage = ref("");
const toastType = ref<"success" | "error">("success");

const {
  data: apiResponse,
  status,
  error,
  refresh,
  pending,
} = useFetch<any>("/api/late-payments", {
  query: {
    page: currentPage,
    search: searchQuery,
    type: filterType,
    aging_bucket: filterAging,
  },
  watch: [currentPage, searchQuery, filterType, filterAging],
  transform: (response: any) => {
    if (!response.data) response.data = [];
    return response;
  },
});

const lateList = computed(() => apiResponse.value?.data || []);
const totalPages = computed(() => apiResponse.value?.totalPages || 1);
const summary = computed(() => apiResponse.value?.summary || { total_overdue_count: 0, total_overdue_amount: 0 });

const typeText = (type: string) => {
  return type === 'bill' ? 'فاتورة مورد' : 'أمر شراء';
};

const typeClass = (type: string) => {
  return type === 'bill'
    ? 'bg-blue-100 text-blue-800'
    : 'bg-amber-100 text-amber-800';
};

const agingText = (bucket: string) => {
  const map: Record<string, string> = {
    '0-30': '0-30 يوم',
    '30-60': '30-60 يوم',
    '60-90': '60-90 يوم',
    '90+': 'أكثر من 90 يوم',
  };
  return map[bucket] || bucket;
};

const agingClass = (bucket: string) => {
  if (bucket === '0-30') return 'bg-yellow-100 text-yellow-800';
  if (bucket === '30-60') return 'bg-amber-100 text-amber-800';
  if (bucket === '60-90') return 'bg-orange-100 text-orange-800';
  if (bucket === '90+') return 'bg-red-100 text-red-800';
  return 'bg-slate-100 text-slate-600';
};

const rowClass = (days: number) => {
  if (days > 90) return 'bg-red-50';
  if (days > 60) return 'bg-orange-50';
  if (days > 30) return 'bg-amber-50';
  return '';
};

function showToastMessage(message: string, type: "success" | "error") {
  toastMessage.value = message;
  toastType.value = type;
  showToast.value = true;
  setTimeout(() => { showToast.value = false; }, 3000);
}

const payBill = async (billId: number) => {
  try {
    const res = await $fetch<{ success: boolean; message?: string }>(
      "/api/vendor-bills/payment",
      {
        method: "POST",
        body: { bill_id: billId, amount: 0, payment_date: new Date().toISOString().slice(0, 10) },
      },
    );
    if (res.success) {
      showToastMessage("تم تسجيل الدفعة بنجاح", "success");
      refresh();
    } else {
      showToastMessage(res.message || "فشل تسجيل الدفعة", "error");
    }
  } catch (e: any) {
    showToastMessage(e?.data?.statusMessage || e?.message || "خطأ في الاتصال بالخادم", "error");
  }
};
</script>

<template>
  <div class="space-y-8 max-w-7xl mx-auto">
    <div
      v-if="pending && lateList.length === 0"
      class="h-[calc(100vh-200px)] flex items-center justify-center"
    >
      <div class="flex flex-col items-center gap-3 text-on-white-variant">
        <LoaderCircle class="w-8 h-8 animate-spin text-primary" />
        <span class="text-[13px]">جاري تحميل المدفوعات المتأخرة...</span>
      </div>
    </div>

    <template v-else>
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-headline-lg font-bold text-on-white">المدفوعات المتأخرة</h1>
          <p class="text-on-white-variant text-label-md">
            متابعة الفواتير وقائمة مشترايات المتأخرة
          </p>
        </div>
        <button @click="refresh()"
          class="px-4 py-2 border border-outline-variant rounded-lg font-bold hover:bg-white-low cursor-pointer">
          تحديث
        </button>
      </div>

      <!-- Summary KPIs -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-white border border-outline-variant rounded-xl p-6">
          <div class="flex items-center gap-3 mb-2">
            <div class="w-10 h-10 rounded-lg bg-error/20 flex items-center justify-center text-error">
              <AlertCircle class="w-6 h-6" />
            </div>
          </div>
          <p class="text-on-white-variant text-label-md">إجمالي المتأخرات</p>
          <h3 class="text-price-display font-bold text-error">{{ summary.total_overdue_count || 0 }}</h3>
        </div>
        <div class="bg-white border border-outline-variant rounded-xl p-6">
          <div class="flex items-center gap-3 mb-2">
            <div class="w-10 h-10 rounded-lg bg-error/20 flex items-center justify-center text-error">
              <Banknote class="w-6 h-6" />
            </div>
          </div>
          <p class="text-on-white-variant text-label-md">القيمة المتأخرة</p>
          <h3 class="text-price-display font-bold text-error">
            {{ (summary.total_overdue_amount || 0).toLocaleString("en-US") }} ج.م
          </h3>
        </div>
        <div class="bg-white border border-outline-variant rounded-xl p-6">
          <div class="flex items-center gap-3 mb-2">
            <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <TrendingUp class="w-6 h-6" />
            </div>
          </div>
          <p class="text-on-white-variant text-label-md">فواتير / أوامر شراء</p>
          <h3 class="text-price-display font-bold text-primary">
            {{ summary.bill_count || 0 }} / {{ summary.po_count || 0 }}
          </h3>
        </div>
      </div>

      <div v-if="status === 'error'"
        class="bg-error/10 border border-error text-error p-6 rounded-2xl text-center">
        <CloudOff class="w-10 h-10 mb-2 inline-block" />
        <p class="font-bold">فشل الاتصال بالخادم</p>
        <button @click="refresh()"
          class="mt-4 px-6 py-2 bg-error text-on-error rounded-full font-bold cursor-pointer">إعادة المحاولة</button>
      </div>

      <!-- Filters -->
      <div class="flex gap-4">
        <input v-model="searchQuery"
          class="flex-1 h-11 px-4 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white"
          placeholder="بحث..." type="text" />
        <select v-model="filterType"
          class="h-11 px-3 bg-white border border-outline-variant rounded-lg text-sm cursor-pointer min-w-[140px]">
          <option value="">الكل</option>
          <option value="bill">فواتير الموردين</option>
          <option value="po">قائمة مشترايات</option>
        </select>
        <select v-model="filterAging"
          class="h-11 px-3 bg-white border border-outline-variant rounded-lg text-sm cursor-pointer min-w-[140px]">
          <option value="">جميع المدد</option>
          <option value="0-30">0-30 يوم</option>
          <option value="30-60">30-60 يوم</option>
          <option value="60-90">60-90 يوم</option>
          <option value="90+">أكثر من 90 يوم</option>
        </select>
      </div>

      <!-- Late Items Table -->
      <div class="bg-white border border-outline-variant rounded-xl overflow-hidden">
        <div v-if="lateList.length === 0" class="p-12 text-center text-on-white-variant">
          <p class="font-bold">لا توجد مدفوعات متأخرة</p>
          <p class="text-sm mt-1">كل الفواتير وقائمة مشترايات في الموعد المحدد</p>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-right border-collapse">
            <thead class="bg-white-low text-on-white-variant">
              <tr>
                <th class="p-4 text-label-md font-bold">النوع</th>
                <th class="p-4 text-label-md font-bold">المرجع</th>
                <th class="p-4 text-label-md font-bold">المورد</th>
                <th class="p-4 text-label-md font-bold">تاريخ الاستحقاق</th>
                <th class="p-4 text-label-md font-bold">أيام التأخير</th>
                <th class="p-4 text-label-md font-bold">الفترة</th>
                <th class="p-4 text-label-md font-bold">المبلغ</th>
                <th class="p-4 text-label-md font-bold">المتبقي</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-outline-variant/45 text-body-md text-on-white">
              <tr v-for="item in lateList" :key="item.type + '-' + item.id"
                class="hover:bg-primary/5 transition-colors" :class="rowClass(item.days_overdue)">
                <td class="p-4">
                  <span class="px-2.5 py-0.5 rounded-full text-xs font-bold" :class="typeClass(item.type)">
                    {{ typeText(item.type) }}
                  </span>
                </td>
                <td class="p-4 font-bold">{{ item.reference }}</td>
                <td class="p-4">{{ item.partner_id?.[1] || "-" }}</td>
                <td class="p-4 text-on-white-variant">{{ item.date_due || "-" }}</td>
                <td class="p-4">
                  <span class="flex items-center gap-1 font-bold" :class="item.days_overdue > 90 ? 'text-error' : 'text-amber-600'">
                    <Clock class="w-3 h-3" /> {{ item.days_overdue }} يوم
                  </span>
                </td>
                <td class="p-4">
                  <span class="px-2.5 py-0.5 rounded-full text-xs font-bold" :class="agingClass(item.aging_bucket)">
                    {{ agingText(item.aging_bucket) }}
                  </span>
                </td>
                <td class="p-4 font-bold">{{ item.amount_total.toLocaleString("en-US") }} ج.م</td>
                <td class="p-4 font-bold text-error">{{ item.amount_residual.toLocaleString("en-US") }} ج.م</td>
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
