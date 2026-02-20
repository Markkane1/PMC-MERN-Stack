# Deep Dive: Features Present in (pmc_fe_react-main + pmc_be_django-main) BUT Missing / Incomplete in PMC-MERN-Stack-main

Date: 2026-02-17  
Scope: Compare the original React frontend + Django backend implementation against the MERN app, and list only the features that are missing or functionally incomplete in MERN.

---

## ⚠️ PRIORITY: P0 - CRITICAL (Must Fix First)

### P0: Entire API Router Not Mounted in Express App
**In MERN server `createApp()` (server/src/app.ts), apiRouter is imported but never mounted.**

Effect:
- Even though routes exist in `pmc.routes.ts` and `accounts.routes.ts`, they are unreachable unless manually mounted elsewhere.
- Django equivalent serves APIs under `/api/...`.

Missing feature:
- Ability to actually call `/api/accounts/...` and `/api/pmc/...`

Fix:
- Add `app.use('/api', apiRouter)` in `createApp()`.

Acceptance Criteria:
- Postman/curl can successfully call `/api/pmc/ping/` and `/api/accounts/login/`

---

## ⚠️ PRIORITY: P1 - HIGH (Critical Integrations)

### P1.1: `/plmis-token/` method mismatch (External Integration)
Django:
- `plmis-token/` implemented as POST (body-driven)
MERN:
- defines `GET /plmis-token/` but reads request body anyway (nonstandard, many clients will fail)

Missing feature:
- POST implementation parity and standards compliance.

---

### P1.2: `/payment-intimation/` authentication mismatch (PITB/ePay Callback)
Django:
- `payment_intimation_view` uses CustomTokenAuthentication + AllowAny,
  meaning PITB/ePay can call it using service token (not a user JWT)

MERN:
- requires `authenticate` (JWT user auth) + permission `pmc_api.add_psidtracking`

Missing feature:
- External-system token auth support (service tokens), meaning PITB callback likely breaks.

---

### P1.3: `/verify-chalan/` contract mismatch (QR verification flow differs)
Django:
- `POST /verify-chalan/` expects uploaded image → server decodes QR (opencv/pyzbar)
MERN:
- `GET /verify-chalan/` exists
- `POST /verify-chalan-qr/` expects raw QR string (`qrData`) + chalanNumber,
  and requires JWT auth.

Missing features:
- Correct POST endpoint path `/verify-chalan/`
- Accepting QR image upload (multipart) and decoding QR on server
- No-auth/service-auth compatibility if used externally

---

### P1.4: Applicant Document Upload Fee Settlement (Business Rule)
Django ApplicantDocumentsViewSet.create:
- If uploaded document description == `"Fee Verification from Treasury/District Accounts Office"`
  then it finds unsettled ApplicantFee and marks it settled.

MERN uploadApplicantDocument:
- Stores doc but does NOT settle fee.

Missing feature:
- Fee settlement automation based on document upload.

---

### P1.5: Producer/Consumer/Collector/Recycler POST is Upsert (MERN breaks idempotency)
Django create() for Producer/Consumer/Collector/Recycler:
- If record already exists for applicant, POST updates it (partial=True) and returns 200.
- If not exists, creates new.

MERN:
- Schema has `applicantId: unique: true`
- POST create will throw duplicate key instead of updating.

Missing feature:
- Create-or-update semantics (idempotent POST).

Impact:
- Frontend flows that POST repeatedly will break.

---

### P1.6: Application Assignment side-effects missing
Django ApplicationAssignment perform_create:
- updates ApplicantDetail:
  - assigned_group = instance.assigned_group
  - application_status = 'In Process'
- calls create_or_update_license(applicant)

MERN createApplicationAssignment:
- updates assignedGroup only
- does NOT set applicationStatus to 'In Process'
- does NOT create/update license record

Missing features:
- status transition to 'In Process'
- automatic license creation/update during assignment.

---

### P1.7: ApplicantFieldResponse bulk create missing
Django ApplicantFieldResponseViewSet.create:
- Supports bulk create when request.data is a list (many=True)
MERN:
- Only supports single create payload (generic controller)

