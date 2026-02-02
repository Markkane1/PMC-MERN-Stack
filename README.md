# PMC MERN Stack

This repo contains the MERN backend and React frontend for the PMC system.

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
