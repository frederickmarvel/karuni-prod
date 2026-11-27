# Karuni — Scope Notes

Review of `/Users/frederickmarvel/karuni/Karuni` (Nov 2025). Notes on architecture, what is complete end-to-end (backend → frontend), and what is not built.

## Architecture

- **Server**: single-file Node HTTP server ([server.mjs](../Karuni/server.mjs)) — no framework, ESM only.
- **Default store**: SQLite via built-in `node:sqlite` ([store.mjs](../Karuni/store.mjs)).
- **Postgres mode**: if `KARUNI_POSTGRES_URL` is set, the server swaps the store for the async Postgres implementation ([postgres/store.mjs](../Karuni/postgres/store.mjs)).
  - Migration helper: [postgres/migrate.mjs](../Karuni/postgres/migrate.mjs) (SQLite backup → empty PG, verified transfer).
  - QA test: [postgres/test.mjs](../Karuni/postgres/test.mjs) (credit replay, concurrent reservation, settlement, revoke, tenant isolation).
- **Data model** (both stores): `users`, `sessions`, `keys`, `inventory` (upstream model list), `models` (published catalog + pricing), `requests` (hold → settle/reject billing), `ledger`, `audit`, `google_ids`. `topups` table exists but is **unused** (checkout never wired).
- **Module layers** on top of core endpoints:
  - [admin.mjs](../Karuni/admin.mjs) — Admin Console endpoints + WebAuthn passkeys.
  - [control.mjs](../Karuni/control.mjs) — Business Control Center: switches, stock ledger, user policies (rpm / tpm / freeze / concurrency), expenses, tickets, announcements, diagnosis.
  - [branding.mjs](../Karuni/branding.mjs) — redacts router/upstream identifiers (model names, keys, IPs) from anything that leaves the server, including error messages and chat content.

## 1. Is the router already there? — NO, it is external

Karuni is the **storefront / billing gateway in front of an external router** (referred to internally as the "weize" / "9-router" upstream). The only integration points that already exist:

