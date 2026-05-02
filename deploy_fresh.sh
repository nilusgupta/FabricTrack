#!/usr/bin/env bash
# FabricTrack - Fresh EC2 Deployment (t2.large, Ubuntu 22.04/24.04)
# Domain: crm.ramanujgroup.com via Let's Encrypt SSL
# MongoDB: Atlas (pre-populated with 296 enquiries)
# Run as: ubuntu user. sudo will be invoked where needed.
#
# Usage:
#   ./deploy_fresh.sh <ATLAS_MONGO_URL> <DB_NAME> <JWT_SECRET> <YOUR_EMAIL>
# Example:
#   ./deploy_fresh.sh "mongodb+srv://..." fabrictrack "long-random-string" you@example.com
set -euo pipefail

if [ "$#" -lt 4 ]; then
  echo "Usage: $0 <ATLAS_MONGO_URL> <DB_NAME> <JWT_SECRET> <ADMIN_EMAIL>"
  echo "  Wrap the Atlas URL in quotes (it contains special chars)"
  exit 1
fi

ATLAS_URL="$1"
DB_NAME="$2"
JWT_SECRET="$3"
ADMIN_EMAIL="$4"
DOMAIN="crm.ramanujgroup.com"
APP_DIR="/opt/fabrictrack"
REPO_URL="${REPO_URL:-https://github.com/YOUR_GITHUB_USER/YOUR_REPO.git}"

echo "=============================================="
echo "FabricTrack Fresh Deployment"
echo "  Domain:   $DOMAIN"
echo "  DB Name:  $DB_NAME"
echo "  AppDir:   $APP_DIR"
echo "=============================================="

# 1. System update & base packages
echo -e "\n[1/9] Installing base packages..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-pip python3-venv nginx supervisor certbot \
                    python3-certbot-nginx curl git build-essential ufw

# 2. Node.js 20 + Yarn
echo -e "\n[2/9] Installing Node.js 20 + Yarn..."
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
fi
sudo npm install -g yarn

# 3. Firewall (open 22, 80, 443 only)
echo -e "\n[3/9] Configuring UFW firewall..."
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# 4. Clone app repo (or prompt user)
echo -e "\n[4/9] Fetching app code..."
if [ ! -d "$APP_DIR" ]; then
  sudo mkdir -p "$APP_DIR"
  sudo chown -R ubuntu:ubuntu "$APP_DIR"
fi
if [ ! -d "$APP_DIR/backend" ] || [ ! -d "$APP_DIR/frontend" ]; then
  echo ""
  echo "!!!!  $APP_DIR is empty. Upload your app code there. Options:"
  echo "  A) git clone $REPO_URL $APP_DIR"
  echo "  B) scp -r ./app/* ubuntu@THIS_SERVER:$APP_DIR"
  echo "Then re-run this script."
  exit 1
fi

# 5. Backend setup
echo -e "\n[5/9] Setting up backend (Python venv + pip)..."
cd "$APP_DIR/backend"
python3 -m venv venv
# shellcheck source=/dev/null
source venv/bin/activate
pip install --upgrade pip wheel
pip install -r requirements.txt
pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/ || true
deactivate

cat > "$APP_DIR/backend/.env" <<EOF
MONGO_URL=$ATLAS_URL
DB_NAME=$DB_NAME
JWT_SECRET=$JWT_SECRET
COOKIE_SECURE=true
EOF
chmod 600 "$APP_DIR/backend/.env"
echo "Backend .env configured (COOKIE_SECURE=true because we have HTTPS)"

# 6. Frontend build
echo -e "\n[6/9] Building frontend..."
cd "$APP_DIR/frontend"
cat > .env <<EOF
REACT_APP_BACKEND_URL=https://$DOMAIN
EOF
yarn install --frozen-lockfile
yarn build
echo "Frontend built at $APP_DIR/frontend/build"

# 7. Supervisor config for backend
echo -e "\n[7/9] Configuring supervisor for backend..."
sudo tee /etc/supervisor/conf.d/fabrictrack.conf >/dev/null <<EOF
[program:fabrictrack-backend]
command=$APP_DIR/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001 --proxy-headers --forwarded-allow-ips="*"
directory=$APP_DIR/backend
user=ubuntu
autostart=true
autorestart=true
stderr_logfile=/var/log/fabrictrack/backend.err.log
stdout_logfile=/var/log/fabrictrack/backend.out.log
environment=PATH="$APP_DIR/backend/venv/bin:/usr/bin:/bin"
stopasgroup=true
killasgroup=true
EOF
sudo mkdir -p /var/log/fabrictrack
sudo chown ubuntu:ubuntu /var/log/fabrictrack
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl restart fabrictrack-backend || sudo supervisorctl start fabrictrack-backend

# 8. Nginx — HTTP only (certbot will add HTTPS next)
echo -e "\n[8/9] Configuring Nginx..."
sudo tee /etc/nginx/sites-available/fabrictrack >/dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    client_max_body_size 50M;

    # Frontend (React build)
    root $APP_DIR/frontend/build;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF
sudo ln -sf /etc/nginx/sites-available/fabrictrack /etc/nginx/sites-enabled/fabrictrack
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# 9. Let's Encrypt SSL
echo -e "\n[9/9] Obtaining Let's Encrypt SSL..."
echo "--- Before continuing, verify DNS for $DOMAIN points to THIS server's IP. ---"
THIS_IP=$(curl -s https://checkip.amazonaws.com || echo "UNKNOWN")
RESOLVED=$(getent hosts $DOMAIN | awk '{print $1}' | head -1)
echo "  This server IP: $THIS_IP"
echo "  $DOMAIN resolves to: $RESOLVED"
if [ "$THIS_IP" != "$RESOLVED" ]; then
  echo ""
  echo "!!!  DNS mismatch. Update BigRock DNS:"
  echo "     - Delete any existing A/CNAME records for 'crm'"
  echo "     - Add A record: crm -> $THIS_IP (TTL 300)"
  echo "     - Wait 5-10 min, then re-run the next command manually:"
  echo "       sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $ADMIN_EMAIL --redirect"
  exit 0
fi

sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$ADMIN_EMAIL" --redirect

echo ""
echo "=============================================="
echo "Deployment complete!"
echo "  Open: https://$DOMAIN"
echo "  Backend logs: tail -f /var/log/fabrictrack/backend.err.log"
echo "  Restart backend: sudo supervisorctl restart fabrictrack-backend"
echo "=============================================="
