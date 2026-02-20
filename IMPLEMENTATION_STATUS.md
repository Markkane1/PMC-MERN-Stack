# PMC MERN Implementation Status - Optimization Features

## ✅ COMPLETED PHASES

### PHASE 0: API Router Mounting
- **Status**: ✅ COMPLETE (Already existed)
- **Details**: API router is properly mounted in `server/src/app.ts` at line 183
- **Endpoints**: `/api/accounts` and `/api/pmc` are accessible

### PHASE 1: External Integration Fixes
- **Status**: ✅ COMPLETE

#### P1.1: `/plmis-token/` Method Fix
- Changed from GET-only to POST (keep GET for backward compatibility)
- **File**: `server/src/interfaces/http/routes/pmc.routes.ts` line 192-193
- **Changes**: Added POST route, kept GET for backward compatibility

#### P1.2: External Service Token Authentication
- **New File**: `server/src/interfaces/http/middlewares/externalTokenAuth.ts`
- **Features**:
  - Service token validation middleware
  - Support for PITB and ePay service tokens
  - Token extraction from Authorization header, X-Service-Token header, or query params
  - Fallback to user JWT auth (via `authenticateUserOrService`)
  - Service token registration and revocation functions
- **Initialization**: Added to `server/src/server.ts`
- **Route Update**: `/payment-intimation/` now accepts both user and service tokens

#### P1.3: `/verify-chalan/` QR Image Upload Support
- **New File**: `server/src/application/services/pmc/QRDecoderService.ts`
- **Features**:
  - Decode QR codes from image buffers (PNG, JPG, etc.)
  - Support for Base64 encoded images
  - Uses `jsQR` and `jimp` libraries for decoding
  - Grayscale conversion for better QR detection
- **Route Updates**: `server/src/interfaces/http/routes/pmc.routes.ts` lines 265-266
  - Changed to POST with multipart form data
  - Kept GET for backward compatibility
- **Implementation**: Updated `server/src/application/usecases/pmc/UtilityUseCases.ts`
  - Accepts image file upload or raw QR data
  - Decodes QR from image if provided
  - Validates QR type and chalan number
  - Returns detailed verification response

### PHASE 2: Business Rule Implementations
- **Status**: ✅ COMPLETE

#### P2.1: Fee Settlement on Document Upload
- **File**: `server/src/application/usecases/pmc/DocumentsUseCases.ts`
- **Changes**:
  - Added fee verification labels list:
    - "Fee Verification from Treasury/District Accounts Office"
    - "Fee Verification"
    - "Payment Verification"
    - "Fee Receipt"
  - If document description matches, marks all unsettled fees as SETTLED
  - Added `applicantFeeRepositoryMongo` to dependencies
  - Non-blocking: Fee settlement failures don't fail the upload
  - Logging added for tracking settlements

#### P2.2: Application Assignment Side-Effects
- **File**: `server/src/application/usecases/pmc/ResourceUseCases.ts`
- **Changes**:
  - Imported `createOrUpdateLicense` function
  - On assignment creation:
    1. Updates `assignedGroup` (existing)
    2. Sets `applicationStatus` to 'In Process' (except for APPLICANT/Download License groups)
    3. Creates or updates license for the applicant
  - Non-blocking: License creation failures don't fail the assignment
  - Logging added for tracking license operations

---

## 🚧 PARTIAL IMPLEMENTATION - REMAINING WORK

### PHASE 2.3: LSO Modulo Sharding
- **Status**: ⏳ Not Started
- **Complexity**: HIGH
- **Required Changes**:
  - Implement modulo-based partitioning for LSO user workload distribution
  - Extract user suffix from username (e.g., "lso.001")
  - Calculate modulo (3-way partition) for applicant assignment
  - Use ApplicationSubmitted `ids_to_include` logic
  - Files affected: `server/src/application/usecases/pmc/ApplicantUseCases.ts`

### PHASE 3.1: Upsert Semantics for Producer/Consumer/Collector/Recycler
- **Status**: ⏳ Not Started  
- **Required Implementation**:
  - Create custom handlers (not use generic CRUD controller)
  - Check if `applicantId` exists before create
  - If exists: UPDATE with HTTP 200
  - If not exists: CREATE with HTTP 201
  - Files to modify: `server/src/application/usecases/pmc/ResourceUseCases.ts`
  - Affected Controllers:
    - `producersController`
    - `consumersController`
    - `collectorsController`
    - `recyclersController`

