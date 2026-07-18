<script setup lang="ts">
import { SearchX, ChevronLeft, ChevronRight } from "@lucide/vue";
import Skeleton from "@/components/ui/skeleton/Skeleton.vue";
import type { Supplier } from "~/types/supplier";
import { usePermissions } from '~/composables/usePermissions'
const { can } = usePermissions()

defineProps<{
  suppliers: Supplier[];
  status: string;
  currentPage: number;
  totalPages: number;
}>();

const emit = defineEmits<{
  (e: "edit", supplier: Supplier): void;
  (e: "next-page"): void;
  (e: "prev-page"): void;
}>();
</script>

<template>
  <div
    class="bg-white rounded-2xl border border-outline-variant shadow-sm overflow-hidden flex flex-col"
  >
    <div
      v-if="status === 'pending' && suppliers.length === 0"
      class="bg-white border border-outline-variant rounded-xl overflow-hidden"
    >
      <div class="overflow-x-auto">
        <table class="w-full text-right border-collapse">
          <thead class="bg-white-low text-on-white-variant">
            <tr>
              <th class="px-6 py-4 text-label-md font-bold">الاسم</th>
              <th class="px-6 py-4 text-label-md font-bold">رقم الهاتف</th>
              <th class="px-6 py-4 text-label-md font-bold">الرقم الضريبي</th>
              <th class="px-6 py-4 text-label-md font-bold">شروط الدفع</th>
              <th class="px-6 py-4 text-label-md font-bold">إجمالي المشتريات</th>
              <th class="px-6 py-4 text-label-md font-bold">المستحق</th>
              <th class="px-6 py-4 text-label-md font-bold">الإجراءات</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant/45">
            <tr v-for="i in 5" :key="'skeleton-' + i">
              <td class="px-6 py-5"><Skeleton class="h-4 w-32" /></td>
              <td class="px-6 py-5"><Skeleton class="h-4 w-24" /></td>
              <td class="px-6 py-5"><Skeleton class="h-4 w-20" /></td>
              <td class="px-6 py-5"><Skeleton class="h-4 w-28" /></td>
              <td class="px-6 py-5"><Skeleton class="h-4 w-20" /></td>
              <td class="px-6 py-5"><Skeleton class="h-4 w-16" /></td>
              <td class="px-6 py-5"><Skeleton class="h-8 w-14 rounded-lg" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div
      v-else-if="suppliers.length === 0"
      class="p-12 text-center text-on-white-variant"
    >
      <SearchX class="w-10 h-10 block mb-2 mx-auto text-outline" />
      <p class="font-bold">لا يوجد موردون</p>
      <p class="text-sm mt-1">حاول تغيير معايير البحث أو التصفية</p>
    </div>

    <div v-else class="overflow-x-auto custom-scrollbar">
      <table class="w-full text-right border-collapse">
        <thead class="bg-white-low text-on-white-variant">
          <tr>
            <th class="px-6 py-4 text-label-md font-bold">الاسم</th>
            <th class="px-6 py-4 text-label-md font-bold">رقم الهاتف</th>
            <th class="px-6 py-4 text-label-md font-bold">الرقم الضريبي</th>
            <th class="px-6 py-4 text-label-md font-bold">شروط الدفع</th>
            <th class="px-6 py-4 text-label-md font-bold">إجمالي المشتريات</th>
            <th class="px-6 py-4 text-label-md font-bold">المستحق</th>
            <th class="px-6 py-4 text-label-md font-bold">الإجراءات</th>
          </tr>
        </thead>
        <tbody
          class="divide-y divide-outline-variant text-body-md text-on-white"
        >
          <tr
            v-for="supplier in suppliers"
            :key="supplier.id"
            class="hover:bg-primary/5 transition-colors"
          >
            <td class="px-6 py-5 font-bold">
              <NuxtLink
                :to="`/supplier-details?id=${supplier.id}`"
                class="text-primary hover:underline"
              >
                {{ supplier.name }}
              </NuxtLink>
            </td>
            <td class="px-6 py-5 text-on-white-variant">
              {{ supplier.phone || "-" }}
            </td>
            <td class="px-6 py-5 text-on-white-variant">
              {{ supplier.vat || "-" }}
            </td>
            <td class="px-6 py-5">
              {{
                supplier.property_supplier_payment_term_id
                  ? supplier.property_supplier_payment_term_id[1]
                  : "-"
              }}
            </td>
            <td class="px-6 py-5 font-bold text-primary">
              {{ supplier.total_purchased.toLocaleString("en-US") }} ج.م
            </td>
            <td class="px-6 py-5">
              <span
                v-if="supplier.outstanding > 0"
                class="text-amber-600 font-bold"
              >
                {{ supplier.outstanding.toLocaleString("en-US") }} ج.م
              </span>
              <span v-else class="text-on-white-variant">0</span>
            </td>
            <td class="px-6 py-5">
              <button
                v-if="can('supplier.edit')"
                @click="emit('edit', supplier)"
                class="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-lg hover:bg-primary/20 transition-all cursor-pointer"
              >
                تعديل
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="totalPages > 1"
      class="p-4 bg-white-low border-t border-outline-variant flex items-center justify-between"
    >
      <p class="text-label-md text-on-white-variant">
        عرض {{ suppliers.length }} من أصل {{ suppliers.length }} مورد
      </p>
      <div class="flex gap-2">
        <button
          @click="emit('prev-page')"
          :disabled="currentPage <= 1"
          class="w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant hover:bg-white transition-all text-on-white-variant disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronRight class="w-5 h-5" />
        </button>
        <button
          v-for="p in totalPages"
          :key="p"
          @click="emit(p === currentPage ? undefined : '')"
          class="w-10 h-10 flex items-center justify-center rounded-lg font-bold cursor-pointer"
          :class="
            currentPage === p
              ? 'bg-primary text-white shadow-md'
              : 'hover:bg-white text-on-white border border-outline-variant'
          "
        >
          {{ p }}
        </button>
        <button
          @click="emit('next-page')"
          :disabled="currentPage >= totalPages"
          class="w-10 h-10 flex items-center justify-center rounded-lg border border-outline-variant hover:bg-white transition-all text-on-white-variant disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronLeft class="w-5 h-5" />
        </button>
      </div>
    </div>
  </div>
</template>