Missing feature:
- Bulk submission of field responses.

---

### P1.8: Applicant List "LSO modulo sharding" behavior missing
Django ApplicantDetailViewSet.get_queryset for LSO:
- Filters applicants by modulo-based distribution (3-way partition) using user suffix.
- Uses ApplicationSubmitted ids_to_include to create personalized applicant set.

MERN filterByUserGroups:
- For LSO users, only filters by assignedGroup in ['LSO','APPLICANT']
- Does NOT implement modulo partitioning (ids_to_include logic)

Missing feature:
- The actual LSO workload distribution algorithm.

⚠️ NOTE: Full Django group logic for other groups (LSM/TL/etc.) is extensive. MERN implements partial equivalents for Super, LSO, DO, and generic group filtering but may miss deeper conditional branches.

---

### P1.9: Missing Django ViewSet Actions / Alternate Endpoints

#### P1.9.1: `business-profiles/by_applicant/` missing
Django:
- `GET /business-profiles/by_applicant/?applicant_id=...`
MERN:
- No such endpoint (only generic CRUD routes)

Missing feature:
- Dedicated "fetch business profile(s) for applicant" API.

---

#### P1.9.2: `application-assignment/by_applicant/` missing
Django:
- `GET /application-assignment/by_applicant/?applicant_id=...`
MERN:
- Missing

Missing feature:
- Dedicated "fetch assignments for applicant".

---

### P1.10: Missing "Cached Router" Equivalent
Django registers:
- `inspection-report-cached` as a full ViewSet (full CRUD endpoints under that prefix)

MERN:
- ONLY exposes `/inspection-report-cached/all_other_single_use_plastics/`
- Missing list/create/retrieve/update/delete under `/inspection-report-cached/`

Missing feature:
- Full cached inspection-report endpoint prefix parity.

---

### P1.11: Competition Registration Management Missing (Admin CRUD)
Django:
- `competition/register` is a full ModelViewSet:
  - list all registrations
  - retrieve one
  - update/patch
  - delete

MERN:
- Only supports `POST /competition/register/` (public registration)
- No admin endpoints to list/manage/update/delete registrations via this legacy path

Missing features:
- Admin management functions under legacy `/competition/register/` prefix.

(Note: MERN *does* have newer competition mgmt endpoints under `/competitions/...`, but parity with Django legacy prefix is missing.)

---

## ⚠️ PRIORITY: P2 - MEDIUM (Parity & Polish)

### P2.1: Missing Django Admin & OAuth2 Provider System
Django has:
- `/admin/` (Django admin)
- `/o/` (oauth2_provider routes)
- OAuth2TokenMiddleware
- OAuth2Authentication in DRF authentication stack

MERN has:
- Custom admin UI + logs + service config UI (good)
But MERN is missing:
- OAuth2 flow endpoints under `/o/` (token/authorize/revoke/introspect)
- Equivalent middleware-based oauth token enforcement system

Missing feature:
- Full OAuth2 provider compatibility for third party / government integrations relying on `/o/token` etc.

---

### P2.2: Missing CRUD Operations vs Django for Many Resources
Django exposes full CRUD for many ModelViewSets. MERN often exposes only list/create or list/create/patch, missing retrieve/delete/update.

#### Common missing patterns:
- Missing `GET /resource/:id/`
- Missing `DELETE /resource/:id/`
- Missing `PUT /resource/:id/` (MERN uses PATCH only)

Resources with incomplete CRUD compared to Django:
- `plastic-items`
- `products`
- `by-products`
- `raw-materials`
- `applicant-documents`
- `district-documents`
- `field-responses`
- `manual-fields`
- `inspection-report` (missing retrieve)
- `inspection-report-cached` (missing almost everything)
- `fetch-statistics-view-groups` (list-only)
- `fetch-statistics-do-view-groups` (list-only)
- `competition/register` (create-only, missing manage endpoints)
- `producers/consumers/collectors/recyclers` (missing DELETE)

Some of these may be unused by FE, but are still parity gaps.

---

## 📋 PRIORITY: P3 - LOW (Frontend Demo Routes)

### P3: FRONTEND FEATURES MISSING IN MERN

### 1.1 Missing / Unwired Demo Navigation Routes
The following routes exist in original FE routing (and corresponding demo view files exist), but are NOT registered in MERN routing config and therefore are not reachable in MERN:

- `/single-menu-view`
- `/collapse-menu-item-view-1`
- `/group-single-menu-item-view`
- `/group-collapse-menu-item-view-1`
- `/group-collapse-menu-item-view-2`

> Notes:
> - These appear to be demo UI/navigation testing pages rather than core business flows.
> - The underlying React components still exist in MERN client, but are not wired into the route config.

✅ Other FE features (MIS pages, Analytics pages, Competition Registration, Inspection module pages, auth pages) are present in MERN client.

---

## 2) BACKEND FEATURES MISSING / BROKEN / NOT PARITY-COMPATIBLE IN MERN

This section is the real meat. MERN has many endpoints, but several key *behaviors* and *compatibility contracts* from Django are missing.

---

## 2.1 P0 Critical: Entire API Router Not Mounted in Express App
**In MERN server `createApp()` (server/src/app.ts), apiRouter is imported but never mounted.**

Effect:
- Even though routes exist in `pmc.routes.ts` and `accounts.routes.ts`, they are unreachable unless manually mounted elsewhere.
- Django equivalent serves APIs under `/api/...`.

Missing feature:
- Ability to actually call `/api/accounts/...` and `/api/pmc/...`

Fix:
- Add `app.use('/api', apiRouter)` in `createApp()`.

---

## 2.2 Missing Django Admin & OAuth2 Provider System
Django has:
- `/admin/` (Django admin)
- `/o/` (oauth2_provider routes)
- OAuth2TokenMiddleware
- OAuth2Authentication in DRF authentication stack

MERN has:
- Custom admin UI + logs + service config UI (good)
But MERN is missing:
- OAuth2 flow endpoints under `/o/` (token/authorize/revoke/introspect)
- Equivalent middleware-based oauth token enforcement system

Missing feature:
- Full OAuth2 provider compatibility for third party / government integrations relying on `/o/token` etc.

---

## 2.3 API Compatibility Mismatches (Method + Auth Differences)

### 2.3.1 `/plmis-token/` method mismatch
Django:
- `plmis-token/` implemented as POST (body-driven)
MERN:
- defines `GET /plmis-token/` but reads request body anyway (nonstandard, many clients will fail)

Missing feature:
- POST implementation parity and standards compliance.

---

### 2.3.2 `/payment-intimation/` authentication mismatch (external services will fail)
Django:
- `payment_intimation_view` uses CustomTokenAuthentication + AllowAny,
  meaning PITB/ePay can call it using service token (not a user JWT)

MERN:
- requires `authenticate` (JWT user auth) + permission `pmc_api.add_psidtracking`

Missing feature:
- External-system token auth support (service tokens), meaning PITB callback likely breaks.

---

### 2.3.3 `/verify-chalan/` contract mismatch (QR verification flow differs)
Django:
- `POST /verify-chalan/` expects uploaded image → server decodes QR (opencv/pyzbar)
MERN:
- `GET /verify-chalan/` exists
- `POST /verify-chalan-qr/` expects raw QR string (`qrData`) + chalanNumber,
  and requires JWT auth.

Missing features:
- Correct POST endpoint path `/verify-chalan/`
- Accepting QR image upload (multipart) and decoding QR on server
- No-auth/service-auth compatibility if used externally

---

## 2.4 Missing Django ViewSet Actions / Alternate Endpoints

### 2.4.1 `business-profiles/by_applicant/` missing
Django:
- `GET /business-profiles/by_applicant/?applicant_id=...`
MERN:
- No such endpoint (only generic CRUD routes)

Missing feature:
- Dedicated “fetch business profile(s) for applicant” API.

---

### 2.4.2 `application-assignment/by_applicant/` missing
Django:
- `GET /application-assignment/by_applicant/?applicant_id=...`
MERN:
- Missing

Missing feature:
- Dedicated “fetch assignments for applicant”.

---

