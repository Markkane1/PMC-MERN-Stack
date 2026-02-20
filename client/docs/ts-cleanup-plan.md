# Type Debt Cleanup Plan (4 Phases)

## Scope
This plan targets TypeScript debt in the client app, primarily temporary `@ts-nocheck` suppressions and weakly typed legacy screens.

## Baseline (Phase 1)
- Date: 2026-02-20
- `tsc --noEmit`: passing
- `@ts-nocheck` files: 56
- Largest buckets:
  - `src/views/supid`: 27
  - `src/views/demo`: 11
  - `src/views/auth`: 8

Source snapshot: `client/docs/ts-nocheck-baseline.json`.

## Phase 1 (Executed)
- Added debt audit tooling:
  - `npm run typecheck`
  - `npm run debt:ts-nocheck`
  - `npm run debt:ts-nocheck:json`
- Added automated scanner script:
  - `client/scripts/tsNocheckAudit.cjs`
- Captured baseline snapshot:
  - `client/docs/ts-nocheck-baseline.json`

Exit criteria:
- Baseline is measurable and reproducible from CLI.
- Next phases have clear targets by folder.

## Phase 2 (Next)
Target: remove `@ts-nocheck` from core route/dashboard/auth screens first.

Candidate groups:
- `src/views/Home*.tsx`
- `src/views/TrackApplication.tsx`
- `src/views/auth/**` (sign-in/sign-up/forgot/reset/analytics/competition)
- `src/views/ErrorPage.tsx`

Exit criteria:
- `@ts-nocheck` reduced by at least 20 files.
- `tsc --noEmit` remains passing.

## Phase 3
Target: remove suppressions from `demo` and `epa` screens and shared view utilities.

Candidate groups:
- `src/views/demo/**`
- `src/views/epa/**`

Exit criteria:
- `@ts-nocheck` reduced by at least 12 more files.
- No new `any`-heavy regressions in changed files.

## Phase 4
Target: remove suppressions from heavy SUPID flows and finalize strict typing.

Candidate groups:
- `src/views/supid/**`
- `src/store/supid/supidStore.ts`

Exit criteria:
- Zero `@ts-nocheck` in client source.
- `tsc --noEmit` and production build both pass.
