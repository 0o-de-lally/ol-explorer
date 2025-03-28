# OL Explorer - Deployment Summary

This document outlines the deployment process for the OL Explorer blockchain explorer project, focusing on server deployment with Nginx, SSL configuration, and firewall settings.

## Server Requirements

The application requires the following server environment:

- Ubuntu 22.04 LTS or newer
- Node.js 18.x or newer
- Nginx 1.18.0 or newer
- Certbot for SSL certificate management
- Firewall (UFW)

## Server Setup

### 1. Install Required Packages

```bash
# Update package lists
sudo apt update
sudo apt upgrade -y

# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx
sudo apt install -y nginx

# Install Certbot and Nginx plugin
sudo apt install -y certbot python3-certbot-nginx

# Install additional utilities
sudo apt install -y git ufw
```

### 2. Configure Firewall

```bash
# Enable UFW if not already enabled
sudo ufw enable

# Allow SSH connections
sudo ufw allow 22

# Allow HTTP and HTTPS traffic
sudo ufw allow 80
sudo ufw allow 443

# Verify firewall status
sudo ufw status
```

Firewall status should show:
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
22/tcp (v6)                ALLOW       Anywhere (v6)
80/tcp (v6)                ALLOW       Anywhere (v6)
443/tcp (v6)               ALLOW       Anywhere (v6)
```

## Application Deployment

### 1. Build the Application

Build the application on your local machine or CI/CD pipeline:

```bash
# Install dependencies
npm ci

# Build for web
npm run build
```

### 2. Create Web Server Directory

```bash
# Create directory for the application
sudo mkdir -p /var/www/ol-explorer

# Set ownership
sudo chown -R $USER:$USER /var/www/ol-explorer

