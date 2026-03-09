module.exports = {
  apps: [
    {
      name: process.env.PM2_APP_NAME || 'pmc-api',
      cwd: './server',
      script: './dist/server.js',
      interpreter: 'node',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      time: true,
      merge_logs: true,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
        PORT: process.env.PORT || 4000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3003,
      },
    },
  ],
}
