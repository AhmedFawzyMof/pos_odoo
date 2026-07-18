<script setup lang="ts">
import type { Product } from "~/types/product";
import { Edit, Trash2, RotateCcw, SearchX, Package, History } from "@lucide/vue";
import Skeleton from "@/components/ui/skeleton/Skeleton.vue";

const props = defineProps<{
  products: Product[];
  status: string;
  allProductsCount: number;
  currentPage?: number;
  totalPages?: number;
  archiveFilter?: "all" | "active" | "archived";
  selectedLocationId?: number | null;
}>();
const emit = defineEmits<{
  (e: "edit", product: Product, index: number): void;
  (e: "delete", product: Product, index: number): void;
  (e: "restore", product: Product, index: number): void;
  (e: "view-stock-movements", product: Product, index: number): void;
  (e: "next-page"): void;
  (e: "prev-page"): void;
}>();
</script>

<template>
  <div
    class="bg-white rounded-2xl border border-outline-variant overflow-hidden flex flex-col shadow-sm"
  >
    <div class="overflow-x-auto custom-scrollbar">
      <table class="w-full text-right border-collapse">
        <thead>
          <tr
            class="bg-white text-on-white-variant border-b border-outline-variant"
          >
            <th class="px-6 py-4 font-bold text-label-md">
              حالة البيع في الـ POS
            </th>
            <th class="px-6 py-4 font-bold text-label-md">
              اسم المنتج / البديل
            </th>
            <th class="px-6 py-4 font-bold text-label-md">الباركود</th>
            <th class="px-6 py-4 font-bold text-label-md">السعر البيعي</th>
            <th class="px-6 py-4 font-bold text-label-md">الضريبة</th>
            <th class="px-6 py-4 font-bold text-label-md">التكلفة</th>
            <th class="px-6 py-4 font-bold text-label-md">المخزون الحالي</th>
            <th class="px-6 py-4 font-bold text-label-md">موقع التخزين</th>
            <th class="px-6 py-4 font-bold text-label-md text-center">
              الإجراءات
            </th>
          </tr>
        </thead>

        <tbody class="divide-y divide-outline-variant">
          <template v-if="status === 'pending' && !products.length">
            <tr v-for="i in 5" :key="'skeleton-' + i">
              <td class="px-6 py-4"><Skeleton class="h-5 w-20 rounded-full" /></td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <Skeleton class="w-10 h-10 rounded-lg shrink-0" />
                  <div class="space-y-1.5">
                    <Skeleton class="h-3.5 w-40" />
                    <Skeleton class="h-3 w-24" />
                  </div>
                </div>
              </td>
              <td class="px-6 py-4"><Skeleton class="h-4 w-14" /></td>
              <td class="px-6 py-4"><Skeleton class="h-4 w-12" /></td>
              <td class="px-6 py-4"><Skeleton class="h-5 w-16 rounded-full" /></td>
              <td class="px-6 py-4"><Skeleton class="h-4 w-12" /></td>
              <td class="px-6 py-4"><Skeleton class="h-5 w-16 rounded-full" /></td>
              <td class="px-6 py-4"><Skeleton class="h-4 w-20" /></td>
              <td class="px-6 py-4 text-center">
                <div class="flex justify-center gap-2">
                  <Skeleton class="h-8 w-8 rounded-full" />
                  <Skeleton class="h-8 w-8 rounded-full" />
                </div>
              </td>
            </tr>
          </template>

          <tr
            v-for="(prod, index) in products"
            :key="prod.id || index"
            @click="emit('edit', prod, index)"
            class="hover:bg-white-low transition-colors group cursor-pointer"
          >
            <td class="px-6 py-4">
              <span
                class="px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap"
                :class="
                  prod.available_in_pos
                    ? 'bg-success/10 text-success'
                    : 'bg-outline-variant text-on-white-variant'
                "
              >
                {{
                  prod.available_in_pos ? "متاح بنظام البيع" : "مخفي بالخلفية"
                }}
              </span>
            </td>
            <td class="px-6 py-4">
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 rounded-lg bg-white-low border border-outline-variant flex items-center justify-center overflow-hidden shrink-0"
                >
                  <img
                    v-if="prod.image_1920"
                    :src="
                      prod.image_1920.startsWith('data:')
                        ? prod.image_1920
                        : `data:image/png;base64,${prod.image_1920}`
                    "
                    class="w-full h-full object-cover"
                  />
                  <Package v-else class="w-5 h-5 text-on-white-variant/60" />
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <p class="font-bold text-on-white text-body-md">
                      {{ prod.display_name || prod.name }}
                    </p>
                    <span
                      v-if="prod.active === false"
                      class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-error/10 text-error border border-error/20"
                    >
                      مؤرشف
                    </span>
                  </div>
                  <div class="flex items-center gap-1.5 mt-0.5">
                    <span
                      class="text-[11px] px-1.5 py-0.2 bg-white-variant rounded text-on-white-variant"
                      >{{ prod.type }}</span
                    >
                    <p
                      class="text-[12px] text-on-white-variant"
                      v-if="prod.pos_categories?.length"
                    >
                      {{ prod.pos_categories[0]?.name }}
                    </p>
                  </div>
                </div>
              </div>
            </td>
            <td class="px-6 py-4 font-mono text-label-md text-on-white-variant">
              {{ prod.barcode || "—" }}
            </td>
            <td class="px-6 py-4 text-primary font-bold text-label-md">
              {{
                (prod.list_price || 0).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })
              }}
              ج.م
            </td>
            <td class="px-6 py-4 text-center">
              <span
                class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap"
                :class="
                  prod.taxes_id?.length
                    ? 'bg-warning/10 text-warning'
                    : 'bg-outline-variant text-on-white-variant'
                "
              >
                <span
                  class="w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] font-bold"
                  :class="
                    prod.taxes_id?.length
                      ? 'bg-warning text-white'
                      : 'bg-on-white-variant/30 text-white'
                  "
                >
                  {{ prod.taxes_id?.length ? "✓" : "—" }}
                </span>
                {{
                  prod.taxes_id?.length
                    ? prod.taxes?.[0]?.name || "خاضع"
                    : "غير خاضع"
                }}
              </span>
            </td>
            <td class="px-6 py-4 text-on-white-variant text-label-md">
              {{
                (prod.standard_price || 0).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })
              }}
              ج.m
            </td>
            <td class="px-6 py-4">
              <div class="flex flex-col gap-0.5">
                <span
                  class="px-3 py-1 rounded-full text-label-md font-bold whitespace-nowrap inline-block w-fit"
                  :class="
                    (prod.qty_available || 0) <= 5
                      ? 'bg-error/10 text-error'
                      : 'bg-primary/10 text-primary'
                  "
                >
                  {{ prod.qty_available || 0 }}
                  {{ prod.to_weight ? "كجم" : "قطعة" }}
                  {{ (prod.qty_available || 0) <= 5 ? "(منخفض)" : "" }}
                </span>
                <span
                  v-if="selectedLocationId"
                  class="text-[10px] text-on-white-variant/60"
                >
                  في {{ prod.stock_locations?.[0]?.location_name || "الموقع المحدد" }}
                </span>
              </div>
            </td>
            <td class="px-6 py-4 text-label-md text-on-white-variant">
              <div v-if="prod.stock_locations?.length" class="space-y-1">
                <div
                  v-for="loc in prod.stock_locations.filter(
                    (l) => l.location_name !== 'Unknown',
                  )"
                  :key="loc.location_id"
                  class="flex justify-between gap-2"
                >
                  <span>{{ loc.location_name }}</span>
                  <span class="font-mono whitespace-nowrap"
                    >{{ loc.qty }} {{ prod.to_weight ? "كجم" : "قطعة" }}</span
                  >
                </div>
              </div>
              <span v-else-if="selectedLocationId">--</span>
              <span v-else>-</span>
            </td>
            <td class="px-6 py-4 text-center" @click.stop>
              <div class="flex items-center justify-center gap-2">
                <button
                  @click="emit('view-stock-movements', prod, index)"
                  class="p-2 hover:bg-primary/10 rounded-full transition-colors text-on-white-variant hover:text-primary active:scale-95"
                  title="عرض حركات المخزون"
                >
                  <History class="w-5 h-5" />
                </button>
                <button
                  @click="emit('edit', prod, index)"
                  class="p-2 hover:bg-white-high rounded-full transition-colors text-on-white-variant hover:text-primary active:scale-95"
                  title="تعديل"
                >
                  <Edit class="w-5 h-5" />
                </button>
                <button
                  v-if="prod.active !== false"
                  @click="emit('delete', prod, index)"
                  class="p-2 hover:bg-error-container rounded-full transition-colors text-on-white-variant hover:text-error active:scale-95"
                  title="أرشفة / حذف"
                >
                  <Trash2 class="w-5 h-5" />
                </button>
                <button
                  v-else
                  @click="emit('restore', prod, index)"
                  class="p-2 hover:bg-success/10 rounded-full transition-colors text-on-white-variant hover:text-success active:scale-95"
                  title="استعادة المنتج"
                >
                  <RotateCcw class="w-5 h-5" />
                </button>
              </div>
            </td>
          </tr>

          <tr v-if="products.length === 0 && status !== 'pending'">
            <td colspan="9" class="p-12 text-center text-on-white-variant">
              <SearchX class="w-10 h-10 block mb-2 mx-auto text-outline" />
              لا توجد منتجات مطابقة في كتالوج المستودع.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      class="px-8 py-4 bg-white-low border-t border-outline-variant flex justify-between items-center shrink-0"
    >
      <p class="text-label-md text-on-white-variant">
        عرض {{ products.length }} من أصل {{ allProductsCount }} منتج متوفر
      </p>
      <div class="flex items-center gap-2" v-if="totalPages && totalPages > 1">
        <button
          @click="emit('prev-page')"
          :disabled="currentPage === 1"
          class="px-4 py-2 text-label-md font-bold rounded-lg border border-outline-variant hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          السابق
        </button>
        <span class="text-label-md text-on-white-variant font-medium mx-2">
          صفحة {{ currentPage }} من {{ totalPages }}
        </span>
        <button
          @click="emit('next-page')"
          :disabled="currentPage === totalPages"
          class="px-4 py-2 text-label-md font-bold rounded-lg border border-outline-variant hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          التالي
        </button>
      </div>
    </div>
  </div>
</template>
