<script setup lang="ts">
import { ref, onMounted } from "vue"
import { Plus } from "@lucide/vue"
import { Button } from "@/components/ui/button"
import UsersTable from "~/components/users/UsersTable.vue"
import UserDrawer from "~/components/users/UserDrawer.vue"
import { usePermissions } from "~/composables/usePermissions"
import { useAuthStore } from "../../stores/auth"

const { canViewPage, can } = usePermissions()
const route = useRoute()

if (import.meta.client) {
  if (!canViewPage(route.path)) {
    navigateTo('/')
  }
}

const users = ref<any[]>([])
const total = ref(0)
const loading = ref(false)
const page = ref(1)
const search = ref("")
const drawerOpen = ref(false)
const selectedUser = ref<any | null>(null)
const groups = ref<any[]>([])
const groupsLoading = ref(false)

async function fetchUsers() {
  loading.value = true
  try {
    const res = await $fetch<any>("/api/users", {
      params: { page: page.value, search: search.value },
    })
    if (res.success) {
      users.value = res.data
      total.value = res.total
    }
  } catch {
    users.value = []
  } finally {
    loading.value = false
  }
}

async function fetchGroups() {
  groupsLoading.value = true
  try {
    const res = await $fetch<any>("/api/users/groups")
    if (res.success) {
      groups.value = res.data
    }
  } catch {
    groups.value = []
  } finally {
    groupsLoading.value = false
  }
}

function openAddDrawer() {
  selectedUser.value = null
  drawerOpen.value = true
}

async function openEditDrawer(user: any) {
  try {
    const res = await $fetch<any>("/api/users/detail", { params: { id: user.id } })
    if (res.success) {
      selectedUser.value = res.data
    } else {
      selectedUser.value = user
    }
  } catch {
    selectedUser.value = user
  }
  drawerOpen.value = true
}

async function handleSave(data: any) {
  try {
    const isEdit = !!data.id
    const endpoint = isEdit ? "/api/users/update" : "/api/users/create"
    const res = await $fetch<any>(endpoint, {
      method: "POST",
      body: data,
    })
    if (res.success) {
      if (res.roles) {
        const auth = useAuthStore()
        auth.userRoles = res.roles
      }
      drawerOpen.value = false
      await fetchUsers()
    }
  } catch (err: any) {
    alert(err.statusMessage || err.message || "فشل الحفظ")
  }
}

async function handleDelete(user: any) {
  if (!confirm(`هل أنت متأكد من تعطيل المستخدم "${user.name}"؟`)) return
  try {
    const res = await $fetch<any>("/api/users/delete", {
      method: "POST",
      body: { id: user.id },
    })
    if (res.success) {
      await fetchUsers()
    }
  } catch (err: any) {
    alert(err.statusMessage || err.message || "فشل التعطيل")
  }
}

onMounted(() => {
  fetchUsers()
  if (can.value('user.manage')) {
    fetchGroups()
  }
})
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">المستخدمين</h1>
      <Button
        v-if="can('user.manage')"
        @click="openAddDrawer"
        class="gap-2 cursor-pointer"
      >
        <Plus class="w-4 h-4" />
        مستخدم جديد
      </Button>
    </div>

    <div class="flex items-center gap-3">
      <input
        v-model="search"
        type="text"
        placeholder="بحث..."
        class="h-10 border border-border rounded-lg px-3 text-sm max-w-xs focus:ring-2 focus:ring-primary focus:outline-none"
        @input="fetchUsers"
      />
    </div>

    <div class="bg-card border border-border rounded-xl overflow-hidden">
      <UsersTable
        :users="users"
        :loading="loading"
        @edit="openEditDrawer"
        @delete="handleDelete"
      />
    </div>

    <div class="flex items-center justify-between text-sm text-muted-foreground">
      <span>إجمالي {{ total }} مستخدم</span>
    </div>

    <UserDrawer
      :open="drawerOpen"
      :user="selectedUser"
      :groups="groups"
      :loading="groupsLoading"
      @update:open="drawerOpen = $event"
      @save="handleSave"
    />
  </div>
</template>
