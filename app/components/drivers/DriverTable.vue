<script setup lang="ts">
import { computed } from "vue";
import { SearchX, Truck, Edit, ChevronLeft, ChevronRight } from "@lucide/vue";
import Skeleton from "@/components/ui/skeleton/Skeleton.vue";
import type { Driver } from "~/types/driver";

const props = defineProps<{
  drivers: Driver[];
  status: string;
  currentPage: number;
  totalPages: number;
  totalItems: number;
}>();

const emit = defineEmits<{
  (e: "edit", driver: Driver): void;
  (e: "next-page"): void;
  (e: "prev-page"): void;
  (e: "page-change", page: number): void;
}>();

const startItem = computed(() =>
  props.drivers.length ? (props.currentPage - 1) * 20 + 1 : 0,
);
const endItem = computed(() =>
  Math.min(props.currentPage * 20, props.totalItems),
);
</script>

<template>
  <div
    class="bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden flex flex-col"
  >
    <slot name="filters" />

    <div class="overflow-x-auto custom-scrollbar">
      <table class="w-full text-right border-collapse">
        <thead>
          <tr
            class="bg-white-low text-on-white-variant border-b border-outline-variant"
          >
            <th class="px-6 py-4 font-bold text-label-md">السائق</th>
            <th class="px-6 py-4 font-bold text-label-md">رقم الهاتف</th>
            <th class="px-6 py-4 font-bold text-label-md">طرق التوصيل</th>
            <th class="px-6 py-4 font-bold text-label-md">تاريخ الإضافة</th>
            <th class="px-6 py-4 font-bold text-label-md text-center">
              الإجراءات
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-outline-variant">
          <template v-if="status === 'pending' && drivers.length === 0">
            <tr v-for="i in 5" :key="'skeleton-' + i">
              <td class="px-6 py-5">
                <div class="flex items-center gap-3">
                  <Skeleton class="w-10 h-10 rounded-full shrink-0" />
                  <div class="space-y-1.5">
                    <Skeleton class="h-4 w-32" />
                    <Skeleton class="h-3 w-40" />
                  </div>
                </div>
              </td>
              <td class="px-6 py-5"><Skeleton class="h-4 w-24" /></td>
              <td class="px-6 py-5"><Skeleton class="h-5 w-24 rounded-full" /></td>
              <td class="px-6 py-5"><Skeleton class="h-4 w-16" /></td>
              <td class="px-6 py-5 text-center">
                <div class="flex justify-center gap-2">
                  <Skeleton class="h-8 w-8 rounded-lg" />
                </div>
              </td>
            </tr>
          </template>

          <tr v-else-if="drivers.length === 0">
            <td colspan="5" class="p-16 text-center text-on-white-variant">
              <SearchX class="w-10 h-10 block mb-2 mx-auto text-outline" />
              <p class="font-bold">لا يوجد سائقون مطابقون</p>
              <p class="text-sm mt-1">حاول تغيير معايير البحث أو أضف سائق جديد</p>
            </td>
          </tr>

          <tr
            v-for="d in drivers"
            :key="d.id"
            class="hover:bg-primary/5 transition-colors group"
          >
            <td class="px-6 py-5">
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 rounded-full flex items-center justify-center font-bold bg-primary/10 text-primary"
                >
                  {{ d.name.slice(0, 2) }}
                </div>
                <div>
                  <p class="text-body-md font-bold text-on-white">{{ d.name }}</p>
                  <p class="text-[12px] text-on-white-variant">{{ d.email }}</p>
                </div>
              </div>
            </td>
            <td class="px-6 py-5 font-mono text-body-md text-on-white">
              {{ d.phone }}
            </td>
            <td class="px-6 py-5">
              <span
                v-if="d.carriers.length"
                class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-secondary-container text-on-secondary-container"
              >
                {{ d.carriers.join("، ") }}
              </span>
              <span
                v-else
                class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white-low text-on-white-variant"
              >
                غير مرتبط بطريقة توصيل
              </span>
            </td>
            <td class="px-6 py-5 text-label-md text-on-white-variant">
              {{ d.createdAt }}
            </td>
            <td class="px-6 py-5 text-center" @click.stop>
              <div class="flex justify-center gap-2">
                <button
                  @click="emit('edit', d)"
                  class="p-2 rounded-lg hover:bg-white text-on-white-variant cursor-pointer"
                  title="تعديل"
                >
                  <Edit class="w-[20px] h-[20px]" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      class="p-4 bg-white-low border-t border-outline-variant flex items-center justify-between"
    >
      <p class="text-label-md text-on-white-variant">
        عرض {{ startItem }}-{{ endItem }} من أصل {{ totalItems }} سائق
      </p>
      <div class="flex gap-2" v-if="totalPages > 1">
        <button
          @click="emit('prev-page')"
          :disabled="currentPage <= 1"
          class="w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant hover:bg-white text-on-white-variant disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronLeft class="w-5 h-5" />
        </button>
        <button
          v-for="p in totalPages"
          :key="p"
          @click="emit('page-change', p)"
          class="w-10 h-10 flex items-center justify-center rounded-lg font-bold cursor-pointer"
          :class="
            currentPage === p
              ? 'bg-primary text-white'
              : 'hover:bg-white text-on-white border border-outline-variant'
          "
        >
          {{ p }}
        </button>
        <button
          @click="emit('next-page')"
          :disabled="currentPage >= totalPages"
          class="w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant hover:bg-white text-on-white-variant disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronRight class="w-5 h-5" />
        </button>
      </div>
    </div>
  </div>
</template>
