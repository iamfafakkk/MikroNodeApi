#!/bin/bash

# Script untuk mendeteksi CPU cores dan memilih konfigurasi PM2 yang tepat

set -e

echo "🔍 Detecting CPU cores..."

# Deteksi jumlah CPU cores
CPU_CORES=$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo "1")

echo "💻 Detected $CPU_CORES CPU core(s)"

# Pilih konfigurasi berdasarkan jumlah CPU
if [ "$CPU_CORES" -eq 1 ]; then
    echo "⚙️  Using single-core optimized configuration..."
    CONFIG_FILE="ecosystem.1core.config.js"
    SCRIPT_COMMAND="pm2:start:1core"
else
    echo "⚙️  Using multi-core cluster configuration..."
    CONFIG_FILE="ecosystem.multicore.config.js"
    SCRIPT_COMMAND="pm2:start:multicore"
fi

echo "📋 Selected configuration: $CONFIG_FILE"

# Check if PM2 is installed globally
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 is not installed globally. Installing PM2..."
    npm install -g pm2
fi

# Check if .env file exists, if not copy from example
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "📋 Copying .env.example to .env..."
        cp .env.example .env
        echo "⚠️  Please update .env file with your configuration"
    fi
fi

# Create logs directory if it doesn't exist
if [ ! -d "logs" ]; then
    echo "📁 Creating logs directory..."
    mkdir -p logs
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Stop any existing PM2 processes
echo "🛑 Stopping existing PM2 processes..."
pm2 delete all 2>/dev/null || true

# Start the application with the appropriate configuration
echo "▶️  Starting application with $CONFIG_FILE..."
pm2 start "$CONFIG_FILE"

# Show PM2 status
echo "📊 PM2 Status:"
pm2 status

# Show CPU and memory info
echo ""
echo "💾 System Resources:"
echo "CPU Cores: $CPU_CORES"
echo "Memory Usage:"
free -h 2>/dev/null || vm_stat | grep "Pages free\|Pages active\|Pages inactive" || echo "Memory info not available"

# Save PM2 configuration
echo ""
echo "💾 Saving PM2 configuration..."
pm2 save

echo ""
echo "✅ Mikrotik Node.js API started successfully!"
echo "🔗 Access the API at: http://localhost:8585"
echo "📊 Monitor with: npm run pm2:monit"
echo "📝 View logs with: npm run pm2:logs"

if [ "$CPU_CORES" -eq 1 ]; then
    echo ""
    echo "💡 Single-core optimization tips:"
    echo "   - Using fork mode instead of cluster"
    echo "   - Memory limit set to 512MB"
    echo "   - Longer timeouts for stability"
    echo "   - Consider upgrading to multi-core VPS for better performance"
fi
