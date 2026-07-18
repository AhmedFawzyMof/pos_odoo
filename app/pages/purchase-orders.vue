<script setup lang="ts">
import { ref, computed } from "vue";
import {
  CloudOff,
  LoaderCircle,
  Plus,
  CheckCheck,
  AlertCircle,
  Printer,
} from "@lucide/vue";
import type {
  PurchaseOrder,
  PurchaseOrderApiResponse,
  POLine,
} from "~/types/purchaseOrder";
import CreatePurchaseOrderModal from "~/components/purchase/CreatePurchaseOrderModal.vue";
import EditPurchaseOrderModal from "~/components/purchase/EditPurchaseOrderModal.vue";
import ReceivePurchaseOrderModal from "~/components/purchase/ReceivePurchaseOrderModal.vue";
import { usePermissions } from "~/composables/usePermissions";

const route = useRoute();
const { canViewPage, can, isPurchaseUser, isStockUser } = usePermissions();

if (import.meta.client) {
  if (!canViewPage(route.path)) {
    navigateTo("/");
  }
}

const showCreateModal = ref(false);
const showEditModal = ref(false);
const showReceiveModal = ref(false);
const editingPO = ref<PurchaseOrder | null>(null);
const receivingPO = ref<PurchaseOrder | null>(null);
const receivingPOIds = ref(new Set<number>());

const currentPage = ref(1);
const searchQuery = ref("");
const filterState = ref("");
const showToast = ref(false);
const toastMessage = ref("");
const toastType = ref<"success" | "error">("success");

const {
  data: apiResponse,
  status,
  error,
  refresh,
  pending,
} = useFetch<PurchaseOrderApiResponse>("/api/purchase-orders", {
  lazy: true,
  query: { page: currentPage, search: searchQuery, state: filterState },
  watch: [currentPage, searchQuery, filterState],
  transform: (response: any) => {
    if (!response.data) response.data = [];
    return response;
  },
});

const poList = computed<PurchaseOrder[]>(() => apiResponse.value?.data || []);
const totalPages = computed(() => apiResponse.value?.totalPages || 1);
const totalItems = computed(() => apiResponse.value?.totalItems || 0);

function showToastMessage(message: string, type: "success" | "error") {
  toastMessage.value = message;
  toastType.value = type;
  showToast.value = true;
  setTimeout(() => {
    showToast.value = false;
  }, 3000);
}

const confirmPO = async (poId: number) => {
  try {
    const res = await $fetch<{ success: boolean; message?: string }>(
      "/api/purchase-orders/confirm",
      { method: "POST", body: { po_id: poId } },
    );
    if (res.success) {
      showToastMessage("تم تأكيد أمر الشراء بنجاح", "success");
      await refresh();
    } else {
      showToastMessage(res.message || "فشل تأكيد أمر الشراء", "error");
    }
  } catch (e: any) {
    showToastMessage(
      e?.data?.statusMessage ||
        e?.statusMessage ||
        e?.message ||
        "خطأ في الاتصال بالخادم",
      "error",
    );
  }
};

const receivePO = async (poId: number) => {
  const po = poList.value.find((p) => p.id === poId);
  if (!po) return;
  receivingPOIds.value = new Set([...receivingPOIds.value, poId]);
  receivingPO.value = po;
  showReceiveModal.value = true;
};

const handleReceive = async (data: { po_id: number; lines: any[] }) => {
  try {
    const res = await $fetch<{ success: boolean; message?: string }>(
      "/api/purchase-orders/receive",
      { method: "POST", body: data },
    );
    if (res.success) {
      showToastMessage("تم استلام المنتجات بنجاح", "success");
      showReceiveModal.value = false;
      receivingPO.value = null;
      await refresh();
    } else {
      showToastMessage(res.message || "فشل استلام المنتجات", "error");
      showReceiveModal.value = false;
      receivingPO.value = null;
    }
  } catch (e: any) {
    showToastMessage(
      e?.data?.statusMessage ||
        e?.statusMessage ||
        e?.message ||
        "خطأ في الاتصال بالخادم",
      "error",
    );
    showReceiveModal.value = false;
    receivingPO.value = null;
  } finally {
    receivingPOIds.value = new Set([...receivingPOIds.value].filter((id) => id !== data.po_id));
  }
};

