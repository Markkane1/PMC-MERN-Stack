# VIBECODE_AUDIT.md

Generated: 2026-03-07 14:45:00 +05:00

## Medium

### Fake UI element: analytics export button only logs to console
- **File:** `client/src/components/analytics/AnalyticsDashboard.tsx:54`
- **Finding:** The button looks production-ready but defaults to `console.log('Exporting analytics report...')` instead of performing a real export. This is a classic fake-action pattern in generated UI.
- **Impact:** Users can click a primary CTA and receive no real outcome.
- **Action:** Replace the mock branch with a real export flow or disable/hide the control until the handler is wired.
- **Status:** Resolved. The button is now disabled when no export handler is supplied.

### Sensitive review/inspection data is still logged to the browser console
- **Files:** `client/src/views/supid/ReviewApplication/ReviewApplication.tsx:120`, `client/src/views/supid/ReviewApplication/ReviewApplication.tsx:129`, `client/src/views/supid/EPA/InspectionCreate.tsx:94`
- **Finding:** Live applicant review state and inspection submission payloads are logged directly from UI code.
- **Impact:** Operational or personal data can be exposed in shared browsers, support sessions, and screenshots.
- **Action:** Remove the logs or guard them behind a dev-only logger that strips payload contents.
- **Status:** Resolved. The applicant-review and inspection payload debug logs were removed.

### Obsolete Cypress suite remains in the active E2E folder
- **File:** `tests/legacy-cypress/features.cy.ts:1`
- **Finding:** The old Cypress suite has been moved out of the active Playwright directory.
- **Impact:** Active E2E coverage is no longer overstated by a non-runnable Cypress file living under `tests/e2e`.
- **Action:** Resolved. Keep legacy Cypress assets outside the Playwright tree unless they are actively maintained.

## Low

### Frontend ad hoc console instrumentation has been centralized
- **Files:** `client/src/utils/logger.ts:1` plus affected `client/src` callers
- **Finding:** Direct `console.log` / `console.warn` / `console.error` calls in app code were replaced with a shared logger utility.
- **Impact:** Browser-console noise is now gated behind a single dev-only logger instead of being scattered through production UI code.
- **Action:** Resolved. Keep runtime logging routed through `client/src/utils/logger.ts` and avoid new direct `console.*` calls in application code.
- **Status:** Resolved

## Critical

No critical Vibe Code findings were confirmed in `client/src` during this pass.

## Hardcoded values check

- `client/src/configs/firebase.config.ts:2` reads `apiKey` from `import.meta.env.VITE_FIREBASE_API_KEY`; this is configuration, not a hardcoded secret.
- No hardcoded production credentials were confirmed in `client/src` during this pass.
