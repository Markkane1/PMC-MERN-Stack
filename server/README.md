# PMC Backend

Express + TypeScript + MongoDB backend for the PMC application.

## Requirements

- Node.js 20+
- npm 10+
- MongoDB database

## Setup

1. Install dependencies:

```powershell
npm install
```

2. Create env file:

```powershell
Copy-Item .env.example .env
```

3. Update required environment variables in `.env`:

- `MONGO_URI`
- `JWT_SECRET`
- `CORS_ORIGIN`

## Run

- Development: `npm run dev`
- Build: `npm run build`
- Production: `npm run start`
- Lint: `npm run lint`

Default API base URL: `http://localhost:4000/api`

## Data / Utility Scripts

- `npm run seed`: seed base reference data
- `npm run seed:tehsils`: seed tehsil data
- `npm run seed:idm`: seed IDM data
- `npm run db:index`: create database indexes
- `npm run cleanup:bak`: remove backup collections
- `npm run ensure:applicant-perms`: normalize applicant permissions
- `npm run superadmin:static`: create static super admin

## Notes

- Uploaded files are stored in `uploads/`.
- API docs are available under `docs/`.
