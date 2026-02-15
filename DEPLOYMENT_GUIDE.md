# PMC MERN Stack - Deployment Guide

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Production Environment Setup](#production-environment-setup)
3. [Backend Deployment](#backend-deployment)
4. [Frontend Deployment](#frontend-deployment)
5. [Database Setup](#database-setup)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

### Application Code
- [ ] All TypeScript compiles without errors
- [ ] All tests passing (unit, integration, e2e)
- [ ] No console.log statements in production code
- [ ] Security headers configured
- [ ] CORS settings appropriate for production
- [ ] Environment variables documented

### Infrastructure
- [ ] Production MongoDB instance available
- [ ] SSL/TLS certificates obtained
- [ ] Firewall rules configured
- [ ] Backup strategy in place
- [ ] Monitoring tools configured
- [ ] CDN configured (optional)

### Security
- [ ] Dependencies scanned for vulnerabilities (`npm audit`)
- [ ] Sensitive data removed from codebase
- [ ] API keys/secrets in environment variables only
- [ ] Rate limiting enabled
- [ ] HTTPS enforced
- [ ] CORS restricted to known origins

### Documentation
- [ ] API documentation complete
- [ ] Deployment runbook prepared
- [ ] Architecture documentation updated
- [ ] Incident response plan ready

---

## Production Environment Setup

### 1. Install Node.js and npm

```bash
# Windows (Using Chocolatey)
choco install nodejs

# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# macOS
brew install node
```

**Verify:**
```bash
node --version  # v18.x or higher
npm --version   # v9.x or higher
```

### 2. Install PM2 (Process Manager)

```bash
npm install -g pm2
pm2 startup
pm2 save
```

### 3. Create Application Directory

```bash
# Create dedicated user
sudo useradd -m -s /bin/bash pmcapp

# Create application directory
sudo mkdir -p /opt/pmc-application
sudo chown pmcapp:pmcapp /opt/pmc-application
sudo chmod 755 /opt/pmc-application
```

### 4. Configure Environment Variables

**Backend (.env)**
```env
# Server Configuration
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Database
MONGODB_URI=mongodb://user:password@mongodb-host:27017/pmc-db
MONGODB_POOL_SIZE=10

# API Configuration
API_BASE_URL=https://api.pmc.gov.pk
CORS_ORIGIN=https://www.pmc.gov.pk

# Security
JWT_SECRET=your-secret-key-here
JWT_EXPIRATION=24h
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRATION=7d

# File Upload
MAX_FILE_SIZE=52428800
UPLOAD_PATH=/opt/pmc-application/uploads

# Email Notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-password
SMTP_FROM=noreply@pmc.gov.pk

# Logging
LOG_LEVEL=info
LOG_PATH=/opt/pmc-application/logs

# Features
ENABLE_ANALYTICS=true
ENABLE_REPORTS=true
ANALYTICS_RETENTION_DAYS=90
```

**Frontend (.env)**
```env
VITE_API_URL=https://api.pmc.gov.pk
VITE_APP_NAME=PMC Management System
VITE_APP_VERSION=1.0.0
VITE_ENABLE_ANALYTICS=true
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

---

## Backend Deployment

### 1. Clone and Setup Application

```bash
# Navigate to application directory
cd /opt/pmc-application

# Clone repository
git clone https://github.com/your-org/pmc-mernstack.git .

# Install dependencies
cd server
npm install --production

# Build application
npm run build

# Verify build
ls -la dist/
```

### 2. Database Migration

```bash
# Run migrations
npm run migrations:run

# Verify database connection
npm run db:health-check
```

### 3. Start with PM2

```bash
# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'pmc-backend',
      script: './dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: './logs/error.log',
      out_file: './logs/output.log',
      log_file: './logs/combined.log',
      time_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads'],
      max_memory_restart: '1G',
      restart_delay: 4000,
      min_uptime: '10s',
      max_restarts: 10
    }
  ]
}
EOF

# Start application
pm2 start ecosystem.config.js --env production

# Verify
pm2 status
pm2 logs pmc-backend
```

### 4. Nginx Reverse Proxy

**Configuration (/etc/nginx/sites-available/pmc-api):**

```nginx
upstream pmc_backend {
    server 127.0.0.1:5000;
    keepalive 32;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name api.pmc.gov.pk;
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name api.pmc.gov.pk;

    ssl_certificate /etc/letsencrypt/live/api.pmc.gov.pk/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.pmc.gov.pk/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Logging
    access_log /var/log/nginx/pmc-api-access.log combined;
    error_log /var/log/nginx/pmc-api-error.log warn;

    # Proxy Configuration
    location / {
        proxy_pass http://pmc_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # File Upload Configuration
    client_max_body_size 50M;

    # Static Files Caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/pmc-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Frontend Deployment

### 1. Build and Deploy

```bash
# Navigate to client directory
cd /opt/pmc-application/client

# Install dependencies
npm install --production

# Build for production
npm run build

# Build output in 'dist' directory
ls -la dist/
```

### 2. AWS S3 + CloudFront Deployment (Recommended)

```bash
# Install AWS CLI
npm install -g aws-cli

# Configure AWS credentials
aws configure

# Deploy to S3
aws s3 sync dist/ s3://pmc-frontend-bucket/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id E1234ABCD --paths "/*"
```

### 3. Nginx Static Hosting

**Configuration (/etc/nginx/sites-available/pmc-web):**

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name pmc.gov.pk www.pmc.gov.pk;
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name pmc.gov.pk www.pmc.gov.pk;

    ssl_certificate /etc/letsencrypt/live/pmc.gov.pk/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pmc.gov.pk/privkey.pem;

    root /opt/pmc-application/client/dist;
    index index.html;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css text/javascript application/json application/javascript;
    gzip_min_length 1000;

    # SPA Fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Proxy
    location /api/ {
        proxy_pass https://api.pmc.gov.pk/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Cache Static Assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|ttf|eot)$ {
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    access_log /var/log/nginx/pmc-web-access.log combined;
    error_log /var/log/nginx/pmc-web-error.log warn;
}
```

---

## Database Setup

### 1. MongoDB Atlas (Recommended for Production)

```bash
# Create cluster at https://www.mongodb.com/cloud/atlas
# Connection string format:
# mongodb+srv://user:password@cluster.mongodb.net/pmc-db

# Test connection
npx mongodb-connection-string-parser "mongodb+srv://user:password@cluster.mongodb.net/pmc-db"
```

### 2. Self-Hosted MongoDB

```bash
# Install MongoDB
sudo apt-get install -y mongodb-org

# Start service
sudo systemctl start mongod
sudo systemctl enable mongod

# Create admin user
mongo admin --eval "
  db.createUser({
    user: 'admin',
    pwd: 'strong_password_here',
    roles: ['root']
  })
"

# Create application database
mongo -u admin -p strong_password_here --eval "
  use pmcdb;
  db.createCollection('applicants');
  db.createCollection('businesses');
"

# Enable authentication
sudo nano /etc/mongod.conf
# Uncomment: security: authorization: enabled

# Restart
sudo systemctl restart mongod
```

### 3. Database Backup Strategy

```bash
# Automated daily backup via cron
crontab -e

# Add line:
0 2 * * * mongodump -u admin -p password -d pmc-db -o /backup/mongo-$(date +\%Y\%m\%d)

# Backup rotation (keep last 30 days)
0 3 * * * find /backup -type d -mtime +30 -exec rm -rf {} \;
```

---

## Monitoring & Maintenance

### 1. Application Monitoring

```bash
# Install Datadog Agent
DD_AGENT_MAJOR_VERSION=7 DD_API_KEY=your-key DD_SITE=datadoghq.com \
bash -c "$(curl -L https://s3.amazonaws.com/datadog-agent/scripts/install_agent.sh)"

# Monitor PM2
pm2 install pm2-auto-pull
pm2 install pm2-logrotate

# View real-time logs
pm2 monit
```

### 2. Health Check Endpoint

**Backend (src/interfaces/middleware/health.ts):**

```typescript
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  })
})
```

### 3. Performance Optimization

```bash
# Enable gzip compression (Nginx configured above)

