# PMC Frontend

React + TypeScript + Vite frontend for the PMC application.

## Requirements

- Node.js 20+
- npm 10+
- Running backend API

## Setup

1. Install dependencies:

```powershell
npm install
```

2. Create env file:

```powershell
Copy-Item .env.example .env
```

3. Confirm API settings in `.env`:

- `VITE_API_BASE_URL` (default: `http://localhost:4000/api`)

## Run

- Development: `npm run dev`
- Build: `npm run build`
- Preview build: `npm run preview`
- Lint: `npm run lint`
- Type check: `npm run typecheck`
- Format: `npm run format`

## Dev Proxy

Vite proxies `/api` to `http://127.0.0.1:4000` by default.
Override with `VITE_API_PROXY` when needed.
