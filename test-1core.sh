#!/bin/bash

# Simulate single-core environment for testing
# This script temporarily modifies the CPU detection for testing purposes

echo "🧪 Testing PM2 configuration with simulated single-core environment..."

# Create a temporary test configuration
cat > ecosystem.test.1core.js << 'EOF'
const os = require('os');

// Simulate single core for testing
const cpuCount = 1;
const instances = cpuCount === 1 ? 1 : 2;
const execMode = cpuCount === 1 ? "fork" : "cluster";

console.log(`🧪 [TEST] Simulating ${cpuCount} CPU core(s)`);
console.log(`⚙️ [TEST] Using ${instances} instance(s) in ${execMode} mode`);

module.exports = {
  apps: [
    {
      name: "mikro-node-api-test-1core",
      script: "./index.js",
      instances: instances,
      exec_mode: execMode,
      env: {
        NODE_ENV: "development",
        PORT: 8586
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 8586
      },
      log_file: "./logs/test-1core-combined.log",
      out_file: "./logs/test-1core-out.log",
      error_file: "./logs/test-1core-error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      
      max_memory_restart: "256M",
      node_args: "--max-old-space-size=256",
      
      watch: false,
      ignore_watch: ["node_modules", "logs"],
      
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      
      health_check_timeout: 30000,
      health_check_grace_period: 15000,
      
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 8000,
      
      env_file: ".env"
    }
  ]
};
EOF

echo "✅ Created test configuration for single-core simulation"
echo "🚀 To test single-core configuration:"
echo "   pm2 start ecosystem.test.1core.js"
echo "   pm2 status"
echo "   pm2 delete ecosystem.test.1core.js"
echo ""
echo "🧹 To clean up test files:"
echo "   rm ecosystem.test.1core.js"
