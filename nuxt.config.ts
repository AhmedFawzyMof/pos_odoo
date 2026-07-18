export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  devServer: {
    host: "0.0.0.0",
    port: 3000,
    https: true,
  },
  vite: {
    build: {
      rollupOptions: {
        onwarn(warning, warn) {
          if (warning.plugin === "@tailwindcss/vite:generate:build") return;
          if (warning.code === "ANNONCOMMENT") return;
          warn(warning);
        },
      },
    },
  },
  css: ["@/assets/tailwind.css"],
  modules: [
    "@nuxtjs/tailwindcss",
    "shadcn-nuxt",
    "@pinia/nuxt",
    "nuxt-auth-utils",
  ],
  runtimeConfig: {
    session: {
      maxAge: 60 * 60 * 24 * 7,
    },
  },
  nitro: {
    externals: {
      trace: ["better-sqlite3"],
    },
  },
  app: {
    head: {
      htmlAttrs: {
        dir: "rtl",
        lang: "ar",
        class: "light",
      },
      link: [
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Cairo:wght@200;300;400;500;600;700;800&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap",
        },
      ],
    },
  },
  shadcn: {
    prefix: "",
    componentDir: "@/components/ui",
  },
  pinia: {
    storesDirs: ["./stores/**"],
  },
});
