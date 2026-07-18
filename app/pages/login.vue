<script setup lang="ts">
import { ref } from "vue";
import { useAuth } from "~/composables/useAuth";
import {
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  LogIn,
  Loader2,
  Receipt,
  RefreshCw,
  WifiOff,
} from "@lucide/vue";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

definePageMeta({
  layout: "default",
});
const { user, fetch: refreshSession } = useUserSession();
const auth = useAuth();

const usernameVal = ref("");
const passwordVal = ref("");

const showPassword = ref(false);
const localError = ref<string | null>(null);

function normalizeUsername(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.includes("@")) return trimmed;
  return `${trimmed}@gmail.com`;
}

const handleLogin = async () => {
  localError.value = null;

  if (!usernameVal.value) {
    localError.value = "يرجى إدخال اسم المستخدم.";
    return;
  }
  if (!passwordVal.value) {
    localError.value = "يرجى إدخال كلمة المرور.";
    return;
  }

  try {
    await auth.login({
      username: normalizeUsername(usernameVal.value),
      password: passwordVal.value,
    });
    await refreshSession();
  } catch (err: any) {
    localError.value =
      err.message || "فشل الاتصال بنظام المبيعات أو بيانات الاعتماد خاطئة.";
    return;
  }
  await navigateTo("/");
};
</script>

