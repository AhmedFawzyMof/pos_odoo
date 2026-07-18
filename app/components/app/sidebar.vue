<script setup lang="ts">
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "../ui/button";
import { Menu, LogOut, ChevronDown } from "@lucide/vue";
import { groupedNav } from "~/lib/navlinks";
import type { NavGroup } from "~/lib/navlinks";
import { usePermissions } from "~/composables/usePermissions";

const route = useRoute();
const { logout, user, username } = useAuth();
const { hasPermission } = usePermissions();

function canSeeLink(link: { requiredPermission?: string }): boolean {
  if (!link.requiredPermission) return true
  return hasPermission(link.requiredPermission)
}

const filteredNav = computed(() =>
  groupedNav.filter((entry) => {
    if ("children" in entry) {
      const visibleChildren = entry.children.filter(canSeeLink)
      return visibleChildren.length > 0
    }
    return canSeeLink(entry)
  }),
)

const expanded = ref<Record<string, boolean>>(
  Object.fromEntries(
    groupedNav
      .filter((e): e is NavGroup => "children" in e)
      .map((g) => [g.name, true]),
  ),
);

const toggleGroup = (name: string) => {
  expanded.value[name] = !expanded.value[name];
};

const pageTitle = computed(() => {
  const allLinks = filteredNav.value.flatMap((entry) =>
    "children" in entry ? entry.children : [entry],
  );
  const currentLink = allLinks.find((link) => {
    if (link.path === "/") return route.path === "/";
    return route.path.startsWith(link.path);
  });
  if (currentLink) return currentLink.name;
  if (route.path.startsWith("/customer-details")) return "تفاصيل العميل";
  if (route.path.startsWith("/supplier-details")) return "تفاصيل المورد";
  if (route.path.startsWith("/user-profile")) return "الملف الشخصي";
  if (route.path.startsWith("/company-profile")) return "بيانات الشركة";
  if (route.path.startsWith("/receipt-design")) return "تصميم الفاتورة";
  return "easyweb POS";
});

const isActive = (linkPath: string) =>
  linkPath === "/" ? route.path === "/" : route.path.startsWith(linkPath);

const isGroupActive = (group: NavGroup) =>
  group.children.some((child) => isActive(child.path));
</script>

<template>
  <Sheet>
    <SheetTrigger as-child>
      <Button
        variant="ghost"
        size="icon"
        class="rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
      >
        <Menu class="w-5 h-5" />
      </Button>
    </SheetTrigger>
    <SheetContent
      side="right"
      class="w-80 p-0 flex flex-col h-full bg-background border-l border-border"
    >
      <!-- Header / Brand -->
      <div class="p-6 border-b border-border flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-xl shadow-lg shadow-primary/25"
        >
          O
        </div>
        <div class="flex flex-col">
          <span
            class="font-bold text-lg text-foreground tracking-wide leading-none"
            >easyweb POS</span
          >
          <span class="text-xs text-muted-foreground mt-1"
            >نظام إدارة نقاط البيع بالتجزئة</span
          >
        </div>
      </div>

      <!-- Navigation Links -->
      <div class="flex-1 overflow-y-auto px-4 py-6">
        <nav class="space-y-1">
          <template v-for="entry in filteredNav" :key="'children' in entry ? entry.name : entry.path">
            <!-- Group -->
            <div v-if="'children' in entry" class="space-y-0.5">
              <button
                class="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted/80"
                :class="{ 'bg-muted/80 text-foreground': isGroupActive(entry) }"
                @click="toggleGroup(entry.name)"
              >
                <span class="w-5 h-5 flex items-center justify-center shrink-0">
                  <component
                    :is="entry.icon"
                    class="w-5 h-5"
                  />
                </span>
                <span class="flex-1 text-right">{{ entry.name }}</span>
                <ChevronDown
                  class="w-4 h-4 transition-transform duration-200"
                  :class="{ 'rotate-180': expanded[entry.name] }"
                />
              </button>
              <Transition name="slide">
                <div v-if="expanded[entry.name]" class="space-y-0.5 mr-3">
                  <SheetClose
                    as-child
                    v-for="child in entry.children"
                    :key="child.path"
                  >
                    <NuxtLink
                      :to="child.path"
                      class="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group"
                      :class="[
                        isActive(child.path)
                          ? 'bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/20'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/80',
                      ]"
                    >
                      <span class="w-5 h-5 flex items-center justify-center shrink-0">
                        <component
                          :is="child.icon"
                          class="w-4 h-4 transition-transform duration-200 group-hover:scale-110"
                        />
                      </span>
                      <span>{{ child.name }}</span>
                    </NuxtLink>
                  </SheetClose>
                </div>
              </Transition>
            </div>

            <!-- Standalone link -->
            <SheetClose v-else as-child>
              <NuxtLink
                :to="entry.path"
                class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group"
                :class="[
                  isActive(entry.path)
                    ? 'bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/80',
                ]"
              >
                <span class="w-5 h-5 flex items-center justify-center shrink-0">
                  <component
                    :is="entry.icon"
                    class="w-5 h-5 transition-transform duration-200 group-hover:scale-110"
                  />
                </span>
                <span>{{ entry.name }}</span>
              </NuxtLink>
            </SheetClose>
          </template>
        </nav>
      </div>

      <div class="p-4 border-t border-border bg-muted/40 space-y-2">
        <div class="flex items-center gap-3 p-2 rounded-lg">
          <div
            class="w-10 h-10 bg-primary rounded-full text-white flex items-center justify-center"
          >
            <span class="font-bold">
              {{ user?.name[0] }}
            </span>
          </div>
          <div class="flex flex-col min-w-0">
            <span class="text-sm font-semibold text-foreground truncate">{{
              user?.name
            }}</span>
            <span class="text-[10px] text-muted-foreground truncate">{{
              username
            }}</span>
          </div>
        </div>
        <Button
          variant="ghost"
          class="w-full justify-start gap-3 px-3 py-2 text-sm font-medium text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all duration-200"
          @click="logout"
        >
          <LogOut class="w-4 h-4 shrink-0" />
          <span>تسجيل الخروج</span>
        </Button>
      </div>
    </SheetContent>
  </Sheet>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: all 0.2s ease;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
