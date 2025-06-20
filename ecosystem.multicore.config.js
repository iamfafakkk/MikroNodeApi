// PM2 Ecosystem Configuration for Multi-Core VPS
module.exports = {
  apps: [
    {
      name: "mikro-node-api",
      script: "./index.js",
      instances: "max", // Otomatis sesuai jumlah CPU core
      exec_mode: "cluster",
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
      
      // Advanced settings untuk multi-core
      max_memory_restart: "1G",
      node_args: "--max-old-space-size=1024",
      
      // Watch and restart settings
      watch: false,
      ignore_watch: ["node_modules", "logs"],
      
      // Auto restart settings
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      
      // Health monitoring
      health_check_timeout: 30000,
      health_check_grace_period: 15000,
      
      // Process management
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 8000,
      
      // Cluster settings
      increment_var: "PORT",
      
      // Additional environment variables
      env_file: ".env"
    }
  ]
};
