<script setup lang="ts">
import { ref, watch, computed } from "vue"
import { X, RefreshCw, AlertTriangle } from "@lucide/vue"
import { Groups, categorizeGroups, RoleToOdooGroupName, type EnrichedPage } from "~/types/permissions"

const props = defineProps<{
  open: boolean
  user: any | null
  groups: any[]
  loading: boolean
}>()

const emit = defineEmits<{
  "update:open": [boolean]
  save: [data: any]
}>()

const isEditing = ref(false)
const name = ref("")
const login = ref("")
const email = ref("")
const password = ref("")
const passwordConfirm = ref("")
const saving = ref(false)
const error = ref("")

const selectedPageLevels = ref<Record<string, string>>({})
const preservedGroupIds = ref<number[]>([])

const categorizedData = computed(() => {
  if (!props.groups.length) return { enrichedPages: [] as EnrichedPage[] }
  return categorizeGroups(props.groups)
})

const enrichedPages = computed(() => categorizedData.value.enrichedPages)

function collectLevelIds(page: EnrichedPage, levelId: string): string[] {
  const result: string[] = []
  const level = page.levels.find(l => l.id === levelId)
  if (!level) return result
  result.push(levelId)
  if (level.dependsOn) {
    result.push(...collectLevelIds(page, level.dependsOn))
  }
  return result
}

function findGroupByOdooGroupName(odooGroupName: string): any | undefined {
  return props.groups.find((g: any) => {
    const fn = g.fullName || `${g.categoryName} / ${g.name}`
    return fn === odooGroupName || g.name === odooGroupName
  })
}

const selectedGroupIds = computed(() => {
  const ids: number[] = []

  const odooGroupName = RoleToOdooGroupName[Groups.BASE_USER]
  const baseUser = odooGroupName ? findGroupByOdooGroupName(odooGroupName) : null
  if (baseUser) ids.push(baseUser.id)

  for (const page of enrichedPages.value) {
    const levelId = selectedPageLevels.value[page.key]
    if (!levelId) continue

    const levelIds = collectLevelIds(page, levelId)
    for (const lid of levelIds) {
      const level = page.levels.find(l => l.id === lid)
      if (!level) continue
      const odooGroupName = RoleToOdooGroupName[Groups[level.groupRef]]
      if (odooGroupName) {
        const match = findGroupByOdooGroupName(odooGroupName)
        if (match) ids.push(match.id)
      }
    }

    const selectedLevel = page.levels.find(l => l.id === levelId)
    const isHighest = selectedLevel === page.levels[page.levels.length - 1]
    if (isHighest) {
      for (const ag of page.additionalGroups) {
        ids.push(ag.id)
      }
    }
  }
  for (const gid of preservedGroupIds.value) {
    ids.push(gid)
  }
  return [...new Set(ids)]
})

const selectedRoleNames = computed(() => {
  const roles: string[] = []
  for (const page of enrichedPages.value) {
    const levelId = selectedPageLevels.value[page.key]
    if (!levelId) continue
    const levelIds = collectLevelIds(page, levelId)
    for (const lid of levelIds) {
      const level = page.levels.find(l => l.id === lid)
      if (level) {
        roles.push(Groups[level.groupRef])
      }
    }
  }
  return roles
})

function setPageLevel(pageKey: string, levelId: string) {
  selectedPageLevels.value = { ...selectedPageLevels.value, [pageKey]: levelId }
}

watch([() => props.open, () => props.user], ([open, user]) => {
  if (!open) return
  isEditing.value = !!user
  name.value = user?.name || ""
  login.value = user?.login || ""
  email.value = user?.email || ""
  password.value = ""
  passwordConfirm.value = ""
  selectedPageLevels.value = {}
  error.value = ""

  if (!user) return

  const userGroupIds = (user.groups || []).map((g: any) => g.id)

  const userOwnedGroups = props.groups.filter((g: any) => userGroupIds.includes(g.id))
  const userOdooGroupNames = new Set(
    userOwnedGroups.map((g: any) => g.fullName || `${g.categoryName} / ${g.name}`)
  )
  const userSimpleGroupNames = new Set(userOwnedGroups.map((g: any) => g.name))

  for (const page of enrichedPages.value) {
    let bestLevel: string | null = null
    for (const level of page.levels) {
      const neededIds = collectLevelIds(page, level.id)
      const neededOdooNames = neededIds.map(lid => {
        const l = page.levels.find(ll => ll.id === lid)!
        return RoleToOdooGroupName[Groups[l.groupRef]]
      }).filter(Boolean)
      const hasAll = neededOdooNames.every(n => {
        if (userOdooGroupNames.has(n)) return true
        const simpleName = n.includes(' / ') ? n.split(' / ')[1] : n
        return userSimpleGroupNames.has(simpleName) || userSimpleGroupNames.has(n)
      })
      if (hasAll) {
        bestLevel = level.id
      }
    }
    if (bestLevel) {
      selectedPageLevels.value[page.key] = bestLevel
    }
  }

  const managedNames = new Set(Object.values(RoleToOdooGroupName))
  preservedGroupIds.value = userOwnedGroups
    .filter((g: any) => {
      const fn = g.fullName || `${g.categoryName} / ${g.name}`
      return !managedNames.has(fn) && !managedNames.has(g.name)
    })
    .map((g: any) => g.id)
})

