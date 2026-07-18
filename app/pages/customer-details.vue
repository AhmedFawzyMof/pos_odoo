<script setup lang="ts">
import { ref, computed, watch, watchEffect } from "vue";
import { useRoute, navigateTo } from "#app";
import { Mail, Phone, RefreshCw, CloudOff } from "@lucide/vue";
import type {
  Customer,
  CustomerDetailResponse,
  CustomerOrder,
} from "~/types/customer";
import { usePermissions } from "~/composables/usePermissions";

const { canViewPage } = usePermissions();

if (import.meta.client) {
  if (!canViewPage(route.path)) {
    navigateTo('/')
  }
}

const route = useRoute();
const customerId = computed(() => route.query.id as string);

const activeTab = ref<"overview" | "orders" | "settings">("overview");
const isSaving = ref(false);
const actionError = ref("");

const {
  data: apiResponse,
  status,
  error,
  refresh,
} = useFetch<CustomerDetailResponse>("/api/customers/detail", {
  lazy: true,
  query: { id: customerId },
  watch: [customerId],
});

const customer = ref<Customer | null>(null);

watchEffect(() => {
  const data =
    (apiResponse.value as any)?.customer ?? (apiResponse.value as any)?.data;
  customer.value = data ?? null;
});

const transactions = computed<CustomerOrder[]>(
  () => customer.value?.transactions || [],
);

const stats = computed(() => {
  const txs = transactions.value;
  const totalOrders = txs.length;
  const totalSpent =
    customer.value?.totalSpent ?? txs.reduce((s, o) => s + o.amount, 0);
  const avgBasket = totalOrders > 0 ? totalSpent / totalOrders : 0;
  const lastVisit = txs.length > 0 ? txs[0]?.date : "";
  return { totalOrders, totalSpent, avgBasket, lastVisit };
});

const lastTransaction = computed(() =>
  transactions.value.length > 0 ? transactions.value[0] : null,
);

const pendingOrders = computed(() =>
  transactions.value.filter((o) => o.state !== "done" && o.state !== "cancel"),
);

const editName = ref("");
const editEmail = ref("");
const editPhone = ref("");
const editType = ref("");
const editTier = ref("");
const editCompanyName = ref("");
const editTaxId = ref("");
const editBirthDate = ref("");

const initEditForm = () => {
  if (customer.value) {
    editName.value = customer.value.name;
    editEmail.value = customer.value.email;
    editPhone.value = customer.value.phone;
    editType.value = customer.value.type;
    editTier.value = customer.value.tier;
    editCompanyName.value = customer.value.companyName;
    editTaxId.value = customer.value.taxId;
    editBirthDate.value = customer.value.birthDate;
  }
};

const saveSettings = async () => {
  if (!customer.value) return;
  isSaving.value = true;
  actionError.value = "";
  try {
    const res = await $fetch<{ success: boolean; message: string }>(
      "/api/customers/save",
      {
        method: "POST",
        body: {
          id: customer.value.id,
          name: editName.value,
          email: editEmail.value,
          phone: editPhone.value,
          type: editType.value,
          tier: editTier.value,
          companyName: editCompanyName.value,
          taxId: editTaxId.value,
          birthDate: editBirthDate.value,
        },
      },
    );
    if (res.success) {
      const saved = {
        name: editName.value,
        email: editEmail.value,
        phone: editPhone.value,
        type: editType.value,
        tier: editTier.value,
        companyName: editCompanyName.value,
        taxId: editTaxId.value,
        birthDate: editBirthDate.value,
      };
      await refresh();
      if (customer.value) {
        Object.assign(customer.value, saved);
      }
      initEditForm();
      activeTab.value = "overview";
    }
  } catch (err: any) {
    actionError.value = err.message || err.statusMessage || "خطأ في الاتصال بالنظام";
  } finally {
    isSaving.value = false;
  }
};

const accountTypes = ["فرد", "B2B"];
const tiers = ["برونزي", "فضي", "ذهبي", "بلاتيني"];

watch(
  customer,
  (val) => {
    if (val) initEditForm();
  },
  { immediate: true },
);
</script>

