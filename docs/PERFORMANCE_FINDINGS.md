# PERFORMANCE_FINDINGS.md

Generated: 2026-03-07 14:40:00 +05:00

## High

### PERF-001 Malformed-input fuzzing previously reached 500 responses on 15 POST endpoints
- **Evidence:** `s9-failed-fuzz-routes.json`
- **Affected routes:** `/api/pmc/applicant-detail/`, `/api/pmc/application-assignment/`, `/api/pmc/business-profiles/`, `/api/pmc/by-products/`, `/api/pmc/collectors/`, `/api/pmc/consumers/`, `/api/pmc/field-responses/`, `/api/pmc/inspection-report/`, `/api/pmc/manual-fields/`, `/api/pmc/plastic-items/`, `/api/pmc/plmis-token/`, `/api/pmc/producers/`, `/api/pmc/products/`, `/api/pmc/raw-materials/`, `/api/pmc/recyclers/`
- **Impact:** Invalid hostile traffic can still escape validation and trigger expensive exception paths.
- **Action:** Enforce schema validation before handlers and normalize malformed payloads to `400/422`.
- **Status:** Resolved. Re-ran `npx jest --runInBand --forceExit --roots tests/security --testMatch "**/*.test.js" tests/security/pentest-simulation.test.js` on March 7, 2026; the fuzzing check now passes.

### PERF-002 Unsupported HTTP methods previously hit success/error paths on a large route surface
- **Evidence:** `s9-failed-method-routes.json` contains 272 unexpected method/route combinations.
- **Impact:** Method abuse increases noisy error handling and can waste application work on requests that should terminate immediately with `405`.
- **Action:** Add explicit `405 Method Not Allowed` handling consistently across route groups.
- **Status:** Resolved. Re-ran the S9 method-tampering check on March 7, 2026; the suite now passes without `200`/`500` responses for unsupported methods.

## Medium

### PERF-003 Global online listener can duplicate work under hot reload or repeated imports
- **File:** `client/src/store/supid/useInspectionStore.ts:226`
- **Finding:** The module registers `window.addEventListener('online', ...)` at import time and never removes it.
- **Impact:** Duplicate listeners can trigger redundant sync work and hard-to-trace client-side spikes.
- **Action:** Register the listener inside a component/effect with teardown, or gate it so it can only be attached once.
- **Status:** Resolved. Listener registration now happens through an explicit binder with cleanup, attached from `App.tsx`.

## Low

### PERF-004 In-memory cache cleanup timer is process-global
- **File:** `server/src/infrastructure/cache/memory.ts:24`
- **Finding:** Cache cleanup runs on a permanent interval. `cleanupTimer.unref?.()` avoids blocking process exit, which is good, but there is still no explicit shutdown path.
- **Impact:** Low in production, but it makes lifecycle management less explicit and can complicate long-lived worker behavior.
- **Action:** Expose a stop hook for controlled shutdown/test teardown.

## Notes

- The integration harness already uses `mongodb-memory-server` via `tests/integration/helpers/testApp.js`, which keeps route-level test isolation good.
- Missing-index analysis was not re-run in this pass; no new confirmed missing-index findings were added beyond the existing S7/S9 evidence.
- Current verification baseline: `tests/security/pentest-simulation.test.js` passed on March 7, 2026.
