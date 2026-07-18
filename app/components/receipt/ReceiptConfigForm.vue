<script setup lang="ts">
import {
  Building2,
  Receipt,
  ListChecks,
  Wallet,
  Percent,
  FileText,
  Palette,
  Layout,
  Settings2,
  Save,
  X,
  RefreshCw,
} from "@lucide/vue"
import ReceiptConfigCollapsible from "./ReceiptConfigCollapsible.vue"

const props = defineProps<{
  config: any
  collapsedSections: Record<string, boolean>
  states: any[]
  countries: any[]
  filteredStates: any[]
  isSaving: boolean
}>()

const emit = defineEmits<{
  "update:config": [value: any]
  toggleSection: [section: string]
  save: []
  discard: []
}>()

function updateCompany(field: string, value: any) {
  const c = { ...props.config }
  c.company[field] = value
  emit("update:config", c)
}

function updateCompanyAddress(field: string, value: any) {
  const c = { ...props.config }
  c.company.address[field] = value
  emit("update:config", c)
}

function updateReceipt(path: string[], value: any) {
  const c = JSON.parse(JSON.stringify(props.config))
  let obj: any = c.receipt
  for (let i = 0; i < path.length - 1; i++) {
    obj = obj[path[i] as keyof typeof obj]
  }
  obj[path[path.length - 1] as keyof typeof obj] = value
  emit("update:config", c)
}
</script>

