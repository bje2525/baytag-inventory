# BayTag Inventory v2.3.0 Stable

A beginner-friendly iPhone web app for yellow bay locations and white BEAR tags.

## v2.3 major usability update
- Removed the redundant yellow-tag instructional box, as requested.
- Removed the empty "Review uploaded BEAR photo" picker from the visible screen while retaining the underlying scanner selector.
- Added simple Previous / Next photo buttons when two or more white-tag photos are selected; single-photo scanning has no extra controls.
- Added clearer progress guidance, Continue to Step 2 and Review detected SKUs shortcuts.
- Preserved the v2.2 multi-SKU/quantity/date OCR, manual review, duplicate warnings, saved inventory, offline access, CSV and JSON backups.

## Data and release safety
Inventory still uses `baytag-inventory-v1` in browser localStorage. No migrations, photo persistence or automatic save of unreviewed text. OCR may need internet on first use; saved inventory can load offline once cached. Avoid clearing Safari website data. Export a JSON backup from the same original live URL periodically.

Run `npm ci && npm test` (Node 24); GitHub Actions tests all pull requests into protected `main`. Deploy through a reviewed pull request to `main`, then confirm GitHub Pages deployment and saved iPhone inventory.
