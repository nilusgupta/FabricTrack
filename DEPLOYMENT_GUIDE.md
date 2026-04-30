# FabricTrack Deployment Guide - AWS EC2 (Ubuntu 22.04/24.04)
# Server: t3.micro | Domain: ramanujgroup.com

## ⚠️ IMPORTANT: t3.micro has only 1GB RAM
## MongoDB + Node + Python on 1GB is tight. Consider t3.small (2GB) for production.
## If budget is strict, we'll add swap space to make it work.

---

## Step 1: SSH into your EC2 instance

```bash
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

---

## Step 2: Run the full setup script (copy-paste this entire block)

```bash
#!/bin/bash
set -e

echo "=== FabricTrack Deployment Script ==="
echo "=== Ubuntu 22.04/24.04 on t3.micro ==="

# Add 2GB swap (critical for t3.micro with 1GB RAM)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Update system
sudo apt update && sudo apt upgrade -y

# Install MongoDB 7.0
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# Install Python 3.11+
sudo apt install -y python3 python3-pip python3-venv

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g yarn

# Install Nginx
sudo apt install -y nginx

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx

# Install Supervisor
sudo apt install -y supervisor

# Create app directory
sudo mkdir -p /opt/fabrictrack
sudo chown ubuntu:ubuntu /opt/fabrictrack

echo "=== Base packages installed ==="
echo "MongoDB status:"
sudo systemctl status mongod --no-pager -l | head -5
echo ""
echo "=== Now upload your app code ==="
```

---

## Step 3: Upload your app code

From your local machine (after downloading from Emergent):
```bash
# Option A: Using SCP
scp -i your-key.pem -r ./app/* ubuntu@YOUR_EC2_PUBLIC_IP:/opt/fabrictrack/

# Option B: Using Git (if you saved to GitHub)
cd /opt/fabrictrack
git clone https://github.com/YOUR_REPO.git .
```

---

## Step 4: Setup Backend

```bash
cd /opt/fabrictrack/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/

# Create .env file
cat > .env << 'EOF'
MONGO_URL=mongodb://localhost:27017
DB_NAME=fabrictrack
JWT_SECRET=your-strong-random-secret-change-this-in-production
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
EOF

# Test backend starts
python -c "import server; print('Backend OK')"
deactivate
```

---

## Step 5: Build Frontend

```bash
cd /opt/fabrictrack/frontend

# Create .env
cat > .env << 'EOF'
REACT_APP_BACKEND_URL=https://ramanujgroup.com
EOF

# Install dependencies and build
yarn install
yarn build
```

---

## Step 6: Configure Supervisor (Process Manager)

```bash
sudo cat > /etc/supervisor/conf.d/fabrictrack.conf << 'EOF'
[program:fabrictrack-backend]
command=/opt/fabrictrack/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
directory=/opt/fabrictrack/backend
user=ubuntu
autostart=true
autorestart=true
stderr_logfile=/var/log/fabrictrack/backend.err.log
stdout_logfile=/var/log/fabrictrack/backend.out.log
environment=PATH="/opt/fabrictrack/backend/venv/bin:%(ENV_PATH)s"
EOF

sudo mkdir -p /var/log/fabrictrack
sudo chown ubuntu:ubuntu /var/log/fabrictrack
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start fabrictrack-backend
```

---

## Step 7: Configure Nginx

```bash
sudo cat > /etc/nginx/sites-available/fabrictrack << 'EOF'
server {
    listen 80;
    server_name ramanujgroup.com www.ramanujgroup.com;

    # Frontend (React build)
    root /opt/fabrictrack/frontend/build;
    index index.html;

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 50M;
    }

    # React SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/fabrictrack /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

## Step 8: Point DNS to EC2

Go to your DNS provider and update:
- **A Record**: `ramanujgroup.com` → YOUR_EC2_PUBLIC_IP
- **A Record**: `www.ramanujgroup.com` → YOUR_EC2_PUBLIC_IP

Wait 5-10 minutes for DNS to propagate.

---

## Step 9: Install SSL Certificate (after DNS is pointed)

```bash
sudo certbot --nginx -d ramanujgroup.com -d www.ramanujgroup.com --non-interactive --agree-tos -m your-email@example.com
```

---

## Step 10: Verify Everything Works

```bash
# Check all services
sudo systemctl status mongod --no-pager | head -3
sudo supervisorctl status
sudo systemctl status nginx --no-pager | head -3

# Test API
curl -s http://localhost:8001/api/auth/login -X POST -H "Content-Type: application/json" -d '{"email":"admin@example.com","password":"admin123"}' | head -c 100

echo ""
echo "=== DEPLOYMENT COMPLETE ==="
echo "Visit: https://ramanujgroup.com"
```

---

## Maintenance Commands

```bash
# View backend logs
tail -f /var/log/fabrictrack/backend.err.log

# Restart backend after code changes
sudo supervisorctl restart fabrictrack-backend

# Restart Nginx after config changes
sudo systemctl restart nginx

# MongoDB shell
mongosh fabrictrack

# Backup database
mongodump --db fabrictrack --out /opt/backups/$(date +%Y%m%d)

# Update app code
cd /opt/fabrictrack && git pull
cd frontend && yarn build
sudo supervisorctl restart fabrictrack-backend
```

---

## Security Checklist

- [ ] Change JWT_SECRET in backend/.env to a random 64-char string
- [ ] Change ADMIN_PASSWORD to something strong
- [ ] Configure EC2 Security Group: only allow ports 22 (SSH), 80 (HTTP), 443 (HTTPS)
- [ ] Set up automated backups for MongoDB
- [ ] Consider upgrading to t3.small if app feels slow (1GB RAM is tight)

---

## Troubleshooting

**Backend not starting:**
```bash
tail -50 /var/log/fabrictrack/backend.err.log
```

**Nginx 502 Bad Gateway:**
```bash
sudo supervisorctl status  # Check if backend is running
curl http://localhost:8001/api/auth/me  # Test backend directly
```

**MongoDB connection failed:**
```bash
sudo systemctl status mongod
sudo journalctl -u mongod --no-pager | tail -20
```

**Out of memory (t3.micro):**
```bash
free -h  # Check memory
htop     # Check processes
# Add more swap if needed
```
