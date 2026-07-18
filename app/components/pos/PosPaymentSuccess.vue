<template>
  <div class="receipt-inline bg-white rounded-xl shadow-inner mx-auto overflow-hidden" :style="renderedStyle">
    <div :style="renderBorderStyle">
      <!-- Header -->
      <template v-if="cfg.header?.enabled">
        <div class="text-center mb-3" :style="headerStyle">
          <img
            v-if="cfg.header?.companyLogo && company.logo"
            :src="`data:image/png;base64,${company.logo}`"
            class="h-12 mx-auto mb-1 object-contain"
            alt="logo"
          />
          <div v-if="cfg.header?.companyName && company.name" class="font-bold" :style="{ fontSize: Math.round(baseFontSize * 1.3) + 'px' }">
            {{ company.name }}
          </div>
          <div
            v-if="cfg.header?.companyAddress && company.address?.city"
            class="leading-relaxed"
            :style="{ fontSize: baseFontSize + 'px', color: cfg.colors?.secondary }"
          >
            {{ company.address?.street }}{{ company.address?.street2 ? ', ' + company.address?.street2 : '' }}{{ company.address?.city ? ', ' + company.address?.city : '' }}
          </div>
          <div v-if="cfg.header?.companyPhone && company.phone" :style="{ fontSize: baseFontSize + 'px', color: cfg.colors?.secondary }">
            {{ company.phone }}
          </div>
          <div v-if="cfg.header?.companyEmail && company.email" :style="{ fontSize: baseFontSize + 'px', color: cfg.colors?.secondary }">
            {{ company.email }}
          </div>
          <div v-if="cfg.header?.companyVat && company.vat" :style="{ fontSize: baseFontSize + 'px', color: cfg.colors?.secondary }">
            الرقم الضريبي: {{ company.vat }}
          </div>
        </div>
        <div :style="renderDivider" class="my-2"></div>
      </template>

      <!-- Title -->
      <div class="text-center font-bold mb-2" :style="{ fontSize: Math.round(baseFontSize * 1.15) + 'px', color: cfg.colors?.primary }">
        {{ cfg.titleAr || "فاتورة بيع" }}
      </div>
      <div
        v-if="cfg.footer?.showOrderNumber || cfg.footer?.showDate || cfg.footer?.showTime"
        class="text-center font-bold mb-2"
        :style="{ fontSize: Math.round(baseFontSize * 1.15) + 'px', color: cfg.colors?.primary }"
      >
        <div v-if="cfg.footer?.showOrderNumber">{{ orderName }}</div>
        <div>{{ dateStr }} {{ timeStr }}</div>
      </div>

      <div :style="renderDivider" class="my-2"></div>

      <!-- Items -->
      <template v-if="cfg.items?.enabled">
        <table class="w-full border-collapse" :style="{ fontSize: baseFontSize + 'px' }">
          <thead>
            <tr>
              <th class="text-right py-1 px-0.5 font-bold" :style="{ borderBottom: `1px solid ${cfg.colors?.primary || '#000'}`, color: cfg.colors?.primary }">المنتج</th>
              <th v-if="cfg.items?.showQuantity" class="text-center py-1 px-0.5 font-bold" :style="{ borderBottom: `1px solid ${cfg.colors?.primary || '#000'}`, color: cfg.colors?.primary }">الكمية</th>
              <th v-if="cfg.items?.showPrice" class="text-left py-1 px-0.5 font-bold" :style="{ borderBottom: `1px solid ${cfg.colors?.primary || '#000'}`, color: cfg.colors?.primary }">السعر</th>
              <th v-if="cfg.items?.showTotal" class="text-left py-1 px-0.5 font-bold" :style="{ borderBottom: `1px solid ${cfg.colors?.primary || '#000'}`, color: cfg.colors?.primary }">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) in items" :key="idx">
              <td class="text-right py-1 px-0.5">{{ item.product.name }}</td>
              <td v-if="cfg.items?.showQuantity" class="text-center py-1 px-0.5">{{ item.quantity }}</td>
              <td v-if="cfg.items?.showPrice" class="text-left py-1 px-0.5">{{ formatPrice(item.price) }}</td>
              <td v-if="cfg.items?.showTotal" class="text-left py-1 px-0.5">{{ formatPrice(item.price * item.quantity) }}</td>
            </tr>
          </tbody>
        </table>
        <div :style="renderDivider" class="my-2"></div>
      </template>

      <!-- Totals -->
      <template v-if="cfg.totals?.enabled">
        <table class="w-full border-collapse" :style="{ fontSize: baseFontSize + 'px' }">
          <tbody>
            <tr v-if="cfg.totals?.showSubtotal">
              <td class="text-right py-0.5">المجموع</td>
              <td class="text-left py-0.5">{{ formatPrice(subtotal) }} {{ currency }}</td>
            </tr>
            <tr v-if="cfg.totals?.showDiscount && discountAmount > 0">
              <td class="text-right py-0.5" :style="{ color: cfg.colors?.accent }">الخصم</td>
              <td class="text-left py-0.5" :style="{ color: cfg.colors?.accent }">-{{ formatPrice(discountAmount) }} {{ currency }}</td>
            </tr>
            <tr v-if="cfg.totals?.showServiceFee && serviceFeeAmount > 0">
              <td class="text-right py-0.5" :style="{ color: cfg.colors?.accent }">رسوم إضافية</td>
              <td class="text-left py-0.5" :style="{ color: cfg.colors?.accent }">+{{ formatPrice(serviceFeeAmount) }} {{ currency }}</td>
            </tr>
            <tr class="font-bold">
              <td class="text-right py-1" :style="{ borderTop: `1px solid ${cfg.colors?.primary || '#000'}`, color: cfg.colors?.primary }">الإجمالي</td>
              <td class="text-left py-1" :style="{ borderTop: `1px solid ${cfg.colors?.primary || '#000'}`, color: cfg.colors?.primary }">{{ formatPrice(grandTotal) }} {{ currency }}</td>
            </tr>
          </tbody>
        </table>
        <div :style="renderDivider" class="my-2"></div>
      </template>

      <!-- Payments -->
      <template v-if="cfg.payments?.enabled">
        <table class="w-full border-collapse" :style="{ fontSize: baseFontSize + 'px' }">
          <tbody>
            <tr><th class="text-right py-1 font-bold" :style="{ color: cfg.colors?.primary }" colspan="2">طرق الدفع</th></tr>
            <tr v-for="(p, idx) in payments" :key="idx">
              <td class="text-right py-0.5">{{ p.methodName }}</td>
              <td class="text-left py-0.5">{{ formatPrice(p.amount) }} {{ currency }}</td>
            </tr>
          </tbody>
        </table>
        <div :style="renderDivider" class="my-2"></div>
      </template>

      <!-- Footer -->
      <template v-if="cfg.footer?.enabled">
        <div class="text-center leading-relaxed" :style="{ fontSize: Math.round(baseFontSize * 1.1) + 'px', fontWeight: 'bold', color: cfg.colors?.primary }">
          <div v-if="cfg.footer?.showThankYou">{{ cfg.footer?.thankYouText }}</div>
          <div v-if="cfg.footer?.showTerms && cfg.footer?.termsText" class="mt-1">{{ cfg.footer?.termsText }}</div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  orderName: string;
  items: { product: { name: string }; quantity: number; price: number; discount: number }[];
  payments: { methodName: string; amount: number }[];
  subtotal: number;
  discountAmount: number;
  serviceFeeAmount: number;
  grandTotal: number;
  receiptConfig: any;
}>();

