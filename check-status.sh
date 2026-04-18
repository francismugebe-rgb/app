#!/bin/bash

echo "🔍 Diagnostic Check for ray.styni.com"
echo "------------------------------------"

# 1. Check PM2 Status
echo "📦 PM2 Process Status:"
pm2 status ray-app

# 2. Check Listening Ports
echo -e "\n👂 Listening on Port 3003?"
ss -tulnp | grep 3003 || echo "❌ Nothing is listening on port 3003!"

# 3. Check App Logs
echo -e "\n📝 Last 5 lines of App Logs:"
pm2 logs ray-app --lines 5 --no-daemon

# 4. Check Nginx Config hint
echo -e "\n⚙️ Nginx Configuration Hint:"
echo "Look for 'proxy_pass' in your config files (likely in /etc/nginx/conf.d/)"
grep -r "ray.styni.com" /etc/nginx/ 2>/dev/null | grep "proxy_pass" || echo "Could not find Nginx config via grep. Please check your hosting panel."
