# PMC MERN Stack

This repo contains the MERN backend and React frontend for the PMC system.

## 🔒 SECURITY NOTICE

This application handles sensitive government data. **IMPORTANT:** Before deploying to production, you MUST:

1. **Read** [SECURITY_AUDIT_REPORT.md](SECURITY_AUDIT_REPORT.md) for detailed security assessment
2. **Review** [SECURITY_CHANGES_SUMMARY.md](SECURITY_CHANGES_SUMMARY.md) for fixes implemented
3. **Follow** [SECURITY_HARDENING_GUIDE.md](SECURITY_HARDENING_GUIDE.md) for deployment steps

**Critical Environment Variables Required:**
- `JWT_SECRET` - MUST be set to a cryptographically random 32+ character string (never 'replace_me')
- `MONGO_URI` - Must point to MongoDB Atlas or secure instance (never localhost in production)
- `CORS_ORIGIN` - Must be exact domain (never use `*` wildcard in production)
- `NODE_ENV` - Must be `production` for production deployments

⚠️ **Security fixes implemented:** Rate limiting, file upload validation, helmet CSP, HTTPS enforcement, permission controls removed, environment validation.

## Structure
- `server` - Express + MongoDB backend
- `client` - React (Vite) frontend

## Quick Start

### 1) Install dependencies

```powershell
cd "PMC Mernstack"
npm install
npm install --prefix server
npm install --prefix client
```

### 2) Run both apps (dev)

```powershell
npm run dev
```

### 3) Run backend only

```powershell
npm run dev:be
```

### 4) Run frontend only

```powershell
npm run dev:fe
```

## Notes
- Frontend API proxy targets `http://127.0.0.1:4000`.
- Backend runs on port `4000` by default.
- Configure backend env in `server/.env` (see `.env.example`).

## Build

```powershell
npm run build
```
