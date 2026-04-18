#!/bin/bash

# Configuration
APP_NAME="ray-app"
PROJECT_DIR="/home/ray.styni.com/public_html"

echo "🚀 Starting deployment for $APP_NAME..."

# Navigate to project directory
cd $PROJECT_DIR || exit

# Pull latest changes
echo "📥 Pulling latest changes from git..."
git reset --hard
git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the frontend
echo "🏗️ Building frontend assets..."
npm run build

# Restart or Start the application using PM2
echo "🔄 Restarting application..."
# Check if the process is already running
pm2 describe $APP_NAME > /dev/null
if [ $? -eq 0 ]; then
  echo "Process exists, restarting..."
  pm2 restart ecosystem.config.cjs --env production
else
  echo "Process does not exist, starting new instance..."
  pm2 start ecosystem.config.cjs --env production
fi

# Save the PM2 list to ensure it persists on reboot
pm2 save

echo "✅ Deployment completed successfully!"