const reverseReceive = async (poId: number) => {
  if (!confirm("هل أنت متأكد من عكس استلام هذا الأمر؟ سيتم إرجاع المنتجات إلى المخزون."))
    return;
  try {
    const res = await $fetch<{ success: boolean; message?: string; bill_warning?: string }>(
      "/api/purchase-orders/reverse-receive",
      { method: "POST", body: { po_id: poId } },
    );
    if (res.success) {
      showToastMessage(res.message || "تم عكس الاستلام بنجاح", "success");
      if (res.bill_warning) {
        setTimeout(() => showToastMessage(res.bill_warning!, "error"), 600);
      }
      await refresh();
    } else {
      showToastMessage(res.message || "فشل عكس الاستلام", "error");
    }
  } catch (e: any) {
    showToastMessage(
      e?.data?.statusMessage ||
        e?.statusMessage ||
        e?.message ||
        "خطأ في الاتصال بالخادم",
      "error",
    );
  }
};

const createBill = async (poId: number) => {
  try {
    const res = await $fetch<{ success: boolean; message?: string }>(
      "/api/purchase-orders/create-bill",
      { method: "POST", body: { po_id: poId } },
    );
    if (res.success) {
      showToastMessage(
        res.message || "تم إنشاء فاتورة المورد بنجاح",
        "success",
      );
      refresh();
    } else {
      showToastMessage(res.message || "فشل إنشاء الفاتورة", "error");
    }
  } catch (e: any) {
    showToastMessage(
      e?.data?.statusMessage ||
        e?.statusMessage ||
        e?.message ||
        "خطأ في الاتصال بالخادم",
      "error",
    );
  }
};

const canEdit = computed(() => can.value("purchase.create"));

const openEdit = (po: PurchaseOrder) => {
  editingPO.value = po;
  showEditModal.value = true;
};

const handleEditSaved = async (updated: Partial<PurchaseOrder> & { id: number }) => {
  if (!apiResponse.value?.data) return;
  const idx = apiResponse.value.data.findIndex((p) => p.id === updated.id);
  if (idx !== -1) {
    const apiData: any = {
      ...apiResponse.value.data[idx],
      ...updated,
    };
    apiResponse.value.data[idx] = apiData;
  }
  await refresh();
  showToastMessage("تم حفظ التعديلات بنجاح", "success");
};

const receiptStatusText = (status: string) => {
  if (status === "done") return "مكتمل";
  if (status === "partial") return "جزئي";
  return "معلق";
};

const receiptStatusClass = (status: string) => {
  if (status === "done") return "bg-emerald-100 text-emerald-800";
  if (status === "partial") return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-600";
};

const stateText = (state: string) => {
  const map: Record<string, string> = {
    draft: "مسودة",
    sent: "مرسل",
    purchase: "مؤكد",
    done: "مكتمل",
    cancel: "ملغي",
  };
  return map[state] || state;
};

const stateClass = (state: string) => {
  if (state === "purchase" || state === "done")
    return "bg-primary/10 text-primary";
  if (state === "draft") return "bg-slate-100 text-slate-600";
  if (state === "sent") return "bg-blue-100 text-blue-800";
  if (state === "cancel") return "bg-red-100 text-red-800";
  return "bg-slate-100 text-slate-600";
};

