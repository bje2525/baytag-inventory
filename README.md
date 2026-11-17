# BayTag Inventory — v2.4.0 Stable

BayTag is an iPhone-friendly, local-first app for yellow bay locations and white BEAR product labels. No coding knowledge or account is needed to use the app.

## All-in-one update: smart inventory controls

- Clear inventory summary: visible item count, quantity totals, and items marked **Needs review**
- Filter saved items by **department** and **status**, while keeping familiar SKU/location search
- Sort by recently changed, SKU, bay, or quantity
- One-tap **Show needs review** and **Clear filters**
- Select several visible items and update their status together, **only after confirmation**
- Download **matching inventory items** as a spreadsheet (CSV), or save a complete JSON backup with one tap
- Large, mobile-friendly buttons; no extra steps in the existing yellow-location → BEAR-photo → SKU-review scan workflow

All previous v2.3 scanner, date matching, duplicate warnings, history, editing, manual corrections and offline capabilities remain.

## Data safety

- Inventory stays under the same `baytag-inventory-v1` key in iPhone browser storage. There is no data migration or automatic overwrite.
- Batch status updates require confirmation and roll back on a failed local save.
- Filtered downloads do not modify inventory. The full backup includes **all** inventory even if you have filters selected.
- Photos are used for review but are not saved permanently or uploaded to a backend.
- Never clear Safari website data or uninstall the Home Screen app to refresh. Make regular JSON backups.
- OCR requires a connection on first download; cached app shell and saved inventory may be used offline.

## Release and testing

Run `npm ci && npm test` with Node.js 24. The stable release runs through a PR into protected `main` and must pass GitHub Actions before merging. The live Pages app is `https://bje2525.github.io/baytag-inventory/`. After merging, check deployment and existing inventory on the same original iPhone origin.
