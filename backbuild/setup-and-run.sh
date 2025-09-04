#!/bin/bash

# Simple setup script for the database-backed learning AI
# This proves the AI actually works across browsers!

echo "
╔════════════════════════════════════════════════════════╗
║                                                        ║
║   🧠 Setting up REAL AI with Database Learning         ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
"

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed!"
    exit 1
fi

echo "✅ npm found: $(npm --version)"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo ""
    echo "📦 Installing dependencies..."
    npm init -y > /dev/null 2>&1
    npm install express sqlite3 cors
else
    echo "✅ Dependencies already installed"
fi

# Kill any existing server on port 3000
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "🔄 Stopping existing server on port 3000..."
    kill $(lsof -Pi :3000 -sTCP:LISTEN -t)
    sleep 2
fi

echo ""
echo "🚀 Starting the AI Learning Server..."
echo ""

# Start the server in background
node learning-server.js &
SERVER_PID=$!

# Wait a moment for server to start
sleep 2

# Open the HTML file in default browser
echo "🌐 Opening the AI interface..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open learns-for-real.html
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    xdg-open learns-for-real.html 2>/dev/null || firefox learns-for-real.html 2>/dev/null || google-chrome learns-for-real.html 2>/dev/null
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    # Windows
    start learns-for-real.html
fi

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║                                                        ║"
echo "║   ✅ AI Learning System is Running!                    ║"
echo "║                                                        ║"
echo "║   🧪 To prove it works:                               ║"
echo "║   1. Teach it something (e.g., 'banana' → 'yellow')   ║"
echo "║   2. Open in ANOTHER browser                           ║"
echo "║   3. Test the same pattern - it knows!                ║"
echo "║   4. = REAL SHARED LEARNING!                          ║"
echo "║                                                        ║"
echo "║   Press Ctrl+C to stop the server                     ║"
echo "║                                                        ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Keep script running and handle Ctrl+C
trap "echo ''; echo '🛑 Stopping server...'; kill $SERVER_PID 2>/dev/null; exit" INT

# Wait for server process
wait $SERVER_PID