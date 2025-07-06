#!/bin/bash
# Complete VPS setup script for Ubuntu 22.04

set -e

echo "Starting Kahoot App VPS setup..."

# Update system
echo "Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install essential packages
echo "Installing essential packages..."
sudo apt-get install -y curl git build-essential ufw fail2ban

# Install Node.js 18
echo "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
echo "Installing PM2..."
sudo npm install -g pm2

# Install Nginx
echo "Installing Nginx..."
sudo apt-get install -y nginx

# Setup firewall
echo "Configuring firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Configure fail2ban
echo "Configuring fail2ban..."
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Create application user
echo "Creating application user..."
sudo useradd -m -s /bin/bash kahoot || echo "User already exists"
sudo usermod -aG sudo kahoot

# Create application directory
echo "Setting up application directory..."
sudo mkdir -p /var/www/kahoot-app
sudo chown kahoot:kahoot /var/www/kahoot-app

# Clone repository (replace with your repo URL)
echo "Please enter your Git repository URL:"
read -r REPO_URL

cd /var/www/kahoot-app
sudo -u kahoot git clone "$REPO_URL" . || echo "Directory not empty, skipping clone"

# Install dependencies
echo "Installing application dependencies..."
sudo -u kahoot npm install
sudo -u kahoot npm install --save helmet express-rate-limit dotenv

# Create environment file
echo "Creating environment file..."
sudo -u kahoot cat > .env << EOF
NODE_ENV=production
PORT=3000
EOF

# Setup PM2
echo "Setting up PM2..."
sudo -u kahoot pm2 start ecosystem.config.js --env production
sudo -u kahoot pm2 save

# Setup PM2 startup
echo "Setting up PM2 startup..."
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u kahoot --hp /home/kahoot
sudo -u kahoot pm2 save

# Configure Nginx
echo "Please enter your domain name (e.g., example.com):"
read -r DOMAIN_NAME

sudo cp nginx.conf /etc/nginx/sites-available/kahoot-app
sudo sed -i "s/yourdomain.com/${DOMAIN_NAME}/g" /etc/nginx/sites-available/kahoot-app
sudo ln -s /etc/nginx/sites-available/kahoot-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Install Certbot
echo "Installing Certbot for SSL..."
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot || echo "Certbot already linked"

# Get SSL certificate
echo "Obtaining SSL certificate..."
sudo certbot --nginx -d "$DOMAIN_NAME" -d "www.$DOMAIN_NAME"

# Create backup script
echo "Creating backup script..."
sudo -u kahoot cat > /home/kahoot/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/kahoot/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
cd /var/www/kahoot-app
tar -czf "$BACKUP_DIR/kahoot-backup-$DATE.tar.gz" data/
# Keep only last 7 days of backups
find $BACKUP_DIR -type f -name "kahoot-backup-*.tar.gz" -mtime +7 -delete
EOF

sudo chmod +x /home/kahoot/backup.sh

# Setup cron for backups
echo "Setting up automated backups..."
(sudo -u kahoot crontab -l 2>/dev/null; echo "0 2 * * * /home/kahoot/backup.sh") | sudo -u kahoot crontab -

# Setup log rotation
echo "Setting up log rotation..."
sudo tee /etc/logrotate.d/kahoot-app > /dev/null << EOF
/var/www/kahoot-app/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 kahoot kahoot
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# Create monitoring script
echo "Creating monitoring script..."
sudo -u kahoot cat > /home/kahoot/monitor.sh << 'EOF'
#!/bin/bash
# Simple monitoring script
URL="http://localhost:3000/api/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $URL)

if [ $RESPONSE -ne 200 ]; then
    echo "$(date): Health check failed with response code $RESPONSE" >> /home/kahoot/monitor.log
    # Restart the application
    pm2 restart kahoot-app
fi
EOF

sudo chmod +x /home/kahoot/monitor.sh

# Add monitoring to cron
(sudo -u kahoot crontab -l 2>/dev/null; echo "*/5 * * * * /home/kahoot/monitor.sh") | sudo -u kahoot crontab -

# Add health check endpoint to the app
echo "Note: Add this health check endpoint to your server/app.js:"
echo "app.get('/api/health', (req, res) => { res.status(200).json({ status: 'ok' }); });"

echo ""
echo "VPS Setup Complete!"
echo "Your Kahoot app should now be running at https://$DOMAIN_NAME"
echo ""
echo "Important commands:"
echo "- Check app status: pm2 status"
echo "- View logs: pm2 logs"
echo "- Restart app: pm2 restart kahoot-app"
echo "- Monitor app: pm2 monit"
echo ""
echo "Security recommendations:"
echo "1. Change the default SSH port"
echo "2. Disable root SSH login"
echo "3. Setup SSH key authentication"
echo "4. Regularly update the system"
echo "5. Monitor logs for suspicious activity"