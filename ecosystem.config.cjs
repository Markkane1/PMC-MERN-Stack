const path = require('path')

const serverCwd = path.resolve(__dirname, 'server')
const serverEnvFile = path.join(serverCwd, '.env.production')

module.exports = {
  apps: [
    {
      name: process.env.PM2_APP_NAME || 'pmc-api',
      cwd: serverCwd,
      script: './dist/server.js',
      interpreter: 'node',
      node_args: '-r dotenv/config',
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
        DOTENV_CONFIG_PATH: path.join(serverCwd, '.env'),
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 3003,
        DOTENV_CONFIG_PATH: serverEnvFile,
      },
    },
  ],
}