### PHASE 3.2: Bulk Create for ApplicantField Response
- **Status**: ⏳ Not Started
- **Required Changes**:
  - Detect if request body is array or single object
  - If array: insertMany with proper createdBy
  - If single: standard create
  - Return array responses accordingly
  - File: `server/src/application/usecases/pmc/ResourceUseCases.ts`

### PHASE 4: Missing CRUD Endpoints & Query Endpoints
- **Status**: ⏳ Not Started
- **Missing GET/:id endpoints**:
  - plastic-items
  - products
  - by-products
  - raw-materials
  - applicant-documents
  - district-documents
  - field-responses
  - manual-fields
  - inspection-report (retrieve single)

- **Missing Query Endpoints**:
  - `GET /business-profiles/by_applicant/?applicant_id=...`
  - `GET /application-assignment/by_applicant/?applicant_id=...`

- **Missing Full CRUD on Cached Inspection**:
  - Currently only `/inspection-report-cached/all_other_single_use_plastics/`
  - Need full `/inspection-report-cached/` CRUD

- **Missing DELETE Endpoints**:
  - producers
  - consumers
  - collectors
  - recyclers

- **Missing Admin CRUD under Legacy Paths**:
  - `/competition/register/` list/update/delete (currently create-only)

### PHASE 5: Parity Automation & Testing
- **Status**: ⏳ Not Started
- **Required Implementation**:
  - Write comparison script to parse Django routes and compare with Express
  - Add Jest/Newman API contract tests for:
    - payment-intimation (service token auth)
    - plmis-token (POST behavior)
    - verify-chalan (image upload + QR decode)
    - assignment create (side-effects)
    - producer POST upsert behavior
  - CI integration to fail on parity gaps

---

## 📊 SUMMARY

**Overall Completion**: ~40-45%

**By Priority Level**:
- P0 (Critical): ✅ 100% Complete (API mounting)
- P1 (High): ✅ 100% Complete (External integrations + core side-effects)
- P2 (Medium): 🟡 50% Complete (Side-effects completed, LSO sharding pending)
- P3 (Low): ⏳ 0% Complete (Demo routes, not critical)

**New Files Created**:
1. `server/src/interfaces/http/middlewares/externalTokenAuth.ts` - Service token auth
2. `server/src/application/services/pmc/QRDecoderService.ts` - QR image decoding

**Files Modified**:
1. `server/src/server.ts` - Added service token initialization
2. `server/src/interfaces/http/routes/pmc.routes.ts` - Route changes for M1-M3
3. `server/src/application/usecases/pmc/DocumentsUseCases.ts` - Fee settlement
4. `server/src/application/usecases/pmc/ResourceUseCases.ts` - Assignment side-effects
5. `server/src/application/usecases/pmc/UtilityUseCases.ts` - QR verification

**Libraries to Install** (if not already present):
- `jsqr` - QR code decoding from images
- `jimp` - Image processing for QR extraction

**Next Steps** (Priority Order):
1. Install required libraries (`jsqr`, `jimp`)
2. Implement PHASE 3.1 (Upsert semantics) - High business impact
3. Implement PHASE 4 (Missing CRUD) - Completeness
4. Implement PHASE 2.3 (LSO sharding) - Complex, lower priority
5. Implement PHASE 5 (Automation tests) - Prevent future regressions

---

## 🧪 TESTING CHECKLIST

For completed phases, add tests:
- [ ] POST `/plmis-token/` with body (new method parity)
- [ ] POST `/payment-intimation/` with service token
- [ ] POST `/verify-chalan/` with image file
- [ ] POST `/verify-chalan/` with invalid QR code
- [ ] POST applicant document with fee verification description
- [ ] Verify unsettled fees are marked as SETTLED
- [ ] POST application assignment and verify:
  - [ ] assignedGroup updated
  - [ ] applicationStatus set to 'In Process'
  - [ ] License created/updated
- [ ] POST producer twice with same applicantId → upsert (not duplicate key error)

