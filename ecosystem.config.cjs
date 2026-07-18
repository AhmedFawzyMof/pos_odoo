module.exports = {
  apps: [
    {
      name: "nuxt-pos",
      script: ".output/server/index.mjs",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3080,
        HOST: "0.0.0.0",
        DEFAULT_URL: "http://localhost:3080",
        DEFAULT_DB: "system",
        NUXT_SESSION_PASSWORD: "69c7cbe863b5484d81b8b686ceb991c2",
        NUXT_SESSION_MAX_AGE: 604800,
      },
    },
  ],
};
