module.exports = {
  apps: [
    {
      name: 'webp-converter',
      script: 'dist/app.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 10001,
      },
      watch: false,
      max_memory_restart: '500M',
    },
  ],
}
