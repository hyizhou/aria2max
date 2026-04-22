module.exports = {
  apps: [{
    name: 'aria-max-server',
    script: './dist/server.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
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
