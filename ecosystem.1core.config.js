// PM2 Ecosystem - Fork mode (1 core) untuk VPS high spec
module.exports = {
  apps: [
    {
      name: "mikro-node-api",
      script: "./index.js",
      exec_mode: "fork",       // Hanya 1 proses
      instances: 1,

      // ---- ENV ----
      env_file: ".env",
      env: {
        NODE_ENV: "development",
        PORT: 8585
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 8585
      },

      // ---- LOGGING ----
      out_file: "/var/log/mikro-node-api/out.log",
      error_file: "/var/log/mikro-node-api/err.log",
      merge_logs: true,
      time: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      vizion: false, // matikan auto git scan, hemat CPU

      // ---- RELIABILITY ----
      autorestart: true,
      min_uptime: 5000,                // dianggap "up" jika ≥5s
      max_restarts: 15,                // restart loop limit
      restart_delay: 2000,             // jeda antar-restart
      exp_backoff_restart_delay: 200,  // backoff kalau crash cepat

      // ---- RESOURCE GUARD ----
      // walau RAM gede, jangan dibiarkan liar. Limit 1 GB cukup.
      max_memory_restart: "1G",
      node_args: [
        "--max-old-space-size=1024", // limit heap Node ke 1GB
        "--unhandled-rejections=strict",
        "--trace-uncaught"
      ],

      // ---- ZERO-DOWNTIME / GRACEFUL ----
      wait_ready: true,            // butuh process.send('ready')
      listen_timeout: 20000,       // tunggu ready maksimal 20s
      kill_timeout: 15000,         // grace kill 15s
      shutdown_with_message: true, // kirim pesan shutdown ke app

      // ---- WATCH (hanya aktif di dev) ----
      watch: false,
      ignore_watch: ["node_modules", "logs", ".git"]
    }
  ]
};
