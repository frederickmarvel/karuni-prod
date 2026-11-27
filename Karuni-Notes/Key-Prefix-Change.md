---
tags: [backend, api-keys, tasks]
created: 2025-11-27
---

# API Key Prefix Change — `kar_live_…` → `kr_live_…`

## Current state (grep touch list)

- Prefixes/handlers:
  - `server.mjs` — `/v1/chat/completions` Bearer extraction regex (currently `kar_live_[a-f0-9]{64}`); `/api/*` auth via sessions (no prefix involvement).
  - `store.mjs` — `key(uid,name)` mints the `kar_live_` token.
  - `postgres/store.mjs` — `key()` same; `keyUser()` (hash lookup, no prefix match).
  - Re-grep `kar_live_` / `kar_` before editing — this list goes stale.
- All keys are stored **hashed** (`keys.hash`); the plaintext is shown exactly once to the user. Changing the mint format therefore does NOT require rewrites of stored data — existing key hashes remain valid.

## Decisions

- [ ] New prefix: `kr_live_` + 64 hex = `kr_live_<64hex>`. (Tighter than a broader `kr_` because live keys are the only type that exists today.)
- [ ] Rotation policy: risk-averse default — change the mint regex to accept `kr_live_` only, then **revoke all existing `kar_live_` keys** and instruct users to regenerate. (Alternative one-time dual-accept per this note; the [[Open-Decisions]] default is revoke-and-reissue.)

## Tasks (phase 1)

- [ ] `store.mjs`: `key()` emits `'kr_live_'+secret()`.
- [ ] `postgres/store.mjs`: same.
- [ ] `server.mjs`: Bearer regex → `/^Bearer (kr_live_[a-f0-9]{64})$/`.
- [ ] Docs/labels mentioning `kar_` anywhere → `kr_` (snippets in `app.js`/landing/docs copy, `connection.js` Base URL text, README).
- [ ] Migration: SQL (both stores) `UPDATE keys SET active=0 WHERE prefix LIKE 'kar_live_%'` — record note so the admin console can show users the "re-issue keys" banner (a one-line announcement via the [[Referral-Flows|announcements]] system or a static note).
- [ ] Migration: add a `CHECK` guard so new rows (or updated) only ever hold `kr_live_` prefixes.
- [ ] Regression test pass: mint with `POST /api/key`, succeed in `/v1/chat/completions`; an old-format key is rejected with `401 Invalid API key`.
- [ ] Legacy admin console (`/api/admin/state` etc.) — touches `keys()` output only; no change needed beyond UI text.

## Blast radius

- Users must re-generate keys (existing integrations break once rotation fires) — communicate in an announcement prior to rollout.
- `keyUser()` (hash lookup) works unchanged.
- Idempotent: re-running the `UPDATE` is safe.

Related: [[Key-Prefix-Change#Decisions]] for the dual-accept option.