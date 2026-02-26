# GET Performance Optimization Phases

## Phase 1 - Core Query Path Hardening (Completed)
- Replaced sequential camelCase-then-snake_case repository fallbacks with single legacy-aware queries.
- Applied to applicant, business profile, district/tehsil, license, assignment, documents, fees, PSID, producer/consumer/collector/recycler repositories.
- Reduced extra Mongo round-trips on mixed legacy data.

## Phase 2 - N+1 / O(n^2) Removal (Completed)
- `InspectionUseCases.listInspectionReports`: moved to DB pagination (`skip/limit/count`) instead of loading all rows then slicing.
- `InspectionUseCases.districtSummaryInternal`: replaced per-district query loop with one aggregation.
- `CommonUseCases.applicantLocationPublic`: replaced repeated `.find()` joins with prebuilt maps.
- `CommonUseCases.applicantStatistics`: replaced profile lookup scans with map join by applicant ID.
- `ReportUseCases.exportApplicant`: removed O(n^2) profile lookup pattern.
- `PaymentVerificationService.generatePaymentSummary`: replaced per-applicant status calls with batched fee/PSID aggregation logic.

## Phase 3 - Index Alignment (Completed)
- Expanded `server/src/scripts/createIndexes.ts` with legacy-field indexes for hot GET filters/sorts.
- Added/updated indexes for:
  - ApplicantDetail (`numeric_id`, `id`, `tracking_number`, `created_at`, group/status combinations)
  - BusinessProfile (`applicant_id`, `district_id`, `tehsil_id`, `business_name`)
  - License (`applicant_id`, `license_number`, `is_active`, date compounds)
  - ApplicantDocument (`applicant_id`, date compounds)
  - ApplicantFee (legacy + modern applicant/settlement paths)
  - ApplicationAssignment (legacy + modern applicant/group paths)
  - PSIDTracking (applicant/payment status, consumer number, dept txn)
  - InspectionReport (district/date + legacy numeric id)
  - Admin log collections (Api/Audit/Access log time/user filters)
- Made index creation conflict-tolerant to avoid aborting on pre-existing index shape/name differences.

## Phase 4 - Verification (Completed)
- `npm run lint` (server) passed.
- `npm run build` (server) passed.
- `npm run db:index` passed after conflict-tolerance patch.

## Notes
- Response contracts were preserved; optimization focused on query shape, joins, and indexes.
- Existing repo has many unrelated pre-existing modified files; optimization changes were applied to targeted server performance paths only.
