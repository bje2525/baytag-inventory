# BayTag Capture v3.0.0 Stable

BayTag Capture is an independently branded, local-first iPhone web app for capturing shelf/bay locations and white BEAR inventory tags. The orange-and-charcoal capture interface is inspired by retail workflow concepts; it is not an official Home Depot app.

## Capture-first experience

- New Home dashboard with a current-or-recent location card, Start Bay Capture, Review Captures, Saved Inventory, and History
- A guided three-step capture flow: **1 · Location**, **2 · Photos**, **3 · Review**
- Large yellow-location and BEAR-tag camera/upload actions, real captured image preview and photo navigation
- Dedicated Review Capture screen with live department/aisle/bay summary, editable detected SKU rows, quantities, dates, and the existing **Save Capture** action
- Four-item bottom navigation: **Home**, **Capture**, **Inventory**, **History**
- Clear one-handed orange/charcoal design, accessible buttons, safe-area padding, and no dummy data when a bay has not been selected

## Preserved production features

- The exact original `baytag-inventory-v1` localStorage key and existing saved inventory records
- Existing multi-photo OCR, multiple SKU recognition, per-tag dates, quantity correction, duplicate prompts, error recovery, manual entry, editing, status management, history, smart inventory tools, CSV and JSON backups
- Photo previews are temporary and not permanently saved to inventory or sent to a new backend
- No automatic migrations or automatic save of OCR suggestions

## Testing and deployment

Run `npm ci && npm test` with Node.js 24. The protected-main PR must pass all scanner, inventory, data safety, and v3 UI regression tests. Verify the GitHub Pages deployment commit. On iPhone, open the existing URL, verify all saved inventory, then check Home → Capture → Review → Save and History. Export JSON backup regularly; do not clear Safari website data or uninstall the Home Screen shortcut to force an update.

Live URL: https://bje2525.github.io/baytag-inventory/
