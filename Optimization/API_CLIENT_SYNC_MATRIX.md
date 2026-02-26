# API Contract and Client Sync Matrix

Generated: 2026-02-25T21:19:13.511Z

## Summary

- Server endpoints discovered: 244
- Client endpoint calls discovered: 98
- Client calls matched to server: 98
- Client calls missing on server: 0
- Server endpoints not called by client: 146

## Client Calls Missing on Server

None

## Server Endpoints Not Used by Client

| Method | Path | Server Source |
| --- | --- | --- |
| DELETE | `/pmc/admin/fields/definitions/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:375` |
| DELETE | `/pmc/alerts/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:350` |
| DELETE | `/pmc/applicant-detail/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:106` |
| DELETE | `/pmc/applicant-documents/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:174` |
| DELETE | `/pmc/business-profiles/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:117` |
| DELETE | `/pmc/by-products/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:136` |
| DELETE | `/pmc/collectors/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:155` |
| DELETE | `/pmc/competition/register/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:310` |
| DELETE | `/pmc/consumers/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:149` |
| DELETE | `/pmc/district-documents/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:186` |
| DELETE | `/pmc/field-responses/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:211` |
| DELETE | `/pmc/inspection-report-cached/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:299` |
| DELETE | `/pmc/inspection-report/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:287` |
| DELETE | `/pmc/manual-fields/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:217` |
| DELETE | `/pmc/plastic-items/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:124` |
| DELETE | `/pmc/producers/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:143` |
| DELETE | `/pmc/products/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:130` |
| DELETE | `/pmc/raw-materials/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:167` |
| DELETE | `/pmc/recyclers/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:161` |
| GET | `/cache/health` | `server/src/interfaces/http/routes/cache.routes.ts:8` |
| GET | `/cache/stats` | `server/src/interfaces/http/routes/cache.routes.ts:29` |
| GET | `/notification/count` | `server/src/interfaces/http/routes/common.routes.ts:8` |
| GET | `/pmc/admin/alerts/all` | `server/src/interfaces/http/routes/pmc.routes.ts:358` |
| GET | `/pmc/alerts` | `server/src/interfaces/http/routes/pmc.routes.ts:345` |
| GET | `/pmc/alerts/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:347` |
| GET | `/pmc/alerts/preferences` | `server/src/interfaces/http/routes/pmc.routes.ts:351` |
| GET | `/pmc/alerts/statistics` | `server/src/interfaces/http/routes/pmc.routes.ts:354` |
| GET | `/pmc/alerts/unread-count` | `server/src/interfaces/http/routes/pmc.routes.ts:346` |
| GET | `/pmc/applicant-documents` | `server/src/interfaces/http/routes/pmc.routes.ts:170` |
| GET | `/pmc/applicant-documents/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:171` |
| GET | `/pmc/application-assignment` | `server/src/interfaces/http/routes/pmc.routes.ts:200` |
| GET | `/pmc/application-assignment/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:201` |
| GET | `/pmc/application-assignment/by_applicant` | `server/src/interfaces/http/routes/pmc.routes.ts:202` |
| GET | `/pmc/business-profiles` | `server/src/interfaces/http/routes/pmc.routes.ts:112` |
| GET | `/pmc/business-profiles/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:113` |
| GET | `/pmc/business-profiles/by_applicant` | `server/src/interfaces/http/routes/pmc.routes.ts:114` |
| GET | `/pmc/by-products` | `server/src/interfaces/http/routes/pmc.routes.ts:132` |
| GET | `/pmc/by-products/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:133` |
| GET | `/pmc/check-psid-payment` | `server/src/interfaces/http/routes/pmc.routes.ts:262` |
| GET | `/pmc/collectors` | `server/src/interfaces/http/routes/pmc.routes.ts:151` |
| GET | `/pmc/collectors/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:152` |
| GET | `/pmc/competition` | `server/src/interfaces/http/routes/pmc.routes.ts:303` |
| GET | `/pmc/competition/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:304` |
| GET | `/pmc/competition/:param/registrations/:param/generate-label` | `server/src/interfaces/http/routes/pmc.routes.ts:314` |
| GET | `/pmc/competition/courier-label/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:317` |
| GET | `/pmc/competition/my/registrations` | `server/src/interfaces/http/routes/pmc.routes.ts:311` |
| GET | `/pmc/competition/register` | `server/src/interfaces/http/routes/pmc.routes.ts:305` |
| GET | `/pmc/competition/register/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:306` |
| GET | `/pmc/confiscation-lookup` | `server/src/interfaces/http/routes/pmc.routes.ts:330` |
| GET | `/pmc/consumers` | `server/src/interfaces/http/routes/pmc.routes.ts:145` |
| GET | `/pmc/consumers/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:146` |
| GET | `/pmc/district-documents/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:183` |
| GET | `/pmc/DistrictByLatLon` | `server/src/interfaces/http/routes/pmc.routes.ts:227` |
| GET | `/pmc/export/applicants-payment` | `server/src/interfaces/http/routes/pmc.routes.ts:337` |
| GET | `/pmc/export/competitions` | `server/src/interfaces/http/routes/pmc.routes.ts:338` |
| GET | `/pmc/export/courier-labels` | `server/src/interfaces/http/routes/pmc.routes.ts:341` |
| GET | `/pmc/export/payments` | `server/src/interfaces/http/routes/pmc.routes.ts:339` |
| GET | `/pmc/export/psid-tracking` | `server/src/interfaces/http/routes/pmc.routes.ts:340` |
| GET | `/pmc/export/summary-report` | `server/src/interfaces/http/routes/pmc.routes.ts:342` |
| GET | `/pmc/field-responses` | `server/src/interfaces/http/routes/pmc.routes.ts:207` |
| GET | `/pmc/field-responses/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:208` |
| GET | `/pmc/fields/audit-log/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:368` |
| GET | `/pmc/fields/completion-status` | `server/src/interfaces/http/routes/pmc.routes.ts:366` |
| GET | `/pmc/fields/definitions` | `server/src/interfaces/http/routes/pmc.routes.ts:361` |
| GET | `/pmc/fields/definitions/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:362` |
| GET | `/pmc/fields/responses` | `server/src/interfaces/http/routes/pmc.routes.ts:365` |
| GET | `/pmc/fields/sections` | `server/src/interfaces/http/routes/pmc.routes.ts:369` |
| GET | `/pmc/fields/sections/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:370` |
| GET | `/pmc/generate-license-pdf` | `server/src/interfaces/http/routes/pmc.routes.ts:248` |
| GET | `/pmc/inspection-report` | `server/src/interfaces/http/routes/pmc.routes.ts:283` |
| GET | `/pmc/inspection-report-cached` | `server/src/interfaces/http/routes/pmc.routes.ts:295` |
| GET | `/pmc/inspection-report-cached/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:296` |
| GET | `/pmc/inspection-report/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:284` |
| GET | `/pmc/license-eligibility/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:264` |
| GET | `/pmc/license-pdf` | `server/src/interfaces/http/routes/pmc.routes.ts:249` |
| GET | `/pmc/manual-fields` | `server/src/interfaces/http/routes/pmc.routes.ts:213` |
| GET | `/pmc/manual-fields/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:214` |
| GET | `/pmc/media/:param/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:333` |
| GET | `/pmc/media/:param/:param/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:334` |
| GET | `/pmc/payment-history/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:263` |
| GET | `/pmc/payment-status/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:260` |
| GET | `/pmc/payment-summary` | `server/src/interfaces/http/routes/pmc.routes.ts:267` |
| GET | `/pmc/ping` | `server/src/interfaces/http/routes/pmc.routes.ts:327` |
| GET | `/pmc/plastic-items` | `server/src/interfaces/http/routes/pmc.routes.ts:120` |
| GET | `/pmc/plastic-items/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:121` |
| GET | `/pmc/plmis-token` | `server/src/interfaces/http/routes/pmc.routes.ts:245` |
| GET | `/pmc/plmis/health` | `server/src/interfaces/http/routes/pmc.routes.ts:276` |
| GET | `/pmc/plmis/receipt/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:273` |
| GET | `/pmc/plmis/statistics` | `server/src/interfaces/http/routes/pmc.routes.ts:275` |
| GET | `/pmc/plmis/status/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:271` |
| GET | `/pmc/producers` | `server/src/interfaces/http/routes/pmc.routes.ts:139` |
| GET | `/pmc/producers/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:140` |
| GET | `/pmc/products` | `server/src/interfaces/http/routes/pmc.routes.ts:126` |
| GET | `/pmc/products/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:127` |
| GET | `/pmc/raw-materials` | `server/src/interfaces/http/routes/pmc.routes.ts:163` |
| GET | `/pmc/raw-materials/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:164` |
| GET | `/pmc/recyclers` | `server/src/interfaces/http/routes/pmc.routes.ts:157` |
| GET | `/pmc/recyclers/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:158` |
| GET | `/pmc/verify-chalan` | `server/src/interfaces/http/routes/pmc.routes.ts:329` |
| PATCH | `/accounts/profile` | `server/src/interfaces/http/routes/accounts.routes.ts:55` |
| PATCH | `/pmc/applicant-documents/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:173` |
| PATCH | `/pmc/application-assignment/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:204` |
| PATCH | `/pmc/by-products/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:135` |
| PATCH | `/pmc/competition/register/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:309` |
| PATCH | `/pmc/district-documents/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:185` |
| PATCH | `/pmc/field-responses/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:210` |
| PATCH | `/pmc/inspection-report-cached/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:298` |
| PATCH | `/pmc/plastic-items/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:123` |
| PATCH | `/pmc/products/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:129` |
| PATCH | `/pmc/raw-materials/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:166` |
| POST | `/cache/clear` | `server/src/interfaces/http/routes/cache.routes.ts:41` |
| POST | `/pmc/admin/alerts/create` | `server/src/interfaces/http/routes/pmc.routes.ts:357` |
| POST | `/pmc/admin/fields/bulk-update` | `server/src/interfaces/http/routes/pmc.routes.ts:376` |
| POST | `/pmc/admin/fields/definitions` | `server/src/interfaces/http/routes/pmc.routes.ts:373` |
| POST | `/pmc/alerts/test` | `server/src/interfaces/http/routes/pmc.routes.ts:353` |
| POST | `/pmc/by-products` | `server/src/interfaces/http/routes/pmc.routes.ts:134` |
| POST | `/pmc/competition/:param/register` | `server/src/interfaces/http/routes/pmc.routes.ts:307` |
| POST | `/pmc/competition/:param/registrations/:param/generate-label` | `server/src/interfaces/http/routes/pmc.routes.ts:315` |
| POST | `/pmc/competition/:param/registrations/:param/score` | `server/src/interfaces/http/routes/pmc.routes.ts:318` |
| POST | `/pmc/competition/:param/registrations/:param/submit` | `server/src/interfaces/http/routes/pmc.routes.ts:312` |
| POST | `/pmc/competition/:param/score` | `server/src/interfaces/http/routes/pmc.routes.ts:319` |
| POST | `/pmc/competition/:param/submit` | `server/src/interfaces/http/routes/pmc.routes.ts:313` |
| POST | `/pmc/fields/evaluate-conditions` | `server/src/interfaces/http/routes/pmc.routes.ts:367` |
| POST | `/pmc/fields/responses` | `server/src/interfaces/http/routes/pmc.routes.ts:364` |
| POST | `/pmc/fields/validate` | `server/src/interfaces/http/routes/pmc.routes.ts:363` |
| POST | `/pmc/inspection-report-cached` | `server/src/interfaces/http/routes/pmc.routes.ts:297` |
| POST | `/pmc/payment-intimation` | `server/src/interfaces/http/routes/pmc.routes.ts:243` |
| POST | `/pmc/payment-reminder/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:266` |
| POST | `/pmc/payment-status/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:261` |
| POST | `/pmc/plastic-items` | `server/src/interfaces/http/routes/pmc.routes.ts:122` |
| POST | `/pmc/plmis-token` | `server/src/interfaces/http/routes/pmc.routes.ts:244` |
| POST | `/pmc/plmis/cancel/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:274` |
| POST | `/pmc/plmis/initiate` | `server/src/interfaces/http/routes/pmc.routes.ts:270` |
| POST | `/pmc/plmis/verify` | `server/src/interfaces/http/routes/pmc.routes.ts:272` |
| POST | `/pmc/plmis/webhook/payment-confirmed` | `server/src/interfaces/http/routes/pmc.routes.ts:279` |
| POST | `/pmc/plmis/webhook/payment-failed` | `server/src/interfaces/http/routes/pmc.routes.ts:280` |
| POST | `/pmc/products` | `server/src/interfaces/http/routes/pmc.routes.ts:128` |
| POST | `/pmc/raw-materials` | `server/src/interfaces/http/routes/pmc.routes.ts:165` |
| POST | `/pmc/receipt-pdf` | `server/src/interfaces/http/routes/pmc.routes.ts:255` |
| POST | `/pmc/verify-chalan` | `server/src/interfaces/http/routes/pmc.routes.ts:328` |
| POST | `/pmc/verify-chalan-qr` | `server/src/interfaces/http/routes/pmc.routes.ts:257` |
| POST | `/pmc/verify-payments` | `server/src/interfaces/http/routes/pmc.routes.ts:265` |
| PUT | `/pmc/admin/fields/definitions/:param` | `server/src/interfaces/http/routes/pmc.routes.ts:374` |
| PUT | `/pmc/alerts/:param/read` | `server/src/interfaces/http/routes/pmc.routes.ts:348` |
| PUT | `/pmc/alerts/mark-read/batch` | `server/src/interfaces/http/routes/pmc.routes.ts:349` |
| PUT | `/pmc/alerts/preferences` | `server/src/interfaces/http/routes/pmc.routes.ts:352` |