function formatDate(d: string): string {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function buildPOReceiptHtml(params: {
  name: string;
  dateOrder: string;
  partnerName: string;
  partnerRef: string;
  state: string;
  notes: string;
  lines: POLine[];
  amountUntaxed: number;
  amountTotal: number;
  currency: string;
}): string {
  const {
    name,
    dateOrder,
    partnerName,
    partnerRef,
    state,
    notes,
    lines,
    amountUntaxed,
    amountTotal,
    currency,
  } = params;

  const stateLabels: Record<string, string> = {
    draft: "مسودة",
    sent: "مرسل",
    purchase: "مؤكد",
    done: "مكتمل",
    cancel: "ملغي",
  };

  const linesHtml = lines
    .map(
      (line, i) => `
        <tr>
          <td style="text-align:center;padding:6px 4px;border-bottom:1px solid #e2e8f0;">${i + 1}</td>
          <td style="text-align:right;padding:6px 4px;border-bottom:1px solid #e2e8f0;">${line.product_id?.[1] || line.name}</td>
          <td style="text-align:center;padding:6px 4px;border-bottom:1px solid #e2e8f0;">${line.product_qty}</td>
          <td style="text-align:center;padding:6px 4px;border-bottom:1px solid #e2e8f0;">${line.qty_received}</td>
          <td style="text-align:left;padding:6px 4px;border-bottom:1px solid #e2e8f0;">${line.price_unit.toFixed(2)}</td>
          <td style="text-align:left;padding:6px 4px;border-bottom:1px solid #e2e8f0;">${line.price_subtotal.toFixed(2)}</td>
        </tr>`,
    )
    .join("");

  const stateLabel = stateLabels[state] || state;
  const dateStr = formatDate(dateOrder);

  return `
<!DOCTYPE html>
<html dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>أمر شراء - ${name}</title>
  <style>
    @page { margin: 15mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: "Arial", sans-serif;
      font-size: 13px;
      color: #1e293b;
      background: #fff;
      max-width: 210mm;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
    }
    .no-print { display: block; }
    @media print {
      .no-print { display: none !important; }
      body { max-width: 100%; padding: 5mm; }
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #1e293b;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .header h1 { font-size: 20px; color: #1e293b; margin-bottom: 4px; }
    .title {
      text-align: center;
      font-size: 18px;
      font-weight: bold;
      color: #1e40af;
      margin: 12px 0;
    }
    .info-grid {
      display: flex;
      justify-content: space-between;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 14px;
    }
    .info-grid .col { display: flex; flex-direction: column; gap: 4px; }
    .info-grid .col .lbl { font-size: 11px; color: #64748b; }
    .info-grid .col .val { font-weight: bold; color: #0f172a; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
    }
    th {
      background: #1e40af;
      color: #fff;
      padding: 8px 4px;
      font-size: 12px;
      font-weight: bold;
    }
    td { padding: 6px 4px; }
    tr:nth-child(even) { background: #f8fafc; }
    .totals {
      width: 300px;
      margin-right: auto;
      border-collapse: collapse;
    }
    .totals td {
      padding: 6px 8px;
      border-bottom: 1px solid #e2e8f0;
    }
    .totals .grand-total td {
      font-weight: bold;
      font-size: 15px;
      color: #1e40af;
      border-top: 2px solid #1e40af;
      border-bottom: none;
    }
    .notes {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 8px;
      padding: 10px 14px;
      margin-top: 14px;
      font-size: 12px;
      color: #92400e;
    }
    .footer {
      text-align: center;
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="no-print" style="text-align:center;padding:20px 0;">
    <button onclick="window.print()" style="padding:12px 40px;font-size:14px;font-weight:bold;background:#059669;color:white;border:none;border-radius:8px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.15);">
      🖨️ طباعة
    </button>
    <p style="margin-top:10px;font-size:12px;color:#888;">أو استخدم Ctrl+P للطباعة</p>
  </div>

  <div class="header">
    <h1>أمر شراء</h1>
  </div>

  <div class="info-grid">
    <div class="col">
      <span class="lbl">رقم الأمر</span>
      <span class="val">${name}</span>
    </div>
    <div class="col">
      <span class="lbl">التاريخ</span>
      <span class="val">${dateStr}</span>
    </div>
    <div class="col">
      <span class="lbl">المورد</span>
      <span class="val">${partnerName}</span>
    </div>
    ${partnerRef ? `<div class="col">
      <span class="lbl">مرجع المورد</span>
      <span class="val">${partnerRef}</span>
    </div>` : ""}
    <div class="col">
      <span class="lbl">الحالة</span>
      <span class="val">${stateLabel}</span>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:40px;">#</th>
        <th style="text-align:right;">المنتج</th>
        <th style="width:70px;">الكمية</th>
        <th style="width:70px;">المستلم</th>
        <th style="width:90px;">سعر الوحدة</th>
        <th style="width:100px;">الإجمالي</th>
      </tr>
    </thead>
    <tbody>
      ${linesHtml}
    </tbody>
  </table>

  <table class="totals">
    <tr>
      <td style="text-align:right;">المجموع</td>
      <td style="text-align:left;">${amountUntaxed.toFixed(2)} ${currency}</td>
    </tr>
    <tr class="grand-total">
      <td style="text-align:right;">الإجمالي</td>
      <td style="text-align:left;">${amountTotal.toFixed(2)} ${currency}</td>
    </tr>
  </table>

  ${notes ? `<div class="notes"><strong>ملاحظات:</strong> ${notes}</div>` : ""}

  <div class="footer">
    <div>${name}</div>
  </div>
</body>
</html>`;
}

const printPurchaseOrder = async (po: PurchaseOrder) => {
  try {
    const res = await $fetch<any>("/api/purchase-orders/detail", {
      query: { id: po.id },
    });
    if (!res?.success || !res?.data) return;

    const d = res.data;
    const lines: POLine[] = d.lines || [];
    const partnerName = d.partner_id?.[1] || "-";

    const html = buildPOReceiptHtml({
      name: d.name,
      dateOrder: d.date_order,
      partnerName,
      partnerRef: d.partner_ref || "",
      state: d.state,
      notes: d.notes || "",
      lines,
      amountUntaxed: d.amount_untaxed || 0,
      amountTotal: d.amount_total || 0,
      currency: d.currency_id?.[1] || "ج.م",
    });

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.top = "-9999px";
    iframe.style.left = "-9999px";
    iframe.style.width = "1px";
    iframe.style.height = "1px";
    iframe.style.opacity = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    doc.write(html);
    doc.close();

    const win = iframe.contentWindow;
    if (!win) return;
    win.focus();
    win.print();
    win.onafterprint = () => {
      document.body.removeChild(iframe);
    };
  } catch {
    // silently fail
  }
};
</script>

<template>
  <div class="space-y-8 max-w-7xl mx-auto">
    <div
      v-if="pending && poList.length === 0"
      class="h-[calc(100vh-200px)] flex items-center justify-center"
    >
      <div class="flex flex-col items-center gap-3 text-on-white-variant">
        <LoaderCircle class="w-8 h-8 animate-spin text-primary" />
        <span class="text-[13px]">جاري تحميل قائمة مشترايات...</span>
      </div>
    </div>

    <template v-else>
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-headline-lg font-bold text-on-white">
            قائمة مشترايات
          </h1>
          <p class="text-on-white-variant text-label-md">
            إدارة قائمة مشترايات واستلام المخزون من الموردين
          </p>
        </div>
        <div class="flex gap-2">
          <button
            v-if="can('purchase.create')"
            @click="showCreateModal = true"
            class="h-11 px-4 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 flex items-center gap-2 cursor-pointer"
          >
            <Plus class="w-4 h-4" /> إنشاء فتورة شراء
          </button>
          <select
            v-model="filterState"
            class="h-11 px-3 bg-white border border-outline-variant rounded-lg text-sm cursor-pointer"
          >
            <option value="">جميع الحالات</option>
            <option value="draft">مسودة</option>
            <option value="sent">مرسل</option>
            <option value="purchase">مؤكد</option>
            <option value="done">مكتمل</option>
          </select>
          <button
            @click="refresh()"
            class="px-4 py-2 border border-outline-variant rounded-lg font-bold hover:bg-white-low cursor-pointer"
          >
            تحديث
          </button>
        </div>
      </div>

      <div
        v-if="status === 'error'"
        class="bg-error/10 border border-error text-error p-6 rounded-2xl text-center"
      >
        <CloudOff class="w-10 h-10 mb-2 inline-block" />
        <p class="font-bold">فشل الاتصال بالخادم</p>
        <button
          @click="refresh()"
          class="mt-4 px-6 py-2 bg-error text-on-error rounded-full font-bold cursor-pointer"
        >
          إعادة المحاولة
        </button>
      </div>

      <input
        v-model="searchQuery"
        class="w-full h-11 px-4 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary outline-none bg-white"
        placeholder="بحث برقم الأمر أو اسم المورد..."
        type="text"
      />

      <div
        class="bg-white border border-outline-variant rounded-xl overflow-hidden"
      >
        <div
          v-if="poList.length === 0"
          class="p-12 text-center text-on-white-variant"
        >
          <p class="font-bold">لا توجد أوامر شراء</p>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-right border-collapse">
            <thead class="bg-white-low text-on-white-variant">
              <tr>
                <th class="p-4 text-label-md font-bold">رقم الأمر</th>
                <th class="p-4 text-label-md font-bold">المورد</th>
                <th class="p-4 text-label-md font-bold">التاريخ</th>
                <th class="p-4 text-label-md font-bold">الحالة</th>
                <th class="p-4 text-label-md font-bold">حالة الاستلام</th>
                <th class="p-4 text-label-md font-bold">الإجمالي</th>
                <th class="p-4 text-label-md font-bold">الإجراءات</th>
              </tr>
            </thead>
            <tbody
              class="divide-y divide-outline-variant/45 text-body-md text-on-white"
            >
              <tr
                v-for="po in poList"
                :key="po.id"
                @click="canEdit ? openEdit(po) : undefined"
                class="hover:bg-primary/5 transition-colors"
                :class="canEdit ? 'cursor-pointer' : ''"
              >
                <td class="p-4 font-bold">{{ po.name }}</td>
                <td class="p-4">
                  {{ po.partner_id ? po.partner_id[1] : "-" }}
                </td>
                <td class="p-4 text-on-white-variant">{{ po.date_order }}</td>
                <td class="p-4">
                  <span
                    class="px-2.5 py-0.5 rounded-full text-xs font-bold"
                    :class="stateClass(po.state)"
                  >
                    {{ stateText(po.state) }}
                  </span>
                </td>
                <td class="p-4">
                  <span
                    class="px-2.5 py-0.5 rounded-full text-xs font-bold"
                    :class="receiptStatusClass(po.receipt_status)"
                  >
                    {{ receiptStatusText(po.receipt_status) }}
                  </span>
                </td>
                <td class="p-4 font-bold text-primary">
                  {{ (po.amount_untaxed || 0).toLocaleString("en-US") }} ج.م
                </td>
                <td class="p-4">
                  <div class="flex gap-2">
                    <button
                      v-if="po.state === 'draft' && can('purchase.confirm')"
                      @click.stop="confirmPO(po.id)"
                      class="px-3 py-1 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 cursor-pointer"
                    >
                      تأكيد
                    </button>
                    <button
                      v-if="
                        po.state === 'purchase' &&
                        po.receipt_status !== 'done' &&
                        can('purchase.receive')
                      "
                      @click.stop="receivePO(po.id)"
                      :disabled="receivingPOIds.has(po.id)"
                      class="px-3 py-1 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <LoaderCircle
                        v-if="receivingPOIds.has(po.id)"
                        class="w-3 h-3 inline animate-spin ml-1"
                      />
                      استلام
                    </button>
                    <button
                      v-if="
                        po.state === 'purchase' &&
                        po.receipt_status === 'done' &&
                        can('purchase.createBill')
                      "
                      @click.stop="createBill(po.id)"
                      class="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 cursor-pointer"
                    >
                      إنشاء فاتورة
                    </button>
                    <button
                      v-if="
                        po.state === 'purchase' &&
                        po.receipt_status === 'done' &&
                        can('purchase.reverseReceive')
                      "
                      @click.stop="reverseReceive(po.id)"
                      class="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 cursor-pointer"
                    >
                      عكس الاستلام
                    </button>
                    <button
                      v-if="po.state === 'purchase' || po.state === 'done'"
                      @click.stop="printPurchaseOrder(po)"
                      class="p-2 rounded-lg hover:bg-white text-secondary transition-colors cursor-pointer"
                      title="طباعة أمر الشراء"
                    >
                      <Printer class="w-[18px] h-[18px] text-primary" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="totalPages > 1" class="flex justify-center gap-4">
        <button
          @click="currentPage--"
          :disabled="currentPage <= 1"
          class="px-4 py-2 border border-outline-variant rounded-lg disabled:opacity-40 cursor-pointer"
        >
          السابق
        </button>
        <span class="flex items-center text-on-white-variant"
          >الصفحة {{ currentPage }} من {{ totalPages }}</span
        >
        <button
          @click="currentPage++"
          :disabled="currentPage >= totalPages"
          class="px-4 py-2 border border-outline-variant rounded-lg disabled:opacity-40 cursor-pointer"
        >
          التالي
        </button>
      </div>
    </template>
  </div>
  <CreatePurchaseOrderModal
    :open="showCreateModal"
    @update:open="showCreateModal = $event"
    @created="refresh"
  />

  <EditPurchaseOrderModal
    :key="editingPO?.id || 0"
    :open="showEditModal"
    :purchase-order="editingPO"
    @update:open="showEditModal = $event"
    @saved="handleEditSaved"
  />

  <ReceivePurchaseOrderModal
    :open="showReceiveModal"
    :purchase-order="receivingPO"
    @update:open="(val) => { showReceiveModal = val; if (!val) { receivingPO = null; receivingPOIds.value = new Set(); } }"
    @confirm="handleReceive"
  />

  <!-- Feedback Toast -->
  <div
    class="fixed bottom-10 left-1/2 -translate-x-1/2 z-100 transition-all duration-500 bg-white text-primary"
    :class="
      showToast
        ? 'translate-y-0 opacity-100'
        : 'translate-y-32 opacity-0 pointer-events-none'
    "
  >
    <div
      class="px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3"
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
      <div>
        <p class="font-bold text-sm text-primary">{{ toastMessage }}</p>
      </div>
    </div>
  </div>
</template>
