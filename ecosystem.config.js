const os = require('os');

// Auto-detect CPU cores and set instances accordingly
const cpuCount = os.cpus().length;
const instances = cpuCount === 1 ? 1 : 2;
const execMode = cpuCount === 1 ? "fork" : "cluster";

console.log(`🖥️  Detected ${cpuCount} CPU core(s)`);
console.log(`⚙️  Using ${instances} instance(s) in ${execMode} mode`);

module.exports = {
  apps: [
    {
      name: "mikro-node-api",
      script: "./index.js",
      instances: instances,
      exec_mode: execMode,
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
      
      // Advanced settings - Adjust memory based on CPU cores
      max_memory_restart: cpuCount === 1 ? "256M" : "512M",
      node_args: cpuCount === 1 ? "--max-old-space-size=256" : "--max-old-space-size=512",
      
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
      
      // Additional environment variables
      env_file: ".env"
    }
  ]
};
