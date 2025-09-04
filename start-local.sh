#!/bin/bash

echo "🚀 Starting Your Local Development Environment"
echo "============================================"
echo ""

# Check if Ollama is running
echo "📋 Checking Ollama..."
if curl -s http://localhost:11434/api/tags > /dev/null; then
    echo "✅ Ollama is running"
else
    echo "⚠️  Ollama not running. Start it with: ollama serve"
    echo "   Then pull model: ollama pull codellama:7b"
fi

echo ""
echo "Choose what to run:"
echo "1) LLM Course - Build and test your LLM"
echo "2) Simple Git Platform - GitHub for normal people"
echo "3) 🔥 Interactive AI Workspace (NEW!)"
echo "4) Everything (multiple terminals)"
echo ""
read -p "Enter choice (1-4): " choice

case $choice in
    1)
        echo ""
        echo "🤖 Starting LLM Course..."
        echo "Try these commands:"
        echo "  node build-llm.js     - Build and test your LLM"
        echo "  ./prove-it-works.sh   - Verify it works"
        echo "  node stage1.js        - Build web interface"
        echo ""
        cd "$(dirname "$0")"
        ;;
    2)
        echo ""
        echo "📁 Starting Simple Git Platform..."
        cd "$(dirname "$0")/simple-git-platform"
        
        if [ ! -d "node_modules" ]; then
            echo "📦 Installing dependencies..."
            npm install
        fi
        
        echo ""
        echo "🌐 Starting server at http://localhost:3000"
        echo ""
        npm start
        ;;
    3)
        echo ""
        echo "🔥 Starting Interactive AI Workspace..."
        cd "$(dirname "$0")"
        
        # Check for package.json
        if [ ! -f "package-orchestration.json" ]; then
            echo "Setting up workspace..."
            cp package-orchestration.json package.json 2>/dev/null || echo "{}" > package.json
        fi
        
        if [ ! -d "node_modules" ]; then
            echo "📦 Installing dependencies..."
            npm install express ws dotenv
        fi
        
        echo ""
        echo "🚀 Launching AI Workspace at http://localhost:8080"
        echo ""
        echo "Features:"
        echo "  • Chat with AI (left panel)"
        echo "  • See code update in real-time (middle)"
        echo "  • Preview runs instantly (right)"
        echo "  • Draw and annotate (bottom)"
        echo ""
        node orchestration-server.js
        ;;
    4)
        echo ""
        echo "🎯 Starting all services..."
        echo ""
        echo "Terminal 1 - AI Workspace:"
        echo "  cd $(pwd)"
        echo "  node orchestration-server.js"
        echo ""
        echo "Terminal 2 - Simple Git:"
        echo "  cd $(pwd)/simple-git-platform"
        echo "  npm install && npm start"
        echo ""
        echo "Open each command in a new terminal window."
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac