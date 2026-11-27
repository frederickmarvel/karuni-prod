---
tags: [referral, reseller, backend, schema]
created: 2025-11-27
---

# Referral / Reseller — Data Model

## Objects (Postgres; mirror in SQLite for dev)

### referral codes (one per user, invite code)

| column | type | notes |
|--------|------|-------|
| uid | BIGINT PK FK users(id) | one row per user = one code |
| code | TEXT UNIQUE NOT NULL | e.g. `kar_<10 x [a-z0-9]>` or user-chosen handle |
| created_at | TIMESTAMPTZ default now() | |

- Code minted for every registered user (previous + future). Naming prefix MUST avoid the keys' `kar_`/`car_` mix-ups → use `rf_` (e.g. `rf_AB12CD34EF`). See [[Referral-Flows#Mechanics]].

### referrals (bind invitee → inviter)

| column | type | notes |
|--------|------|-------|
| id | BIGINT PK identity | |
| inviter_uid | BIGINT NOT NULL FK users(id) | the reseller |
| invitee_uid | BIGINT UNIQUE NOT NULL FK users(id) | one inviter per new account |
| code_used | TEXT NOT NULL | snapshot (code can theoretically rotate) |
| created_at | TIMESTAMPTZ default now() | |

### referral_earnings (the only withdrawable balance)

| column | type | notes |
|--------|------|-------|
| inviter_uid | BIGINT NOT NULL FK users(id) | |
| invitee_uid | BIGINT NOT NULL FK users(id) | |
| deposit_id | BIGINT NOT NULL FK ledger/ops | the deposit row that earned the fee |
| rate | NUMERIC(6,4) NOT NULL | snapshot, e.g. 0.1000 |
| amount | BIGINT NOT NULL CHECK(amount>0) | fee in internal units |
| state | TEXT NOT NULL default 'pending' | 'pending' → 'approved'/'rejected' by admin |
| payout_id | BIGINT NULL | links to payout_rows |
| created_at | TIMESTAMPTZ default now() | |

- `rate`/`amount` snapshots make repricing or decimal drift safe — the payout is always based on the row at deposit time.

### deposits (manual top-ups, the fee base)

| column | type | notes |
|--------|------|-------|
| id | BIGINT PK identity | |
| uid | BIGINT NOT NULL FK users(id) | the depositor |
| amount | BIGINT NOT NULL | credited to balance |
| currency | TEXT default 'IDR' | display only |
| rate_major_per_credit | NUMERIC | Rp per internal unit (snapshot of env `KARUNI_IDR_PER_CREDIT`) |
| ref | TEXT UNIQUE NOT NULL | admin-entered unique reference |
| actor | BIGINT NULL FK users(id) | admin who processed it |
| note | TEXT default '' | |
| state | TEXT default 'applied' | applied / reversed |
| created_at | TIMESTAMPTZ default now() | |

What deposit "is": today admin calls `adjust(uid, delta, ref)` (server.mjs). The deposits table wraps that call with the metadata the referral math needs — same ref passed to `adjust` → no double credit. `adjust`'s uniqueness (uid, kind='adjust', ref) blocks double-application.

### payout_account (banking account — collected per withdrawal, always fresh)

| column | type | notes |
|--------|------|-------|
| uid | BIGINT PK FK users(id) | inviter |
| bank_code | TEXT | e.g. `014`/`BCA` |
| account_number | TEXT | masked after use |
| account_name | TEXT | |
| used_at | TIMESTAMPTZ | last submission timestamp |

> "the inviters have to put their banking account everytime they want to withdraw" → banking details are submitted **with each withdrawal request**, used once, and only stored masked (`****1234`) after use. No reusable "banking account" wallet.

### payout_requests (withdrawal asks)

| column | type | notes |
|--------|------|-------|
| id | BIGINT PK identity | |
| uid | BIGINT NOT NULL FK users(id) | inviter |
| amount | BIGINT NOT NULL | internal units requested |
| bank_code / account_number / account_name | TEXT NOT NULL | fresh, encrypted at rest |
| state | TEXT NOT NULL default 'submitted' | submitted → approved/paid/rejected |
| note | TEXT default '' | admin fills |
| requested_at / resolved_at | TIMESTAMPTZ | |

### payout_rows (what an approved payout actually transfers)

| column | type | notes |
|--------|------|-------|
| id | BIGINT PK identity | |
| payout_request_id | BIGINT NOT NULL | |
| inviter_uid | BIGINT NOT NULL | |
| earnings_id | BIGINT UNIQUE NOT NULL FK referral_earnings | each earning row paid exactly once (UNIQUE prevents double-pay) |
| amount | BIGINT NOT NULL | capped by the earnings row |
| manual_ref | TEXT UNIQUE | the bank transfer reference admin used |
| processed_at | TIMESTAMPTZ | |

## Proof-of-work for the future admin UI

- `SELECT sum(amount) FROM referral_earnings WHERE inviter_uid=? AND state='approved' AND payout_id IS NULL` selective sum → this is the in-app "withdrawable referral fee". Withholding/risk can be layered later without schema change by only *approving* what admins want payable.
- 10% of deposit: `amount = floor(deposit.amount * 0.10)` with `rate` snapshot — integer-safe.

## Migration

- [ ] Additive only (`CREATE TABLE IF NOT EXISTS` style), then `ALTER`-style additions for any index: `referral_earnings(inviter_uid,state)` and `payout_requests(uid)`.
- [ ] New tables live behind the existing switch style: referral feature gate under `control_settings` switches (`referral`) — extend `defaults` (currently `referral:false`) per [[Open-Decisions#D3]].