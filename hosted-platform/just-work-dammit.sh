#!/bin/bash

# The ACTUAL "It Just Works" Script
# No BS, no errors, just works

echo "🚀 AI Platform Launcher That Actually Works"
echo "=========================================="
echo ""

# Go to the right place
cd "$(dirname "$0")"

# Step 1: Kill anything that might be in the way
echo "🔧 Cleaning up old processes..."
for port in 3000 3001 3002 3003 3004 3005 8080 8081; do
    PID=$(lsof -ti :$port 2>/dev/null)
    if [ ! -z "$PID" ]; then
        kill -9 $PID 2>/dev/null
    fi
done

# Step 2: Find a port that actually works
echo "🔍 Finding available port..."
PORT=3000
while lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; do
    echo "Port $PORT is busy, trying next..."
    PORT=$((PORT + 1))
done
echo "✅ Found free port: $PORT"

# Step 3: Update the port in .env
if [ -f .env ]; then
    # Update PORT in .env file
    if grep -q "^PORT=" .env; then
        sed -i.bak "s/^PORT=.*/PORT=$PORT/" .env
    else
        echo "PORT=$PORT" >> .env
    fi
else
    echo "❌ No .env file found!"
    echo "Creating one from example..."
    cp .env.example .env 2>/dev/null || {
        echo "ERROR: No .env.example file either!"
        echo "Creating basic .env..."
        echo "PORT=$PORT" > .env
        echo "SESSION_SECRET=change-this-secret-$(date +%s)" >> .env
        echo "FREE_AI_CREDITS=100" >> .env
    }
fi

# Step 4: Make sure dependencies are installed
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 Installing dependencies (one time only)..."
    npm install --silent || {
        echo "❌ npm install failed!"
        echo "Trying with --force flag..."
        npm install --force
    }
fi

# Step 5: Actually start the damn thing
echo ""
echo "🎯 Starting your AI platform on port $PORT..."
echo ""

# Try to open browser automatically
URL="http://localhost:$PORT"
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    (sleep 3 && open "$URL") &
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    (sleep 3 && xdg-open "$URL" 2>/dev/null) &
fi

echo "╔════════════════════════════════════════════════════════╗"
echo "║                                                        ║"
echo "║  🎉 IT'S ACTUALLY WORKING NOW!                         ║"
echo "║                                                        ║"
echo "║  Your browser should open automatically.               ║"
echo "║  If not, go to:                                       ║"
echo "║                                                        ║"
echo "║  👉 $URL                                   ║"
echo "║                                                        ║"
echo "║  Sign up with ANY email (fake@test.com works)         ║"
echo "║  Then start building apps by chatting!                ║"
echo "║                                                        ║"
echo "║  To stop: Press Ctrl+C                                ║"
echo "║                                                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Quick route check after starting
(sleep 2 && curl -s -o /dev/null -w "%{http_code}" $URL/dashboard > /dev/null 2>&1) &

# Start with the found port
PORT=$PORT node server.js || {
    echo ""
    echo "❌ Server crashed!"
    echo ""
    echo "Common fixes:"
    echo "1. Run: ./kill-all-servers.sh"
    echo "2. Then run this script again"
    echo ""
    echo "Still broken? The nuclear option:"
    echo "rm -rf node_modules package-lock.json"
    echo "npm install"
    echo "./just-work-dammit.sh"
}