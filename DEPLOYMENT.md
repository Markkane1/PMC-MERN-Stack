# Staging and Production Deployment

This repo supports two deployment modes:

- `staging`: full stack with Docker + local MongoDB container.
- `production`: Dockerized client/server with external production services (recommended for DB/Redis).

## 1) Staging Setup

1. Create env file from template:

```powershell
Copy-Item server/.env.staging.example server/.env.staging
```

2. Update required values in `server/.env.staging`:
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `CORS_ORIGIN`
- Optional integration keys/tokens as needed

3. Start staging stack:

```powershell
npm run docker:staging:up
```

4. Validate:
- Frontend: `http://localhost:5173`
- API: `http://localhost:4000`
- Health: `http://localhost:4000/monitoring/health`

5. Stop:

```powershell
npm run docker:staging:down
```

## 2) Production Deployment

1. Create env file from template:

```powershell
Copy-Item server/.env.production.example server/.env.production
```

2. Update `server/.env.production` with real production values:
- `MONGO_URI` (production MongoDB)
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `CORS_ORIGIN`
- `APP_URL`

3. Start production stack:

```powershell
npm run docker:prod:up
```

4. Validate:
- Frontend: `http://<host>/`
- API: `http://<host>/api/...` (proxied by nginx to server)
- Health: `http://<host>/monitoring/health`

5. Stop:

```powershell
npm run docker:prod:down
```

## 3) Pre-Deploy Verification

Run this before staging or production rollout:

```powershell
npm run verify
```

## 4) Frontend Env Notes

Frontend API base supports both:
- `VITE_API_URL` (recommended, e.g. `https://api.example.com`)
- `VITE_API_BASE_URL` (legacy alias)

If URL does not end with `/api`, it is appended automatically.

