<script setup lang="ts">
import { ref, watch, computed } from "vue";
import {
  Folder,
  X,
  Trash2,
  Image,
  Upload,
  ChevronDown,
  RefreshCw,
} from "@lucide/vue";
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

const props = defineProps<{
  isOpen: boolean;
  mode: "add" | "edit";
  category: Category | null;
  isSaving: boolean;
}>();

const emit = defineEmits<{
  (e: "update:isOpen", value: boolean): void;
  (
    e: "save",
    payload: {
      id?: number;
      name: string;
      sequence: number;
      parent_id: number | null;
      image: string | null;
    },
  ): void;
  (e: "delete"): void;
}>();

const formName = ref("");
const formSequence = ref<number>(0);
const formParentId = ref<number | null>(null);
const formParentName = ref("");
const formImage = ref<string | null>(null);
const showParentDropdown = ref(false);

const { data: categoriesResponse, refresh: refreshParentCategories } =
  await useFetch<{
    success: boolean;
    data?: any[];
    error?: string;
  }>("/api/pos/categories");

const parentCategories = computed(() => {
  const list = categoriesResponse.value?.data || [];
  if (props.category?.id) {
    return list.filter((c: any) => c.id !== props.category?.id);
  }
  return list;
});

const handleImageUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    formImage.value = e.target?.result as string;
  };
  reader.readAsDataURL(file);
};

const triggerFileInput = () => {
  const fileInput = document.getElementById("category-image-input");
  fileInput?.click();
};

const removeImage = () => {
  formImage.value = null;
};

watch(
  () => props.isOpen,
  async (newVal) => {
    if (newVal) {
      await refreshParentCategories();

      if (props.mode === "add") {
        formName.value = "";
        formSequence.value = 0;
        formParentId.value = null;
        formParentName.value = "";
        formImage.value = null;
      } else if (props.mode === "edit" && props.category) {
        formName.value = props.category.name;
        formSequence.value = props.category.sequence || 0;
        formParentId.value = props.category.parent_id
          ? props.category.parent_id.id
          : null;
        formParentName.value = props.category.parent_id
          ? props.category.parent_id.name
          : "";

        const rawImg = props.category.image;
        if (rawImg) {
          formImage.value = rawImg.startsWith("data:")
            ? rawImg
            : `data:image/png;base64,${rawImg}`;
        } else {
          formImage.value = null;
        }
      }
    }
  },
);

const closeDrawer = () => {
  emit("update:isOpen", false);
};

const hideParentDropdown = () => {
  setTimeout(() => {
    showParentDropdown.value = false;
  }, 200);
};

const saveCategory = () => {
  emit("save", {
    id: props.category?.id,
    name: formName.value,
    sequence: Number(formSequence.value),
    parent_id: formParentId.value,
    image: formImage.value,
  });
};
</script>

