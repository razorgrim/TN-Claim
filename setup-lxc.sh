#!/bin/bash

# Total Neutron Claims LXC Deployment Script
# Target OS: Debian / Ubuntu LXC

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC_PLAIN='\033[0m'

echo -e "${BLUE}========================================================"
echo -e "       TOTAL NEUTRON CLAIMS PORTAL LXC SETUP"
echo -e "========================================================${NC_PLAIN}"

# 1. Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Error: Please run this script as root (sudo).${NC_PLAIN}"
  exit 1
fi

# 2. Update System Packages
echo -e "${YELLOW}[1/7] Updating system packages...${NC_PLAIN}"
apt-get update && apt-get upgrade -y
apt-get install -y curl git build-essential ufw

# 3. Install Node.js LTS (NodeSource 20.x)
echo -e "${YELLOW}[2/7] Installing Node.js LTS...${NC_PLAIN}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
echo -e "${GREEN}Node.js version: $(node -v)${NC_PLAIN}"
echo -e "${GREEN}NPM version: $(npm -v)${NC_PLAIN}"

# 4. Install & Configure MariaDB
echo -e "${YELLOW}[3/7] Installing & configuring MariaDB Server...${NC_PLAIN}"
apt-get install -y mariadb-server

# Enable and start MariaDB service
systemctl enable mariadb
systemctl start mariadb

# Configure MariaDB Database and User
echo -e "${YELLOW}Setting up tn_claims database and configuring root user...${NC_PLAIN}"
mysql -e "CREATE DATABASE IF NOT EXISTS tn_claims;"
mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED BY 'my1p@ssw0rd';"
mysql -e "FLUSH PRIVILEGES;"

# 5. Install PM2 globally
echo -e "${YELLOW}[4/7] Installing PM2 Process Manager globally...${NC_PLAIN}"
npm install -g pm2

# 6. Configure Application environment
echo -e "${YELLOW}[5/7] Preparing project dependencies...${NC_PLAIN}"

# Ensure .env file exists
if [ ! -f .env ]; then
  echo -e "${YELLOW}No .env file found. Creating default production .env...${NC_PLAIN}"
  cat <<EOT > .env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=my1p@ssw0rd
DB_NAME=tn_claims
JWT_SECRET=supersecretjwtkey123!@#
NODE_ENV=production
EOT
fi

# Install npm packages
echo -e "${YELLOW}Running npm install...${NC_PLAIN}"
npm install

# Build the client production assets
echo -e "${YELLOW}Building frontend assets (Vite)...${NC_PLAIN}"
npm run build

# 7. Start application using PM2
echo -e "${YELLOW}[6/7] Starting backend and frontend preview servers via PM2...${NC_PLAIN}"
pm2 delete all || true
pm2 start ecosystem.config.cjs

# Save PM2 state and configure startup service
echo -e "${YELLOW}[7/7] Configuring startup service...${NC_PLAIN}"
pm2 save
# Generate startup configuration
startup_cmd=$(pm2 startup | tail -n 1)
if [ -n "$startup_cmd" ]; then
  echo -e "${YELLOW}Running startup command:${NC_PLAIN}"
  eval "$startup_cmd"
fi

# Configure Firewall
echo -e "${YELLOW}Configuring Firewall (UFW) to allow ports 5173 (frontend) and 5000 (backend API)...${NC_PLAIN}"
ufw allow 5173/tcp
ufw allow 5000/tcp

# Done
ip_address=$(hostname -I | awk '{print $1}')
echo -e "${GREEN}========================================================"
echo -e "      DEPLOYMENT SUCCESSFUL! TOTAL NEUTRON PORTAL IS LIVE"
echo -e "========================================================"
echo -e "You can access the portal from your network at:"
echo -e "👉 http://${ip_address}:5173"
echo -e ""
echo -e "PM2 Status:"
pm2 status
echo -e "========================================================${NC_PLAIN}"