## Fully Matched Endpoints

| Method | Path |
| --- | --- |
| DELETE | `/accounts/admin/groups/:param` |
| DELETE | `/accounts/admin/superadmins/:param` |
| DELETE | `/accounts/admin/users/:param` |
| GET | `/accounts/admin/access-logs` |
| GET | `/accounts/admin/api-logs` |
| GET | `/accounts/admin/audit-logs` |
| GET | `/accounts/admin/external-tokens` |
| GET | `/accounts/admin/groups` |
| GET | `/accounts/admin/permissions` |
| GET | `/accounts/admin/service-configs` |
| GET | `/accounts/admin/superadmins` |
| GET | `/accounts/admin/users` |
| GET | `/accounts/generate-captcha` |
| GET | `/accounts/list-inspectors` |
| GET | `/accounts/oauth/github/auth-url` |
| GET | `/accounts/oauth/google/auth-url` |
| GET | `/accounts/profile` |
| GET | `/accounts/role-dashboard` |
| GET | `/notification/list` |
| GET | `/pmc/applicant-alerts` |
| GET | `/pmc/applicant-detail` |
| GET | `/pmc/applicant-detail-main-do-list` |
| GET | `/pmc/applicant-detail-main-list` |
| GET | `/pmc/applicant-detail/:param` |
| GET | `/pmc/applicant-location-public` |
| GET | `/pmc/applicant-statistics` |
| GET | `/pmc/chalan-pdf` |
| GET | `/pmc/check-psid-status` |
| GET | `/pmc/competition/generate-label` |
| GET | `/pmc/district-documents` |
| GET | `/pmc/districts` |
| GET | `/pmc/districts-public` |
| GET | `/pmc/download_latest_document` |
| GET | `/pmc/export-applicant` |
| GET | `/pmc/fetch-statistics-do-view-groups` |
| GET | `/pmc/fetch-statistics-view-groups` |
| GET | `/pmc/generate-psid` |
| GET | `/pmc/idm_clubs_geojson_all` |
| GET | `/pmc/idm_clubs/all` |
| GET | `/pmc/idm_districts-club-counts` |
| GET | `/pmc/inspection-report-cached/all_other_single_use_plastics` |
| GET | `/pmc/inspection-report/district_summary` |
| GET | `/pmc/inspection-report/export-all-inspections-excel` |
| GET | `/pmc/inspection-report/export-all-inspections-pdf` |
| GET | `/pmc/inspection-report/export-district-summary-excel` |
| GET | `/pmc/inspection-report/export-district-summary-pdf` |
| GET | `/pmc/license-by-user` |
| GET | `/pmc/mis-applicant-statistics` |
| GET | `/pmc/mis-district-plastic-stats` |
| GET | `/pmc/psid-report` |
| GET | `/pmc/receipt-pdf` |
| GET | `/pmc/report` |
| GET | `/pmc/report-fee` |
| GET | `/pmc/tehsils` |
| GET | `/pmc/track-application` |
| GET | `/pmc/user-groups` |
| GET | `/search/query` |
| PATCH | `/accounts/admin/groups/:param` |
| PATCH | `/accounts/admin/service-configs/:param` |
| PATCH | `/accounts/admin/superadmins/:param` |
| PATCH | `/accounts/admin/users/:param` |
| PATCH | `/pmc/applicant-detail/:param` |
| PATCH | `/pmc/business-profiles/:param` |
| PATCH | `/pmc/collectors/:param` |
| PATCH | `/pmc/consumers/:param` |
| PATCH | `/pmc/inspection-report/:param` |
| PATCH | `/pmc/manual-fields/:param` |
| PATCH | `/pmc/producers/:param` |
| PATCH | `/pmc/recyclers/:param` |
| POST | `/accounts/admin/groups` |
| POST | `/accounts/admin/permissions/reset` |
| POST | `/accounts/admin/service-configs` |
| POST | `/accounts/admin/superadmins` |
| POST | `/accounts/admin/users/:param/reset-password` |
| POST | `/accounts/create-update-inpsector-user` |
| POST | `/accounts/find-user` |
| POST | `/accounts/login` |
| POST | `/accounts/logout` |
| POST | `/accounts/oauth/github/callback` |
| POST | `/accounts/oauth/google/callback` |
| POST | `/accounts/register` |
| POST | `/accounts/reset-forgot-password` |
| POST | `/accounts/reset-password2` |
| POST | `/pmc/applicant-detail` |
| POST | `/pmc/applicant-documents` |
| POST | `/pmc/application-assignment` |
| POST | `/pmc/business-profiles` |
| POST | `/pmc/chalan-pdf` |
| POST | `/pmc/collectors` |
| POST | `/pmc/competition/register` |
| POST | `/pmc/consumers` |
| POST | `/pmc/district-documents` |
| POST | `/pmc/field-responses` |
| POST | `/pmc/inspection-report` |
| POST | `/pmc/manual-fields` |
| POST | `/pmc/producers` |
| POST | `/pmc/recyclers` |
| PUT | `/accounts/admin/role-dashboard` |
