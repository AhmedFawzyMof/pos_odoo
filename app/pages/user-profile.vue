<script setup lang="ts">
import { ref, computed } from "vue";
import {
  RefreshCw,
  CloudOff,
  User,
  Mail,
  AtSign,
  Globe,
  Clock,
  Shield,
  Upload,
  Palette,
  Check,
} from "@lucide/vue";
import { translateGroup } from "~~/app/utils/permissions";
import { useColorTheme, themeOptions } from "~/composables/useColorTheme";
import { usePermissions } from "~/composables/usePermissions";

const route = useRoute();
const { canViewPage } = usePermissions();

if (import.meta.client) {
  if (!canViewPage(route.path)) {
    navigateTo('/')
  }
}

const { currentTheme, applyTheme } = useColorTheme();

interface UserGroup {
  id: number;
  name: string;
  category_id: [number, string];
}

interface ProfileData {
  id: number;
  name: string;
  login: string;
  email: string;
  lang: string;
  tz: string;
  partnerId: number;
  avatar: string | null;
  groups: UserGroup[];
}

const {
  data: apiResponse,
  status,
  error,
  refresh,
  pending,
} = useFetch<{ success: boolean; data: ProfileData }>("/api/user/profile", {
  lazy: true,
});

const profile = computed(() => apiResponse.value?.data ?? null);

const editLang = ref("");
const editTz = ref("");
const editAvatar = ref<string | null>(null);
const avatarFile = ref<File | null>(null);
const avatarPreview = ref<string | null>(null);
const isSaving = ref(false);
const actionError = ref("");
const actionSuccess = ref("");

const languageOptions = [
  { code: "ar_001", name: "العربية" },
  { code: "en_US", name: "English (US)" },
  { code: "fr_FR", name: "Français" },
];

const tzOptions = Intl.supportedValuesOf
  ? Intl.supportedValuesOf("timeZone").map((tz: string) => ({ value: tz, label: tz }))
  : [
      { value: "Africa/Cairo", label: "Africa/Cairo" },
      { value: "Europe/London", label: "Europe/London" },
      { value: "America/New_York", label: "America/New_York" },
      { value: "Asia/Dubai", label: "Asia/Dubai" },
      { value: "Asia/Riyadh", label: "Asia/Riyadh" },
    ];

const initForm = () => {
  if (profile.value) {
    editLang.value = profile.value.lang || "";
    editTz.value = profile.value.tz || "";
    editAvatar.value = profile.value.avatar || null;
    avatarPreview.value = profile.value.avatar
      ? `data:image/png;base64,${profile.value.avatar}`
      : null;
    avatarFile.value = null;
  }
};

const handleAvatarChange = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    avatarFile.value = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      avatarPreview.value = e.target?.result as string;
    };
    reader.readAsDataURL(input.files[0]);
  }
};

const handleSave = async () => {
  if (!profile.value) return;
  isSaving.value = true;
  actionError.value = "";
  actionSuccess.value = "";

  try {
    const body: Record<string, any> = {
      lang: editLang.value,
      tz: editTz.value,
      partnerId: profile.value.partnerId,
    };

    if (avatarFile.value) {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(avatarFile.value);
      });
      body.avatar = base64;
    }

    const res = await $fetch<{ success: boolean }>("/api/user/profile", {
      method: "POST",
      body,
    });

    if (res.success) {
      actionSuccess.value = "تم حفظ التغييرات بنجاح";
      avatarFile.value = null;
      await refresh();
      initForm();
    }
  } catch (err: any) {
    actionError.value = err.message || err.statusMessage || "حدث خطأ أثناء الحفظ";
  } finally {
    isSaving.value = false;
  }
};

const handleDiscard = () => {
  initForm();
  actionError.value = "";
  actionSuccess.value = "";
};

watch(profile, (val) => {
  if (val) initForm();
});
</script>

