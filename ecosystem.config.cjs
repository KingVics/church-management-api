module.exports = {
  apps: [{
    name:               'church-api',
    script:             'vaultsync',
    args:               'run --label Church-backend --env Production -- node index.js',
    interpreter:        'none',
    autorestart:        true,
    watch:              false,
    max_memory_restart: '500M',
  }]
}
