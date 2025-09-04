#!/bin/bash

echo "🚀 AI Builder Platform - Simple Deployment"
echo "========================================="
echo ""

# Check if running locally or on server
if [ "$1" == "local" ]; then
    echo "📍 Running locally with public access..."
    echo ""
    
    # Option 1: Using ngrok (if installed)
    if command -v ngrok &> /dev/null; then
        echo "✅ Found ngrok - starting tunnel..."
        npm start &
        sleep 3
        ngrok http 3000
    
    # Option 2: Using Cloudflare Tunnel
    elif command -v cloudflared &> /dev/null; then
        echo "✅ Found Cloudflare Tunnel - starting..."
        npm start &
        sleep 3
        cloudflared tunnel --url http://localhost:3000
    
    # Option 3: Local network only
    else
        echo "ℹ️  No tunnel service found. Running on local network only."
        echo ""
        echo "To make it publicly accessible, install one of:"
        echo "  • ngrok: https://ngrok.com"
        echo "  • Cloudflare Tunnel: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/"
        echo ""
        echo "Your local IP addresses:"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            ifconfig | grep "inet " | grep -v 127.0.0.1
        else
            hostname -I
        fi
        echo ""
        npm start
    fi

elif [ "$1" == "vps" ]; then
    echo "📦 Deploying to VPS..."
    echo ""
    
    # Simple VPS deployment
    read -p "Enter your VPS IP or domain: " VPS_HOST
    read -p "Enter your VPS username (default: root): " VPS_USER
    VPS_USER=${VPS_USER:-root}
    
    echo ""
    echo "📤 Uploading files to $VPS_USER@$VPS_HOST..."
    
    # Create deployment package
    tar -czf deploy.tar.gz --exclude='node_modules' --exclude='*.db' --exclude='.env' .
    
    # Upload and deploy
    ssh $VPS_USER@$VPS_HOST << 'EOF'
        # Install Node.js if needed
        if ! command -v node &> /dev/null; then
            curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
            sudo apt-get install -y nodejs
        fi
        
        # Create app directory
        mkdir -p /var/www/ai-builder
        cd /var/www/ai-builder
EOF
    
    # Copy files
    scp deploy.tar.gz $VPS_USER@$VPS_HOST:/var/www/ai-builder/
    
    # Extract and run
    ssh $VPS_USER@$VPS_HOST << 'EOF'
        cd /var/www/ai-builder
        tar -xzf deploy.tar.gz
        npm install --production
        
        # Create systemd service
        sudo tee /etc/systemd/system/ai-builder.service > /dev/null <<EOL
[Unit]
Description=AI Builder Platform
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/ai-builder
ExecStart=/usr/bin/node server.js
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=80

[Install]
WantedBy=multi-user.target
EOL
        
        # Start service
        sudo systemctl daemon-reload
        sudo systemctl enable ai-builder
        sudo systemctl restart ai-builder
        
        echo ""
        echo "✅ Deployment complete!"
        echo "🌐 Your platform is running at http://$VPS_HOST"
EOF
    
    # Cleanup
    rm deploy.tar.gz
    
    echo ""
    echo "📝 Next steps:"
    echo "1. Set up your domain DNS to point to $VPS_HOST"
    echo "2. Add SSL with: sudo certbot --nginx -d yourdomain.com"
    echo "3. Configure environment variables in /var/www/ai-builder/.env"

else
    echo "Usage:"
    echo "  ./deploy-simple.sh local  - Run locally with public tunnel"
    echo "  ./deploy-simple.sh vps    - Deploy to a VPS"
    echo ""
    echo "For cloud platforms:"
    echo ""
    echo "🚂 Railway:"
    echo "  1. Install Railway CLI: npm i -g @railway/cli"
    echo "  2. Run: railway login && railway init && railway up"
    echo ""
    echo "▲ Vercel:"
    echo "  1. Install Vercel CLI: npm i -g vercel"
    echo "  2. Run: vercel"
    echo ""
    echo "🌊 DigitalOcean App Platform:"
    echo "  1. Push to GitHub"
    echo "  2. Connect at: https://cloud.digitalocean.com/apps"
fi