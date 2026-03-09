# COVERAGE_REPORT.md

Generated: 2026-03-06 15:31:00 +05:00

## Current run

- **Command:** `npm run test:coverage`
- **Result:** `21` test files passed, `137` tests passed.
- **Raw c8 summary:** `All files 100%` lines/branches/functions/statements.

## Coverage validity

The raw `c8` output is not trustworthy for application coverage in its current configuration.

- The report only instrumented `vitest.config.ts`.
- No server files, client views, route handlers, or use cases appeared in the emitted table.
- As a result, the reported `100%` does **not** prove that auth, payments, or user-data paths meet the requested thresholds.

## Practical status

- **Unit/component surface:** healthy. `npm run test:coverage` executed the Vitest suites successfully.
- **Integration surface:** healthy. `npm run test:integration` passed `4` suites and `39` tests in the current workspace.
- **E2E surface:** scaffolding exists at `tests/e2e/auth.playwright.spec.ts`, but a full green Playwright run was not confirmed in this pass because the client app cold-start/navigation path is still too heavy for stable local verification.

## Coverage gaps that still matter

Because instrumentation is misconfigured, these critical files should be treated as effectively unmeasured until coverage includes app code:

- `server/src/application/usecases/accounts/AuthUseCases.ts`
- `server/src/application/usecases/accounts/AdminUseCases.ts`
- `server/src/interfaces/http/routes/pmc.routes.ts`
- `server/src/interfaces/http/middlewares/error.ts`
- `client/src/views/PaymentDashboard.tsx`
- `client/src/views/ApplicationFormPage.tsx`

## Minimum work to make coverage meaningful

1. Configure `c8`/Vitest includes so app source files are instrumented instead of only config/test files.
2. Re-run coverage for unit plus component suites after instrumentation is fixed.
3. Add route-level coverage collection for the Jest integration suite or merge Jest coverage into the final report.
4. Add stable Playwright execution or remove E2E coverage targets from the threshold until the runner is reliable.

## Intentionally untested or currently unverified

- Full browser E2E flows beyond the new Playwright auth scaffold.
- True merged coverage across Vitest, Jest, and Playwright.
- Per-function 0% coverage analysis for app code, because the current report does not instrument those files.