<template>
  <div
    class="flex min-h-screen w-full items-stretch justify-center bg-background overflow-hidden select-none"
  >
    <div
      class="relative hidden w-1/2 flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex overflow-hidden"
    >
      <div
        class="absolute inset-0 bg-linear-to-tr from-primary/95 via-primary to-primary/85 z-0"
      />
      <div
        class="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-primary-foreground/5 blur-3xl z-0"
      />
      <div
        class="absolute -bottom-32 -right-32 h-[600px] w-[600px] rounded-full bg-black/10 blur-3xl z-0"
      />

      <div class="relative z-10 flex items-center gap-2">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/15 backdrop-blur-md border border-primary-foreground/20"
        >
          <Receipt class="w-6 h-6 text-primary-foreground font-bold" />
        </div>
        <span class="text-xl font-bold tracking-wide">POS Retail Lite</span>
      </div>

      <!-- Center content -->
      <div class="relative z-10 my-auto max-w-lg space-y-6">
        <h1
          class="text-4xl font-extrabold leading-tight text-primary-foreground/95"
        >
          نظام المبيعات ونقاط البيع المتكامل
        </h1>
        <p
          class="text-lg text-primary-foreground/80 leading-relaxed font-light"
        >
          قم بتوصيل جهاز الكاشير أو نقطة البيع الخاصة بك مباشرة بنظام المبيعات
          لمزامنة المنتجات، المبيعات، العملاء والطلبات بشكل فوري وسلس.
        </p>

        <div class="grid grid-cols-2 gap-4 pt-4">
          <div
            class="rounded-2xl bg-primary-foreground/5 p-4 backdrop-blur-xs border border-primary-foreground/10 flex items-center gap-3"
          >
            <RefreshCw class="w-7 h-7 text-primary-foreground/90" />
            <div>
              <p class="text-sm font-semibold text-primary-foreground/90">
                مزامنة فورية
              </p>
              <p class="text-xs text-primary-foreground/60">
                للمنتجات والطلبات
              </p>
            </div>
          </div>
          <div
            class="rounded-2xl bg-primary-foreground/5 p-4 backdrop-blur-xs border border-primary-foreground/10 flex items-center gap-3"
          >
            <WifiOff class="w-7 h-7 text-primary-foreground/90" />
            <div>
              <p class="text-sm font-semibold text-primary-foreground/90">
                دعم غير متصل
              </p>
              <p class="text-xs text-primary-foreground/60">
                جاهز للعمل دائماً
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Bottom footer info -->
      <div
        class="relative z-10 text-xs text-primary-foreground/60 flex items-center justify-between"
      >
        <p>© 2026 POS Retail Lite. جميع الحقوق محفوظة.</p>
        <div class="flex gap-4">
          <a href="#" class="hover:underline hover:text-primary-foreground/80"
            >المساعدة</a
          >
          <a href="#" class="hover:underline hover:text-primary-foreground/80"
            >الشروط والأحكام</a
          >
        </div>
      </div>
    </div>

    <!-- Right Pane: Login Form -->
    <div
      class="flex w-full flex-col justify-center px-4 py-8 sm:px-6 lg:w-1/2 lg:px-8 bg-linear-to-tr from-muted/30 via-background to-muted/30"
    >
      <div class="mx-auto w-full max-w-md space-y-6">
        <!-- Mobile Header (Visible on smaller screens only) -->
        <div class="flex flex-col items-center text-center lg:hidden">
          <div
            class="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-lg mb-3"
          >
            <Receipt class="w-7 h-7 font-bold" />
          </div>
          <h2 class="text-2xl font-bold text-foreground">POS Retail Lite</h2>
          <p class="text-sm text-muted-foreground mt-1">
            نظام المبيعات ونقاط البيع المتكامل
          </p>
        </div>

        <Card class="border-border/60 shadow-lg backdrop-blur-md bg-card/90">
          <CardHeader class="space-y-1">
            <CardTitle class="text-2xl font-bold text-center sm:text-right"
              >تسجيل الدخول للنظام</CardTitle
            >
            <CardDescription class="text-center sm:text-right">
              أدخل بيانات الاعتماد الخاصة بك للبدء
            </CardDescription>
          </CardHeader>

          <CardContent class="space-y-4">
            <!-- Custom Alert for Errors -->
            <transition name="fade">
              <div
                v-if="localError"
                class="flex items-start gap-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20"
              >
                <AlertCircle class="h-5 w-5 shrink-0 mt-0.5" />
                <div class="flex-1">
                  <p class="font-medium text-destructive">
                    خطأ في تسجيل الدخول
                  </p>
                  <p class="text-xs opacity-90 mt-0.5 leading-relaxed">
                    {{ localError }}
                  </p>
                </div>
              </div>
            </transition>

            <form @submit.prevent="handleLogin" class="space-y-4">
              <!-- Section 2: Account Config -->
              <div class="space-y-3 pt-2">
                <div
                  class="flex items-center justify-between border-b border-border/50 pb-1.5"
                >
                  <span
                    class="text-xs font-semibold text-primary flex items-center gap-1.5"
                  >
                    <User class="h-3.5 w-3.5" />
                    بيانات الحساب والاعتماد
                  </span>
                </div>

                <!-- Username -->
                <div class="space-y-1">
                  <Label for="username" class="text-xs text-muted-foreground"
                    >اسم المستخدم</Label
                  >
                  <div class="relative">
                    <User
                      class="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/75"
                    />
                    <Input
                      id="username"
                      v-model="usernameVal"
                      type="text"
                      placeholder="اسم المستخدم"
                      class="pr-10 text-left ltr focus-visible:ring-primary/40 focus-visible:border-primary"
                      required
                    />
                  </div>
                </div>

                <!-- Password -->
                <div class="space-y-1">
                  <div class="flex justify-between items-center">
                    <Label for="password" class="text-xs text-muted-foreground"
                      >كلمة المرور (أو API Key)</Label
                    >
                  </div>
                  <div class="relative">
                    <Lock
                      class="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/75"
                    />
                    <Input
                      id="password"
                      v-model="passwordVal"
                      :type="showPassword ? 'text' : 'password'"
                      placeholder="••••••••••••"
                      class="pr-10 pl-10 text-left ltr focus-visible:ring-primary/40 focus-visible:border-primary"
                      required
                    />
                    <button
                      type="button"
                      class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground transition-colors cursor-pointer"
                      @click="showPassword = !showPassword"
                    >
                      <Eye v-if="!showPassword" class="h-4 w-4" />
                      <EyeOff v-else class="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <!-- Submit Button -->
              <Button
                type="submit"
                class="w-full h-11 bg-primary text-primary-foreground font-semibold hover:bg-primary/95 transition-all shadow-md active:scale-[0.98] mt-2 cursor-pointer flex items-center justify-center gap-2"
                :disabled="auth.isLoading.value"
              >
                <Loader2
                  v-if="auth.isLoading.value"
                  class="h-4 w-4 animate-spin"
                />
                <LogIn v-else class="h-4 w-4" />
                <span>{{
                  auth.isLoading.value
                    ? "جاري التحقق والاتصال..."
                    : "دخول النظام"
                }}</span>
              </Button>
            </form>
          </CardContent>

          <CardFooter
            class="flex flex-col items-center justify-center gap-1.5 pb-6 border-t border-border/40 pt-4"
          >
            <span class="text-xs text-muted-foreground flex items-center gap-1">
              <span
                class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"
              ></span>
              يدعم الاتصال الآمن ومزامنة المبيعات الفورية
            </span>
          </CardFooter>
        </Card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
