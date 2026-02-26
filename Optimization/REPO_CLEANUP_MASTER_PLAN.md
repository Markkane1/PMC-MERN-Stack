# Repo Cleanup Master Plan

## Scope
- Full codebase cleanup across root, `server`, and `client`.
- Remove stale artifacts and outdated documentation.
- Ensure compile-time and lint-time quality gates pass.
- Validate runtime startup path for API service.

## Phase 0: Baseline and Safety
Status: Completed

Tasks:
1. Capture current git state and branch.
2. Validate baseline lint/build behavior.
3. Identify runtime startup blockers and warnings.

Deliverables:
- Baseline command outputs captured during execution.

## Phase 1: Repo Hygiene
Status: Completed (Core)

Tasks:
1. Ensure `node_modules` and build outputs are ignored.
2. Remove tracked generated artifacts.
3. Keep repository root clean and source-focused.

Completed:
- Confirmed ignore rules for `node_modules`, `build`, `dist`, logs.
- Removed tracked `build.log` artifact.

## Phase 2: Documentation Cleanup
Status: Completed

Tasks:
1. Rewrite root README with current monorepo workflows.
2. Rewrite server README with accurate scripts/env setup.
3. Add client README with setup/build/lint/typecheck instructions.

Completed:
- `README.md` updated.
- `server/README.md` updated.
- `client/README.md` created.

## Phase 3: Compile/Lint Cleanup
Status: Completed

Tasks:
1. Fix lint and build blockers/warnings.
2. Ensure root `npm run lint` and `npm run build` pass.

Completed:
- Root lint passed.
- Root build passed.
- Removed Vite unresolved asset warnings by replacing missing image URLs in KPI dashboard CSS.

## Phase 4: Runtime Startup Cleanup
Status: Completed (Core)

Tasks:
1. Verify server can start and serve health endpoint.
2. Remove startup/runtime warnings caused by code issues.

Completed:
- Fixed duplicate Mongoose index warning in `ApplicantDocument` schema.
- Fixed server startup log template interpolation bug for monitoring/HA URLs.
- Verified server responds on a free port via `/monitoring/health`.

Notes:
- Health endpoint can return `503 degraded` under configured health checks; this is not a startup failure.
- Redis warning remains expected when Redis env vars are not configured.

## Phase 5: API Contract and Client Sync
Status: Pending

Tasks:
1. Generate endpoint inventory from server routes.
2. Cross-check frontend service calls against endpoint contracts.
3. Resolve response-shape mismatches and dead client integrations.

Deliverables:
- Endpoint mapping matrix (`route`, `method`, `client usage`, `status`).

## Phase 6: Dead Code and Dependency Pruning
Status: Pending

Tasks:
1. Remove unused utilities/components/routes/services.
2. Prune unused npm dependencies from root/server/client.
3. Re-run full install/lint/build after pruning.

Deliverables:
- Dependency diff and dead-code removal list.

## Phase 7: DB/Collection Access Hardening
Status: Pending

Tasks:
1. Inventory all Mongo collections referenced by repositories/models.
2. Remove collection references not used by active API paths.
3. Normalize collection naming references where required.

Deliverables:
- Collection usage matrix by endpoint.

## Phase 8: Final QA Gate
Status: Pending

Tasks:
1. Full lint/build pass at root.
2. API smoke checks on critical modules.
3. Final git status sanity check.

Deliverables:
- Final cleanup report with pass/fail evidence.

## Execution Log (Current Turn)
- Updated and standardized READMEs in root/server/client.
- Fixed client build warnings from missing `img/banana.png` and `img/map.png` references.
- Fixed duplicate Mongoose index definition in `server/src/infrastructure/database/models/pmc/ApplicantDocument.ts`.
- Fixed runtime log interpolation in `server/src/server.ts`.
- Verified root lint/build success.
