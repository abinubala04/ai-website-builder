#!/bin/bash

echo "🌟 Starting Simple Git Platform..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the server
echo "🚀 Launching platform..."
echo "👉 Open http://localhost:3000 in your browser"
echo ""

npm start