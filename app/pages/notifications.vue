<script setup lang="ts">
import { ref, onMounted, computed } from "vue"
import { useRouter } from "#app"
import { Bell, CheckCheck, Filter } from "@lucide/vue"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { useNotificationsStore } from "~~/stores/notifications"
import { useAuth } from "~~/app/composables/useAuth"
import { usePermissions } from "~~/app/composables/usePermissions"

const router = useRouter()
const store = useNotificationsStore()
const { hasPermission } = usePermissions()

const { isAuthenticated } = useAuth()

const tabs = [
  { label: "الكل", value: "" },
  { label: "غير مقروء", value: "unread" },
]

const activeTab = ref("")

onMounted(async () => {
  if (!isAuthenticated.value || !hasPermission("settings_access_rights")) {
    router.push("/")
    return
  }
  store.setUnreadFilter(false)
  await store.fetchNotifications()
  await store.fetchUnreadCount()
  await store.fetchCategories()
})

function selectCategory(cat: string) {
  store.setCategoryFilter(store.categoryFilter === cat ? "" : cat)
}

const pageCount = computed(() => Math.ceil(store.total / store.limit))

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "الآن"
  if (mins < 60) return `منذ ${mins} دقيقة`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `منذ ${hrs} ساعة`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `منذ ${days} يوم`
  return dateStr.slice(0, 10)
}

const priorityConfig: Record<string, { label: string; class: string }> = {
  high: { label: "عالية", class: "bg-red-100 text-red-700 border-red-200" },
  medium: { label: "متوسطة", class: "bg-amber-100 text-amber-700 border-amber-200" },
  low: { label: "منخفضة", class: "bg-green-100 text-green-700 border-green-200" },
}
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <Bell class="w-6 h-6 text-primary" />
        <h1 class="text-2xl font-bold">الإشعارات</h1>
        <Badge
          v-if="store.unreadCount > 0"
          variant="secondary"
          class="text-sm"
        >
          {{ store.unreadCount }} غير مقروء
        </Badge>
      </div>
      <Button
        v-if="store.unreadCount > 0"
        variant="outline"
        size="sm"
        class="gap-2"
        @click="store.markAllRead()"
      >
        <CheckCheck class="w-4 h-4" />
        تحديد الكل كمقروء
      </Button>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <div class="flex gap-1 bg-muted rounded-lg p-1">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          class="px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
          :class="activeTab === tab.value ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'"
          @click="activeTab = tab.value; store.setUnreadFilter(tab.value === 'unread')"
        >
          {{ tab.label }}
        </button>
      </div>

      <div v-if="store.categories.length > 1" class="flex items-center gap-2 mr-auto">
        <Filter class="w-4 h-4 text-muted-foreground" />
        <select
          class="text-sm border border-border rounded-lg px-3 py-1.5 bg-background"
          :value="store.categoryFilter"
          @change="(e: any) => store.setCategoryFilter(e.target.value)"
        >
          <option value="">كل التصنيفات</option>
          <option v-for="cat in store.categories" :key="cat" :value="cat">{{ cat }}</option>
        </select>
      </div>
    </div>

    <div v-if="store.loading && store.notifications.length === 0" class="space-y-3">
      <div v-for="i in 5" :key="i" class="bg-card border border-border rounded-xl p-4 animate-pulse">
        <div class="flex items-start gap-3">
          <div class="w-3 h-3 rounded-full bg-muted mt-1" />
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-muted rounded w-3/4" />
            <div class="h-3 bg-muted rounded w-1/2" />
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="store.notifications.length === 0" class="text-center py-16">
      <Bell class="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
      <p class="text-lg font-medium text-muted-foreground">لا توجد إشعارات</p>
      <p class="text-sm text-muted-foreground/60">سيتم عرض الإشعارات هنا عند حدوثها</p>
    </div>

    <TransitionGroup v-else name="list" tag="div" class="space-y-2">
      <Card
        v-for="n in store.notifications"
        :key="n.id"
        class="p-4 transition-all"
        :class="{ 'border-primary/30 bg-primary/[0.02]': !n.is_read }"
      >
        <div class="flex items-start gap-3">
          <div
            class="w-3 h-3 rounded-full mt-1.5 shrink-0"
            :class="{
              'bg-red-500': n.priority === 'high',
              'bg-amber-500': n.priority === 'medium',
              'bg-green-500': n.priority === 'low',
            }"
          />
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="font-medium text-sm" :class="{ 'text-foreground': !n.is_read, 'text-muted-foreground': n.is_read }">
                  {{ n.title }}
                </p>
                <p v-if="n.description" class="text-xs text-muted-foreground mt-1">{{ n.description }}</p>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <Badge
                  variant="outline"
                  class="text-[10px] px-2 py-0"
                  :class="priorityConfig[n.priority]?.class"
                >
                  {{ priorityConfig[n.priority]?.label }}
                </Badge>
              </div>
            </div>
            <div class="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground/60">
              <span>{{ timeAgo(n.created_at) }}</span>
              <span class="w-1 h-1 rounded-full bg-muted-foreground/30" />
              <span>{{ n.category }}</span>
            </div>
          </div>
          <button
            v-if="!n.is_read"
            class="shrink-0 w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
            title="تحديد كمقروء"
            @click="store.markRead(n.id)"
          >
            <CheckCheck class="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </Card>
    </TransitionGroup>

    <div
      v-if="pageCount > 1"
      class="flex items-center justify-center gap-2 pt-4"
    >
      <Button
        variant="outline"
        size="sm"
        :disabled="store.page <= 1"
        @click="store.setPage(store.page - 1)"
      >
        السابق
      </Button>
      <span class="text-sm text-muted-foreground px-2">
        صفحة {{ store.page }} من {{ pageCount }}
      </span>
      <Button
        variant="outline"
        size="sm"
        :disabled="store.page >= pageCount"
        @click="store.setPage(store.page + 1)"
      >
        التالي
      </Button>
    </div>
  </div>
</template>
