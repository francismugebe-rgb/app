module.exports = {
  apps: [
    {
      name: "ray-app",
      script: "tsx",
      args: "server.ts",
      env_production: {
        NODE_ENV: "production",
        PORT: 3003
      },
      watch: false,
      max_memory_restart: "1G",
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss"
    }
  ]
};