<template>
  <div class="bg-white border border-outline-variant rounded-xl p-6 shadow-sm">
    <div class="flex items-center gap-2 mb-4 pb-3 border-b border-outline-variant">
      <Settings2 class="w-5 h-5 text-primary" />
      <span class="font-bold text-sm">إعدادات التصميم</span>
    </div>

    <div class="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pl-1">
      <!-- Company Info -->
      <ReceiptConfigCollapsible
        :icon="Building2"
        title="الشركة"
        :collapsed="collapsedSections.company"
        @toggle="emit('toggleSection', 'company')"
      >
        <div class="space-y-2">
          <label class="block text-xs font-bold text-muted-foreground">اسم الشركة</label>
          <input
            :value="config.company.name"
            @input="updateCompany('name', ($event.target as HTMLInputElement).value)"
            class="w-full h-10 px-3 border border-outline-variant rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
            type="text"
          />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-2">
            <label class="block text-xs font-bold text-muted-foreground">الهاتف</label>
            <input
              :value="config.company.phone"
              @input="updateCompany('phone', ($event.target as HTMLInputElement).value)"
              class="w-full h-10 px-3 border border-outline-variant rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
              type="text"
            />
          </div>
          <div class="space-y-2">
            <label class="block text-xs font-bold text-muted-foreground">البريد الإلكتروني</label>
            <input
              :value="config.company.email"
              @input="updateCompany('email', ($event.target as HTMLInputElement).value)"
              class="w-full h-10 px-3 border border-outline-variant rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
              type="email"
            />
          </div>
        </div>
        <div class="space-y-2">
          <label class="block text-xs font-bold text-muted-foreground">الموقع الإلكتروني</label>
          <input
            :value="config.company.website"
            @input="updateCompany('website', ($event.target as HTMLInputElement).value)"
            class="w-full h-10 px-3 border border-outline-variant rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
            type="text"
          />
        </div>
        <div class="space-y-2">
          <label class="block text-xs font-bold text-muted-foreground">الرقم الضريبي</label>
          <input
            :value="config.company.vat"
            @input="updateCompany('vat', ($event.target as HTMLInputElement).value)"
            class="w-full h-10 px-3 border border-outline-variant rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
            type="text"
          />
        </div>
        <div class="space-y-2">
          <label class="block text-xs font-bold text-muted-foreground">الشارع</label>
          <input
            :value="config.company.address.street"
            @input="updateCompanyAddress('street', ($event.target as HTMLInputElement).value)"
            class="w-full h-10 px-3 border border-outline-variant rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
            type="text"
          />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-2">
            <label class="block text-xs font-bold text-muted-foreground">المدينة</label>
            <input
              :value="config.company.address.city"
              @input="updateCompanyAddress('city', ($event.target as HTMLInputElement).value)"
              class="w-full h-10 px-3 border border-outline-variant rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
              type="text"
            />
          </div>
          <div class="space-y-2">
            <label class="block text-xs font-bold text-muted-foreground">الرمز البريدي</label>
            <input
              :value="config.company.address.zip"
              @input="updateCompanyAddress('zip', ($event.target as HTMLInputElement).value)"
              class="w-full h-10 px-3 border border-outline-variant rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
              type="text"
            />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-2">
            <label class="block text-xs font-bold text-muted-foreground">الدولة</label>
            <select
              :value="config.company.address.countryId"
              @change="updateCompanyAddress('countryId', ($event.target as HTMLSelectElement).value ? Number(($event.target as HTMLSelectElement).value) : null)"
              class="w-full h-10 px-3 bg-white border border-outline-variant rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none cursor-pointer"
            >
              <option :value="null">اختر الدولة...</option>
              <option v-for="c in countries" :key="c.id" :value="c.id">{{ c.name }}</option>
            </select>
          </div>
          <div class="space-y-2">
            <label class="block text-xs font-bold text-muted-foreground">المحافظة</label>
            <select
              :value="config.company.address.stateId"
              @change="updateCompanyAddress('stateId', ($event.target as HTMLSelectElement).value ? Number(($event.target as HTMLSelectElement).value) : null)"
              class="w-full h-10 px-3 bg-white border border-outline-variant rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none cursor-pointer"
            >
              <option :value="null">اختر المحافظة...</option>
              <option v-for="s in filteredStates" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </div>
        </div>
      </ReceiptConfigCollapsible>

      <!-- Header Settings -->
      <ReceiptConfigCollapsible
        :icon="Receipt"
        title="رأس الفاتورة"
        :collapsed="collapsedSections.header"
        @toggle="emit('toggleSection', 'header')"
      >
        <label class="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            :checked="config.receipt.header.enabled"
            @change="updateReceipt(['header', 'enabled'], ($event.target as HTMLInputElement).checked)"
            class="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
          />
          <span class="text-sm">تمكين رأس الفاتورة</span>
        </label>
        <template v-if="config.receipt.header.enabled">
          <div class="space-y-2">
            <label class="block text-xs font-bold text-muted-foreground">عنوان الفاتورة</label>
            <input
              :value="config.receipt.titleAr"
              @input="updateReceipt(['titleAr'], ($event.target as HTMLInputElement).value)"
              class="w-full h-10 px-3 border border-outline-variant rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
              type="text"
            />
          </div>
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" :checked="config.receipt.header.companyLogo" @change="updateReceipt(['header', 'companyLogo'], ($event.target as HTMLInputElement).checked)" class="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" />
            <span class="text-sm">عرض الشعار</span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" :checked="config.receipt.header.companyName" @change="updateReceipt(['header', 'companyName'], ($event.target as HTMLInputElement).checked)" class="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" />
            <span class="text-sm">عرض اسم الشركة</span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" :checked="config.receipt.header.companyAddress" @change="updateReceipt(['header', 'companyAddress'], ($event.target as HTMLInputElement).checked)" class="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" />
            <span class="text-sm">عرض العنوان</span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" :checked="config.receipt.header.companyPhone" @change="updateReceipt(['header', 'companyPhone'], ($event.target as HTMLInputElement).checked)" class="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" />
            <span class="text-sm">عرض الهاتف</span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" :checked="config.receipt.header.companyEmail" @change="updateReceipt(['header', 'companyEmail'], ($event.target as HTMLInputElement).checked)" class="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" />
            <span class="text-sm">عرض البريد الإلكتروني</span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" :checked="config.receipt.header.companyWebsite" @change="updateReceipt(['header', 'companyWebsite'], ($event.target as HTMLInputElement).checked)" class="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" />
            <span class="text-sm">عرض الموقع الإلكتروني</span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" :checked="config.receipt.header.companyVat" @change="updateReceipt(['header', 'companyVat'], ($event.target as HTMLInputElement).checked)" class="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" />
            <span class="text-sm">عرض الرقم الضريبي</span>
          </label>
        </template>
      </ReceiptConfigCollapsible>

      <!-- Items Settings -->
      <ReceiptConfigCollapsible
        :icon="ListChecks"
        title="المنتجات"
        :collapsed="collapsedSections.items"
        @toggle="emit('toggleSection', 'items')"
      >
        <label class="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" :checked="config.receipt.items.enabled" @change="updateReceipt(['items', 'enabled'], ($event.target as HTMLInputElement).checked)" class="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" />
          <span class="text-sm">تمكين جدول المنتجات</span>
        </label>
        <template v-if="config.receipt.items.enabled">
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" :checked="config.receipt.items.showPrice" @change="updateReceipt(['items', 'showPrice'], ($event.target as HTMLInputElement).checked)" class="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" />
            <span class="text-sm">عرض السعر</span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" :checked="config.receipt.items.showQuantity" @change="updateReceipt(['items', 'showQuantity'], ($event.target as HTMLInputElement).checked)" class="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" />
            <span class="text-sm">عرض الكمية</span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" :checked="config.receipt.items.showTotal" @change="updateReceipt(['items', 'showTotal'], ($event.target as HTMLInputElement).checked)" class="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" />
            <span class="text-sm">عرض الإجمالي</span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" :checked="config.receipt.items.showDiscount" @change="updateReceipt(['items', 'showDiscount'], ($event.target as HTMLInputElement).checked)" class="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" />
            <span class="text-sm">عرض الخصم</span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" :checked="config.receipt.items.showTax" @change="updateReceipt(['items', 'showTax'], ($event.target as HTMLInputElement).checked)" class="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" />
            <span class="text-sm">عرض الضريبة</span>
          </label>
        </template>
      </ReceiptConfigCollapsible>

      <!-- Payments Settings -->
      <ReceiptConfigCollapsible
        :icon="Wallet"
        title="طرق الدفع"
        :collapsed="collapsedSections.payments"
        @toggle="emit('toggleSection', 'payments')"
      >
        <label class="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" :checked="config.receipt.payments.enabled" @change="updateReceipt(['payments', 'enabled'], ($event.target as HTMLInputElement).checked)" class="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" />
          <span class="text-sm">تمكين قسم الدفع</span>
        </label>
        <template v-if="config.receipt.payments.enabled">
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" :checked="config.receipt.payments.showMethod" @change="updateReceipt(['payments', 'showMethod'], ($event.target as HTMLInputElement).checked)" class="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" />
            <span class="text-sm">عرض وسيلة الدفع</span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" :checked="config.receipt.payments.showAmount" @change="updateReceipt(['payments', 'showAmount'], ($event.target as HTMLInputElement).checked)" class="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" />
            <span class="text-sm">عرض المبلغ</span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" :checked="config.receipt.payments.showChange" @change="updateReceipt(['payments', 'showChange'], ($event.target as HTMLInputElement).checked)" class="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" />
            <span class="text-sm">عرض الباقي</span>
          </label>
        </template>
      </ReceiptConfigCollapsible>

      <!-- Totals Settings -->
      <ReceiptConfigCollapsible
        :icon="Percent"
        title="الإجماليات"
        :collapsed="collapsedSections.totals"
        @toggle="emit('toggleSection', 'totals')"
      >
        <label class="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" :checked="config.receipt.totals.enabled" @change="updateReceipt(['totals', 'enabled'], ($event.target as HTMLInputElement).checked)" class="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" />
          <span class="text-sm">تمكين الإجماليات</span>
        </label>
        <template v-if="config.receipt.totals.enabled">
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" :checked="config.receipt.totals.showSubtotal" @change="updateReceipt(['totals', 'showSubtotal'], ($event.target as HTMLInputElement).checked)" class="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" />
            <span class="text-sm">عرض المجموع</span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" :checked="config.receipt.totals.showDiscount" @change="updateReceipt(['totals', 'showDiscount'], ($event.target as HTMLInputElement).checked)" class="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" />
            <span class="text-sm">عرض الخصم</span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" :checked="config.receipt.totals.showServiceFee" @change="updateReceipt(['totals', 'showServiceFee'], ($event.target as HTMLInputElement).checked)" class="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" />
            <span class="text-sm">عرض الرسوم الإضافية</span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" :checked="config.receipt.totals.showGrandTotal" @change="updateReceipt(['totals', 'showGrandTotal'], ($event.target as HTMLInputElement).checked)" class="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" />
            <span class="text-sm">عرض الإجمالي الكلي</span>
          </label>
          <div class="space-y-2">
            <label class="block text-xs font-bold text-muted-foreground">رمز العملة</label>
            <input
              :value="config.receipt.totals.currency"
              @input="updateReceipt(['totals', 'currency'], ($event.target as HTMLInputElement).value)"
              class="w-full h-10 px-3 border border-outline-variant rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
              type="text"
              placeholder="ج.م"
            />
          </div>
        </template>
      </ReceiptConfigCollapsible>

      <!-- Footer Settings -->
      <ReceiptConfigCollapsible
        :icon="FileText"
        title="تذييل الفاتورة"
        :collapsed="collapsedSections.footer"
        @toggle="emit('toggleSection', 'footer')"
      >
        <label class="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" :checked="config.receipt.footer.enabled" @change="updateReceipt(['footer', 'enabled'], ($event.target as HTMLInputElement).checked)" class="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" />
          <span class="text-sm">تمكين التذييل</span>
        </label>
        <template v-if="config.receipt.footer.enabled">
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" :checked="config.receipt.footer.showThankYou" @change="updateReceipt(['footer', 'showThankYou'], ($event.target as HTMLInputElement).checked)" class="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" />
            <span class="text-sm">عرض نص الشكر</span>
          </label>
          <div v-if="config.receipt.footer.showThankYou" class="space-y-2">
            <label class="block text-xs font-bold text-muted-foreground">نص الشكر</label>
            <input
              :value="config.receipt.footer.thankYouText"
              @input="updateReceipt(['footer', 'thankYouText'], ($event.target as HTMLInputElement).value)"
              class="w-full h-10 px-3 border border-outline-variant rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
              type="text"
              placeholder="شكراً لتسوقكم معنا"
            />
          </div>
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" :checked="config.receipt.footer.showOrderNumber" @change="updateReceipt(['footer', 'showOrderNumber'], ($event.target as HTMLInputElement).checked)" class="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" />
            <span class="text-sm">عرض رقم الفاتورة</span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" :checked="config.receipt.footer.showDate" @change="updateReceipt(['footer', 'showDate'], ($event.target as HTMLInputElement).checked)" class="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" />
            <span class="text-sm">عرض التاريخ</span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" :checked="config.receipt.footer.showTime" @change="updateReceipt(['footer', 'showTime'], ($event.target as HTMLInputElement).checked)" class="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" />
            <span class="text-sm">عرض الوقت</span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" :checked="config.receipt.footer.showCashier" @change="updateReceipt(['footer', 'showCashier'], ($event.target as HTMLInputElement).checked)" class="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" />
            <span class="text-sm">عرض اسم الكاشير</span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" :checked="config.receipt.footer.showTerms" @change="updateReceipt(['footer', 'showTerms'], ($event.target as HTMLInputElement).checked)" class="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" />
            <span class="text-sm">عرض الشروط</span>
          </label>
          <div v-if="config.receipt.footer.showTerms" class="space-y-2">
            <label class="block text-xs font-bold text-muted-foreground">نص الشروط</label>
            <textarea
              :value="config.receipt.footer.termsText"
              @input="updateReceipt(['footer', 'termsText'], ($event.target as HTMLTextAreaElement).value)"
              rows="2"
              class="w-full px-3 py-2 border border-outline-variant rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none resize-none"
              placeholder="نص الشروط والأحكام..."
            />
          </div>
        </template>
      </ReceiptConfigCollapsible>

      <!-- Appearance -->
      <ReceiptConfigCollapsible
        :icon="Palette"
        title="المظهر"
        :collapsed="collapsedSections.appearance"
        @toggle="emit('toggleSection', 'appearance')"
      >
        <div class="space-y-2">
          <label class="block text-xs font-bold text-muted-foreground">نوع الخط</label>
          <select
            :value="config.receipt.fontFamily"
            @change="updateReceipt(['fontFamily'], ($event.target as HTMLSelectElement).value)"
            class="w-full h-10 px-3 bg-white border border-outline-variant rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none cursor-pointer"
          >
            <option value="Courier New, monospace">Courier New</option>
            <option value="Arial, sans-serif">Arial</option>
            <option value="'Courier New', 'Cairo', monospace">Courier New + Cairo</option>
            <option value="monospace">Monospace</option>
            <option value="'Cairo', sans-serif">Cairo</option>
          </select>
        </div>
        <div class="space-y-2">
          <label class="block text-xs font-bold text-muted-foreground">سمك الخط</label>
          <select
            :value="config.receipt.fontWeight"
            @change="updateReceipt(['fontWeight'], ($event.target as HTMLSelectElement).value)"
            class="w-full h-10 px-3 bg-white border border-outline-variant rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none cursor-pointer"
          >
            <option value="normal">عادي</option>
            <option value="500">متوسط</option>
            <option value="bold">عريض</option>
          </select>
        </div>
        <div class="space-y-2">
          <label class="block text-xs font-bold text-muted-foreground">حجم الخط (px)</label>
          <div class="flex items-center gap-3">
            <input
              :value="config.receipt.fontSize"
              @input="updateReceipt(['fontSize'], Number(($event.target as HTMLInputElement).value))"
              type="range"
              min="8"
              max="28"
              class="flex-1 accent-primary"
            />
            <span class="text-sm font-bold w-8 text-center">{{ config.receipt.fontSize }}</span>
          </div>
        </div>
        <div class="space-y-2">
          <label class="block text-xs font-bold text-muted-foreground">عرض الورق (px)</label>
          <div class="flex items-center gap-3">
            <input
              :value="config.receipt.width"
              @input="updateReceipt(['width'], Number(($event.target as HTMLInputElement).value))"
              type="range"
              min="200"
              max="500"
              step="10"
              class="flex-1 accent-primary"
            />
            <span class="text-sm font-bold w-12 text-center">{{ config.receipt.width }}</span>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-2">
            <label class="block text-xs font-bold text-muted-foreground">اللون الأساسي</label>
            <div class="flex items-center gap-2">
              <input
                :value="config.receipt.colors.primary"
                @input="updateReceipt(['colors', 'primary'], ($event.target as HTMLInputElement).value)"
                type="color"
                class="w-10 h-10 rounded-lg border border-outline-variant cursor-pointer p-0.5"
              />
              <span class="text-xs text-muted-foreground">{{ config.receipt.colors.primary }}</span>
            </div>
          </div>
          <div class="space-y-2">
            <label class="block text-xs font-bold text-muted-foreground">اللون الثانوي</label>
            <div class="flex items-center gap-2">
              <input
                :value="config.receipt.colors.secondary"
                @input="updateReceipt(['colors', 'secondary'], ($event.target as HTMLInputElement).value)"
                type="color"
                class="w-10 h-10 rounded-lg border border-outline-variant cursor-pointer p-0.5"
              />
              <span class="text-xs text-muted-foreground">{{ config.receipt.colors.secondary }}</span>
            </div>
          </div>
          <div class="space-y-2">
            <label class="block text-xs font-bold text-muted-foreground">لون التمييز</label>
            <div class="flex items-center gap-2">
              <input
                :value="config.receipt.colors.accent"
                @input="updateReceipt(['colors', 'accent'], ($event.target as HTMLInputElement).value)"
                type="color"
                class="w-10 h-10 rounded-lg border border-outline-variant cursor-pointer p-0.5"
              />
              <span class="text-xs text-muted-foreground">{{ config.receipt.colors.accent }}</span>
            </div>
          </div>
          <div class="space-y-2">
            <label class="block text-xs font-bold text-muted-foreground">لون النص</label>
            <div class="flex items-center gap-2">
              <input
                :value="config.receipt.colors.text"
                @input="updateReceipt(['colors', 'text'], ($event.target as HTMLInputElement).value)"
                type="color"
                class="w-10 h-10 rounded-lg border border-outline-variant cursor-pointer p-0.5"
              />
              <span class="text-xs text-muted-foreground">{{ config.receipt.colors.text }}</span>
            </div>
          </div>
          <div class="space-y-2">
            <label class="block text-xs font-bold text-muted-foreground">لون الخلفية</label>
            <div class="flex items-center gap-2">
              <input
                :value="config.receipt.colors.background"
                @input="updateReceipt(['colors', 'background'], ($event.target as HTMLInputElement).value)"
                type="color"
                class="w-10 h-10 rounded-lg border border-outline-variant cursor-pointer p-0.5"
              />
              <span class="text-xs text-muted-foreground">{{ config.receipt.colors.background }}</span>
            </div>
          </div>
        </div>
      </ReceiptConfigCollapsible>

      <!-- Layout -->
      <ReceiptConfigCollapsible
        :icon="Layout"
        title="التخطيط"
        :collapsed="collapsedSections.layout"
        @toggle="emit('toggleSection', 'layout')"
      >
        <label class="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" :checked="config.receipt.layout.showDivider" @change="updateReceipt(['layout', 'showDivider'], ($event.target as HTMLInputElement).checked)" class="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" />
          <span class="text-sm">إظهار الفواصل</span>
        </label>
        <div v-if="config.receipt.layout.showDivider" class="space-y-2">
          <label class="block text-xs font-bold text-muted-foreground">نوع الفاصل</label>
          <select
            :value="config.receipt.layout.dividerStyle"
            @change="updateReceipt(['layout', 'dividerStyle'], ($event.target as HTMLSelectElement).value)"
            class="w-full h-10 px-3 bg-white border border-outline-variant rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none cursor-pointer"
          >
            <option value="dashed">متقطع</option>
            <option value="solid">صلب</option>
            <option value="dotted">منقط</option>
          </select>
        </div>
        <label class="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" :checked="config.receipt.layout.showBorder" @change="updateReceipt(['layout', 'showBorder'], ($event.target as HTMLInputElement).checked)" class="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary" />
          <span class="text-sm">إظهار الحدود</span>
        </label>
        <div v-if="config.receipt.layout.showBorder" class="space-y-2">
          <label class="block text-xs font-bold text-muted-foreground">نوع الحدود</label>
          <select
            :value="config.receipt.layout.borderStyle"
            @change="updateReceipt(['layout', 'borderStyle'], ($event.target as HTMLSelectElement).value)"
            class="w-full h-10 px-3 bg-white border border-outline-variant rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none cursor-pointer"
          >
            <option value="solid">صلب</option>
            <option value="dashed">متقطع</option>
            <option value="dotted">منقط</option>
          </select>
        </div>
      </ReceiptConfigCollapsible>
    </div>

    <!-- Save / Discard -->
    <div class="pt-4 mt-4 border-t border-outline-variant flex gap-4">
      <button
        type="button"
        @click="emit('save')"
        :disabled="isSaving"
        class="flex-1 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/95 transition-all cursor-pointer text-center disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <RefreshCw v-if="isSaving" class="w-5 h-5 animate-spin" />
        <Save v-else class="w-5 h-5" />
        حفظ التصميم
      </button>
      <button
        type="button"
        @click="emit('discard')"
        class="flex-1 py-3 border border-outline-variant text-foreground font-bold rounded-lg hover:bg-muted/50 transition-all cursor-pointer text-center flex items-center justify-center gap-2"
      >
        <X class="w-5 h-5" />
        إلغاء التغييرات
      </button>
    </div>
  </div>
</template>