<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black/40 z-60 backdrop-blur-sm transition-opacity flex justify-center"
    @click="closeDrawer"
  >
    <div
      class="h-full w-full bg-white shadow-2xl flex flex-col relative transition-transform duration-300"
      @click.stop
    >
      <!-- Header -->
      <div
        class="p-6 border-b border-outline-variant flex justify-between items-center bg-white-low"
      >
        <div class="flex items-center gap-3">
          <Folder class="text-primary bg-primary/10 p-2 rounded-lg w-10 h-10" />
          <div>
            <h2 class="text-headline-sm font-bold text-primary">
              {{ mode === "add" ? "إضافة قسم جديد" : "تعديل بيانات القسم" }}
            </h2>
            <p class="text-label-md text-on-white-variant">
              تخصيص خصائص وترتيب وأبوة القسم
            </p>
          </div>
        </div>
        <button
          @click="closeDrawer"
          class="p-2 hover:bg-white rounded-full transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Scrollable Form Container -->
      <div class="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar max-w-7xl mx-auto w-full">
        <!-- Category Image Upload -->
        <div
          class="flex flex-col items-center justify-center pb-4 border-b border-outline-variant"
        >
          <div
            @click="triggerFileInput"
            class="relative group w-32 h-32 rounded-2xl border-2 border-dashed border-outline-variant hover:border-primary bg-white-low hover:bg-white transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden shadow-sm"
          >
            <input
              id="category-image-input"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleImageUpload"
            />
            <div v-if="formImage" class="w-full h-full relative">
              <img :src="formImage" class="w-full h-full object-cover" />
              <div
                class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <Upload class="w-6 h-6 text-white" />
              </div>
            </div>
            <div
              v-else
              class="flex flex-col items-center justify-center p-4 text-center"
            >
              <Image
                class="w-8 h-8 text-on-white-variant mb-1 group-hover:text-primary transition-colors"
              />
              <span
                class="text-[11px] text-on-white-variant group-hover:text-primary transition-colors"
                >رفع صورة القسم</span
              >
            </div>
          </div>
          <button
            v-if="formImage"
            type="button"
            @click="removeImage"
            class="mt-2 text-xs text-error font-medium hover:underline flex items-center gap-1"
          >
            <Trash2 class="w-3.5 h-3.5" />
            حذف الصورة
          </button>
        </div>

        <div class="space-y-4">
          <h3
            class="text-label-md font-bold text-on-white-variant flex items-center gap-2"
          >
            <span class="w-1.5 h-4 bg-primary rounded-full"></span>
            محددات القسم
          </h3>

          <div class="space-y-4">
            <!-- Category Name -->
            <div class="relative">
              <input
                v-model="formName"
                class="peer w-full h-12 px-4 pt-4 border-b-2 border-outline-variant focus:border-primary bg-transparent text-body-md outline-none transition-all"
                placeholder=" "
                type="text"
                required
              />
              <label
                class="absolute right-4 top-1 text-[10px] text-on-white-variant peer-placeholder-shown:text-label-md peer-placeholder-shown:top-3 transition-all pointer-events-none"
                >اسم القسم</label
              >
            </div>

            <!-- Sequence / Display Order -->
            <div class="relative">
              <input
                v-model.number="formSequence"
                class="peer w-full h-12 px-4 pt-4 border-b-2 border-outline-variant focus:border-primary bg-transparent text-body-md outline-none transition-all"
                placeholder=" "
                type="number"
                min="0"
              />
              <label
                class="absolute right-4 top-1 text-[10px] text-on-white-variant peer-placeholder-shown:text-label-md peer-placeholder-shown:top-3 transition-all pointer-events-none"
                >ترتيب العرض (Sequence)</label
              >
            </div>

            <!-- Parent Category Dropdown -->
            <div class="relative mt-4">
              <div class="relative">
                <input
                  v-model="formParentName"
                  @focus="showParentDropdown = true"
                  @blur="hideParentDropdown"
                  class="peer w-full h-12 px-4 pt-4 border-b-2 border-outline-variant focus:border-primary bg-transparent text-body-md outline-none transition-all cursor-pointer"
                  placeholder="قسم رئيسي (بدون أب)"
                  type="text"
                  readonly
                />
                <label
                  class="absolute right-4 top-1 text-[10px] text-on-white-variant peer-placeholder-shown:text-label-md peer-placeholder-shown:top-3 transition-all pointer-events-none"
                  >القسم الأب (Parent Category)</label
                >
                <ChevronDown
                  class="absolute left-4 top-3.5 w-5 h-5 text-on-white-variant pointer-events-none"
                />
                <!-- Clear Button -->
                <button
                  v-if="formParentId !== null"
                  type="button"
                  @click="
                    formParentId = null;
                    formParentName = '';
                  "
                  class="absolute left-10 top-3 text-xs text-error hover:underline cursor-pointer"
                >
                  إزالة
                </button>
              </div>
              <div
                v-if="showParentDropdown && parentCategories.length > 0"
                class="absolute z-10 w-full mt-1 bg-white border border-outline-variant rounded-xl shadow-lg max-h-40 overflow-y-auto"
              >
                <button
                  v-for="cat in parentCategories"
                  :key="cat.id"
                  @click="
                    formParentId = cat.id;
                    formParentName = cat.name;
                    showParentDropdown = false;
                  "
                  class="w-full text-right px-4 py-2 hover:bg-white text-body-md text-on-white"
                >
                  {{ cat.name }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Delete Category in Edit Mode -->
        <div
          v-if="mode === 'edit'"
          class="pt-4 border-t border-outline-variant"
        >
          <button
            v-if="can('category.delete')"
            @click="emit('delete')"
            class="w-full h-11 flex items-center justify-center gap-2 text-error hover:bg-error/10 rounded-xl transition-colors border border-dashed border-error/30 font-bold text-label-md cursor-pointer"
          >
            <Trash2 class="w-5 h-5" />
            حذف القسم نهائياً
          </button>
        </div>
      </div>

      <!-- Action Buttons Footer -->
      <div
        class="p-6 border-t border-outline-variant bg-white-low flex items-center justify-end gap-3 shrink-0"
      >
        <button
          @click="closeDrawer"
          class="px-6 h-11 text-label-md font-bold rounded-full border border-outline-variant hover:bg-white active:scale-95 transition-all cursor-pointer"
        >
          إلغاء
        </button>
        <button
          v-if="mode === 'add' ? can('category.create') : can('category.edit')"
          @click="saveCategory"
          :disabled="isSaving || !formName"
          class="px-6 h-11 text-white text-label-md font-bold rounded-full bg-primary text-white hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
        >
          <RefreshCw v-if="isSaving" class="w-4 h-4 animate-spin" />
          <span>{{ mode === "add" ? "إضافة القسم" : "حفظ التعديلات" }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