## 2.5 Missing “Cached Router” Equivalent
Django registers:
- `inspection-report-cached` as a full ViewSet (full CRUD endpoints under that prefix)

MERN:
- ONLY exposes `/inspection-report-cached/all_other_single_use_plastics/`
- Missing list/create/retrieve/update/delete under `/inspection-report-cached/`

Missing feature:
- Full cached inspection-report endpoint prefix parity.

---

## 2.6 Competition Registration Management Missing (Admin CRUD)
Django:
- `competition/register` is a full ModelViewSet:
  - list all registrations
  - retrieve one
  - update/patch
  - delete

MERN:
- Only supports `POST /competition/register/` (public registration)
- No admin endpoints to list/manage/update/delete registrations via this legacy path

Missing features:
- Admin management functions under legacy `/competition/register/` prefix.

(Note: MERN *does* have newer competition mgmt endpoints under `/competitions/...`, but parity with Django legacy prefix is missing.)

---

## 2.7 Django Side-Effects / Business Rules NOT Implemented in MERN

These are not “missing endpoints” — these are missing behaviors that Django performs automatically.

### 2.7.1 Applicant Documents Upload settles applicant fee (missing in MERN)
Django ApplicantDocumentsViewSet.create:
- If uploaded document description == `"Fee Verification from Treasury/District Accounts Office"`
  then it finds unsettled ApplicantFee and marks it settled.

MERN uploadApplicantDocument:
- Stores doc but does NOT settle fee.

Missing feature:
- Fee settlement automation based on document upload.

---

### 2.7.2 Producer/Consumer/Collector/Recycler POST is Upsert in Django (MERN breaks)
Django create() for Producer/Consumer/Collector/Recycler:
- If record already exists for applicant, POST updates it (partial=True) and returns 200.
- If not exists, creates new.

MERN:
- Schema has `applicantId: unique: true`
- POST create will throw duplicate key instead of updating.

Missing feature:
- Create-or-update semantics (idempotent POST).

Impact:
- Frontend flows that POST repeatedly will break.

---

### 2.7.3 ApplicantFieldResponse bulk create missing
Django ApplicantFieldResponseViewSet.create:
- Supports bulk create when request.data is a list (many=True)
MERN:
- Only supports single create payload (generic controller)

Missing feature:
- Bulk submission of field responses.

---

### 2.7.4 Application Assignment side-effects missing
Django ApplicationAssignment perform_create:
- updates ApplicantDetail:
  - assigned_group = instance.assigned_group
  - application_status = 'In Process'
- calls create_or_update_license(applicant)

MERN createApplicationAssignment:
- updates assignedGroup only
- does NOT set applicationStatus to 'In Process'
- does NOT create/update license record

Missing features:
- status transition to 'In Process'
- automatic license creation/update during assignment.

---

### 2.7.5 Applicant List “LSO modulo sharding” behavior missing (partial implementation in MERN)
Django ApplicantDetailViewSet.get_queryset for LSO:
- Filters applicants by modulo-based distribution (3-way partition) using user suffix.
- Uses ApplicationSubmitted ids_to_include to create personalized applicant set.

MERN filterByUserGroups:
- For LSO users, only filters by assignedGroup in ['LSO','APPLICANT']
- Does NOT implement modulo partitioning (ids_to_include logic)

Missing feature:
- The actual LSO workload distribution algorithm.

⚠️ NOTE: Full Django group logic for other groups (LSM/TL/etc.) is extensive. MERN implements partial equivalents for Super, LSO, DO, and generic group filtering but may miss deeper conditional branches.

---

## 2.8 Missing CRUD Operations vs Django for Many Resources
Django exposes full CRUD for many ModelViewSets. MERN often exposes only list/create or list/create/patch, missing retrieve/delete/update.

### Common missing patterns:
- Missing `GET /resource/:id/`
- Missing `DELETE /resource/:id/`
- Missing `PUT /resource/:id/` (MERN uses PATCH only)

