# DB Collection Access Hardening

Generated: 2026-02-25T21:24:32.748Z

## Summary

- Model collections discovered: 44
- Collections used by API runtime: 43
- Collections not referenced by API runtime: 1

## API Collection Allow-List

- `AccessLog`
- `AdvancedFieldDefinition`
- `AdvancedFieldResponse`
- `Alert`
- `AlertRecipient`
- `AlertTemplate`
- `ApiLog`
- `ApplicantDetail`
- `ApplicantDocument`
- `ApplicantFee`
- `ApplicantFieldResponse`
- `ApplicantManualFields`
- `ApplicationSubmitted`
- `AuditLog`
- `BusinessProfile`
- `ByProduct`
- `Collector`
- `Consumer`
- `Counter`
- `District`
- `DistrictNew`
- `DistrictPlasticCommitteeDocument`
- `EecClub`
- `ExternalServiceToken`
- `FieldResponseAuditLog`
- `FieldSection`
- `Group`
- `License`
- `PSIDTracking`
- `Permission`
- `PlasticItem`
- `Producer`
- `Product`
- `RawMaterial`
- `Recycler`
- `ServiceConfiguration`
- `SingleUsePlasticsSnapshot`
- `SocialAccount`
- `SystemConfig`
- `Tehsil`
- `User`
- `UserAuditLog`
- `UserProfile`

## Collections Not Used by API Runtime

- `Division`

## Hardening Actions Applied

- Added runtime allow-list: `server/src/infrastructure/database/collectionAllowList.ts`.
- Added dry-run prune script: `npm run db:prune-unused --prefix server`.
- Added apply prune script: `npm run db:prune-unused:apply --prefix server`.
- Existing backup cleanup remains available: `npm run cleanup:bak --prefix server`.
- Executed `npm run db:prune-unused:apply --prefix server` and dropped `Division`.
- Re-verified with `npm run db:prune-unused --prefix server`: `No unused collections detected.`

## Notes

- `Counter` is retained because numeric ID generation in model hooks depends on it.
- Prune script excludes MongoDB system collections (e.g. `system.*`).
