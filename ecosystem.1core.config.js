// PM2 Ecosystem Configuration for 1 Core VPS
module.exports = {
  apps: [
    {
      name: "mikro-node-api",
      script: "./index.js",
      instances: 1,
      exec_mode: "fork", // Fork mode untuk 1 core
      env: {
        NODE_ENV: "development",
        PORT: 8585
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 8585
      },
      // Logging
      log_file: "./logs/combined.log",
      out_file: "./logs/out.log",
      error_file: "./logs/error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      
      // Advanced settings untuk VPS 1 core
      max_memory_restart: "512M", // Lebih konservatif untuk 1 core
      node_args: "--max-old-space-size=512",
      
      // Watch and restart settings
      watch: false,
      ignore_watch: ["node_modules", "logs"],
      
      // Auto restart settings
      autorestart: true,
      max_restarts: 5, // Lebih sedikit restart untuk stabilitas
      min_uptime: "30s", // Waktu minimum lebih lama
      
      // Health monitoring
      health_check_timeout: 60000, // Timeout lebih lama untuk 1 core
      health_check_grace_period: 30000,
      
      // Process management
      kill_timeout: 10000, // Lebih lama untuk graceful shutdown
      wait_ready: true,
      listen_timeout: 15000, // Timeout lebih lama
      
      // Additional environment variables
      env_file: ".env",
      
      // Performance optimizations for single core
      merge_logs: true,
      time: true
    }
  ]
};
