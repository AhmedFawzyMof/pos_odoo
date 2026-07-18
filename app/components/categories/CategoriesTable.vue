<script setup lang="ts">
import { Edit, Trash2, SearchX, Folder } from "@lucide/vue";
import Skeleton from "@/components/ui/skeleton/Skeleton.vue";
import { usePermissions } from "~/composables/usePermissions";
const { can } = usePermissions();

interface Category {
  id?: number;
  name: string;
  parent_id?: { id: number; name: string } | null;
  sequence?: number;
  image?: string | null;
  productsCount?: number;
  status?: string;
}

defineProps<{
  categories: Category[];
  status: string;
  allCategoriesCount: number;
  currentPage?: number;
  totalPages?: number;
}>();

const emit = defineEmits<{
  (e: "edit", category: Category, index: number): void;
  (e: "delete", category: Category, index: number): void;
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
              القسم الرئيسي / الترتيب
            </th>
            <th class="px-6 py-4 font-bold text-label-md">اسم القسم</th>
            <th class="px-6 py-4 font-bold text-label-md">
              ترتيب العرض (Sequence)
            </th>
            <th class="px-6 py-4 font-bold text-label-md">المنتجات المرتبطة</th>
            <th class="px-6 py-4 font-bold text-label-md text-center">
              الإجراءات
            </th>
          </tr>
        </thead>

        <tbody class="divide-y divide-outline-variant">
          <template v-if="status === 'pending' && !categories.length">
            <tr v-for="i in 5" :key="'skeleton-' + i">
              <td class="px-6 py-4"><Skeleton class="h-5 w-24 rounded-full" /></td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <Skeleton class="w-10 h-10 rounded-lg shrink-0" />
                  <Skeleton class="h-4 w-36" />
                </div>
              </td>
              <td class="px-6 py-4"><Skeleton class="h-4 w-12" /></td>
              <td class="px-6 py-4"><Skeleton class="h-5 w-16 rounded-full" /></td>
              <td class="px-6 py-4 text-center">
                <div class="flex justify-center gap-2">
                  <Skeleton class="h-8 w-8 rounded-full" />
                  <Skeleton class="h-8 w-8 rounded-full" />
                </div>
              </td>
            </tr>
          </template>

          <tr
            v-for="(cat, index) in categories"
            :key="cat.id || index"
            @click="emit('edit', cat, index)"
            class="hover:bg-white-low transition-colors group cursor-pointer"
          >
            <td class="px-6 py-4">
              <span
                class="px-2.5 py-1 rounded-full text-[11px] font-bold"
                :class="
                  cat.parent_id
                    ? 'bg-secondary/10 text-secondary'
                    : 'bg-primary/10 text-primary'
                "
              >
                {{
                  cat.parent_id ? `فرعي من: ${cat.parent_id.name}` : "قسم رئيسي"
                }}
              </span>
            </td>
            <td class="px-6 py-4">
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 rounded-lg bg-white-low border border-outline-variant flex items-center justify-center overflow-hidden shrink-0"
                >
                  <img
                    v-if="cat.image"
                    :src="
                      cat.image.startsWith('data:')
                        ? cat.image
                        : `data:image/png;base64,${cat.image}`
                    "
                    class="w-full h-full object-cover"
                  />
                  <Folder v-else class="w-5 h-5 text-on-white-variant/60" />
                </div>
                <div>
                  <p class="font-bold text-on-white text-body-md">
                    {{ cat.name }}
                  </p>
                </div>
              </div>
            </td>
            <td class="px-6 py-4 font-mono text-label-md text-on-white-variant">
              {{ cat.sequence ?? 0 }}
            </td>
            <td class="px-6 py-4">
              <span
                class="px-3 py-1 rounded-full text-label-md font-bold bg-primary/10 text-primary"
              >
                {{ cat.productsCount ?? 0 }} منتج
              </span>
            </td>
            <td class="px-6 py-4 text-center" @click.stop>
              <div class="flex items-center justify-center gap-2">
                <button
                  v-if="can('category.edit')"
                  @click="emit('edit', cat, index)"
                  class="p-2 hover:bg-white-high rounded-full transition-colors text-on-white-variant hover:text-primary active:scale-95"
                  title="تعديل"
                >
                  <Edit class="w-5 h-5" />
                </button>
                <button
                  v-if="can('category.delete')"
                  @click="emit('delete', cat, index)"
                  class="p-2 hover:bg-error-container rounded-full transition-colors text-on-white-variant hover:text-error active:scale-95"
                  title="حذف"
                >
                  <Trash2 class="w-5 h-5" />
                </button>
              </div>
            </td>
          </tr>

          <tr v-if="categories.length === 0 && status !== 'pending'">
            <td colspan="5" class="p-12 text-center text-on-white-variant">
              <SearchX class="w-10 h-10 block mb-2 mx-auto text-outline" />
              لا توجد أقسام مطابقة.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      class="px-8 py-4 bg-white-low border-t border-outline-variant flex justify-between items-center shrink-0"
    >
      <p class="text-label-md text-on-white-variant">
        عرض {{ categories.length }} من أصل {{ allCategoriesCount }} قسم متوفر
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
