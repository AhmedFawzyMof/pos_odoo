module.exports = {
  apps: [
    {
      name: "nuxt-pos2",
      script: ".output/server/index.mjs",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3060,
        HOST: "0.0.0.0",
        DEFAULT_URL: "https://erp.eldokanh.com",
        DEFAULT_DB: "eldokanh_two",
        NUXT_SESSION_PASSWORD: "69c7cbe863b5484d81b8b686ceb991c2",
        NUXT_SESSION_MAX_AGE: 604800,
        ADMIN_ODOO_USER: "ziad@gmail.com",
        ADMIN_ODOO_PASS: "842002",
        NODE_TLS_REJECT_UNAUTHORIZED: "0",
        CALLCENTER_WEBHOOK_SECRET: "cc-wh-secret-dev-2024",
      },
    },
  ],
};
