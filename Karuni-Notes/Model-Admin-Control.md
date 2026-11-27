---
tags: [admin, models, catalog, tasks]
created: 2025-11-27
---

# Model Add / Remove / Active / Disabled — Admin Control

> **Goal (user, 2025-11-27):** model addition and removal, active and disabled, in the admin page — so the admin chooses what goes live.

## What exists today (baseline)

- `models` table already carries the flag: `enabled` 0/1 (both `store.mjs` and `postgres/store.mjs`), and `publicModels()`/`catalog()` only publish `enabled=1` rows → **live / not-live** is a plain flag flip.
- Admin pricing endpoint (`POST /api/admin/pricing`) already toggles `enabled` — in the newer admin console's "Models & pricing" tab (`admin-ui.js` models()).
- Guard: `model()` blocks flipping a model to `enabled=1` unless `inventory.present=1` for its `source` (both stores) — so a model can only go live after the router sync has listed it.
- **Removal** is NOT exposed anywhere today: no DELETE endpoint, no UI to drop a model row.

## [ ] Tasks (this page)

### A1 — Removal backend (both stores)

- [ ] `DELETE FROM models WHERE id=?` endpoint, admin-only, Postgres console + legacy (mirror in SQLite).
- [ ] Soft vs hard: **hard delete for now** is simplest, BUT it orphans `requests.model` history rows. Decision: hard delete is acceptable for pre-launch (no traffic); record choice here. If history integrity matters later, add `models.archived` flag instead — revisit in phase 7 review.
- [ ] If the model id appears in the session's in-flight `requests` (state='pending'): block delete or warn (user gets a 404 at settle — [[server.mjs:38]] model-not-available path handles it cleanly anyway).
- [ ] Audit row on every delete (`models.actor` convention already in `model()`).

### A2 — Add endpoint (`POST /api/admin/model-add`)

- [ ] Wraps the existing `model()` insert: id, source, name, family, description, input, output, maxIn, maxOut, enabled.
- [ ] Validation identical to `model()`: id regex, lengths, `input/output` are per-1M blended internal units ([[Catalog-Seed-Spec]]), `maxIn` 1..1e6, `maxOut` 1..32768.
- [ ] Auto-fill offer: a "from upstream inventory" button listing ids in `inventory` but not yet in `models` (so admin picks from the router catalog), with a price default prefilled.
- [ ] `enabled=0` on create (never live at add time) — the admin flips it deliberately after `Sync`.
- [ ] Audit + reason on every add (same prompt flow as pricing).

### A3 — UI: Models & pricing tab (`admin-ui.js` + `admin.html`)

- [ ] Per-model row actions grow from `Save` to: **Enable / Disable** toggle (the existing checkbox becomes an explicit pair of buttons for clarity per the ask), **Remove**, **Add** (header action).
- [ ] **Add model dialog** (in-page modal, replacing the native-prompt pattern per [[Component-Spec#Prompt flows]]): id/source/name/family/description/pricing/max-tokens fields, plus the "from inventory" dropdown.
- [ ] **Remove confirmation**: inline confirm "Remove <id> from catalog? History rows keep their references."
- [ ] After add/remove/flip → refresh like pricing does today (`refresh(true)`); status line confirms.
- [ ] Legacy admin console (`index.html` admin section) gets the same add/remove affordances on its `#model` textarea flow — as a textarea JSON, add an explicit `"enabled"` and a remove button per row; low effort, keeps SQLite mode usable.
- [ ] Visual states per [[Retro-Brutalism-Tokens]]: enabled = accent `[▣ LIVE]`, disabled = `[  DISABLED]`, removed = gone. Keep search filter working.

### A4 — List hygiene

- [ ] "Models & pricing" tab shows ALL model rows (`enabled` 0/1) — already the case via `/api/admin/overview`'s `models` array; add a small filter: All / Live / Disabled.
- [ ] Disabled models must not leak status info to users: `/api/catalog` (publicModels) already excludes them; keep that contract.

### A5 — Seed interplay (phase 7)

- [ ] Boot seed from [[Catalog-Seed-Spec]] inserts `enabled=0` for the 70 rows — nothing is live until the admin flips it.
- [ ] Seeded rows removed by admin must NOT be re-added by the boot seed on the next restart → the seed respects "admin removed" (either a `models.deleted_at` marker or an explicit `seed_exclusions` table; implement the marker choice in the seed).

## 2025-11-27 decisions (locked)

- [x] Collision models removed entirely (4 rows): see [[Catalog-Model-Mapping]].
- [x] Admin does add/remove/active/disabled itself — no auto-live from seed.
- [x] Disabled = not live. Active = `enabled=1` + `inventory.present=1` + router healthy.

## Touch list (re-grep before editing)

- `admin-ui.js` models() + table actions; `admin.html` models tab; `control-ui.js` (business center) — no model actions there, keep;
- `admin.mjs` `/api/admin/pricing`; `server.mjs` `/api/admin/model` (legacy);
- `store.mjs` + `postgres/store.mjs` `model()`, `catalog()`, `sync()`, `getModel()`;
- `branding.mjs` `publicModels()` — filtering stays as-is.

## QA pass

- [ ] Add → Disabled-row appears in admin, absent from `/api/catalog`; Enable → appears; Disable → vanishes; Remove → row gone, `/api/catalog` unchanged.
- [ ] Attempt to enable before sync → 400 "Model is not in synced inventory" (existing guard).
- [ ] Seed does not resurrect a removed model after restart.
- [ ] Both admin consoles (Postgres + legacy SQLite) exercise add/remove correctly.