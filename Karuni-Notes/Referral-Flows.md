---
tags: [referral, reseller, flows]
created: 2025-11-27
---

# Referral / Reseller — Flows

End-to-end walk-throughs. Schema lives in [[Referral-Data-Model]]; implementable tasks in [[Referral-Tasks]]. Decisions D3/D4 in [[Open-Decisions]].

## Mechanics — the one-way binding rule

- Each signed-up account has a **one-time** invite claim: `referrals.invitee_uid UNIQUE` enforces one inviter forever.
- Claim sources (most forgiving to adoption):
  1. **Invite link**: `https://karuni.app/dashboard?invite=rf_AB12CD34EF` arrived via an existing user's link.
  2. **Referral code field** on the registration form (added in [[UI-Rollout#3]]).
  3. **Admin sets the inviter manually** after sign-up (transaction passed as data into account creation).
- Order matters: the code claim must complete inside the user creation transaction; never allow a later "re-bind".

## Sign-up + deposit → fee

1. New user registers (Google or email) with invite code → `referrals(inviter_uid, invitee_uid, code_used)` row created in the same tx.
2. Deposit arrives offline (bank/QR); admin opens User → "Record deposit": enters amount (internal units), unique ref, note → creates `deposits(uid, amount, ref, actor)` and calls existing `adjust(uid, amount, ref)` (same tx; `adjust` uniqueness makes replay impossible; `applyDeposit` in [[Referral-Tasks]]).
3. Deposit application hooks referral settlement:
   - Only if the depositor is bound as an *invitee*.
   - Fee = `floor(amount × KARUNI_REFERRAL_RATE)` (D3) → `referral_earnings(inviter, invitee, deposit_id, rate, amount, 'pending')`.
3b. Skipped condition: `deposit.amount <= 0` (never), or depositor has no inviter.

## Withdrawal — banking account per request, referral fees ONLY

1. Dashboard → "Referrals" tab:
   - Shows: my invite code + link, my invitees (count + list), "available referral fee" = approved-but-unpaid earnings (admin-selected, see below).
   - "Request withdrawal": amount (must be ≤ available) + **banking account form every time** (bank_code, account_number, account_name — per the ask, always fresh, encrypted at rest, masked after use).
   - Warning copy lives here: "Only referral fees from your invitees' deposits are withdrawable." Main balance is NOT.
2. Backend creates `payout_requests(state='submitted')`; nothing moves automatically.
3. Admin console ("Referral payouts" section, [[UI-Rollout#5]]):
   - Lists submitted requests and pending/approved earnings per inviter.
   - **Manual processing**: admin sets `referral_earnings.state='approved'` (only approved rows count toward "available"), then on a payout request approves it, records the bank/transfer `manual_ref`.
   - `payout_rows` are stamped per approved request — each `earnings_id` UNIQUE, so no double-pay is possible even on a second approval attempt.
   - Request moves `approved → paid` once the actual transfer completes; `rejected` with `note` otherwise.
   - The admin console records its own `audit` row (existing convention: actor, action, detail).
4. Inviter only ever sees referral balances — main balance remains untouched by the payout flows.

## Money vs balance — no commingling

- Main balance: the existing users.balance (single pool) — used for usage only; never withdrawable.
- Referral fee "balance": sum over `referral_earnings` rows; not a column on `users`; not in users.balance.
- Deposit credits main balance only; fee is booked as a new `referral_earnings` row (no balance subtraction).
- Bookkeeping note for admin tab: `charge` on requests (usage) vs `deposits` (in) vs `payout_rows` (out, referral only) all reconcile to the ledger, so the finance view can show both.

## Edge cases (must decide in code review, not guess)

1. Admin **credits user who is an invitee by mistake** (never meant to earn fee) — deposit `note` should carry `"exclude referral fee"` flag (`deposits.apply_fee` default true).
2. Inviter's account blocked/deleted — earnings still counted; payouts are reviewed manually anyway; admin may freeze payout for a user.
3. Code from a *blocked* inviter works or errors? Default: registration allows the bind (the invite page is not a trust channel), admin manages risks.
4. Self-referral (`rf_` code of the same user) → reject on registration: `inviter_uid != invitee_uid` enforced.

## Where the flows hit the existing app

- **Registration path**: `server.mjs` `/api/register` + Google `/api/google` — add invite param + bind inside a store-level tx (`googleUser`, `user` callers).
- **Deposit path**: currently `admin.mjs`/`server.mjs` admin adjustment — route through `applyDeposit` so referral snapshotting happens.
- **Dashboard tab**: `workspace.js` navigation (currently `Top Up` tab) → replace/augment with "Referrals" (icon/numbering fix in [[UI-Rollout#4]]).
- **Admin**: users tab + balance adjustments — extend per [[Referral-Tasks]], UI section per [[UI-Rollout#5]].