---
tags: [referral, tasks, backend]
created: 2025-11-27
---

# Referral / Reseller — Implementation Tasks

Backend tasks; the flows and semantics are in [[Referral-Flows]], schema in [[Referral-Data-Model]]. Follow phase 3 of the [[Roadmap]]. Every item is a checkbox; touch lists go stale, re-grep before editing.

## Store layer (both `store.mjs` and `postgres/store.mjs`)

- [ ] Add K1: schema from [[Referral-Data-Model]] (referral_codes? no — codes live on `referral_codes` table; double-check name before coding).
- [ ] Add K2: `mintReferralCode(uid)` → unique `rf_` code row; call inside `user()`/`googleUser()` so every new account gets one; backfill for existing users in the migration.
- [ ] Add K3: `bindReferral({inviteeUid, code})` → validates code exists, `inviterUid != inviteeUid`; inserts `referrals` row (UNIQUE invitee blocks rebind); idempotent reject otherwise.
- [ ] Add K4: `applyDeposit({uid, amount, ref, actor, note, applyFee})` — a tx that (a) inserts `deposits`, (b) calls existing `adjust(uid, amount, ref, actor)`, (c) if `applyFee` and `referrals` row exists for uid → insert `referral_earnings(rate snapshot, floor(amount×rate), 'pending')`. Reuses the `adjust` uniqueness already in both stores.
- [ ] Add K5: `requestPayout({uid, amount, bank_code, account_number, account_name})` → checks amount ≤ approved-and-unpaid earnings sum (for that inviter); inserts `payout_requests`; returns row id.
- [ ] Add K6: `payoutEarnings({inviterUid, requestId, manualRef, note})` → approves a payout request, stamps `payout_rows` per earnings-id chosen, marks request `paid`; UNIQUE(earnings_id) makes double-pay impossible.
- [ ] Add K7: queries — `referralState(uid)` (code, link, invitees, available/paid totals) and `adminReferralIndex` (open earnings, submitted payouts).

## Server wiring (`server.mjs` + `control.mjs`)

- [ ] S1: switch default flip — referral gate OFF initially (`control_settings.switches.referral`), then ON at cutover (per [[Open-Decisions#D3]] note).
- [ ] S2: registration route takes invite (`?invite=`): roll the bind into the user-insert tx. On the web, an invite link sets it as a hidden field.
- [ ] S3: Google flow — same param (`/api/google` with invite code) → `googleUser` + `bindReferral` same tx.
- [ ] S4: `/api/referral` GET → `referralState(uid)` for the dashboard tab; `/api/referral/payout` POST → `requestPayout`.
- [ ] S5: admin endpoints: `/api/business/deposit` POST (route to `applyDeposit`), `/api/business/referral-state` GET, `/api/business/payout-approve` POST.
- [ ] S6: audit rows on every admin action (existing `audit` / `control_history` conventions) with reason field.
- [ ] S7: update `publicError` allowlist with any new safe message.

## Admin + user UI (phase 4, per [[UI-Rollout]])

- [ ] U1: dashboard "Referrals" tab → invite code + link + copy button, invitees count, available fee + withdraw button, banking form (every request), withdrawal list.
- [ ] U2: admin "Deposit" action per user — [currently `Adjust balance`] gets replaced/augmented by **Record deposit** (dialog: amount, ref, note, `apply referral fee` checkbox).
- [ ] U3: admin "Referral payouts" business-center section → all submitted payout requests with approve/reject + manual-ref field; referral earnings table.
- [ ] U4: help copy — referral funds are the ONLY withdrawable funds; usage balance is not withdrawable, mention receipts/transfer times.

## Sync worker (manual → the "delay")

- [ ] W1: `syncPendingReferral()` — admin trigger / scheduled loop: when a deposit is recorded, the invitee check is immediate ⇒ nothing async needed for fee accrual.
- [ ] W2: On payout approval, `payout_rows` stamping uses `manual_ref` — admin enters it; no money is auto-moved (the bank transfer is manual, by design).
- [ ] W3: Scheduled safety check only: daily "stale submitted payouts" list in admin overview.

## Hardening / risks

- [ ] Overflow-free fee math: `floor(amount * rate_10000 / 10000)` integer; snapshotted rate.
- [ ] Prevent **self-referral** (K3), **re-deposit replay** (K4 via `adjust` uniqueness), **double-payout** (K6 UNIQUE).
- [ ] Banking data at rest: encrypt `account_number` column fields before insert (aes-256-gcm secret via env); masked form in UI after use; log-free handling of plaintexts.
- [ ] Test fixtures in `postgres/test.mjs`: bind→deposit→fee accrual→payout once→replay block.

## Rollout sequence

1. K1-K3 migrations land (invisible).
2. K4 + S5 deposit route + admin "Record deposit" UI (first replacement of manual `adjust`).
3. K5-K7 + S4 + U1 (users see codes/earnings).
4. Referral switch ON — announce the invite-link rollout.
5. K6 + U3 + W3 payout processing + dry-run with sandbox banking account ([[Roadmap#Phase 8]]).