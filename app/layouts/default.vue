<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute } from "#app";
import { Receipt } from "@lucide/vue";
import { navLinks } from "~/lib/navlinks";
import { useAuthStore } from "~~/stores/auth";

const route = useRoute();
const auth = useAuthStore();

const userInitial = computed(() => {
  const name = auth.user?.name;
  return name ? name.trim().charAt(0).toUpperCase() : "U";
});

const pageTitle = computed(() => {
  const currentLink = navLinks.find((link) => {
    if (link.path === "/") return route.path === "/";
    return route.path.startsWith(link.path);
  });
  if (currentLink) return currentLink.name;
  if (route.path.startsWith("/customer-details")) return "تفاصيل العميل";
  if (route.path.startsWith("/supplier-details")) return "تفاصيل المورد";
  if (route.path.startsWith("/reports")) return "التقارير";
  if (route.path.startsWith("/user-profile")) return "الملف الشخصي";
  if (route.path.startsWith("/company-profile")) return "بيانات الشركة";
  if (route.path.startsWith("/receipt-design")) return "تصميم الفاتورة";
  return "easyweb";
});
</script>

<template>
  <div
    class="min-h-screen bg-background text-foreground font-sans flex flex-col"
    dir="rtl"
  >
    <header
      v-if="route.path !== '/login'"
      class="bg-background border-b border-border flex justify-between items-center w-full px-3 md:px-6 h-16 z-40 sticky top-0"
    >
      <!-- Right side: Sidebar Toggle & Page Title (Assuming RTL context) -->
      <div class="flex items-center gap-2 md:gap-4">
        <AppSidebar />
        <h1 class="text-lg font-bold text-primary">{{ pageTitle }}</h1>
      </div>

      <!-- Left side: User profile & Current Company details -->
      <div class="flex items-center gap-2 md:gap-4">
        <!-- Notification Bell -->
        <AppNotificationBell />

        <!-- POS Shortcut Button -->
        <NuxtLink
          to="/pos"
          class="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-colors text-sm font-semibold"
          title="نقاط البيع"
        >
          <Receipt class="w-4 h-4" />
          <span class="hidden sm:inline">نقاط البيع</span>
        </NuxtLink>

        <!-- Company Badge & Username Info -->
        <div class="flex flex-col text-left md:text-right">
          <span class="text-sm font-semibold text-foreground hidden md:block">
            {{ auth.user?.name || "مستخدم" }}
          </span>
          <span class="text-xs font-medium text-muted-foreground hidden md:block">
            {{
              auth.user?.allowedCompanies.find((company) => {
                return company.id === auth.user?.primaryCompanyId;
              })?.name || "الفرع الرئيسي"
            }}
          </span>
        </div>

        <!-- Avatar with Initial Letter -->
        <NuxtLink
          to="/user-profile"
          class="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-sm select-none"
          title="الملف الشخصي"
        >
          {{ userInitial }}
        </NuxtLink>
      </div>
    </header>

    <main
      :class="
        route.path === '/login'
          ? 'w-full min-h-screen flex items-center justify-center p-0 overflow-hidden'
          : 'w-full p-6 lg:pb-8'
      "
    >
      <slot />
    </main>

  </div>
</template>
