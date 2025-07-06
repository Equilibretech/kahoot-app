#!/bin/bash
# Railway deployment setup script

echo "Setting up Railway deployment..."

# Install Railway CLI if not installed
if ! command -v railway &> /dev/null; then
    echo "Installing Railway CLI..."
    npm install -g @railway/cli
fi

# Login to Railway
railway login

# Initialize project
railway init

# Set environment variables
railway variables set NODE_ENV=production
railway variables set PORT=\${{PORT}}

# Deploy
railway up

echo "Railway deployment complete!"
echo "Run 'railway open' to view your app"