import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import { useAuthStore } from "../../stores/auth";

export const useAuth = () => {
  const store = useAuthStore();

  const {
    user,
    currentCompanyId,
    currentCompany,
    email,
    loading,
    isAuthenticated,
  } = storeToRefs(store);

  const localError = ref<string | null>(null);

  const login = async (creds: { username: string; password: string }) => {
    localError.value = null;
    try {
      if (!creds.username || !creds.password) {
        throw new Error("يرجى ملء جميع الحقول المطلوبة.");
      }
      await store.login({
        username: creds.username,
        password: creds.password,
      });
      return true;
    } catch (err: any) {
      console.error("[useAuth login wrapper error]:", err);
      localError.value = err.message || "حدث خطأ أثناء تسجيل الدخول.";
      throw err;
    }
  };

  const logout = async () => {
    store.logout();
    await navigateTo("/login");
  };

  return {
    user,
    uid: computed(() => user.value?.id || null),
    isAuthenticated,
    isLoading: loading,
    error: localError,
    username: email,
    currentCompanyId,
    currentCompany,

    switchCompany: store.switchCompany,
    login,
    logout,
  };
};