# Set permissions
sudo chmod -R 755 /var/www/ol-explorer
```

### 3. Deploy Application Files

Transfer the built application to the server:

```bash
# From your local machine (Development Environment)
# Replace username and server_ip with your actual server credentials
scp -r web-build/* username@server_ip:/var/www/ol-explorer/

# Alternatively, use rsync for more efficient transfers
rsync -avz --delete web-build/ username@server_ip:/var/www/ol-explorer/
```

## Nginx Configuration

### 1. Create Nginx Server Block

Create a server block configuration file:

```bash
sudo nano /etc/nginx/sites-available/ol-explorer
```

Add the following configuration:

```nginx
server {
    listen 80;
    listen [::]:80;
    
    server_name explorer.openlibra.space;
    
    root /var/www/ol-explorer;
    index index.html;
    
    # React Router support - redirect all requests to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        expires 30d;
    }
    
    # Enable gzip compression
    gzip on;
    gzip_comp_level 5;
    gzip_min_length 256;
    gzip_proxied any;
    gzip_vary on;
    gzip_types
        application/javascript
        application/json
        application/x-javascript
        text/css
        text/javascript
        text/plain
        text/xml;
    
    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options SAMEORIGIN;
    add_header X-XSS-Protection "1; mode=block";
    
    # Logs
    access_log /var/log/nginx/ol-explorer-access.log;
    error_log /var/log/nginx/ol-explorer-error.log;
}
```

### 2. Enable the Server Block

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/ol-explorer /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Reload Nginx to apply changes
sudo systemctl reload nginx
```

## SSL Configuration with Certbot

### 1. Obtain SSL Certificate

```bash
sudo certbot --nginx -d explorer.openlibra.space
```

Follow the prompts to:
- Provide your email address
- Agree to the terms of service
- Choose whether to redirect HTTP traffic to HTTPS

### 2. Verify SSL Configuration

After Certbot completes, your Nginx configuration will be automatically updated. Verify the SSL setup:

```bash
curl -I https://explorer.openlibra.space
```

The response should include:
```
HTTP/2 200
server: nginx
content-type: text/html
...
```

### 3. Configure Auto-renewal

Certbot installs a timer and service to automatically renew certificates. Verify it's active:

```bash
sudo systemctl status certbot.timer
```

## Performance Optimization

### 1. Nginx Worker Configuration

Edit the Nginx configuration:

```bash
sudo nano /etc/nginx/nginx.conf
```

Optimize the worker settings:

```nginx
worker_processes auto;
worker_connections 1024;
```

### 2. Browser Caching

Add or update caching headers in your server block:

```nginx
# Add cache control for static assets
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 30d;
    add_header Cache-Control "public, no-transform";
}
```

## Monitoring and Maintenance

### 1. Set Up Log Rotation

The default Nginx installation includes log rotation. Verify it's configured:

```bash
cat /etc/logrotate.d/nginx
```

### 2. Monitor Nginx Status

```bash
# Check Nginx status
sudo systemctl status nginx

# View error logs
sudo tail -f /var/log/nginx/ol-explorer-error.log

# View access logs
sudo tail -f /var/log/nginx/ol-explorer-access.log
```

## Deployment Verification

After deployment, verify that the application is working correctly:

1. Visit https://explorer.openlibra.space in a browser
2. Test core functionality:
   - Home page loading
   - Transaction list display
   - Transaction details access
   - Account lookups
   - Search functionality
3. Check SSL certificate validity:
   - Using browser security information
   - Using SSL verification tools (e.g., SSL Labs)

## Automated Deployment

For future deployments, consider setting up an automated deployment process:

```bash
# Create a deployment script on the server
cat > /home/ubuntu/deploy.sh << 'EOF'
#!/bin/bash

# Pull latest changes
cd /path/to/repo
git pull

# Install dependencies
npm ci

# Build the application
npm run build

# Deploy to web directory
rsync -avz --delete web-build/ /var/www/ol-explorer/

# Check Nginx configuration
sudo nginx -t

# Reload Nginx if config is valid
if [ $? -eq 0 ]; then
    sudo systemctl reload nginx
    echo "Deployment completed successfully"
else
    echo "Nginx configuration test failed"
    exit 1
fi
EOF

# Make the script executable
chmod +x /home/ubuntu/deploy.sh
```

## Backup Strategy

Implement a backup strategy to ensure you can recover your site:

```bash
# Create a backup script
cat > /home/ubuntu/backup.sh << 'EOF'
#!/bin/bash

# Set backup directory
BACKUP_DIR="/var/backups/ol-explorer"
mkdir -p $BACKUP_DIR

# Timestamp for backup filename
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Backup web files
tar -czf $BACKUP_DIR/ol-explorer_web_$TIMESTAMP.tar.gz -C /var/www/ol-explorer .

# Backup Nginx configuration
tar -czf $BACKUP_DIR/ol-explorer_nginx_$TIMESTAMP.tar.gz -C /etc/nginx/sites-available ol-explorer

# Rotate backups (keep last 7)
find $BACKUP_DIR -name "ol-explorer_web_*.tar.gz" -type f -mtime +7 -delete
find $BACKUP_DIR -name "ol-explorer_nginx_*.tar.gz" -type f -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR"
EOF

# Make the script executable
chmod +x /home/ubuntu/backup.sh

# Set up cron job to run daily
(crontab -l 2>/dev/null; echo "0 2 * * * /home/ubuntu/backup.sh") | crontab -
```

## Troubleshooting Common Issues

### 1. 502 Bad Gateway

If you encounter a 502 Bad Gateway error:

```bash
# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Verify Nginx is running
sudo systemctl status nginx

# Restart Nginx if needed
sudo systemctl restart nginx
```

### 2. SSL Certificate Issues

If you encounter SSL certificate issues:

```bash
# Check SSL certificate
sudo certbot certificates

# Renew certificate manually
sudo certbot renew --dry-run
sudo certbot renew
```

### 3. Permission Issues

If you encounter permission issues:

```bash
# Check ownership of web directory
ls -la /var/www/ol-explorer

# Fix permissions if needed
sudo chown -R www-data:www-data /var/www/ol-explorer
sudo chmod -R 755 /var/www/ol-explorer
```

## Conclusion

The OL Explorer application has been successfully deployed on an Ubuntu server with Nginx and SSL. The deployment follows best practices for security, performance, and maintainability. The application is accessible via HTTPS, and the server is configured for optimal performance and security. 