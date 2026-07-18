<script setup lang="ts">
import { onMounted } from "vue";
import { useColorTheme } from "~/composables/useColorTheme";

const { initTheme } = useColorTheme();
onMounted(initTheme);
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