const cfg = computed(() => props.receiptConfig?.receipt || {});
const company = computed(() => props.receiptConfig?.company || {});
const currency = computed(() => cfg.value.totals?.currency || "ج.م");
const baseFontSize = computed(() => cfg.value.fontSize || 12);

const now = new Date();
const dateStr = now.toLocaleDateString("ar-EG");
const timeStr = now.toLocaleTimeString("ar-EG", {
  hour: "2-digit",
  minute: "2-digit",
});

const renderedStyle = computed(() => {
  const c = cfg.value;
  return {
    fontFamily: c.fontFamily || "Courier New, monospace",
    fontSize: `${c.fontSize || 12}px`,
    fontWeight: c.fontWeight || "normal",
    width: "100%",
    maxWidth: `${c.width || 280}px`,
    color: c.colors?.text || "#000000",
    background: c.colors?.background || "#ffffff",
  };
});

const headerStyle = computed(() => {
  const c = cfg.value.colors || {};
  return { color: c.primary || "#000000" };
});

const renderDivider = computed(() => {
  const layout = cfg.value.layout || {};
  if (!layout.showDivider) return "";
  const style = layout.dividerStyle || "dashed";
  return `border-top: 1px ${style} #000;`;
});

const renderBorderStyle = computed(() => {
  const layout = cfg.value.layout || {};
  if (!layout.showBorder) return "";
  const style = layout.borderStyle || "solid";
  return `border: 1px ${style} ${cfg.value.colors?.primary || "#000"}; padding: 8px;`;
});

function formatPrice(val: number): string {
  return val.toFixed(2);
}
</script>
