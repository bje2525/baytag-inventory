# BayTag Inventory — v2.2.0 stable release preparation

**Status: READY FOR RELEASE REVIEW; NOT DEPLOYED TO PRODUCTION.** This branch (`baytag-v2.2-release-prep`) stages the final stable version. Protected `main` still serves v2.1.0 until the owner approves and merges a pull request.

## What's included

- Easy Mode: large Scan Items / Saved Items controls, simple Location → Photos → Review instructions, optional manual-entry controls and on-screen help
- Multiple BEAR tags per photograph and across photos, with separate SKU quantities and per-physical-tag creation dates when OCR coordinates support them
- Review and correction of uncertain numbers, manual outlines, duplicate warnings, editable inventory and status, history, CSV export and JSON backup/restore
- Existing `baytag-inventory-v1` browser-storage key and JSON record compatibility preserved; no automatic inventory migration
- Offline-cached application shell; first-time OCR download requires internet. Photos are not persisted with records

## Verification

Previous `baytag-v2.2` release candidate at commit `3b6aa7471123057b4f17d9a0df5aa51be57c04aa`: GitHub Actions tests passed. User reported all 7 scanner/inventory iPhone checks passing on the earlier dev build, and all 5 Easy Mode iPhone checks passing on RC1. This release-prep branch adds fresh version/CI tests; confirm the latest GitHub Actions run is green before approving.

Run all tests locally: `npm ci && npm test`. CI runs on pushes to `baytag-v2.2` and `baytag-v2.2-release-prep`, and on pull requests targeting `main` or `baytag-v2.2`.

## Safe production release checklist — owner approval required

1. Back up inventory as JSON from the **current live** app and keep it in iPhone Files. Do not clear website data or uninstall the Home Screen app.
2. Review the draft pull request from `baytag-v2.2-release-prep` into `main`. Check its changed files and green CI tests.
3. Verify a photograph containing **two physical tags with different dates** assigns dates correctly, or leaves ambiguous dates blank for review.
4. Explicitly approve the release, then merge through GitHub. No automatic merge or push to `main` is permitted during preparation.
5. Confirm GitHub Pages deployment success and that the live site shows `BayTag v2.2.0`; verify saved inventory and backups on the same original live origin, then check iPhone camera, saved inventory and offline access.
6. If production behavior fails, revert the release merge and repeat deployment verification. Keep the pre-release backup and do not delete browser storage.

**Safety:** OCR outlines estimate text regions, not guaranteed physical sticker boundaries. Always review quantities and dates before saving. The preview origin may not share local storage with the production Pages origin.
