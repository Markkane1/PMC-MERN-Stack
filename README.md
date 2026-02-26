# PMC Mernstack

Monorepo for the PMC web application.

- `server`: Express + TypeScript + MongoDB API
- `client`: React + TypeScript + Vite frontend

## Prerequisites

- Node.js 20+
- npm 10+
- MongoDB instance

## Quick Start

1. Install dependencies:

```powershell
npm install
npm install --prefix server
npm install --prefix client
```

2. Create environment files:

```powershell
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
```

3. Start backend + frontend in development mode:

```powershell
npm run dev
```

## Root Scripts

- `npm run dev`: run backend and frontend together
- `npm run dev:be`: run backend only
- `npm run dev:fe`: run frontend only
- `npm run build`: build backend and frontend
- `npm run lint`: lint backend and frontend

## Service URLs (Default)

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`
- API base: `http://localhost:4000/api`

## Additional Docs

- [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [PRE_DEPLOYMENT_CHECKLIST.md](PRE_DEPLOYMENT_CHECKLIST.md)
