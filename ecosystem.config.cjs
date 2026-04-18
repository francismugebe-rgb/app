module.exports = {
  apps: [
    {
      name: 'ray-app',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production'
      }
    },
  ],
};
