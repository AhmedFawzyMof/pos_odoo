<script setup lang="ts">
import { onMounted } from "vue";
import { useColorTheme } from "~/composables/useColorTheme";

const { initTheme } = useColorTheme();

const POS_CONFIG_KEY = "pos_config_id";
const POS_NAME_KEY = "pos_config_name";

onMounted(async () => {
  initTheme();

  const fromDbSwitch = sessionStorage.getItem("_db_switch");
  if (fromDbSwitch !== "1") return;
  sessionStorage.removeItem("_db_switch");

  const configId = localStorage.getItem(POS_CONFIG_KEY);
  if (!configId) {
    return navigateTo("/pos?err=no_config");
  }

  try {
    const data = await $fetch<{ success: boolean; session: any }>(
      `/api/pos/status?config_id=${configId}`,
    );
    if (data.success && data.session?.session_state === "opened" && data.session?.session_id) {
      navigateTo(`/cashier?config_id=${configId}&session_id=${data.session.session_id}`);
    } else {
      navigateTo(`/pos?config_id=${configId}`);
    }
  } catch {
    navigateTo("/pos?err=no_config");
  }
});
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

