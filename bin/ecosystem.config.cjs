module.exports = {
  apps: [{
    name: 'aria-max-server',
    script: './dist/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: process.env.PORT || 2999
    },
    error_file: './logs/aria-max-err.log',
    out_file: './logs/aria-max-out.log',
    log_file: './logs/aria-max-combined.log',
    time: true
  }]
};
