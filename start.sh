#!/bin/bash

# Mikrotik Node.js API Startup Script
# This script handles the startup and management of the application using PM2

set -e

echo "🚀 Starting Mikrotik Node.js API with PM2..."

# Detect CPU information
echo "🔍 Detecting system specifications..."
CPU_CORES=$(node -e "console.log(require('os').cpus().length)")
echo "🖥️  Detected $CPU_CORES CPU core(s)"

if [ "$CPU_CORES" -eq 1 ]; then
    echo "⚙️  Using 1 instance in fork mode (optimized for single core)"
else
    echo "⚙️  Using 2 instances in cluster mode (optimized for multi-core)"
fi

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

# Stop any existing PM2 processes for this app
echo "🛑 Stopping existing PM2 processes..."
pm2 stop ecosystem.config.js 2>/dev/null || true
pm2 delete ecosystem.config.js 2>/dev/null || true

# Start the application with PM2
echo "▶️  Starting application with PM2..."
pm2 start ecosystem.config.js

# Show PM2 status
echo "📊 PM2 Status:"
pm2 status

# Save PM2 configuration
echo "💾 Saving PM2 configuration..."
pm2 save

# Setup PM2 startup script (optional - uncomment if needed)
# echo "🔧 Setting up PM2 startup script..."
# pm2 startup

echo "✅ Mikrotik Node.js API started successfully!"
echo "🔗 Access the API at: http://localhost:3000"
echo "📊 Monitor with: npm run pm2:monit"
echo "📝 View logs with: npm run pm2:logs"
