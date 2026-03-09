# PMC Mernstack

PMC Mernstack is a MERN monorepo for managing Plastic Management Committee workflows, including applicant registration, business and plastic-item records, licensing and payment tracking, inspections, analytics, alerts, and role-based administration across public and internal users.

## Tech Stack

- MongoDB
- Express
- React
- Node.js
- TypeScript
- Vite
- Jest, Vitest, Supertest, Playwright

## Prerequisites

- Node.js 20 LTS or newer
- npm 10 or newer
- MongoDB running locally or reachable through `MONGO_URI`
- Optional: Redis for cache-related features

## Installation

1. Clone the repository.
2. Install root dependencies:

```bash
npm install
```

3. Install backend dependencies:

```bash
npm install --prefix server
```

4. Install frontend dependencies:

```bash
npm install --prefix client
```

5. Create local environment files from the root reference:

```bash
cp .env.example server/.env
cp .env.example client/.env
```

6. Set environment values for your machine. Use [`.env.example`](./.env.example) as the source of truth for required keys and defaults.

## Run Locally

Run backend and frontend together:

```bash
npm run dev
```

Run backend only:

```bash
npm run dev:be
```

Run frontend only:

```bash
npm run dev:fe
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`
- API base: `http://localhost:4000/api`

## Test Commands

Run unit tests:

```bash
npm run test:unit
```

Run integration tests:

```bash
npm run test:integration
```

Run component tests:

```bash
npm run test:components
```

Run end-to-end tests:

```bash
npm run test:e2e
```

Run the full suite:

```bash
npm run test:all
```

## Folder Structure

```text
client/              React frontend
server/              Express API and backend services
tests/
  unit/              Pure logic and model tests
  integration/       Supertest API tests
  components/        React Testing Library tests
  e2e/               Playwright browser tests
  security/          Security-focused test suites
docs/                Discovery, audit, coverage, and project reports
scripts/             Seed scripts and repo utilities
```

## Environment Variables

Set values in `server/.env` and `client/.env` as needed. Refer to [`.env.example`](./.env.example) for example values.

Frontend variables:

- `VITE_API_URL`
- `VITE_API_BASE_URL`
- `VITE_API_PROXY`
- `VITE_GOOGLE_ANALYTICS_ID`
- `VITE_ENABLE_PWA`
- `VITE_ENABLE_SERVICE_WORKER`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Backend variables:

- `PORT`
- `NODE_ENV`
- `MONGO_URI`
- `CORS_ORIGIN`
- `APP_URL`
- `UPLOAD_DIR`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `JWT_REFRESH_SECRET`
- `JWT_REFRESH_EXPIRES_IN`
- `ALLOW_LEGACY_MASTERKEY_LOGIN`
- `ENABLE_RATE_LIMITS_IN_TEST`
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`
- `REDIS_DB`
- `PITB_SERVICE_TOKEN`
- `EPAY_SERVICE_TOKEN`
- `PLMIS_API_URL`
- `PLMIS_API_KEY`
- `PLMIS_DEPT_CODE`
- `PLMIS_REDIRECT_URL`
- `SUPERADMIN_USERNAME`
- `SUPERADMIN_PASSWORD`
- `IDM_CLUBS_JSON`
- `IDM_DISTRICTS_JSON`
- `TEHSILS_JSON`
- `TEST_TOKEN`

## Documentation

See [`docs/`](./docs) for:

- discovery output
- security audit findings
- vibe-code and performance audit reports
- coverage reporting
- deployment and architecture notes
