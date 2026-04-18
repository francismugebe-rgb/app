#!/bin/bash
echo "🚀 Starting deployment for ray-app..."

# 1. Pull latest changes
echo "📥 Syncing with repository..."
git fetch origin main
git reset --hard origin/main

# 2. Install dependencies
echo "📦 Installing dependencies..."
npm install

# 3. Build frontend
echo "🏗️ Building frontend assets..."
npm run clean
npm run build

# 4. Global process check
echo "🔍 Checking port 3003..."
fuser -k 3003/tcp || true

# 5. Restart with PM2
echo "🔄 Restarting application..."
pm2 delete ray-app 2>/dev/null || true
pm2 start ecosystem.config.cjs --env production
pm2 save

echo "✅ Deployment completed successfully!"
echo "📡 Check logs with: pm2 logs ray-app"
