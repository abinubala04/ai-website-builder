#!/bin/bash

# Super Simple Launcher for Non-Technical Users
# Just double-click this file or run: ./just-run-this.sh

echo "🚀 Starting Your AI Platform"
echo "==========================="
echo ""

# Change to the right directory
cd "$(dirname "$0")"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo ""
    echo "Please install Node.js first:"
    echo "1. Go to https://nodejs.org"
    echo "2. Download the LTS version"
    echo "3. Install it (just click Next, Next, Finish)"
    echo "4. Then run this script again"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 First time setup - installing packages..."
    echo "(This only happens once, it takes 1-2 minutes)"
    echo ""
    
    npm install
    
    if [ $? -ne 0 ]; then
        echo ""
        echo "❌ Installation failed!"
        echo "Try running: npm install"
        echo "in the hosted-platform folder"
        read -p "Press Enter to exit..."
        exit 1
    fi
    
    echo ""
    echo "✅ Installation complete!"
    echo ""
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  No configuration file found!"
    echo ""
    echo "Creating one from the example..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANT: Edit the .env file to add your API keys!"
    echo ""
fi

# Start the server
echo "🌐 Starting your AI platform..."
echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║                                                        ║"
echo "║  🎉 YOUR PLATFORM IS STARTING!                         ║"
echo "║                                                        ║"
echo "║  Open your browser and go to:                         ║"
echo "║  👉 http://localhost:3000                             ║"
echo "║                                                        ║"
echo "║  What to do:                                           ║"
echo "║  1. Click 'Sign Up' to create an account              ║"
echo "║  2. Use any email (even fake@email.com)               ║"
echo "║  3. Start building apps by chatting!                  ║"
echo "║                                                        ║"
echo "║  To stop: Press Ctrl+C                                ║"
echo "║                                                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Actually start the server
node server.js

# If server stops, show message
echo ""
echo "Server stopped. To restart, run this script again."
read -p "Press Enter to exit..."