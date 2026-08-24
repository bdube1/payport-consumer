module.exports = {
  apps: [{
    name: 'payport-admin',
    script: 'npm',
    args: 'run preview -- --port 3000 --host 0.0.0.0',
    cwd: '/opt/payport/payport-consumer',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/opt/payport/payport-consumer/logs/err.log',
    out_file: '/opt/payport/payport-consumer/logs/out.log',
    log_file: '/opt/payport/payport-consumer/logs/combined.log',
    time: true
  }]
};