function normalizeLogin(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.includes("@")) return trimmed;
  return `${trimmed}@gmail.com`;
}

async function handleSave() {
  error.value = ""

  if (!name.value.trim()) {
    error.value = "الاسم مطلوب"
    return
  }
  if (!isEditing.value && !login.value.trim()) {
    error.value = "اسم المستخدم مطلوب"
    return
  }
  if (!isEditing.value && !password.value) {
    error.value = "كلمة المرور مطلوبة"
    return
  }
  if (password.value && password.value !== passwordConfirm.value) {
    error.value = "كلمة المرور غير متطابقة"
    return
  }

  const finalLogin = normalizeLogin(login.value);

  saving.value = true
  emit("save", {
    id: props.user?.id,
    name: name.value.trim(),
    login: finalLogin,
    email: email.value.trim() || finalLogin,
    password: password.value || undefined,
    groups_id: selectedGroupIds.value,
    roles: selectedRoleNames.value,
  })
  saving.value = false
}
</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="open"
      class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
      @click.self="emit('update:open', false)"
    >
      <div
        class="fixed inset-y-0 left-0 w-full bg-white shadow-xl flex flex-col"
        dir="rtl"
      >
        <div class="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 class="text-lg font-bold">
            {{ isEditing ? 'تعديل مستخدم' : 'مستخدم جديد' }}
          </h2>
          <button
            @click="emit('update:open', false)"
            class="p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-4 space-y-4 text-right max-w-7xl mx-auto w-full">
          <div
            v-if="error"
            class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2"
          >
            <AlertTriangle class="w-4 h-4 shrink-0" />
            {{ error }}
          </div>

          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-gray-700">الاسم</label>
            <input
              v-model="name"
              type="text"
              class="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-gray-700">اسم المستخدم</label>
            <input
              v-model="login"
              type="text"
              :disabled="isEditing"
              class="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-gray-700">البريد الإلكتروني</label>
            <input
              v-model="email"
              type="email"
              class="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-gray-700">
              {{ isEditing ? 'كلمة المرور الجديدة (اتركها فارغة إذا لم ترد التغيير)' : 'كلمة المرور' }}
            </label>
            <input
              v-model="password"
              type="password"
              class="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div v-if="password" class="space-y-1.5">
            <label class="block text-xs font-bold text-gray-700">تأكيد كلمة المرور</label>
            <input
              v-model="passwordConfirm"
              type="password"
              class="w-full h-10 border border-gray-200 rounded-lg px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              :class="password !== passwordConfirm && passwordConfirm ? 'border-red-400' : ''"
            />
          </div>

          <div class="space-y-2">
            <label class="block text-xs font-bold text-gray-700">الصلاحيات</label>
            <div v-if="loading" class="text-sm text-muted-foreground">جاري تحميل المجموعات...</div>
            <div v-else class="space-y-4 max-h-80 overflow-y-auto">
              <div v-for="page in enrichedPages" :key="page.key" class="p-3 bg-gray-50 rounded-lg">
                <h4 class="text-xs font-bold text-gray-600 mb-2">{{ page.labelAr }}</h4>
                <div class="flex gap-1.5 flex-wrap">
                  <button
                    type="button"
                    @click="setPageLevel(page.key, '')"
                    :class="[
                      'px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer',
                      !selectedPageLevels[page.key]
                        ? 'bg-white border border-gray-300 text-gray-500'
                        : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                    ]"
                  >
                    لا يوجد
                  </button>
                  <button
                    v-for="level in page.levels"
                    :key="level.id"
                    type="button"
                    @click="setPageLevel(page.key, level.id)"
                    :class="[
                      'px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer',
                      selectedPageLevels[page.key] === level.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                    ]"
                  >
                    {{ level.labelAr }}
                  </button>
                </div>
                <div
                  v-if="selectedPageLevels[page.key]"
                  class="mt-1.5 text-[10px] text-gray-400 leading-relaxed"
                >
                  {{ page.levels.find(l => l.id === selectedPageLevels[page.key])?.descriptionAr }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="p-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            @click="emit('update:open', false)"
            class="h-10 px-4 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 cursor-pointer"
          >
            إلغاء
          </button>
          <button
            @click="handleSave"
            :disabled="saving"
            class="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-40 flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw v-if="saving" class="w-4 h-4 animate-spin" />
            {{ saving ? 'جاري الحفظ...' : 'حفظ' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
