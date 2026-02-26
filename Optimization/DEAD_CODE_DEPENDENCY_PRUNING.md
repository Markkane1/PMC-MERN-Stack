# Dead Code and Dependency Pruning

Generated: 2026-02-25

## Scope Executed

- Removed dead temporary source files.
- Pruned unused npm dependencies from root, server, and client.
- Kept auth and API behavior intact while matching active code usage.

## Dead Code Removed

- `server/tmp-payload-size.ts`
- `server/tmp-perf-breakdown.ts`
- tracked generated artifact removed from git: `build.log`

## Dependency Pruning

### Root (`package.json`)
- Removed devDependencies:
  - `@types/node`

### Server (`server/package.json`)
- Removed dependencies:
  - `jsbarcode`
  - `luxon`
  - `mongodb`
  - `xlsx`
- Removed devDependencies:
  - `eslint-plugin-import`

### Client (`client/package.json`)
- Removed dependencies:
  - `@googlemaps/google-maps-services-js`
  - `@tanstack/match-sorter-utils`
  - `@tanstack/react-virtual`
  - `@tiptap/pm`
  - `d3-dsv`
  - `d3-fetch`
  - `d3-scale`
  - `firebase`
  - `idb`
  - `leaflet`
  - `marked`
  - `react-csv`
  - `react-leaflet`
  - `react-portal`
  - `terraformer`
  - `workbox-webpack-plugin`

## Notes

- Lockfiles were updated by npm uninstall operations.
- Vulnerabilities reported by npm audit were intentionally not auto-fixed in this pass to avoid unreviewed breaking upgrades.
