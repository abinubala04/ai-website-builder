#!/bin/bash

echo "🌟 Starting Sovereign Platform..."
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "📋 Creating .env file from template..."
    cp .env.example .env
    echo "✅ Created .env file - add your API keys if you want AI features"
    echo ""
fi

# Create necessary directories
mkdir -p workspaces templates

# Start the server
echo "🚀 Launching platform..."
echo "📍 Open http://localhost:8080 in your browser"
echo ""
echo "=================================="
echo "  Ready for non-technical users!  "
echo "=================================="
echo ""

npm start