# Deployment Guide - Bogor Junior FS

## Overview

This guide covers deployment for both:
1. **Backend API** (Express.js) - Separate repository
2. **Frontend** (React + Vite) - Separate repository

## Backend Deployment

### Prerequisites
- Node.js >= 18.x
- MySQL 8.x
- PM2 (for process management)
- Nginx (for reverse proxy)

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install MySQL
sudo apt install mysql-server
sudo mysql_secure_installation
```

### Step 2: Clone and Configure Backend

```bash
# Clone repository
git clone <your-backend-repo-url> /var/www/bogorjunior-backend
cd /var/www/bogorjunior-backend

# Install dependencies
npm ci --only=production

# Create .env file
cp .env.example .env
nano .env
```

Configure `.env`:
```env
PORT=3000
NODE_ENV=production
DB_HOST=localhost
DB_USER=bogorjunior_user
DB_PASSWORD=your_secure_password
DB_NAME=bogorjuniorfs
JWT_SECRET=your_very_secure_jwt_secret_key_here
CORS_ORIGIN=https://yourdomain.com
GA4_PROPERTY_ID=your_property_id
GOOGLE_APPLICATION_CREDENTIALS=./config/google/service-account.json
```

### Step 3: Database Setup

```bash
# Login to MySQL
sudo mysql -u root -p

# Create database and user
CREATE DATABASE bogorjuniorfs;
CREATE USER 'bogorjunior_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON bogorjuniorfs.* TO 'bogorjunior_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Import database (if you have existing data)
mysql -u bogorjunior_user -p bogorjuniorfs < /path/to/your/database.sql
```

### Step 4: Setup Google Analytics (Optional)

```bash
# Create directory
mkdir -p config/google

# Upload your service account JSON file
# scp service-account.json user@server:/var/www/bogorjunior-backend/config/google/
```

### Step 5: Start Backend with PM2

```bash
# Start application
pm2 start src/server.js --name bogorjunior-backend

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### Step 6: Configure Nginx

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/bogorjunior-backend
```

Add configuration:
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads {
        alias /var/www/bogorjunior-backend/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/bogorjunior-backend /etc/nginx/sites-enabled/

# Test and reload Nginx
sudo nginx -t
sudo systemctl reload nginx
```

### Step 7: Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d api.yourdomain.com
```

## Frontend Deployment

### Step 1: Build Frontend

```bash
# Clone repository
git clone <your-frontend-repo-url> /var/www/bogorjunior-frontend
cd /var/www/bogorjunior-frontend

# Install dependencies
npm ci

# Update API URL in .env or config
echo "VITE_API_URL=https://api.yourdomain.com" > .env.production

# Build for production
npm run build
```

### Step 2: Configure Nginx for Frontend

```bash
sudo nano /etc/nginx/sites-available/bogorjunior-frontend
```

Add configuration:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    root /var/www/bogorjunior-frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    gzip on;
    gzip_types text/css application/javascript image/svg+xml;
    gzip_vary on;
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/bogorjunior-frontend /etc/nginx/sites-enabled/

# Test and reload
sudo nginx -t
sudo systemctl reload nginx

# Setup SSL
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## Using Docker (Alternative)

### Backend with Docker

```bash
cd /var/www/bogorjunior-backend

# Build and run
docker-compose up -d

# View logs
docker-compose logs -f backend
```

### Frontend with Docker

Create `Dockerfile` in frontend:
```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Create `nginx.conf`:
```nginx
server {
    listen 80;
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }
}
```

Build and run:
```bash
docker build -t bogorjunior-frontend .
docker run -d -p 80:80 bogorjunior-frontend
```

## Monitoring

### Backend Monitoring

```bash
# PM2 monitoring
pm2 monit

# View logs
pm2 logs bogorjunior-backend

# Restart
pm2 restart bogorjunior-backend
```

### Database Backups

```bash
# Create backup script
cat > /root/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/mysql"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
mysqldump -u bogorjunior_user -p'your_password' bogorjuniorfs > $BACKUP_DIR/backup_$DATE.sql
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
EOF

chmod +x /root/backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /root/backup-db.sh
```

## Environment Variables Reference

### Backend (.env)
```env
PORT=3000
NODE_ENV=production
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=bogorjuniorfs
DB_PORT=3306
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h
CORS_ORIGIN=https://yourdomain.com
GA4_PROPERTY_ID=your_property_id
GOOGLE_APPLICATION_CREDENTIALS=./config/google/service-account.json
MAX_FILE_SIZE=5242880
```

### Frontend (.env.production)
```env
VITE_API_URL=https://api.yourdomain.com
VITE_APP_NAME=Bogor Junior FS
```

## Troubleshooting

### Backend not responding
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs bogorjunior-backend --lines 100

# Restart
pm2 restart bogorjunior-backend
```

### Database connection issues
```bash
# Test MySQL connection
mysql -u bogorjunior_user -p -h localhost bogorjuniorfs

# Check MySQL status
sudo systemctl status mysql
```

### CORS errors
- Verify `CORS_ORIGIN` in backend `.env`
- Check Nginx proxy headers
- Verify frontend is using correct API URL

## Security Checklist

- [ ] Use strong JWT secret
- [ ] Enable HTTPS/SSL
- [ ] Set secure database password
- [ ] Configure firewall (UFW)
- [ ] Regular security updates
- [ ] Backup Google service account keys
- [ ] Set proper file permissions
- [ ] Enable rate limiting
- [ ] Monitor logs regularly
