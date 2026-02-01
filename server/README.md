# PMC MERN Backend

This is a MERN (Express + MongoDB) re-implementation of the PMC Django backend. It exposes the same URL structure used by the React frontend (`/api/accounts/*` and `/api/pmc/*`).

## Quick start

1. Install dependencies

```bash
cd pmc_be_mern
npm install
```

2. Configure environment

```bash
copy .env.example .env
```

Update `MONGO_URI`, `JWT_SECRET`, and `CORS_ORIGIN` as needed.

3. Seed base reference data (divisions + districts)

```bash
npm run seed
```

4. Seed tehsils (optional)

```bash
npm run seed:tehsils
```

Provide `TEHSILS_JSON` env var pointing to a JSON array file shaped like:

```json
[
  { "tehsil_id": 1, "district_id": 1, "division_id": 1, "tehsil_name": "Lahore City", "tehsil_code": "LHR-1" }
]
```

5. Seed IDM data (optional)

```bash
npm run seed:idm
```

Provide:
- `IDM_DISTRICTS_JSON` for districts_new
- `IDM_CLUBS_JSON` for eec_clubs

Sample files live in `data/`.

6. Run the server

```bash
npm run dev
```

The API will run on `http://localhost:4000` by default. The React frontend expects the API under `/api`, so run behind a proxy or update the frontend dev proxy to point `/api` to this server.

## Notes

- Endpoints are aligned with the Django routes used by the frontend.
- File uploads are stored under `uploads/` and served via `/api/pmc/media/...`.
- Some complex report/PDF outputs are simplified but compatible with the frontend download flow.
