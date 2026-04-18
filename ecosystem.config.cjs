module.exports = {
  apps: [
    {
      name: 'ray-app',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3003
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3003
      }
    },
  ],
};
