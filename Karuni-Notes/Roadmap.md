---
tags: [roadmap, project]
created: 2025-11-27
---

# Roadmap

Phase order. Every phase is UI-visible at its end so nothing lands as dead code.

> **Why the current app MUST NOT show its real models before phase 7:** `wz/`, `cx/`, `ag/`, `uc-` model ids are on the redactions list in `branding.mjs` (`internal` regex + marker filter). `wz/…` rows in a catalog seed will be silently dropped by `publicModels()`, and chat content containing the router id fails validation. The prefix strip is therefore **mandatory** for the catalog to work.

## Phase 0 — Foundation

- [ ] Decision pass from [[Open-Decisions]] (rate model, credit policy, referral %, referral cap, seeding mechanism, 2FA scope, whether to defer Stripe). Smallest set needed to start.
- [ ] Server-side catalog seeding decision: import from `price - Sheet1.csv` (cleanest) → spec in [[Catalog-Seed-Spec]].
- [ ] Compute exact internal-unit price per model from the sheet → [[Catalog-Model-Mapping#Seeded rows|seeded table]].
- [ ] Begin referral/2FA schema work in Postgres (new tables only — no disruption) → [[Referral-Data-Model]], [[GOTP-Plan]].

## Phase 1 — API key prefix (`kr-live_…`)

Small and isolated, but destructive to live keys → do early with a clean migration.

- [ ] All tasks in [[Key-Prefix-Change]].
- [ ] Regression: `POST /v1/chat/completions` with a rotated `kr_live_` key; revoked old key → 401.

## Phase 2 — User API endpoints

Layered on the existing hold/settle engine; no UI yet (UI is phase 4).

- [ ] All tasks in [[User-Endpoints]].
- [ ] Compat: `/dashboard` and admin console must still render exactly as before after these changes (they read the same store tables).

## Phase 3 — Referral system (reseller)

Backend, admin UI, and referral UI. Migration + sync worker must exist before front-end touch-ups drop the invite claim UI.

- [ ] All tasks in [[Referral-Tasks]] (subtasks link to [[Referral-Data-Model]] + [[Referral-Flows]]).

## Phase 4 — Retro-brutalism UI + responsive pass

Biggest single visual change; done as per-page modules after data layers are stable.

- [ ] Tokens + reusable primitives in [[Retro-Brutalism-Tokens]] and [[Component-Spec]].
- [ ] Per-page rollout order in [[UI-Rollout]].
- [ ] Responsive + tidy verification against [[Responsive-Verification]] after each page lands.

## Phase 5 — GOTP 2FA

Pure additive (new table, opt-in column) → safe to land last.

- [ ] All tasks in [[GOTP-Plan]].

## Phase 7 — Catalog: seed sheet, strip prefixes, publish

Needs the router synced (see [[Deployment]]): without `POST /api/admin/sync` success, `model()` blocks enabling any model.

- [ ] Seeding workflow from [[Catalog-Seed-Spec]].
- [ ] Prefix-strip step → [[Catalog-Model-Mapping]] (70 rows: collision removals locked on 2025-11-27).
- [ ] Seed all rows from `price - Sheet1.csv`.
- [ ] Admin enable/disable/add/remove controls from [[Model-Admin-Control]] — admin decides what is live; seed comes up fully disabled.
- [ ] Admin enables/prices the models → users see the catalog on `/models` + `/dashboard`.

## Phase 8 — Polish & cutover

- [ ] Toggle 2FA + referral instructions live.
- [ ] Payout run dry-test with a sandbox admin (fake banking account, small amount) before real payouts.
- [ ] Final pass of [[Responsive-Verification]] (all pages, dark/light, 320px→1440px+).
- [ ] Set `KARUNI_IDR_PER_CREDIT` on deploy (default 1 credit = Rp 1 under the 1:1 policy; see [[Open-Decisions]]).
- [ ] Update `README.md` (existing scope doc) with "This build" section.

## Phase numbering

No phase 6 — saved deliberately for the possible Stripe/payment integration spike.