# Database indexes
db.applicants.createIndex({ cnic: 1 })
db.businesses.createIndex({ registrationNumber: 1 })
db.documents.createIndex({ businessId: 1, createdAt: -1 })

# Node.js optimization
NODE_ENV=production node --max-old-space-size=2048 server.js
```

### 4. Log Management

```bash
# View logs
pm2 logs

# Log rotation configuration
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 30
```

---

## Troubleshooting

### Issue: Application won't start

```bash
# Check logs
pm2 logs pmc-backend --lines 50

# Verify dependencies
npm list

# Check port availability
lsof -i :5000

# Restart
pm2 restart pmc-backend
```

### Issue: Database connection failed

```bash
# Test connection
mongosh "mongodb+srv://user:pass@host/db"

# Check MongoDB service
systemctl status mongod

# Verify credentials in .env file
echo $MONGODB_URI
```

### Issue: High memory usage

```bash
# Monitor memory
pm2 monit

# Identify memory leaks
node --inspect server.js

# Increase heap size
pm2 restart pmc-backend --max-memory-restart 2G
```

### Issue: SSL certificate errors

```bash
# Renew Let's Encrypt certificate
certbot renew --force-renewal

# Verify certificate
openssl x509 -in /etc/letsencrypt/live/api.pmc.gov.pk/cert.pem -text -noout

# Reload Nginx
systemctl reload nginx
```

---

## Rollback Procedure

```bash
# If deployment fails:

# 1. Stop application
pm2 stop pmc-backend

# 2. Revert code to previous version
git revert HEAD

# 3. Reinstall dependencies
npm install

# 4. Rebuild
npm run build

# 5. Start application
pm2 start ecosystem.config.js --env production

# 6. Verify
curl https://api.pmc.gov.pk/health
```

---

## Post-Deployment Verification

```bash
# 1. Check API health
curl https://api.pmc.gov.pk/health

# 2. Verify database connectivity
curl https://api.pmc.gov.pk/applicants

# 3. Check SSL certificate
curl -I https://api.pmc.gov.pk/

# 4. Verify frontend access
curl https://pmc.gov.pk/

# 5. Check monitoring
pm2 status
pm2 logs --lines 20
```

---

## Support & Escalation

For deployment issues:
1. Check logs: `pm2 logs pmc-backend`
2. Verify configuration files
3. Check system resources: `free -h`, `df -h`
4. Contact DevOps team
5. File incident ticket with logs attached

---

**Last Updated:** 2024-01-20
**Version:** 1.0.0
