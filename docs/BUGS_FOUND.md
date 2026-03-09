# BUGS_FOUND.md

Generated: 2026-03-06 15:31:00 +05:00

## [BUG-001] Analytics export button is a no-op
- **Severity:**    Medium
- **File:**        client/src/components/analytics/AnalyticsDashboard.tsx:54
- **Session:**     Vibe Audit
- **Description:** The analytics export action does not trigger a real export path. `handleExport()` calls the optional callback and then only logs `Exporting analytics report...`, so the default component behavior presents a functional-looking button with no built-in user-visible result.
- **Test:**        Static audit of `client/src/components/analytics/AnalyticsDashboard.tsx`
- **Status:**      Resolved

## [BUG-002] Legacy Cypress E2E suite is not executed by the current Playwright runner
- **Severity:**    Medium
- **File:**        tests/legacy-cypress/features.cy.ts:1
- **Session:**     Vibe Audit
- **Description:** The repo previously contained a Cypress-style E2E suite under the Playwright test directory. It has been moved out to `tests/legacy-cypress/` so the active Playwright tree now contains only runnable Playwright specs.
- **Test:**        `npm run test:e2e`
- **Status:**      Resolved

## [BUG-003] Inspection sync listener is registered through a lifecycle-managed binder
- **Severity:**    Medium
- **File:**        client/src/store/supid/useInspectionStore.ts:202
- **Session:**     Performance
- **Description:** The store previously registered `window.addEventListener('online', ...)` at module scope with no cleanup. It now exposes a binder that is attached from `App.tsx` and returns a teardown function, preventing duplicate global listeners across remounts.
- **Test:**        Static audit of `client/src/store/supid/useInspectionStore.ts`
- **Status:**      Resolved
