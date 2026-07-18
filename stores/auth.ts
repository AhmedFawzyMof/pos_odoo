import { defineStore } from "pinia";
import { ref, computed } from "vue";

interface UserSession {
  id: number;
  name: string;
  allowedCompanies: { id: number; name: string }[];
  primaryCompanyId: number;
}

export const useAuthStore = defineStore("auth", () => {
  const user = useCookie<UserSession | null>("auth_user", {
    default: () => null,
    maxAge: 60 * 60 * 24 * 7,
  });

  const currentCompanyId = useCookie<number | null>("auth_current_company_id", {
    default: () => null,
    maxAge: 60 * 60 * 24 * 7,
  });

  const permissions = useCookie<any[]>("auth_permissions", {
    default: () => [],
    maxAge: 60 * 60 * 24 * 7,
  });

  const userRoles = useCookie<string[]>("auth_roles", {
    default: () => [],
    maxAge: 60 * 60 * 24 * 7,
  });

  const emailState = useCookie<string>("auth_email", {
    default: () => "",
    maxAge: 60 * 60 * 24 * 365,
  });

  const loading = ref(false);

  const isAuthenticated = computed(() => !!user.value);

  const currentCompany = computed(() => {
    if (!user.value || !currentCompanyId.value) return null;
    const match = user.value.allowedCompanies.find(
      (c) => c.id === currentCompanyId.value,
    );
    return (
      match ||
      user.value.allowedCompanies.find(
        (c) => c.id === user.value!.primaryCompanyId,
      ) ||
      null
    );
  });

  async function login(creds: {
    username: string;
    password: string;
    companySlug?: string;
  }) {
    loading.value = true;
    try {
      const data = await $fetch<any>("/api/auth/login", {
        method: "POST",
        body: {
          username: creds.username.trim(),
          password: creds.password,
          companySlug: creds.companySlug?.trim(),
        },
      });

      if (!data.success || !data.user) {
        throw new Error(
          data.error || "فشل تسجيل الدخول. يرجى التحقق من البيانات.",
        );
      }

      user.value = {
        id: data.user.id,
        name: data.user.name,
        allowedCompanies: data.user.allowedCompanies,
        primaryCompanyId: data.user.primaryCompanyId,
      };

      permissions.value = data.user.userPermissions || [];
      userRoles.value = data.user.roles || [];

      currentCompanyId.value = data.user.primaryCompanyId;
      emailState.value = creds.username.trim();

      return { success: true };
    } catch (error: any) {
      console.error(error);
      logout();
      throw new Error(
        error.data?.message || error.data?.statusMessage || error.message || "Authentication failed",
      );
    } finally {
      loading.value = false;
    }
  }

  async function switchCompany(companyId: number) {
    const exists = user.value?.allowedCompanies.some((c) => c.id === companyId);
    if (exists) {
      await $fetch("/api/auth/company", {
        method: "PUT",
        body: { companyId },
      });
      currentCompanyId.value = companyId;
    }
  }

  function logout() {
    user.value = null;
    currentCompanyId.value = null;
    userRoles.value = [];
    if (import.meta.client) {
      sessionStorage.removeItem("active_session_p_secret");
    }
  }

  return {
    user,
    currentCompanyId,
    currentCompany,
    email: emailState,
    loading,
    isAuthenticated,
    permissions,
    userRoles,
    login,
    switchCompany,
    logout,
  };
});
