<script setup lang="ts">
import { onMounted } from "vue";
import { useColorTheme } from "~/composables/useColorTheme";
import { useCallcenterAlert } from "~/composables/useCallcenterAlert";

const { initTheme } = useColorTheme();
const { connect } = useCallcenterAlert();
onMounted(() => {
  initTheme();
  connect();
});
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

