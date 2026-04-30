#!/bin/bash
# ============================================
# FabricTrack Complete Deployment Script
# Server: AWS EC2 t2.large (Ubuntu 24.04)
# Database: MongoDB Atlas
# Domain: ramanujgroup.com
# ============================================

set -e
echo "=========================================="
echo "  FabricTrack Deployment - Step 1"
echo "  Installing System Dependencies"
echo "=========================================="

# Update system
sudo apt update && sudo apt upgrade -y

# Install Python, Node, Nginx, Git, Supervisor
sudo apt install -y python3 python3-pip python3-venv git nginx supervisor curl gnupg

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g yarn

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx

echo "=========================================="
echo "  Step 1 DONE - All packages installed"
echo "=========================================="
echo ""
echo "Now run: bash /opt/fabrictrack/deploy_step2.sh"