<template>
  <div class="space-y-8 max-w-7xl mx-auto">
    <div v-if="status === 'pending'" class="text-center py-20">
      <RefreshCw class="w-10 h-10 mx-auto animate-spin text-primary" />
      <p class="mt-4 text-on-white-variant">جاري تحميل بيانات العميل...</p>
    </div>

    <div
      v-else-if="status === 'error'"
      class="bg-error/10 border border-error text-error p-6 rounded-2xl text-center"
    >
      <CloudOff class="w-10 h-10 mb-2 inline-block" />
      <p class="font-bold">فشل تحميل بيانات العميل</p>
      <p class="text-sm opacity-80">{{ error?.message }}</p>
      <button
        @click="refresh()"
        class="mt-4 px-6 py-2 bg-error text-on-error rounded-full font-bold active:scale-95 transition-all cursor-pointer"
      >
        إعادة المحاولة
      </button>
    </div>

    <template v-else-if="customer">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div
          class="lg:col-span-2 bg-white border border-outline-variant rounded-xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-sm"
        >
          <div class="relative shrink-0">
            <div
              class="w-28 h-28 rounded-2xl bg-primary/10 overflow-hidden border-2 border-primary/20 flex items-center justify-center"
            >
              <span class="text-headline-lg font-bold text-primary">{{
                customer.name.slice(0, 2)
              }}</span>
            </div>
            <span
              class="absolute -bottom-2 -right-2 bg-primary text-white text-xs px-3 py-0.5 rounded-full font-bold shadow-md"
            >
              {{ customer.tier }}
            </span>
          </div>
          <div class="flex-1 text-center md:text-right">
            <h1 class="text-display-lg font-bold text-on-white mb-1">
              {{ customer.name }}
            </h1>
            <p class="text-body-md text-on-white-variant mb-4">
              {{ customer.addressDetails?.fullAddress || "لا يوجد عنوان" }}
            </p>
            <div class="flex flex-wrap gap-2 justify-center md:justify-start">
              <span
                v-if="customer.email"
                class="px-3.5 py-1.5 bg-white rounded-lg text-label-md text-on-white-variant flex items-center gap-2"
              >
                <Mail class="w-[14px] h-[14px]" />
                {{ customer.email }}
              </span>
              <span
                v-if="customer.phone"
                class="px-3.5 py-1.5 bg-white rounded-lg text-label-md text-on-white-variant flex items-center gap-2"
              >
                <Phone class="w-[14px] h-[14px]" />
                {{ customer.phone }}
              </span>
            </div>
          </div>
        </div>

        <div
          class="bg-primary text-white rounded-xl p-6 flex flex-col justify-between shadow-md relative overflow-hidden"
        >
          <div
            class="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-16 -translate-y-16"
          ></div>
          <div>
            <p class="text-label-md opacity-80 mb-1">رصيد نقاط الولاء الحالي</p>
            <h2 class="text-display-lg font-bold">
              {{ customer.points.toLocaleString("en-US") }}
              <span class="text-body-md opacity-70">نقطة</span>
            </h2>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          class="bg-white border border-outline-variant p-4 rounded-xl shadow-sm"
        >
          <p class="text-label-md text-on-white-variant mb-1">
            إجمالي طلبات العميل
          </p>
          <h4 class="text-headline-md font-bold text-on-white">
            {{ stats.totalOrders }} طلب
          </h4>
        </div>
        <div
          class="bg-white border border-outline-variant p-4 rounded-xl shadow-sm"
        >
          <p class="text-label-md text-on-white-variant mb-1">
            إجمالي المبيعات المحققة
          </p>
          <h4 class="text-headline-md font-bold text-primary">
            {{ stats.totalSpent.toLocaleString("en-US") }} ج.م
          </h4>
        </div>
        <div
          class="bg-white border border-outline-variant p-4 rounded-xl shadow-sm"
        >
          <p class="text-label-md text-on-white-variant mb-1">
            متوسط سلة المشتريات
          </p>
          <h4 class="text-headline-md font-bold text-on-white">
            {{ stats.avgBasket.toFixed(0) }} ج.م
          </h4>
        </div>
        <div
          class="bg-white border border-outline-variant p-4 rounded-xl shadow-sm"
        >
          <p class="text-label-md text-on-white-variant mb-1">تاريخ آخر طلب</p>
          <h4 class="text-headline-md font-bold text-on-white">
            {{
              stats.lastVisit
                ? new Date(stats.lastVisit).toLocaleDateString("ar-EG")
                : "لا يوجد"
            }}
          </h4>
        </div>
      </div>

      <div
        class="flex border-b border-outline-variant gap-6 overflow-x-auto no-scrollbar"
      >
        <button
          @click="activeTab = 'overview'"
          class="pb-4 px-2 text-label-md font-bold transition-all whitespace-nowrap cursor-pointer"
          :class="
            activeTab === 'overview'
              ? 'border-b-2 border-primary text-primary'
              : 'text-on-white-variant hover:text-primary'
          "
        >
          نظرة عامة
        </button>
        <button
          @click="activeTab = 'orders'"
          class="pb-4 px-2 text-label-md font-bold transition-all whitespace-nowrap cursor-pointer"
          :class="
            activeTab === 'orders'
              ? 'border-b-2 border-primary text-primary'
              : 'text-on-white-variant hover:text-primary'
          "
        >
          سجل فواتير العميل
          <span
            v-if="transactions.length"
            class="mr-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full"
            >{{ transactions.length }}</span
          >
        </button>
        <button
          @click="activeTab = 'settings'"
          class="pb-4 px-2 text-label-md font-bold transition-all whitespace-nowrap cursor-pointer"
          :class="
            activeTab === 'settings'
              ? 'border-b-2 border-primary text-primary'
              : 'text-on-white-variant hover:text-primary'
          "
        >
          إعدادات الملف الشخصي
        </button>
      </div>

      <div
        v-if="activeTab === 'overview'"
        class="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <div
          class="lg:col-span-2 bg-white border border-outline-variant rounded-xl p-6 shadow-sm"
        >
          <h3 class="text-headline-sm font-bold text-on-white mb-4">
            آخر معاملة
          </h3>
          <div v-if="lastTransaction" class="bg-white-low p-4 rounded-xl">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-xs text-on-white-variant font-bold mb-0.5">
                  المبلغ
                </p>
                <p class="text-body-md font-bold text-primary">
                  {{ lastTransaction.amount.toLocaleString("en-US") }} ج.م
                </p>
              </div>
              <div>
                <p class="text-xs text-on-white-variant font-bold mb-0.5">
                  التاريخ
                </p>
                <p class="text-body-md">
                  {{ lastTransaction.date || "غير معروف" }}
                </p>
              </div>
            </div>
          </div>
          <p v-else class="text-on-white-variant">لا توجد معاملات سابقة</p>

          <h3 class="text-headline-sm font-bold text-on-white mt-6 mb-4">
            الطلبات المعلقة
          </h3>
          <div v-if="pendingOrders.length" class="space-y-2">
            <div
              v-for="ord in pendingOrders"
              :key="ord.id"
              class="flex justify-between items-center p-3 bg-amber-50 border border-amber-200 rounded-lg"
            >
              <span class="font-bold">{{ ord.name }}</span>
              <span class="text-amber-700 font-bold"
                >{{ ord.amount.toLocaleString("en-US") }} ج.م</span
              >
            </div>
          </div>
          <p v-else class="text-on-white-variant">لا توجد طلبات معلقة</p>
        </div>

        <div
          class="bg-white border border-outline-variant rounded-xl p-6 shadow-sm"
        >
          <h3 class="text-headline-sm font-bold text-on-white mb-6">
            معلومات العميل
          </h3>
          <div class="space-y-4">
            <div>
              <p class="text-xs text-on-white-variant font-bold mb-0.5">
                نوع الحساب
              </p>
              <p class="text-body-md font-bold">{{ customer.type }}</p>
            </div>
            <div>
              <p class="text-xs text-on-white-variant font-bold mb-0.5">
                الرصيد النقطي
              </p>
              <p class="text-body-md font-bold text-primary">
                {{ customer.points.toLocaleString("en-US") }} نقطة
              </p>
            </div>
            <div v-if="customer.taxId">
              <p class="text-xs text-on-white-variant font-bold mb-0.5">
                الرقم الضريبي
              </p>
              <p class="text-body-md font-mono">{{ customer.taxId }}</p>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="activeTab === 'orders'"
        class="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm"
      >
        <div
          v-if="transactions.length === 0"
          class="p-12 text-center text-on-white-variant"
        >
          <p class="font-bold">لا توجد طلبات لهذا العميل</p>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-right border-collapse">
            <thead class="bg-white-low text-on-white-variant">
              <tr>
                <th class="p-4 text-label-md font-bold">
                  رقم الفاتورة / الطلب
                </th>
                <th class="p-4 text-label-md font-bold">تاريخ المعاملة</th>
                <th class="p-4 text-label-md font-bold">حالة الطلب</th>
                <th class="p-4 text-label-md font-bold">المجموع الإجمالي</th>
              </tr>
            </thead>
            <tbody
              class="divide-y divide-outline-variant/45 text-body-md text-on-white"
            >
              <tr
                v-for="ord in transactions"
                :key="ord.id"
                class="hover:bg-primary/5 transition-colors"
              >
                <td class="p-4 font-bold">{{ ord.name }}</td>
                <td class="p-4 text-on-white-variant">
                  {{ new Date(ord.date).toLocaleDateString("ar-EG") }}
                </td>
                <td class="p-4">
                  <span
                    class="px-2.5 py-0.5 rounded-full text-xs font-bold"
                    :class="
                      ord.state === 'done' ||
                      ord.state === 'paid' ||
                      ord.state === 'invoiced'
                        ? 'bg-emerald-100 text-emerald-800'
                        : ord.state === 'cancel'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                    "
                  >
                    {{
                      ord.state === "done" ||
                      ord.state === "paid" ||
                      ord.state === "invoiced"
                        ? "مكتمل"
                        : ord.state === "cancel"
                          ? "ملغي"
                          : ord.state === "draft"
                            ? "مسودة"
                            : ord.state
                    }}
                  </span>
                </td>
                <td class="p-4 font-bold text-primary">
                  {{ ord.amount.toLocaleString("en-US") }} ج.م
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div
        v-if="activeTab === 'settings'"
        class="bg-white border border-outline-variant rounded-xl p-8 max-w-2xl mx-auto shadow-sm"
      >
        <h3 class="text-headline-sm font-bold text-on-white mb-6">
          تعديل بيانات العميل الأساسية
        </h3>
        <div
          v-if="actionError"
          class="mb-4 p-3 bg-error/10 border border-error/30 text-error font-bold rounded-lg text-sm"
        >
          {{ actionError }}
        </div>
        <form @submit.prevent="saveSettings" class="space-y-6">
          <div class="space-y-2">
            <label class="block text-label-md text-on-white-variant font-bold"
              >الاسم</label
            >
            <input
              v-model="editName"
              class="w-full h-11 px-3 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none"
              type="text"
            />
          </div>

          <div class="space-y-2">
            <label class="block text-label-md text-on-white-variant font-bold"
              >البريد الإلكتروني</label
            >
            <input
              v-model="editEmail"
              class="w-full h-11 px-3 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none"
              type="email"
            />
          </div>

          <div class="space-y-2">
            <label class="block text-label-md text-on-white-variant font-bold"
              >رقم الهاتف</label
            >
            <input
              v-model="editPhone"
              class="w-full h-11 px-3 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none"
              type="text"
            />
          </div>

          <div class="space-y-2">
            <label class="block text-label-md text-on-white-variant font-bold"
              >نوع الحساب</label
            >
            <select
              v-model="editType"
              class="w-full h-11 px-3 bg-white border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none cursor-pointer"
            >
              <option v-for="t in accountTypes" :key="t" :value="t">
                {{ t }}
              </option>
            </select>
          </div>

          <div v-if="editType === 'B2B'" class="space-y-2">
            <label class="block text-label-md text-on-white-variant font-bold"
              >اسم الشركة</label
            >
            <input
              v-model="editCompanyName"
              class="w-full h-11 px-3 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none"
              type="text"
            />
          </div>

          <div v-if="editType === 'B2B'" class="space-y-2">
            <label class="block text-label-md text-on-white-variant font-bold"
              >الرقم الضريبي</label
            >
            <input
              v-model="editTaxId"
              class="w-full h-11 px-3 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none"
              type="text"
            />
          </div>

          <div class="space-y-2">
            <label class="block text-label-md text-on-white-variant font-bold"
              >تاريخ الميلاد</label
            >
            <input
              v-model="editBirthDate"
              class="w-full h-11 px-3 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none"
              type="date"
            />
          </div>

          <div class="space-y-2">
            <label class="block text-label-md text-on-white-variant font-bold"
              >مستوى العميل في برنامج الولاء</label
            >
            <select
              v-model="editTier"
              class="w-full h-11 px-3 bg-white border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none cursor-pointer"
            >
              <option v-for="t in tiers" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>

          <div class="pt-4 flex gap-4">
            <button
              type="submit"
              :disabled="isSaving"
              class="flex-1 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/95 transition-all cursor-pointer text-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw
                v-if="isSaving"
                class="w-5 h-5 inline-block animate-spin ml-1"
              />
              حفظ التعديلات
            </button>
            <button
              type="button"
              @click="
                initEditForm();
                activeTab = 'overview';
              "
              class="flex-1 py-3 border border-outline-variant text-on-white font-bold rounded-lg hover:bg-white-low transition-all cursor-pointer text-center"
            >
              إلغاء التغييرات
            </button>
          </div>
        </form>
      </div>

      <button
        @click="navigateTo('/customers')"
        class="mt-4 px-6 py-2 border border-outline-variant text-on-white font-bold rounded-lg hover:bg-white-low transition-all cursor-pointer"
      >
        العودة إلى قائمة العملاء
      </button>
    </template>
  </div>
</template>
