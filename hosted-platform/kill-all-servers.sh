#!/bin/bash

echo "🔪 Killing all Node.js servers..."
echo "================================"
echo ""

# Kill anything on common ports
for port in 3000 3001 3002 8080 8081; do
    PID=$(lsof -ti :$port)
    if [ ! -z "$PID" ]; then
        echo "Killing process on port $port (PID: $PID)"
        kill -9 $PID 2>/dev/null
    fi
done

# Kill all node processes (nuclear option)
echo ""
echo "Killing all Node.js processes..."
pkill -f node 2>/dev/null
pkill -f npm 2>/dev/null

echo ""
echo "✅ All servers stopped!"
echo ""
echo "You can now run ./just-work-dammit.sh"