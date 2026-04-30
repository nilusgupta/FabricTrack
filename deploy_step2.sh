#!/bin/bash
# ============================================
# FabricTrack Deployment - Step 2
# Setup Backend + Frontend + Services
# ============================================

set -e

APP_DIR="/opt/fabrictrack"

echo "=========================================="
echo "  Step 2: Setting up Application"
echo "=========================================="

# Create app directory
sudo mkdir -p $APP_DIR
sudo chown ubuntu:ubuntu $APP_DIR
cd $APP_DIR

echo ""
echo ">> Setting up Backend..."
cd $APP_DIR/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt
pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/

# Test import
python -c "import server; print('Backend OK')"
deactivate

echo ""
echo ">> Building Frontend..."
cd $APP_DIR/frontend

# Install and build
yarn install
yarn build

echo ""
echo ">> Configuring Supervisor..."
sudo mkdir -p /var/log/fabrictrack

sudo tee /etc/supervisor/conf.d/fabrictrack.conf > /dev/null << 'EOF'
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

sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl restart fabrictrack-backend

echo ""
echo ">> Configuring Nginx..."
sudo tee /etc/nginx/sites-available/fabrictrack > /dev/null << 'EOF'
server {
    listen 80;
    server_name ramanujgroup.com www.ramanujgroup.com;

    # Frontend (React build)
    root /opt/fabrictrack/frontend/build;
    index index.html;

    # API proxy to backend
    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_read_timeout 120s;
        client_max_body_size 50M;
    }

    # React SPA - all routes go to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/fabrictrack /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

echo ""
echo "=========================================="
echo "  Step 2 DONE!"
echo "=========================================="
echo ""
echo "  Backend: running on port 8001"
echo "  Frontend: built and served by Nginx"
echo "  Nginx: listening on port 80"
echo ""
echo "  NEXT STEPS:"
echo "  1. Point DNS (ramanujgroup.com) to this server IP"
echo "  2. Run: sudo certbot --nginx -d ramanujgroup.com -d www.ramanujgroup.com"
echo "  3. Visit https://ramanujgroup.com"
echo ""
echo "  Test locally: curl http://localhost:8001/api/auth/me"
echo "=========================================="