<template>
  <div class="space-y-8 max-w-7xl mx-auto">
    <div
      v-if="pending && !profile"
      class="h-[calc(100vh-200px)] flex items-center justify-center"
    >
      <div class="flex flex-col items-center gap-3">
        <RefreshCw class="w-8 h-8 animate-spin text-primary" />
        <span class="text-[13px] text-muted-foreground">جاري التحميل...</span>
      </div>
    </div>

    <template v-else>
      <div
        v-if="status === 'error'"
        class="bg-error/10 border border-error text-error p-6 rounded-2xl text-center"
      >
        <CloudOff class="w-10 h-10 mb-2 inline-block" />
        <p class="font-bold">فشل تحميل الملف الشخصي</p>
        <p class="text-sm opacity-80">{{ error?.message }}</p>
        <button
          @click="refresh()"
          class="mt-4 px-6 py-2 bg-error text-white rounded-full font-bold cursor-pointer"
        >
          إعادة المحاولة
        </button>
      </div>

      <template v-else-if="profile">
        <div
          v-if="actionSuccess"
          class="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold rounded-lg text-sm"
        >
          {{ actionSuccess }}
        </div>
        <div
          v-if="actionError"
          class="mb-4 p-3 bg-error/10 border border-error/30 text-error font-bold rounded-lg text-sm"
        >
          {{ actionError }}
        </div>

        <div
          class="bg-white border border-outline-variant rounded-xl p-6 md:p-8 shadow-sm max-w-3xl mx-auto"
        >
          <div class="flex flex-col md:flex-row gap-8">
            <div class="flex flex-col items-center gap-3 shrink-0">
              <div
                class="w-28 h-28 rounded-full bg-primary/10 border-2 border-primary/20 overflow-hidden flex items-center justify-center"
              >
                <img
                  v-if="avatarPreview"
                  :src="avatarPreview"
                  class="w-full h-full object-cover"
                  alt="Avatar"
                />
                <User v-else class="w-12 h-12 text-primary/40" />
              </div>
              <label
                class="px-4 py-2 text-sm font-bold text-primary border border-primary rounded-lg hover:bg-primary/5 cursor-pointer transition-all flex items-center gap-2"
              >
                <Upload class="w-4 h-4" />
                تغيير الصورة
                <input
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="handleAvatarChange"
                />
              </label>
            </div>

            <div class="flex-1 space-y-5">
              <div class="space-y-1">
                <label class="block text-sm font-bold text-muted-foreground">
                  <User class="w-3.5 h-3.5 inline ml-1" />
                  الاسم
                </label>
                <p class="text-lg font-bold text-foreground">
                  {{ profile.name }}
                </p>
              </div>

              <div class="space-y-1">
                <label class="block text-sm font-bold text-muted-foreground">
                  <Mail class="w-3.5 h-3.5 inline ml-1" />
                  البريد الإلكتروني
                </label>
                <p class="text-base text-foreground">{{ profile.email }}</p>
              </div>

              <div class="space-y-1">
                <label class="block text-sm font-bold text-muted-foreground">
                  <AtSign class="w-3.5 h-3.5 inline ml-1" />
                  اسم المستخدم
                </label>
                <p class="text-base text-foreground font-mono">
                  {{ profile.login }}
                </p>
              </div>

              <div v-if="profile.groups.length" class="space-y-2">
                <label class="block text-sm font-bold text-muted-foreground">
                  <Shield class="w-3.5 h-3.5 inline ml-1" />
                  الصلاحيات
                </label>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="group in profile.groups"
                    :key="group.id"
                    class="px-3 py-1 text-xs font-bold bg-primary/10 text-primary rounded-full"
                  >
                    {{ translateGroup(group.name, group.category_id?.[1]) }}
                  </span>
                </div>
              </div>

              <div class="space-y-3">
                <label class="block text-sm font-bold text-muted-foreground">
                  <Palette class="w-3.5 h-3.5 inline ml-1" />
                  المظهر اللوني
                </label>
                <div class="flex gap-3 flex-wrap">
                  <button
                    v-for="opt in themeOptions"
                    :key="opt.key"
                    @click="applyTheme(opt.key)"
                    class="relative w-11 h-11 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer"
                    :class="
                      currentTheme === opt.key
                        ? 'border-foreground scale-110 shadow-md'
                        : 'border-transparent hover:scale-105'
                    "
                    :title="opt.label"
                  >
                    <span
                      class="w-8 h-8 rounded-full"
                      :style="{ backgroundColor: opt.color }"
                    >
                    </span>
                    <Check
                      v-if="currentTheme === opt.key"
                      class="absolute w-4 h-4 text-white drop-shadow-md"
                      :class="
                        opt.key === 'gold' ? 'text-foreground' : 'text-white'
                      "
                    />
                  </button>
                </div>
              </div>

              <div class="pt-4 flex gap-4">
                <button
                  type="button"
                  @click="handleSave"
                  :disabled="isSaving"
                  class="flex-1 py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/95 transition-all cursor-pointer text-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw
                    v-if="isSaving"
                    class="w-5 h-5 inline-block animate-spin ml-1"
                  />
                  حفظ التغييرات
                </button>
                <button
                  type="button"
                  @click="handleDiscard"
                  class="flex-1 py-3 border border-outline-variant text-foreground font-bold rounded-lg hover:bg-muted/50 transition-all cursor-pointer text-center"
                >
                  إلغاء التغييرات
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>