Resources with incomplete CRUD compared to Django:
- `plastic-items`
- `products`
- `by-products`
- `raw-materials`
- `applicant-documents`
- `district-documents`
- `field-responses`
- `manual-fields`
- `inspection-report` (missing retrieve)
- `inspection-report-cached` (missing almost everything)
- `fetch-statistics-view-groups` (list-only)
- `fetch-statistics-do-view-groups` (list-only)
- `competition/register` (create-only, missing manage endpoints)
- `producers/consumers/collectors/recyclers` (missing DELETE)

Some of these may be unused by FE, but are still parity gaps.

---

# 3) PHASED IMPLEMENTATION PLAN (Codex-ready)

Each phase is designed so you can hand it to Codex as one isolated unit.

---

## PHASE 0 — Restore API functionality (P0)
Goal: Make server routes reachable.
Tasks:
1. In `server/src/app.ts`, mount api router:
   - `app.use('/api', apiRouter)`
2. Add minimal `/api/health` test route if needed
3. Smoke test:
   - GET `/api/pmc/ping/`
   - POST `/api/accounts/login/`

Acceptance:
- Postman/curl can successfully call `/api/pmc/ping/` and `/api/accounts/login/`

---

## PHASE 1 — Fix external integration compatibility (P1)
Goal: PITB/ePay/PLMIS endpoints work exactly like Django.

Tasks:
1. Change `/plmis-token/` to POST (keep GET optionally for backward compatibility)
2. Implement external-service token middleware:
   - Reads token from header
   - Validates against ExternalServiceToken collection
   - Permits `payment-intimation` without user JWT
3. Rebuild `/verify-chalan/`:
   - POST `/verify-chalan/` accepts multipart image upload
   - Server decodes QR (use Node QR decode lib)
   - Return parity response format

Acceptance:
- External client can call `/payment-intimation/` without user JWT
- `/plmis-token/` works as POST with body
- `/verify-chalan/` works with uploaded image

---

## PHASE 2 — Restore Django side-effects / business rules (P1)
Goal: Match Django behavior, not just endpoints.

Tasks:
1. Applicant document upload settles fee:
   - If document_description matches fee verification label
   - Mark unsettled ApplicantFee as settled
2. Application assignment side-effects:
   - Set applicant.applicationStatus = 'In Process'
   - Call createOrUpdateLicense(applicant)
3. Implement LSO modulo sharding:
   - Use username suffix
   - Replicate ApplicationSubmitted modulo logic for applicant selection

Acceptance:
- Upload fee verification doc settles ApplicantFee
- Creating assignment updates applicant status + license
- LSO users see correct partitioned applications

---

## PHASE 3 — CRUD behavioral parity: Upsert + Bulk Create (P1)
Tasks:
1. Producer/Consumer/Collector/Recycler POST becomes upsert:
   - If applicantId exists → update + return 200
   - Else create + return 201
2. ApplicantFieldResponse bulk create:
   - If request body is array → insertMany with createdBy

Acceptance:
- Multiple POST calls do not throw duplicate key error, they update
- FE bulk submission works

---

## PHASE 4 — CRUD endpoint parity for resource sets (P2)
Tasks:
1. Add missing GET/PATCH/DELETE routes for:
   - plastic-items, products, by-products, raw-materials
   - applicant-documents, district-documents
   - field-responses, manual-fields
2. Add missing inspection-report retrieve endpoint
3. Implement full `/inspection-report-cached/` alias endpoints with caching middleware
4. Add admin CRUD under `/competition/register/` legacy prefix OR map to new competition admin system

Acceptance:
- All Django ViewSet endpoints exist (even if implemented as alias to same handlers)
- Admin can list/manage competition registrations via legacy path

---

## PHASE 5 — Parity automation + safety net (P2)
Goal: never miss these again.

Tasks:
1. Write a small script:
   - Parses Django `pmc_api/urls.py` router registers
   - Extracts Express routes from `pmc.routes.ts`
   - Outputs diff report in CI
2. Add Postman/Newman or Jest API contract tests for:
   - payment-intimation
   - plmis-token
   - verify-chalan
   - assignment create side-effects
   - producer POST upsert behavior

Acceptance:
- CI fails if any Django endpoint disappears from MERN or becomes incompatible.

---

# END
