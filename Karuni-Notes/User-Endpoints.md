---
tags: [backend, api, tasks]
created: 2025-11-27
---

# User API Endpoints — Usage, Ledger, Balance

"Token usage, ledger of usage, balance" layered on top of what already exists. The current data is already right: `requests` persists every call's `input`/`output` tokens, `charge`, and `state`; `ledger` holds every delta. This stream is about **exposing it properly** via user-scoped endpoints and adding the missing runtime visibility.

## What already exists (do not rebuild)

- `POST /v1/chat/completions` — hold→settle billing ([`server.mjs:37-50`](Karuni/server.mjs#L37-L50)); per-request X-Request-Id; idempotency.
- `GET /api/usage` — `{summary, days, transactions, idrPerCredit}`.
- `GET /api/account` — user + keys + history; `keyUser()` resolves the api key owner.
- Store methods to reuse: `summary()`, `days()`, `transactions()`, `history()`, `account()` in both `store.mjs` and `postgres/store.mjs`; requestGuard rpm/tpm limits in `control.mjs`.
- Dashboard "Overview" tab already renders summary from `/api/usage`.

## Phase 2 build

### B1 — User-scoped endpoint restructure

- [ ] Keep `GET /api/usage` (dashboard). Add narrower ones:
  - `GET /api/usage/tokens` → `{summary:{input,output,requests,successes}, byModel:[{model,requests,input,output}]}` (aggregate from `requests` WHERE uid; materialize as a SQL aggregate — no JS loops).
  - `GET /api/usage/requests?from=&to=&model=&state=&page=` → filtered request log (uid only), `LIMIT 100`, plus a `has_more` flag. Note: current `requests` has no request timestamp index → add index (see B3).
  - `GET /api/usage/ledger?page=` → paged `ledger` rows (uid only).
- [ ] Auth rules: session cookie or valid API key (`kar_`/`kr_` per [[Key-Prefix-Change]]); reject other users' rows server-side (uid always from the auth token, **never** from query params).
- [ ] Keep old paths working (dashboard regression in [[Roadmap#Phase 2]]).

### B2 — Balance endpoint semantics

- [ ] `GET /api/usage/balance` → `{available, held, effective}` where `held = SUM(held)` of `state='pending'` requests for the user; `effective = available - held`. Users see both ("effective balance" = what they can actually spend right now).
- [ ] Dashboard "Overview" adds an effective-balance line + pending-count chip (UI in [[UI-Rollout#4]]).

### B3 — DB indexes (both stores)

- [ ] `requests(uid, at)` and `requests(uid, state)` for aggregate/recent queries.
- [ ] `ledger(uid, kind, ref)` already exists as UNIQUE; add `ledger(uid)` is unnecessary — verify with EXPLAIN during QA; skip if the UNIQUE prefix index covers it.
- [ ] These are additive migrations only; keep the `migrate.mjs` verification flow for any schema change.

### B4 — Per-key usage separation

- [ ] `requests` has no key column today. Add nullable `key_id` to `requests` in both stores; set it from `keyUser()` resolution in `inference()` in `server.mjs`.
- [ ] `GET /api/usage/by-key` → per-key `{name, requests, input, output, charge}` (uid-owned only).

### B5 — Concurrency + integrity

- [ ] Everything through the existing transaction helpers (`tx()` in both stores). No additive/non-atomic reads for balances.
- [ ] Token usage validation already survives `settle()`; extend the QA test in `postgres/test.mjs` to assert new endpoints' invariants (by-model sums = summary sums).

### B6 — Error & rate-limiting notes

- [ ] Errors through `publicError` whitelist only ([[README#Errors|safe list]] note) — add safe strings for at least `"Usage data unavailable"` `"Invalid date range"` as needed.
- [ ] Rate limit the query endpoints lightly (reuse the existing 1-minute bucket pattern) — dashboards poll; keep pagination cheap.

## Registry of formats (for frontend contract)

| Field | Format |
|-------|--------|
| `input` / `output` / `charge` | integer internal units (1 credit = Rp 1 policy — [[Open-Decisions#D2]]) |
| `at` | UTC as stored in DB |
| `state` | one of `pending / settled / rejected / review` |
| `byModel` | model id = published id, stripped per [[Catalog-Model-Mapping]] |