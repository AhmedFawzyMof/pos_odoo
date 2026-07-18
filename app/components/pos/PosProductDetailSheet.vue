<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { X } from "@lucide/vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import type { POSProduct, POSProductVariant } from "~/types/pos";
import { useNumberFormat } from "~/composables/useNumberFormat";

const props = defineProps<{
  product: POSProduct | null;
  open: boolean;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  addToCart: [product: POSProduct];
  addVariantToCart: [variant: POSProductVariant];
}>();

const hasVariants = computed(() => {
  const p = props.product;
  return p?.variants && p.variants.length > 1;
});

const attributeLines = computed(() => props.product?.attribute_lines || []);

// Track selected attribute values: keyed by attr_id, stores the value_id
const selectedAttrs = ref<Record<number, number>>({});

watch(
  () => props.product,
  (p) => {
    selectedAttrs.value = {};
    if (p?.variants && p.variants.length === 1) {
      const v = p.variants[0];
      if (v.attribute_values) {
        for (const av of v.attribute_values) {
          selectedAttrs.value[av.attr_id] = av.value_id;
        }
      }
    }
  },
  { immediate: true },
);

function selectAttribute(attrId: number, valueId: number) {
  selectedAttrs.value = { ...selectedAttrs.value, [attrId]: valueId };
}

const selectedVariant = computed<POSProductVariant | null>(() => {
  const p = props.product;
  if (!p?.variants || p.variants.length === 0) return null;
  if (p.variants.length === 1) return p.variants[0];

  const sel = selectedAttrs.value;
  const attrEntries = Object.entries(sel);
  if (attrEntries.length === 0) return null;

  const match = p.variants.find((v) => {
    if (!v.attribute_values) return false;
    return attrEntries.every(([attrId, valueId]) =>
      v.attribute_values!.some(
        (av) => av.attr_id === Number(attrId) && av.value_id === valueId,
      ),
    );
  });
  return match || null;
});

const { formatNumber } = useNumberFormat();

const displayPrice = computed(() => {
  const p = props.product;
  if (!p) return formatNumber(0);
  const base = Number(p.list_price) || 0;
  const extra = selectedVariant.value?.price_extra || 0;
  return formatNumber(base + extra);
});

const displayBarcode = computed(() => {
  return selectedVariant.value?.barcode || props.product?.barcode || "";
});

const productImage = computed(() => {
  if (props.product?.image_1920) {
    return `data:image/png;base64,${props.product.image_1920}`;
  }
  return null;
});

function handleClose() {
  emit("update:open", false);
}

function handleAddToCart() {
  if (!props.product) return;
  if (hasVariants.value && selectedVariant.value) {
    emit("addVariantToCart", selectedVariant.value);
  } else {
    emit("addToCart", props.product);
  }
  handleClose();
}
</script>

<template>
  <Sheet :open="open" @update:open="handleClose">
    <SheetContent side="left" class="w-full overflow-y-auto">
      <SheetHeader class="mb-4">
        <SheetTitle class="text-lg">{{ product?.display_name || product?.name }}</SheetTitle>
        <SheetClose as-child>
          <button class="absolute left-4 top-4 text-muted-foreground hover:text-foreground cursor-pointer">
            <X class="w-5 h-5" />
          </button>
        </SheetClose>
      </SheetHeader>

      <div class="max-w-7xl mx-auto">
      <template v-if="product">
        <div class="aspect-square bg-muted/30 rounded-xl flex items-center justify-center overflow-hidden mb-4">
          <img
            v-if="productImage"
            :src="productImage"
            :alt="product.name"
            class="w-full h-full object-contain"
          />
          <span v-else class="material-symbols-outlined text-6xl text-muted-foreground/30">inventory_2</span>
        </div>

        <div class="space-y-4">
          <div>
            <h3 class="text-2xl font-bold text-primary">{{ displayPrice }} ج.م</h3>
            <p v-if="displayBarcode" class="text-xs text-muted-foreground font-mono mt-1">
              الباركود: {{ displayBarcode }}
            </p>
          </div>

          <!-- Variant attribute selectors -->
          <div v-if="hasVariants && attributeLines.length" class="space-y-3">
            <div
              v-for="attrLine in attributeLines"
              :key="attrLine.id"
              class="space-y-1.5"
            >
              <h4 class="text-sm font-semibold">{{ attrLine.name }}</h4>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="val in attrLine.values"
                  :key="val.id"
                  @click="selectAttribute(attrLine.id, val.id)"
                  class="px-3 py-1.5 rounded-full text-sm font-medium border transition-all cursor-pointer"
                  :class="
                    selectedAttrs[attrLine.id] === val.id
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                  "
                >
                  {{ val.name }}
                </button>
              </div>
            </div>
            <p
              v-if="!selectedVariant && Object.keys(selectedAttrs).length === attributeLines.length"
              class="text-xs text-destructive"
            >
              هذه التركيبة غير متوفرة
            </p>
          </div>

          <div v-if="product.pos_categories?.length" class="flex flex-wrap gap-1.5">
            <Badge
              v-for="cat in product.pos_categories"
              :key="cat.id"
              variant="secondary"
              class="text-xs"
            >
              {{ cat.name }}
            </Badge>
          </div>

          <div v-if="(selectedVariant?.stock_by_location || product.stock_by_location)?.length">
            <h4 class="text-sm font-semibold mb-2">المخزون حسب المستودع</h4>
            <div class="space-y-1.5">
              <div
                v-for="loc in (selectedVariant?.stock_by_location || product.stock_by_location)"
                :key="loc.location_id"
                class="flex justify-between text-sm px-3 py-1.5 bg-muted/30 rounded-lg"
              >
                <span class="text-muted-foreground">{{ loc.location_name }}</span>
                <span class="font-bold tabular-nums">{{ loc.quantity }}</span>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3 text-sm">
            <div class="bg-muted/30 rounded-lg p-3">
              <span class="text-muted-foreground text-xs">سعر الشراء</span>
              <p class="font-bold">
                {{ formatNumber(Number(product.standard_price) || 0) }}
              </p>
            </div>
            <div class="bg-muted/30 rounded-lg p-3">
              <span class="text-muted-foreground text-xs">الوزن</span>
              <p class="font-bold">{{ selectedVariant?.weight || product.weight || 0 }}</p>
            </div>
            <div class="bg-muted/30 rounded-lg p-3">
              <span class="text-muted-foreground text-xs">الوارد</span>
              <p class="font-bold">{{ product.incoming_qty }}</p>
            </div>
            <div class="bg-muted/30 rounded-lg p-3">
              <span class="text-muted-foreground text-xs">الصادر</span>
              <p class="font-bold">{{ product.outgoing_qty }}</p>
            </div>
          </div>

          <Button
            @click="handleAddToCart"
            class="w-full gap-2 cursor-pointer"
            size="lg"
            :disabled="hasVariants && !selectedVariant"
          >
            <span class="material-symbols-outlined text-lg">add_shopping_cart</span>
            {{
              hasVariants
                ? (selectedVariant ? 'إضافة إلى الفاتورة' : 'اختر المواصفات')
                : 'إضافة إلى الفاتورة'
            }}
          </Button>
        </div>
      </template>
      </div>
    </SheetContent>
  </Sheet>
</template>