- `upstream()` in [server.mjs:20-21](../Karuni/server.mjs#L20-L21) proxies `/chat/completions` and `/models` to the upstream using:
  - `KARUNI_UPSTREAM_URL` + `KARUNI_UPSTREAM_KEY`
  - optional `KARUNI_UNCENSORED_KEY` + `KARUNI_UNCENSORED_MODELS` (second key; catalogs merged)
- Catalog sync (`POST /api/admin/sync`) pulls upstream `/models` into the `inventory` table.
- [branding.mjs](../Karuni/branding.mjs) hard-blocks the router's IDs / keys / IPs from leaking into model names, errors, or responses.

Token routing, provider failover, and capacity all live upstream. This repo assumes the router answers.

### Do I need the 9-router to connect?

**For the AI gateway function — yes.** Without it:

- The Karuni server itself still starts and runs (it is just the storefront).
- Login, register, dashboard, admin pages all work.
- But: `/api/admin/sync` → 503 "Service is not configured"; `/v1/chat/completions` → 503 "Service is not available"; catalog sync fails → no models in inventory → no published models → `/api/catalog` is empty ("No models published yet").

**To connect a router**, set these env vars on the Karuni server:

| Env var | Purpose |
|---|---|
| `KARUNI_UPSTREAM_URL` | Router base URL (must be https, or http only for 127.0.0.1/localhost) |
| `KARUNI_UPSTREAM_KEY` | Bearer key for the router |
| `KARUNI_UNCENSORED_KEY` | optional second key for uncensored models |
| `KARUNI_UNCENSORED_MODELS` | JSON array of model ids routed to the uncensored key |

Then run **Sync** in the Admin Console (Models tab / Provider Catalog) to pull the router's `/models` into Karuni's inventory. Only then can models be enabled, priced, and published.

Also required separately for full admin UI: `KARUNI_POSTGRES_URL` (see section 2).

## 2. Admin page — COMPLETE, with two deployment conditions

The Admin Console ([admin.html](../Karuni/public/admin.html) + [admin-ui.js](../Karuni/public/admin-ui.js) + [control-ui.js](../Karuni/public/control-ui.js), login page [admin-login.html](../Karuni/public/admin-login.html)) is fully wired end-to-end:

| UI section | Backend |
|---|---|
| Business center (stock, user policies, expenses, tickets, announcements, switches, diagnose, history, capabilities) | `/api/business/*` in [control.mjs:27-48](../Karuni/control.mjs#L27-L48) — every POST requires reason + admin password re-auth, and writes audit history |
| Overview cards / users / usage / audit | `GET /api/admin/overview` in [admin.mjs:30-33](../Karuni/admin.mjs#L30-L33) |
| Models & pricing (search, live price/edit/enable) | `POST /api/admin/pricing` |
| Block / unblock, adjust balance, list + revoke user API keys | `POST /api/admin/user-block`, `/api/admin/adjust` (in [server.mjs:35](../Karuni/server.mjs#L35)), `/api/admin/user-keys`, `/api/admin/key-revoke` |
| Security: password change, passkey enroll + login | `/api/admin/password`, `/api/admin/passkey-*` |

**Deployment conditions:**

1. **Postgres mode required.** `admin.mjs` and `control.mjs` open direct `pg` pools against `KARUNI_POSTGRES_URL` — in SQLite mode `/api/admin/overview` and `/api/business/*` fail (503).
2. **Production origin hardcoded.** [admin.mjs:7,16](../Karuni/admin.mjs#L7) and [control.mjs:28](../Karuni/control.mjs#L28) hardcode `https://karuni.app` as the expected origin / rpID — so admin POST actions from localhost get 403. Passkeys also import from an absolute path `/opt/karuni-admin-deps/...simplewebauthn` ([admin.mjs:3](../Karuni/admin.mjs#L3)) that must exist on the deploy host.

**Legacy admin UI also exists**: inline admin section in [index.html](../Karuni/public/index.html) via `/api/admin/state`, `/api/admin/sync`, `/api/admin/model`, `/api/admin/adjust` — same capabilities, plainer UI, works in SQLite mode.

## 3. User page — COMPLETE, UI and backend match

- **Landing** ([index.html](../Karuni/public/index.html) + [app.js](../Karuni/public/app.js)): hero + 3D knot ([hero.mjs](../Karuni/public/hero.mjs), vendored three.js), catalog table (`GET /api/catalog`), branded model showcase ([showcase.json](../Karuni/public/showcase.json)), curl snippet, pricing — all live.
- **Auth**: email login / register → `/api/login`, `/api/register`; Google sign-in page ([auth.html](../Karuni/public/auth.html) + [google-auth/login.mjs](../Karuni/google-auth/login.mjs)) only when `KARUNI_GOOGLE_CLIENT_ID` is set.
- **User dashboard** ([workspace.js](../Karuni/public/workspace.js)): all 10 pages render against real endpoints —
  - Overview (metrics + 30-day request chart from `/api/usage`)
  - API Keys (`/api/key`, `/api/revoke`)
  - Models & Pricing (`/api/catalog`)
  - Request Logs and Transactions (`/api/usage`, `/api/account`)
  - Support tickets ([customer-support.js](../Karuni/public/customer-support.js) → `/api/business/ticket`) and announcements (`/api/business/public`)
- **Public API**: `/v1/chat/completions` with full hold → settle billing, idempotency keys, per-user rpm/tpm/concurrency limits. Stream mode returns the whole reply as one SSE chunk (non-streaming is the real path). All in [server.mjs:37-50](../Karuni/server.mjs#L37-L50).

## Deliberately NOT built (signposted everywhere as "not available")

- **Top-up / checkout, payments, promotions, referral** — the emergency-control switches for these are force-disabled in [control.mjs:39](../Karuni/control.mjs#L39) ("Payment, promotion and referral engines are not available").
- `/health` reports `checkout: 'closed'`; the `topups` table exists but nothing writes to it.
- The Business Control Center has an "Integration status" card that self-reports: payments `not_integrated`, refunds `provider_not_integrated`, profit `cost_data_incomplete`, referrals `not_implemented`, promotions `not_implemented`, cached input `not_recorded`, upstream capacity `not_reported`.
- Users are told "Self-serve checkout is not available yet. Contact us to top up."

## Oddities worth knowing

- **Trial hardcode** in [server.mjs:41](../Karuni/server.mjs#L41): `const trial={uid:'9',cap:20}` — user ID 9 gets up to 20 requests on zero-priced/private models.
- **[bootstrap.mjs](../Karuni/bootstrap.mjs)** looks broken as committed (references a deploy-time-injected credential placeholder, writes `/root/karuni-admin-handoff.json` mode 0600, refuses to run twice — it is the "provision admin at deploy, run once" script, not a normal script; the placeholder is replaced at deploy time).
- Model ID aliases in [server.mjs:38](../Karuni/server.mjs#L38): `kg/uc-deepseek-v4.1-flash` → `uncensored-deepseek-v4.1-flash`, `wz/gpt-6-luna` → `gpt-6-luna`, etc. — the `wz/`, `kg/`, `cx/`, `ag/` prefixes are redacted by branding.mjs (upstream router identifiers).
- Two overlapping admin data feeds: `/api/admin/overview` (Postgres) vs `/api/admin/state` (core store) — the source of the "two admin UIs" split.
- Request idempotency: client-supplied `Idempotency-Key` header or server-generated UUID; duplicate submission with different body → 409.

## Quick answers

| Question | Answer |
|---|---|
| Is the router already there? | No — external service ("9-router" / weize upstream). Proxy + sync + redaction already built |
| Do I need the router to connect? | Yes, for any model catalog or chat completions. Configure `KARUNI_UPSTREAM_URL` / `KARUNI_UPSTREAM_KEY`, then Sync in admin |
| Is the admin page complete? | Yes (backend → frontend wired). Requires Postgres mode + production origin (`https://karuni.app`) hardcodes fixed |
| Is the user page complete? | Yes. Only the intentionally closed checkout/payment engine is missing |