#!/bin/bash

# CPU Detection and PM2 Configuration Script
# This script detects CPU cores and shows appropriate PM2 configuration

echo "🔍 Detecting system specifications..."

# Get CPU information
CPU_CORES=$(node -e "console.log(require('os').cpus().length)")
CPU_MODEL=$(node -e "console.log(require('os').cpus()[0].model)")

echo "🖥️  System Information:"
echo "   CPU Model: $CPU_MODEL"
echo "   CPU Cores: $CPU_CORES"
echo ""

if [ "$CPU_CORES" -eq 1 ]; then
    echo "📋 Configuration for 1 CPU Core:"
    echo "   • Mode: Fork (single process)"
    echo "   • Instances: 1"
    echo "   • Memory Limit: 256MB"
    echo "   • Recommended for: Low-resource VPS"
    echo ""
    echo "🚀 This configuration will run efficiently on your single-core VPS"
else
    echo "📋 Configuration for Multi-Core CPU ($CPU_CORES cores):"
    echo "   • Mode: Cluster (load balanced)"
    echo "   • Instances: 2 (maximum for optimal performance)"
    echo "   • Memory Limit: 512MB per instance"
    echo "   • Recommended for: Multi-core VPS/servers"
    echo ""
    echo "🚀 Using only 2 instances even with $CPU_CORES cores for optimal performance"
fi

echo ""
echo "⚙️  To start the application with auto-detected configuration:"
echo "   npm run pm2:start"
echo ""
echo "📊 To monitor the application:"
echo "   npm run pm2:status"
echo "   npm run pm2:monit"
