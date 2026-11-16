# baytag-inventory
Appliance over stock

## v2.2.0-dev.2 (development branch only)

Multi-photo OCR now stages results until every photo succeeds, so failed rescans
retain existing review rows. Each SKU retains its own quantity, including zero;
missing quantities remain blank for review. Manual rows remain available offline.
Inventory edits retain legacy and custom JSON fields. The existing
`baytag-inventory-v1` storage key and array-based JSON backups are unchanged.
Unreadable inventory blocks writes to prevent accidental replacement.

Run automated regressions with Node.js 22 or later:

```sh
npm ci
npm test
```

Tests use simulated OCR and browser storage, plus a service-worker cache harness.
Real iPhone camera, OCR accuracy, installation and airplane-mode checks remain
manual acceptance steps. OCR still requires network resources on first use.
This branch is not a production deployment; do not merge into protected main
without a separate release review.

Multi-tag creation dates are associated with nearby OCR date coordinates per SKU,
including separate dates for tags in the same photo. Conflicting dates without
coordinates, or equally close conflicting dates, remain blank for manual review.
The development test workflow runs `npm ci` and `npm test` on pushes and pull
requests targeting `baytag-v2.2` with read-only repository permissions.
