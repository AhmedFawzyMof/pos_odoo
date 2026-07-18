<script setup lang="ts">
import { Edit, MoreVertical, ChevronRight, ChevronLeft } from "@lucide/vue";
import Skeleton from "@/components/ui/skeleton/Skeleton.vue";

interface StockLevelItem {
  name: string;
  sku: string;
  category: string;
  location: string;
  qty: string;
  status: string;
  statusColor: string;
  image: string;
}

// 1. Define Props & Configuration variables
const props = withDefaults(
  defineProps<{
    stockLevels: StockLevelItem[];
    loading?: boolean;
    totalRecords?: number;
    totalPages?: number;
    limit?: number;
  }>(),
  {
    totalRecords: 0,
    totalPages: 1,
    limit: 5,
    loading: false,
  },
);

// 2. Define standard v-model macro for seamless parent synchronization
const currentPage = defineModel<number>("currentPage", { default: 1 });

// 3. Define explicit page-change event emitters
const emit = defineEmits<{
  (e: "page-change", page: number): void;
}>();

// 4. Calculate table meta metrics helper computations
const startRange = computed(() => (currentPage.value - 1) * props.limit + 1);
const endRange = computed(() =>
  Math.min(currentPage.value * props.limit, props.totalRecords),
);

// 5. Change page handler function wrapper
const setPage = (page: number) => {
  if (page < 1 || page > props.totalPages) return;
  currentPage.value = page;
  emit("page-change", page);
};
</script>

<template>
  <div
    class="bg-white rounded-xl border border-outline-variant overflow-hidden"
    dir="rtl"
  >
    <div class="p-6 border-b border-outline-variant">
      <h2 class="text-headline-sm font-bold">
        مستويات المخزون للمنتجات الأكثر مبيعاً
      </h2>
    </div>

    <div class="overflow-x-auto">
      <table class="w-full text-right border-collapse">
        <thead>
          <tr
            class="bg-white-low text-on-white-variant border-b border-outline-variant"
          >
            <th class="p-4 text-label-md font-bold">المنتج</th>
            <th class="p-4 text-label-md font-bold">الفئة</th>
            <th class="p-4 text-label-md font-bold">الموقع</th>
            <th class="p-4 text-label-md font-bold">الكمية الحالية</th>
            <th class="p-4 text-label-md font-bold">حالة التوفر</th>
            <th class="p-4 text-label-md font-bold">الإجراءات</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-outline-variant">
          <template v-if="loading && (!stockLevels || stockLevels.length === 0)">
            <tr v-for="i in 5" :key="'skeleton-' + i">
              <td class="p-4">
                <div class="flex items-center gap-3">
                  <Skeleton class="w-10 h-10 rounded-md shrink-0" />
                  <div class="space-y-1.5">
                    <Skeleton class="h-4 w-32" />
                    <Skeleton class="h-3 w-20" />
                  </div>
                </div>
              </td>
              <td class="p-4"><Skeleton class="h-4 w-20" /></td>
              <td class="p-4"><Skeleton class="h-4 w-24" /></td>
              <td class="p-4"><Skeleton class="h-4 w-12" /></td>
              <td class="p-4"><Skeleton class="h-5 w-16 rounded-md" /></td>
              <td class="p-4">
                <div class="flex gap-1">
                  <Skeleton class="h-8 w-8 rounded-full" />
                  <Skeleton class="h-8 w-8 rounded-full" />
                </div>
              </td>
            </tr>
          </template>

          <template v-else-if="!loading && (!stockLevels || stockLevels.length === 0)">
            <tr>
              <td colspan="6" class="p-8 text-center text-on-white-variant">
                لا توجد مخزونات مسجلة لهذه الصفحة حالياً.
              </td>
            </tr>
          </template>

          <template v-else>
            <tr
              v-for="(item, idx) in stockLevels"
              :key="idx"
              class="hover:bg-white-low transition-colors"
            >
            <td class="p-4">
              <div class="flex items-center gap-3">
                <img
                  :alt="item.name"
                  class="w-10 h-10 rounded-md object-cover bg-white-variant"
                  :src="item.image || '/placeholder-product.png'"
                />
                <div>
                  <p class="font-bold text-on-white">{{ item.name }}</p>
                  <p class="text-xs text-on-white-variant">
                    SKU: {{ item.sku }}
                  </p>
                </div>
              </div>
            </td>
            <td class="p-4 text-body-md text-on-white">
              {{ item.category }}
            </td>
            <td class="p-4 text-body-md text-on-white-variant">
              {{ item.location }}
            </td>
            <td class="p-4 font-bold text-on-white">{{ item.qty }}</td>
            <td class="p-4">
              <span
                class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium"
                :class="item.statusColor"
              >
                {{ item.status }}
              </span>
            </td>
            <td class="p-4">
              <div class="flex gap-1">
                <button
                  class="p-2 hover:bg-white-high rounded-full transition-colors text-on-white-variant"
                >
                  <Edit class="w-5 h-5" />
                </button>
                <button
                  class="p-2 hover:bg-white-high rounded-full transition-colors text-on-white-variant"
                >
                  <MoreVertical class="w-5 h-5" />
                </button>
              </div>
            </td>
          </tr>
          </template>
        </tbody>
      </table>
    </div>

    <div
      class="p-4 bg-white-low flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-outline-variant"
    >
      <p class="text-label-md text-on-white-variant">
        عرض {{ startRange }}-{{ endRange }} من أصل {{ totalRecords }} منتج
      </p>

      <div class="flex gap-2 items-center">
        <button
          :disabled="currentPage === 1"
          @click="setPage(currentPage - 1)"
          class="w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant bg-white hover:bg-white-high transition-all text-on-white-variant disabled:opacity-40 disabled:hover:bg-white"
        >
          <ChevronRight class="w-5 h-5" />
        </button>

        <button
          v-for="pageNumber in totalPages"
          :key="pageNumber"
          @click="setPage(pageNumber)"
          class="w-10 h-10 flex items-center justify-center rounded-lg border font-bold transition-all text-sm"
          :class="[
            currentPage === pageNumber
              ? 'bg-primary text-white border-primary'
              : 'border-outline-variant bg-white text-on-white hover:bg-white-high',
          ]"
        >
          {{ pageNumber }}
        </button>

        <button
          :disabled="currentPage >= totalPages"
          @click="setPage(currentPage + 1)"
          class="w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant bg-white hover:bg-white-high transition-all text-on-white-variant disabled:opacity-40 disabled:hover:bg-white"
        >
          <ChevronLeft class="w-5 h-5" />
        </button>
      </div>
    </div>
  </div>
</template>
