# Kahoot App Deployment Guide

This comprehensive guide covers deploying your Kahoot app to various hosting platforms while maintaining full functionality including WebSockets and file storage.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Production Modifications](#production-modifications)
3. [Free Hosting Options](#free-hosting-options)
   - [Render](#render-deployment)
   - [Railway](#railway-deployment)
   - [Fly.io](#flyio-deployment)
   - [Glitch](#glitch-deployment)
4. [VPS Deployment](#vps-deployment)
   - [DigitalOcean](#digitalocean-deployment)
   - [Linode](#linode-deployment)
5. [Security Considerations](#security-considerations)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying, ensure you have:
- Git installed locally
- Node.js 14+ installed
- All dependencies listed in package.json
- A GitHub account (for some deployment methods)

## Production Modifications

### 1. Environment Variables

Create a `.env` file for production settings:

```env
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### 2. Update server/app.js for Production

Add these modifications to your server/app.js:

```javascript
// At the top of the file
require('dotenv').config();

// CORS configuration for Socket.IO
const io = socketIo(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : "*",
    methods: ["GET", "POST"]
  }
});

// Add helmet for security
const helmet = require('helmet');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
}));

// Add rate limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);
```

### 3. Update package.json

Add production dependencies:

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.2",
    "dotenv": "^16.3.1",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5"
  },
  "engines": {
    "node": ">=14.0.0"
  }
}
```

### 4. Create .gitignore

```
node_modules/
.env
.env.local
.env.production
npm-debug.log*
server.log
.DS_Store
```

### 5. WebSocket Configuration for Production

Update your client-side JavaScript files to use the correct WebSocket URL:

```javascript
// In public/js/app.js and admin.js
const socket = io(window.location.origin, {
  transports: ['websocket', 'polling'],
  upgrade: true
});
```

## Free Hosting Options

### Render Deployment

Render offers free hosting with WebSocket support and automatic HTTPS.

#### Step 1: Prepare Your Repository

1. Initialize git and push to GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/kahoot-app.git
git push -u origin main
```

#### Step 2: Deploy on Render

1. Sign up at [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: kahoot-app
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Free plan**: Select free tier

#### Step 3: Configure Environment Variables

In Render dashboard → Environment:
- Add `NODE_ENV` = `production`
- Add `PORT` = `3000` (Render will override this)

#### Step 4: Handle Persistent Storage

Since Render's free tier doesn't include persistent storage, modify your app to use a database or external storage:

Option A: Use Render's PostgreSQL (free tier available)
Option B: Use MongoDB Atlas (free tier)
Option C: Use Firebase Realtime Database

Example modification for MongoDB:

```javascript
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/kahoot-app');

// Quiz Schema
const quizSchema = new mongoose.Schema({
  title: String,
  description: String,
  questions: [{
    question: String,
    options: [String],
    correct: Number,
    timeLimit: Number
  }],
  createdAt: { type: Date, default: Date.now }
});

const Quiz = mongoose.model('Quiz', quizSchema);
```

### Railway Deployment

Railway provides easy deployment with automatic builds and WebSocket support.

#### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

#### Step 2: Deploy

```bash
# In your project directory
railway login
railway init
railway up
```

#### Step 3: Configure Environment

In Railway dashboard:
1. Go to your project
2. Click on Variables
3. Add:
   - `NODE_ENV` = `production`
   - `PORT` = `${{PORT}}` (Railway provides this)

#### Step 4: Add Volume for Persistent Storage

1. In Railway dashboard → Add New → Volume
2. Mount path: `/data`
3. Update your app to use this path:

```javascript
const DATA_PATH = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, '../data');
const quizStorePath = path.join(DATA_PATH, 'quiz-store.json');
```

### Fly.io Deployment

Fly.io offers global deployment with WebSocket support.

#### Step 1: Install Fly CLI

```bash
curl -L https://fly.io/install.sh | sh
```

#### Step 2: Initialize and Deploy

```bash
fly auth login
fly launch

# When prompted:
# - App name: kahoot-app
# - Region: Choose nearest
# - Deploy now: Yes
```

#### Step 3: Create fly.toml

```toml
app = "kahoot-app"

[env]
  NODE_ENV = "production"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true

[[services]]
  protocol = "tcp"
  internal_port = 3000

  [[services.ports]]
    port = 80
    handlers = ["http"]
  
  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

[mounts]
  destination = "/data"
  source = "kahoot_data"
```

#### Step 4: Deploy

```bash
fly deploy
```

### Glitch Deployment

Glitch provides instant deployment with a web-based editor.

#### Step 1: Import from GitHub

1. Go to [glitch.com](https://glitch.com)
2. Click "New Project" → "Import from GitHub"
3. Enter your repository URL

#### Step 2: Configure for Glitch

Create `.glitch-assets` file (empty is fine)

Update `package.json`:
```json
{
  "scripts": {
    "start": "node server/app.js"
  },
  "engines": {
    "node": "14.x"
  }
}
```

#### Step 3: Handle Wake-Up

Glitch apps sleep after inactivity. Add to your client code:

```javascript
// Keep app awake
setInterval(() => {
  fetch(window.location.origin)
    .then(() => console.log('Keeping app awake'))
    .catch(() => console.log('Wake-up ping failed'));
}, 240000); // Every 4 minutes
```

## VPS Deployment

### DigitalOcean Deployment

#### Step 1: Create Droplet

1. Sign up at [digitalocean.com](https://digitalocean.com)
2. Create Droplet:
   - Choose Ubuntu 22.04 LTS
   - Select $6/month plan (1GB RAM, 25GB SSD)
   - Choose datacenter region
   - Add SSH key

#### Step 2: Initial Server Setup

```bash
# Connect to your server
ssh root@your_server_ip

# Create new user
adduser kahoot
usermod -aG sudo kahoot

# Setup firewall
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable

# Switch to new user
su - kahoot
```

#### Step 3: Install Dependencies

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt-get install nginx

# Install Certbot for SSL
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```

#### Step 4: Deploy Application

```bash
# Clone your repository
git clone https://github.com/yourusername/kahoot-app.git
cd kahoot-app
npm install

# Create PM2 ecosystem file
echo "module.exports = {
  apps: [{
    name: 'kahoot-app',
    script: 'server/app.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}" > ecosystem.config.js

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### Step 5: Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/kahoot-app
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/kahoot-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Step 6: Setup SSL

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Linode Deployment

The process is similar to DigitalOcean:

#### Step 1: Create Linode

1. Sign up at [linode.com](https://linode.com)
2. Create Linode:
   - Choose Ubuntu 22.04 LTS
   - Select Nanode 1GB plan ($5/month)
   - Choose region
   - Set root password

#### Step 2-6: Follow DigitalOcean Steps

The remaining steps are identical to DigitalOcean deployment.

## Security Considerations

### 1. Authentication

Add admin authentication:

```javascript
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Admin middleware
const adminAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Protect admin routes
app.use('/admin', adminAuth);
app.use('/api/quiz', adminAuth);
```

### 2. Input Validation

Add validation middleware:

```javascript
const validator = require('express-validator');

app.post('/api/quiz', [
  validator.body('title').trim().isLength({ min: 1, max: 100 }),
  validator.body('questions').isArray({ min: 1 }),
  validator.body('questions.*.question').trim().isLength({ min: 1, max: 500 }),
  validator.body('questions.*.options').isArray({ min: 2, max: 4 }),
  validator.body('questions.*.correct').isInt({ min: 0, max: 3 })
], (req, res) => {
  const errors = validator.validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // Process valid input
});
```

### 3. Rate Limiting

Already included in production modifications above.

### 4. HTTPS

Always use HTTPS in production. Free SSL certificates are available through:
- Let's Encrypt (for VPS)
- Cloudflare (proxy with SSL)
- Platform-provided SSL (Render, Railway, Fly.io)

### 5. Environment Variables

Never commit sensitive data. Use environment variables for:
- Database credentials
- API keys
- JWT secrets
- Admin passwords

### 6. Content Security Policy

Already included in helmet configuration above.

### 7. WebSocket Security

Implement socket authentication:

```javascript
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication error'));
  }
  
  // Verify token or session
  next();
});
```

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check CORS configuration
   - Ensure nginx/proxy passes WebSocket headers
   - Verify client uses correct protocol (wss:// for HTTPS)

2. **File Storage Issues**
   - Use external storage for platforms without persistent storage
   - Implement proper error handling for file operations
   - Consider using a database instead of JSON files

3. **Memory Limits**
   - Implement proper cleanup for completed games
   - Use Redis for session storage if needed
   - Monitor memory usage with PM2

4. **Performance Issues**
   - Enable Node.js clustering for multiple cores
   - Implement caching for quiz data
   - Use CDN for static assets

### Monitoring

1. **Application Monitoring**
   ```bash
   # For VPS deployments
   pm2 monit
   pm2 logs
   ```

2. **Error Tracking**
   Consider integrating:
   - Sentry for error tracking
   - LogRocket for session replay
   - New Relic for performance monitoring

### Backup Strategy

1. **Database Backups**
   - Set up automated daily backups
   - Store backups in different region
   - Test restore procedures regularly

2. **Code Backups**
   - Use Git for version control
   - Tag releases
   - Maintain staging environment

## Conclusion

This guide covers the essential steps for deploying your Kahoot app to production. Choose the platform that best fits your needs:

- **For Quick Testing**: Glitch or Render free tier
- **For Production with Low Traffic**: Railway or Fly.io
- **For Full Control and Scalability**: DigitalOcean or Linode VPS

Remember to:
- Always use HTTPS in production
- Implement proper authentication
- Monitor your application
- Keep dependencies updated
- Follow security best practices

For questions or issues, refer to the platform-specific documentation or create an issue in your GitHub repository.