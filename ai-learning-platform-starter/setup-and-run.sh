#!/bin/bash

echo "
╔════════════════════════════════════════════════════════╗
║                                                        ║
║   🚀 Setting up AI Learning Platform                   ║
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

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit .env file to add email configuration"
    echo "   For testing, use https://ethereal.email/create"
fi

echo ""
echo "🚀 Starting the server..."
echo ""

# Start the server
npm start