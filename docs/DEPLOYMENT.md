# Deployment Guide

This project is now prepared for your existing Oracle Cloud VM pattern:

- Ubuntu 22.04
- Node.js via NVM
- MongoDB as a local systemd service
- PM2 for the backend process
- Nginx for HTTPS, reverse proxying, and serving the React build

The lowest-effort deployment model for this repo is:

1. run the Express API on `127.0.0.1:3003` with PM2
2. let Nginx serve `client/build`
3. proxy `/api`, `/monitoring`, `/resilience`, and `/ha` to the backend
4. keep the frontend and API on the same domain so the client can use `/api` without extra env work

## Recommended App Identity

- App folder: `/var/www/apps/PMCMernstack`
- PM2 app name: `pmc-api`
- Internal port: `3003`
- Public domain: `https://yourdomain.duckdns.org`

## Files Added For Deployment

- [ecosystem.config.cjs](d:/web%20temps/PMC%20Working%20Project/PMC%20Mernstack/ecosystem.config.cjs)
- [scripts/deploy/oracle-vm-deploy.sh](d:/web%20temps/PMC%20Working%20Project/PMC%20Mernstack/scripts/deploy/oracle-vm-deploy.sh)
- [scripts/deploy/nginx-pmc-mernstack.conf.example](d:/web%20temps/PMC%20Working%20Project/PMC%20Mernstack/scripts/deploy/nginx-pmc-mernstack.conf.example)
- [server/.env.production.example](d:/web%20temps/PMC%20Working%20Project/PMC%20Mernstack/server/.env.production.example)
- [client/.env.production.example](d:/web%20temps/PMC%20Working%20Project/PMC%20Mernstack/client/.env.production.example)
- [.nvmrc](d:/web%20temps/PMC%20Working%20Project/PMC%20Mernstack/.nvmrc)

## One-Time Server Setup

Clone the repo into your standard apps directory:

```bash
cd /var/www/apps
git clone <your-repo-url> PMCMernstack
cd PMCMernstack
```

Use the expected Node version:

```bash
nvm install
nvm use
```

Create production env files:

```bash
cp server/.env.production.example server/.env.production
cp client/.env.production.example client/.env.production
```

## Required Server Environment Values

Edit `server/.env.production` and set these before the first deploy:

- `PORT=3003`
- `NODE_ENV=production`
- `MONGO_URI=mongodb://127.0.0.1:27017/PMISDB`
- `CORS_ORIGIN=https://yourdomain.duckdns.org`
- `APP_URL=https://yourdomain.duckdns.org`
- `JWT_SECRET=<strong random secret, 32+ chars>`
- `JWT_REFRESH_SECRET=<different strong random secret, 32+ chars>`
- `ALLOW_LEGACY_MASTERKEY_LOGIN=false`

Recommended:

- `UPLOAD_DIR=../uploads`

This keeps uploads outside `server/dist` and stable across redeploys.

## Frontend Environment

If you serve frontend and API from the same domain through Nginx, keep this simple:

```env
VITE_API_URL=
```

The client automatically falls back to `/api`, which is the least fragile production setup here.

Only set `VITE_API_URL` if you deliberately split the frontend and API across different domains.

## Deploy Command

Run this on the server from the repo root:

```bash
bash scripts/deploy/oracle-vm-deploy.sh
```

Or use the npm wrapper:

```bash
npm run deploy:oracle
```

What it does:

1. loads `server/.env.production`
2. installs root, server, and client dependencies with `npm ci`
3. builds backend and frontend
4. ensures the upload directory exists
5. starts or restarts the PM2 app from `ecosystem.config.cjs`
6. runs `pm2 save`

If you want a custom PM2 process name:

```bash
PM2_APP_NAME=pmc-api bash scripts/deploy/oracle-vm-deploy.sh
```

## PM2 Commands

First start and later restarts are handled by the deploy script, but the equivalent manual commands are:

```bash
set -a
source server/.env.production
set +a
export PM2_APP_NAME=pmc-api
pm2 start ecosystem.config.cjs --env production --only pmc-api --update-env
pm2 save
```

Useful PM2 checks:

```bash
pm2 list
pm2 logs pmc-api
pm2 describe pmc-api
```

## Nginx Setup

Copy the example config and adjust the domain and path:

```bash
sudo cp scripts/deploy/nginx-pmc-mernstack.conf.example /etc/nginx/sites-available/pmc-mernstack.conf
sudo nano /etc/nginx/sites-available/pmc-mernstack.conf
```

Update these two values in the file:

- `server_name yourdomain.duckdns.org;`
- `root /var/www/apps/PMCMernstack/client/build;`

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/pmc-mernstack.conf /etc/nginx/sites-enabled/pmc-mernstack.conf
sudo nginx -t
sudo systemctl reload nginx
```

Then issue SSL:

```bash
sudo certbot --nginx -d yourdomain.duckdns.org
```

## Firewall Guidance

Because Nginx terminates HTTPS and proxies locally, the only public ports you actually need are:

- `80`
- `443`

Port `3003` does not need to be publicly reachable if Nginx is on the same VM.

## Post-Deploy Checks

Verify backend health locally on the server:

```bash
curl http://127.0.0.1:3003/monitoring/health
curl http://127.0.0.1:3003/ha/status
```

Verify public app:

```bash
curl -I https://yourdomain.duckdns.org
curl -I https://yourdomain.duckdns.org/api/accounts/generate-captcha/
```

Check that:

- Nginx serves the React app
- `/api/*` is proxied correctly
- HTTPS redirect works
- PM2 shows `pmc-api` online
- MongoDB is reachable

## Update Workflow

For later deployments:

```bash
cd /var/www/apps/PMCMernstack
git pull
bash scripts/deploy/oracle-vm-deploy.sh
```

## Rollback Approach

Keep rollback simple:

1. `git log --oneline`
2. `git checkout <last-known-good-commit>`
3. `bash scripts/deploy/oracle-vm-deploy.sh`

If you want safer releases later, add a release-directory/symlink strategy. For now, this repo is prepared for the fastest path on your current VM.
