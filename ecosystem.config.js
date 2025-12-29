module.exports = {
  apps: [{
    name: 'influencer-agent',
    script: 'npm',
    args: 'start',
    cwd: process.cwd(),
    instances: 2, // 根据服务器 CPU 核心数调整，或使用 'max' 使用所有核心
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/influencer-agent-error.log',
    out_file: '/var/log/pm2/influencer-agent-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000,
    // 健康检查
    listen_timeout: 10000,
    kill_timeout: 5000
  }]
};

